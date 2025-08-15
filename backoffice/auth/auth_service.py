from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid

from ..models.backoffice_models import BackofficeUser, UserRole, Permission

# Configuration
SECRET_KEY = "YOUR_SECRET_KEY_HERE"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 token URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Mock database for users (replace with actual database in production)
users_db = {}

def verify_password(plain_password, hashed_password):
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate a password hash."""
    return pwd_context.hash(password)

def get_user(username: str):
    """Get a user by username."""
    if username in users_db:
        user_dict = users_db[username]
        return BackofficeUser(**user_dict)
    return None

def authenticate_user(username: str, password: str):
    """Authenticate a user."""
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create an access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get the current user from the token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        raise credentials_exception from e
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: BackofficeUser = Depends(get_current_user)):
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def has_permission(user: BackofficeUser, permission: Permission):
    """Check if a user has a specific permission."""
    return permission in user.permissions

def has_role(user: BackofficeUser, role: UserRole):
    """Check if a user has a specific role."""
    return user.role == role

def has_brand_access(user: BackofficeUser, brand_id: uuid.UUID):
    """Check if a user has access to a specific brand."""
    # Admin has access to all brands
    if user.role == UserRole.ADMIN:
        return True
    # User is restricted to a specific brand
    if user.brand_id:
        return user.brand_id == brand_id
    # User has no brand restrictions
    return True

def has_restaurant_access(user: BackofficeUser, restaurant_id: uuid.UUID):
    """Check if a user has access to a specific restaurant."""
    # Admin has access to all restaurants
    if user.role == UserRole.ADMIN:
        return True
    # User is restricted to specific restaurants
    if user.restaurant_ids:
        return restaurant_id in user.restaurant_ids
    # User has no restaurant restrictions
    return True

def require_permission(permission: Permission):
    """Dependency to require a specific permission."""
    async def permission_dependency(current_user: BackofficeUser = Depends(get_current_active_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions: {permission} required"
            )
        return current_user
    return permission_dependency

def require_role(role: UserRole):
    """Dependency to require a specific role."""
    async def role_dependency(current_user: BackofficeUser = Depends(get_current_active_user)):
        if not has_role(current_user, role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions: {role} role required"
            )
        return current_user
    return role_dependency

def require_brand_access(brand_id: uuid.UUID):
    """Dependency to require access to a specific brand."""
    async def brand_dependency(current_user: BackofficeUser = Depends(get_current_active_user)):
        if not has_brand_access(current_user, brand_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not authorized to access this brand"
            )
        return current_user
    return brand_dependency

def require_restaurant_access(restaurant_id: uuid.UUID):
    """Dependency to require access to a specific restaurant."""
    async def restaurant_dependency(current_user: BackofficeUser = Depends(get_current_active_user)):
        if not has_restaurant_access(current_user, restaurant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not authorized to access this restaurant"
            )
        return current_user
    return restaurant_dependency
