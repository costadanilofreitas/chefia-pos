# Modelos de autenticação
from .numeric_password_models import (
    AuthConfig,
    LoginRequest,
    LoginResponse,
    OperatorCredential,
    OperatorCredentialCreate,
    OperatorCredentialReset,
    OperatorCredentialUpdate,
)
from .user_models import (
    Permission,
    Token,
    TokenData,
    TokenPayload,
    User,
    UserCreate,
    UserInDB,
    UserRole,
    UserUpdate,
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
    "AuthConfig",
]
