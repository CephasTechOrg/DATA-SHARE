from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routes import bundle_routes, order_routes, payment_routes, admin_routes
from utils.db import engine, Base
from sqlalchemy import text  # Add this import
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(
    title="Data Reseller API", 
    version="1.0",
    description="Backend API for Data Reseller operations with MTN bundle integration"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes with API prefix
app.include_router(bundle_routes.router, prefix="/api")
app.include_router(order_routes.router, prefix="/api")
app.include_router(payment_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Welcome to DataReseller Backend API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "DataReseller API"}

@app.get("/api/health")
def api_health_check():
    return {"status": "healthy", "service": "DataReseller API"}

# Test database connection - FIXED
@app.get("/api/test-db")
def test_db():
    try:
        with engine.connect() as conn:
            # Use text() for raw SQL queries in SQLAlchemy 2.0
            conn.execute(text("SELECT 1"))
        return {"status": "success", "message": "Database connection working"}
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    

    # ------------------ Frontend Section ------------------

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Serve customer and admin frontend
app.mount("/static/customer", StaticFiles(directory="../frontend/customer"), name="customer_static")
app.mount("/static/admin", StaticFiles(directory="../frontend/admin"), name="admin_static")

@app.get("/customer")
async def read_customer_index():
    return FileResponse('../frontend/customer/index.html')

@app.get("/admin")
async def read_admin_index():
    return FileResponse('../frontend/admin/index.html')