# Modelos de autenticação
from .user_models import (
    User,
    UserInDB,
    UserCreate,
    UserUpdate,
    UserRole,
    Permission,
    TokenData,
    Token,
    TokenPayload
)

from .numeric_password_models import (
    OperatorCredential,
    OperatorCredentialCreate,
    OperatorCredentialUpdate,
    OperatorCredentialReset,
    LoginRequest,
    LoginResponse,
    AuthConfig
)

from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from datetime import datetime

# User roles
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"
    WAITER = "waiter"
    COOK = "cook"

# Permissions
class Permission(str, Enum):
    # Special permissions
    ALL = "*"
    
    # Product permissions
    PRODUCT_READ = "product:read"
    PRODUCT_WRITE = "product:write"
    PRODUCT_DELETE = "product:delete"
    
    # Order permissions
    ORDER_READ = "order:read"
    ORDER_WRITE = "order:write"
    ORDER_DELETE = "order:delete"
    ORDER_CREATE = "order:create"
    ORDER_UPDATE = "order:update"
    
    # Sale permissions
    SALE_CREATE = "sale:create"
    SALE_READ = "sale:read"
    
    # Cashier permissions
    CASHIER_OPEN = "cashier:open"
    CASHIER_CLOSE = "cashier:close"
    
    # User permissions
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    
    # Report permissions
    REPORT_READ = "report:read"
    REPORT_WRITE = "report:write"
    
    # System permissions
    SYSTEM_CONFIG = "system:config"

# Base user model
class User(BaseModel):
    operator_id: str
    name: str
    role: UserRole
    permissions: List[Permission] = []
    is_active: bool = True

# User in database (with password hash)
class UserInDB(User):
    password_hash: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

# Token data
class TokenData(BaseModel):
    operator_id: Optional[str] = None
    permissions: List[str] = []

# Export all models
__all__ = [
    # User models
    "User",
    "UserInDB", 
    "UserCreate",
    "UserUpdate",
    "UserRole",
    "Permission",
    "TokenData",
    "Token",
    "TokenPayload",
    
    # Operator models
    "OperatorCredential",
    "OperatorCredentialCreate",
    "OperatorCredentialUpdate", 
    "OperatorCredentialReset",
    "LoginRequest",
    "LoginResponse",
    "AuthConfig"
]

