 
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    bundle_id: int
    customer_name: str
    recipient_phone: str  # Phone to receive the bundle
    payer_phone: str      # Phone for MoMo payment
    email: Optional[str] = None  # Optional email

class OrderResponse(BaseModel):
    id: int
    bundle_id: int
    customer_name: str
    recipient_phone: str
    payer_phone: str
    email: Optional[str] = None
    payment_reference: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True