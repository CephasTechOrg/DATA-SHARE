# backend/reset_db.py
from utils.db import engine, Base
from models.bundle_model import Bundle
from models.order_model import Order
from models.payment_model import Payment

def reset_database():
    try:
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        print("✅ Dropped all tables")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Created all tables")
        
        # Add sample MTN bundles
        from sqlalchemy.orm import Session
        
        mtn_bundles = [
            {"name": "MTN 1GB", "size": "1GB", "price": 5.40, "network": "MTN"},
            {"name": "MTN 2GB", "size": "2GB", "price": 9.80, "network": "MTN"},
            {"name": "MTN 3GB", "size": "3GB", "price": 13.90, "network": "MTN"},
            {"name": "MTN 4GB", "size": "4GB", "price": 18.80, "network": "MTN"},
            {"name": "MTN 5GB", "size": "5GB", "price": 23.30, "network": "MTN"},
        ]
        
        with Session(engine) as session:
            for bundle_data in mtn_bundles:
                bundle = Bundle(**bundle_data)
                session.add(bundle)
            session.commit()
            print(f"✅ Added {len(mtn_bundles)} sample bundles")
            
    except Exception as e:
        print(f"❌ Error resetting database: {e}")

if __name__ == "__main__":
    reset_database()