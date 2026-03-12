from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from utils.db import get_db
from utils.auth import verify_admin_credentials, create_access_token, get_current_admin
from models.bundle_model import Bundle
from models.order_model import Order
from models.payment_model import Payment
from models.admin_setting_model import AdminSetting
from schemas.bundle_schema import BundleCreate
from typing import List, Dict
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["Admin"])

REVENUE_RESET_KEY = "revenue_reset_at"


def get_setting_value(db: Session, key: str):
    record = db.query(AdminSetting).filter(AdminSetting.key == key).first()
    return record.value if record else None


def set_setting_value(db: Session, key: str, value: str):
    record = db.query(AdminSetting).filter(AdminSetting.key == key).first()
    if not record:
        record = AdminSetting(key=key, value=value)
        db.add(record)
    else:
        record.value = value
    db.commit()
    db.refresh(record)
    return record


def parse_iso_datetime(value: str):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None

# Login request schema
class LoginRequest(BaseModel):
    username: str
    password: str

# Login response schema
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    message: str

# ==================== AUTH ENDPOINTS ====================

@router.post("/login", response_model=LoginResponse)
def admin_login(credentials: LoginRequest):
    """Admin login endpoint - No signup, only login with preset credentials"""
    if not verify_admin_credentials(credentials.username, credentials.password):
        raise HTTPException(
            status_code=401, 
            detail="Invalid username or password"
        )
    
    # Create JWT token
    access_token = create_access_token(credentials.username)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=credentials.username,
        message="Login successful"
    )

@router.get("/verify-token")
def verify_admin_token(current_admin: str = Depends(get_current_admin)):
    """Verify if the current token is valid"""
    return {
        "valid": True,
        "username": current_admin,
        "message": "Token is valid"
    }

@router.post("/logout")
def admin_logout():
    """Logout endpoint - Frontend will clear the token"""
    return {"message": "Logged out successfully"}

# ==================== PROTECTED ENDPOINTS ====================

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
def populate_bundles(db: Session = Depends(get_db), current_admin: str = Depends(get_current_admin)):
    """Populate database with MTN bundles (Protected)"""
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
def get_admin_dashboard(db: Session = Depends(get_db), current_admin: str = Depends(get_current_admin)):
    """Get admin dashboard statistics (Protected)"""
    revenue_reset_raw = get_setting_value(db, REVENUE_RESET_KEY)
    revenue_reset_at = parse_iso_datetime(revenue_reset_raw)

    paid_order_ids = [row[0] for row in db.query(Payment.order_id).filter(Payment.status == "paid").distinct().all()]

    total_orders = db.query(Order).filter(Order.id.in_(paid_order_ids)).count() if paid_order_ids else 0
    total_payments = db.query(Payment).filter(Payment.status == "paid").count()
    pending_orders = (
        db.query(Order)
        .filter(Order.id.in_(paid_order_ids), Order.status.in_(["paid", "processing"]))
        .count()
        if paid_order_ids
        else 0
    )
    completed_payments = db.query(Payment).filter(Payment.status == "paid").count()

    revenue_query = db.query(Payment).filter(Payment.status == "paid")
    if revenue_reset_at:
        revenue_query = revenue_query.filter(Payment.created_at >= revenue_reset_at)

    revenue_since_reset = sum((payment.amount or 0) for payment in revenue_query.all())
    
    return {
        "total_orders": total_orders,
        "total_payments": total_payments,
        "pending_orders": pending_orders,
        "completed_payments": completed_payments,
        "revenue_since_reset": revenue_since_reset,
        "revenue_reset_at": revenue_reset_raw
    }


@router.post("/revenue/reset")
def reset_revenue_counter(db: Session = Depends(get_db), current_admin: str = Depends(get_current_admin)):
    """Reset dashboard revenue counting baseline to now (Protected)"""
    now_iso = datetime.now(timezone.utc).isoformat()
    set_setting_value(db, REVENUE_RESET_KEY, now_iso)
    return {
        "message": "Revenue counter reset successfully",
        "revenue_reset_at": now_iso
    }


@router.post("/history/clear")
def clear_history(db: Session = Depends(get_db), current_admin: str = Depends(get_current_admin)):
    """Delete completed history records (paid payments and linked orders) (Protected)"""
    paid_order_ids = [row[0] for row in db.query(Payment.order_id).filter(Payment.status == "paid").distinct().all()]

    deleted_payments = db.query(Payment).filter(Payment.status == "paid").delete(synchronize_session=False)
    deleted_orders = 0

    if paid_order_ids:
        deleted_orders = (
            db.query(Order)
            .filter(Order.id.in_(paid_order_ids))
            .delete(synchronize_session=False)
        )

    db.commit()

    return {
        "message": "History cleared successfully",
        "deleted_payments": deleted_payments,
        "deleted_orders": deleted_orders
    }

@router.get("/orders")
def get_all_orders(db: Session = Depends(get_db), current_admin: str = Depends(get_current_admin)):
    """Get only orders with completed payments (Protected)"""
    paid_order_ids = [row[0] for row in db.query(Payment.order_id).filter(Payment.status == "paid").distinct().all()]
    if not paid_order_ids:
        return []

    return (
        db.query(Order)
        .filter(Order.id.in_(paid_order_ids))
        .order_by(Order.created_at.desc())
        .all()
    )

@router.get("/payments")
def get_all_payments(db: Session = Depends(get_db), current_admin: str = Depends(get_current_admin)):
    """Get only completed payments with order details (Protected)"""
    return (
        db.query(Payment)
        .filter(Payment.status == "paid")
        .order_by(Payment.created_at.desc())
        .all()
    )