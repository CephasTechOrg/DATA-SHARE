import os
from dotenv import load_dotenv

# Load .env only in development (will be None/empty on Render)
if os.getenv('ENV') != 'production':
    load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Paystack
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY")

# SMS
SMS_API_KEY = os.getenv("SMS_API_KEY")
SMS_API_URL = os.getenv("SMS_API_URL")
SENDER_ID = os.getenv("SENDER_ID")

# Admin Authentication
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24  # Token expires after 24 hours
