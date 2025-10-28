 
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from utils.db import Base

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    amount = Column(Float)
    method = Column(String)
    status = Column(String, default="unpaid")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    order = relationship("Order")