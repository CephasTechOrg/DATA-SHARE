from sqlalchemy import Column, Integer, String, Float
from utils.db import Base

class Bundle(Base):
    __tablename__ = "bundles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    size = Column(String)
    price = Column(Float)
    network = Column(String, default="MTN")