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

