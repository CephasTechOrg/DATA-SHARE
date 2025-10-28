from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from utils.db import get_db
from models.payment_model import Payment
from models.order_model import Order
from schemas.payment_schema import PaymentCreate, PaymentResponse
from typing import List

router = APIRouter(prefix="/payments", tags=["Payments"])

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