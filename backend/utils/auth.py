from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from utils.config import ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS

# Security scheme for JWT
security = HTTPBearer()

def verify_admin_credentials(username: str, password: str) -> bool:
    """Verify admin username and password"""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def create_access_token(username: str) -> str:
    """Create JWT access token"""
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": username,
        "exp": expiration,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Verify JWT token and return username"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_admin(token: str = Depends(verify_token)) -> str:
    """Dependency to get current authenticated admin"""
    return token
