from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship
from utils.db import Base

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    bundle_id = Column(Integer, ForeignKey("bundles.id"))
    customer_name = Column(String)
    recipient_phone = Column(String)  # Phone number to receive the data bundle
    payer_phone = Column(String)      # Phone number for MoMo payment
    email = Column(String, nullable=True)  # Optional email
    payment_reference = Column(String, nullable=True, unique=True)  # Paystack reference
    status = Column(String, default="pending")  # pending, paid, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    bundle = relationship("Bundle")