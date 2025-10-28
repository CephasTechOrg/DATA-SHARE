from utils.db import engine
from sqlalchemy import text

def test_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_tables():
    try:
        with engine.connect() as conn:
            # Check if bundles table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'bundles'
                );
            """))
            table_exists = result.scalar()
            if table_exists:
                print("✅ Bundles table exists")
            else:
                print("❌ Bundles table does not exist")
            
            return table_exists
    except Exception as e:
        print(f"❌ Error checking tables: {e}")
        return False

if __name__ == "__main__":
    print("Testing database connection...")
    test_connection()
    test_tables()