from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from utils.db import get_db
from models.order_model import Order
from models.payment_model import Payment
from models.bundle_model import Bundle
from schemas.order_schema import OrderCreate, OrderResponse
from typing import List
import requests
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["Orders"])

def send_sms(phone_number, message):
    """
    SMS sending function - replace with actual SMS provider integration
    """
    # Placeholder for SMS API integration
    # Example using Africa's Talking (replace with your actual API key)
    """
    api_url = "https://api.africastalking.com/version1/messaging"
    api_key = "YOUR_API_KEY"
    sender_id = "ExtraData"

    payload = {
        "to": phone_number,
        "message": message,
        "from": sender_id
    }

    headers = {
        "apikey": api_key,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    response = requests.post(api_url, data=payload, headers=headers)
    return response.json()
    """
    
    # For now, log the message (SMS integration pending)
    logger.info(f"SMS to {phone_number}: {message}")
    return {"status": "sent", "message": "SMS would be sent in production"}

@router.get("/", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).all()

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/", response_model=OrderResponse)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    # Check if bundle exists
    bundle = db.query(Bundle).filter(Bundle.id == order.bundle_id).first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    new_order = Order(**order.dict())
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    # Send confirmation SMS to the recipient phone
    message = "Your MTN data bundle from ExtraData will be delivered within 1–4 hours. Thank you for choosing ExtraData."
    send_sms(order.recipient_phone, message)
    
    return new_order

@router.put("/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    requires_paid_payment = status in {"paid", "processing", "completed"}
    if requires_paid_payment:
        paid_payment = db.query(Payment).filter(
            Payment.order_id == order_id,
            Payment.status == "paid"
        ).first()
        if not paid_payment:
            raise HTTPException(
                status_code=400,
                detail="Order status can only be updated after payment is completed"
            )
    
    order.status = status
    db.commit()
    db.refresh(order)
    
    return {"message": f"Order status updated to {status}", "order": order} 
