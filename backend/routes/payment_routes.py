from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import requests
import uuid
import logging
import os

from utils.db import get_db
from utils.config import PAYSTACK_SECRET_KEY
from models.payment_model import Payment
from models.order_model import Order
from models.bundle_model import Bundle
from schemas.payment_schema import PaymentCreate, PaymentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])

# Paystack API base URL
PAYSTACK_BASE_URL = "https://api.paystack.co"

# ==================== SCHEMAS ====================

class InitializePaymentRequest(BaseModel):
    bundle_id: int
    customer_name: str
    recipient_phone: str  # Phone to receive bundle
    payer_phone: str      # Phone for payment
    email: Optional[str] = None
    callback_url: Optional[str] = None

class InitializePaymentResponse(BaseModel):
    success: bool
    message: str
    order_id: int
    payment_reference: str
    access_code: str
    authorization_url: str

class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    status: str
    order_id: Optional[int] = None
    amount: Optional[float] = None

# ==================== PAYSTACK INTEGRATION ====================

@router.post("/initialize", response_model=InitializePaymentResponse)
def initialize_payment(request: InitializePaymentRequest, db: Session = Depends(get_db)):
    """
    Initialize a Paystack transaction.
    1. Create order in database
    2. Call Paystack API to initialize transaction
    3. Return access_code for frontend popup
    """
    try:
        # 1. Check if bundle exists
        bundle = db.query(Bundle).filter(Bundle.id == request.bundle_id).first()
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")
        
        # 2. Generate unique payment reference
        payment_reference = f"EXTRADATA-{uuid.uuid4().hex[:10].upper()}"
        
        # 3. Create order in database
        new_order = Order(
            bundle_id=request.bundle_id,
            customer_name=request.customer_name,
            recipient_phone=request.recipient_phone,
            payer_phone=request.payer_phone,
            email=request.email or f"{request.payer_phone}@extradata.com",  # Default email if not provided
            payment_reference=payment_reference,
            status="pending"
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        
        # 4. Initialize Paystack transaction
        # Amount in pesewas (kobo equivalent for GHS)
        amount_in_pesewas = int(bundle.price * 100)
        
        paystack_payload = {
            "email": new_order.email,
            "amount": amount_in_pesewas,
            "reference": payment_reference,
            "callback_url": request.callback_url or os.getenv("FRONTEND_URL", "http://127.0.0.1:3000/customer/payment-success.html"),
            "metadata": {
                "order_id": new_order.id,
                "bundle_name": bundle.name,
                "bundle_size": bundle.size,
                "recipient_phone": request.recipient_phone,
                "payer_phone": request.payer_phone,
                "customer_name": request.customer_name
            },
            "channels": ["mobile_money", "card"]  # Enable MoMo and card payments
        }
        
        headers = {
            "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            json=paystack_payload,
            headers=headers
        )
        
        paystack_response = response.json()
        logger.info(f"Paystack initialize response: {paystack_response}")
        
        if not paystack_response.get("status"):
            # Rollback order if Paystack fails
            db.delete(new_order)
            db.commit()
            raise HTTPException(
                status_code=400, 
                detail=paystack_response.get("message", "Failed to initialize payment")
            )
        
        # 5. Return response with access_code
        return InitializePaymentResponse(
            success=True,
            message="Payment initialized successfully",
            order_id=new_order.id,
            payment_reference=payment_reference,
            access_code=paystack_response["data"]["access_code"],
            authorization_url=paystack_response["data"]["authorization_url"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initializing payment: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error initializing payment: {str(e)}")


@router.get("/verify/{reference}", response_model=VerifyPaymentResponse)
def verify_payment(reference: str, db: Session = Depends(get_db)):
    """
    Verify a Paystack transaction by reference.
    Updates order and payment status based on verification result.
    """
    try:
        # 1. Find order by payment reference
        order = db.query(Order).filter(Order.payment_reference == reference).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # 2. Call Paystack verify endpoint
        headers = {
            "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
        }
        
        response = requests.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers=headers
        )
        
        paystack_response = response.json()
        logger.info(f"Paystack verify response: {paystack_response}")
        
        if not paystack_response.get("status"):
            return VerifyPaymentResponse(
                success=False,
                message=paystack_response.get("message", "Verification failed"),
                status="failed",
                order_id=order.id
            )
        
        transaction_data = paystack_response["data"]
        transaction_status = transaction_data.get("status")
        amount_paid = transaction_data.get("amount", 0) / 100  # Convert from pesewas
        
        # 3. Update order status based on payment status
        if transaction_status == "success":
            order.status = "paid"
            
            # Create payment record
            bundle = db.query(Bundle).filter(Bundle.id == order.bundle_id).first()
            
            # Check if payment record already exists
            existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
            if not existing_payment:
                new_payment = Payment(
                    order_id=order.id,
                    amount=amount_paid,
                    method="paystack",
                    status="paid"
                )
                db.add(new_payment)
            else:
                existing_payment.status = "paid"
            
            db.commit()
            
            return VerifyPaymentResponse(
                success=True,
                message="Payment verified successfully",
                status="success",
                order_id=order.id,
                amount=amount_paid
            )
        else:
            order.status = "failed"
            db.commit()
            
            return VerifyPaymentResponse(
                success=False,
                message=f"Payment {transaction_status}",
                status=transaction_status,
                order_id=order.id
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(status_code=500, detail=f"Error verifying payment: {str(e)}")


@router.post("/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Paystack webhook events.
    Paystack sends events for successful payments, failed payments, etc.
    """
    try:
        payload = await request.json()
        event = payload.get("event")
        data = payload.get("data", {})
        
        logger.info(f"Paystack webhook received: {event}")
        
        if event == "charge.success":
            reference = data.get("reference")
            
            # Find and update order
            order = db.query(Order).filter(Order.payment_reference == reference).first()
            if order:
                order.status = "paid"
                
                # Create or update payment record
                amount = data.get("amount", 0) / 100
                existing_payment = db.query(Payment).filter(Payment.order_id == order.id).first()
                
                if not existing_payment:
                    new_payment = Payment(
                        order_id=order.id,
                        amount=amount,
                        method="paystack",
                        status="paid"
                    )
                    db.add(new_payment)
                else:
                    existing_payment.status = "paid"
                
                db.commit()
                logger.info(f"Order {order.id} marked as paid via webhook")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ==================== EXISTING ENDPOINTS ====================

@router.get("/", response_model=List[PaymentResponse])
def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).all()

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@router.post("/", response_model=PaymentResponse)
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    # Check if order exists
    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_payment = Payment(**payment.dict())
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.put("/{payment_id}/status")
def update_payment_status(payment_id: int, status: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    payment.status = status
    db.commit()
    db.refresh(payment)
    
    return {"message": f"Payment status updated to {status}", "payment": payment}