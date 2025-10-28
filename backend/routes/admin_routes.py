from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from utils.db import get_db
from models.bundle_model import Bundle
from models.order_model import Order
from models.payment_model import Payment
from schemas.bundle_schema import BundleCreate
from typing import List, Dict

router = APIRouter(prefix="/admin", tags=["Admin"])

# Predefined MTN bundles data
MTN_BUNDLES = [
    {"name": "MTN 1GB", "size": "1GB", "price": 5.40},
    {"name": "MTN 2GB", "size": "2GB", "price": 9.80},
    {"name": "MTN 3GB", "size": "3GB", "price": 13.90},
    {"name": "MTN 4GB", "size": "4GB", "price": 18.80},
    {"name": "MTN 5GB", "size": "5GB", "price": 23.30},
    {"name": "MTN 6GB", "size": "6GB", "price": 26.80},
    {"name": "MTN 7GB", "size": "7GB", "price": 32.00},
    {"name": "MTN 8GB", "size": "8GB", "price": 34.80},
    {"name": "MTN 10GB", "size": "10GB", "price": 42.80},
    {"name": "MTN 15GB", "size": "15GB", "price": 61.30},
    {"name": "MTN 20GB", "size": "20GB", "price": 80.90},
    {"name": "MTN 25GB", "size": "25GB", "price": 101.00},
    {"name": "MTN 30GB", "size": "30GB", "price": 123.00},
    {"name": "MTN 40GB", "size": "40GB", "price": 162.00},
    {"name": "MTN 50GB", "size": "50GB", "price": 205.00},
]

@router.post("/populate-bundles")
def populate_bundles(db: Session = Depends(get_db)):
    """Populate database with MTN bundles"""
    try:
        # Clear existing bundles
        db.query(Bundle).delete()
        
        # Add MTN bundles
        for bundle_data in MTN_BUNDLES:
            bundle = Bundle(**bundle_data, network="MTN")
            db.add(bundle)
        
        db.commit()
        return {"message": f"Successfully populated {len(MTN_BUNDLES)} MTN bundles"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error populating bundles: {str(e)}")

@router.get("/dashboard")
def get_admin_dashboard(db: Session = Depends(get_db)):
    """Get admin dashboard statistics"""
    total_orders = db.query(Order).count()
    total_payments = db.query(Payment).count()
    pending_orders = db.query(Order).filter(Order.status == "pending").count()
    completed_payments = db.query(Payment).filter(Payment.status == "paid").count()
    
    return {
        "total_orders": total_orders,
        "total_payments": total_payments,
        "pending_orders": pending_orders,
        "completed_payments": completed_payments
    }

@router.get("/orders")
def get_all_orders(db: Session = Depends(get_db)):
    """Get all orders with bundle details"""
    return db.query(Order).all()

@router.get("/payments")
def get_all_payments(db: Session = Depends(get_db)):
    """Get all payments with order details"""
    return db.query(Payment).all()