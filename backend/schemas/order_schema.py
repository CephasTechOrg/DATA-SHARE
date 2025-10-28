 
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    bundle_id: int
    customer_name: str
    phone_number: str

class OrderResponse(OrderCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True