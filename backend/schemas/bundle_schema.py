from pydantic import BaseModel
from typing import Optional

class BundleCreate(BaseModel):
    name: str
    size: str
    price: float
    network: Optional[str] = "MTN"

class BundleResponse(BundleCreate):
    id: int

    class Config:
        from_attributes = True