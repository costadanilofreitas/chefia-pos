from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from datetime import datetime

# Importar modelos existentes
from .numeric_password_models import (
    OperatorCredential,
    OperatorCredentialCreate,
    OperatorCredentialUpdate,
    OperatorCredentialReset,
    LoginRequest,
    LoginResponse,
    AuthConfig
)

class UserRole(str, Enum):
    """Roles de usuário no sistema."""
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"
    WAITER = "waiter"
    KITCHEN = "kitchen"

class Permission(str, Enum):
    """Permissões do sistema."""
    # Produtos
    PRODUCT_CREATE = "product:create"
    PRODUCT_READ = "product:read"
    PRODUCT_UPDATE = "product:update"
    PRODUCT_DELETE = "product:delete"
    
    # Pedidos
    ORDER_CREATE = "order:create"
    ORDER_READ = "order:read"
    ORDER_UPDATE = "order:update"
    ORDER_DELETE = "order:delete"
    
    # Caixa
    CASHIER_OPEN = "cashier:open"
    CASHIER_CLOSE = "cashier:close"
    CASHIER_WITHDRAW = "cashier:withdraw"
    
    # Dia operacional
    DAY_OPEN = "day:open"
    DAY_CLOSE = "day:close"
    
    # Relatórios
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"
    
    # Administração
    ADMIN_USERS = "admin:users"
    ADMIN_SETTINGS = "admin:settings"

class User(BaseModel):
    """Modelo base de usuário."""
    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole
    permissions: List[Permission] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class UserInDB(User):
    """Usuário com senha hash (para uso interno)."""
    hashed_password: str

class UserCreate(BaseModel):
    """Modelo para criação de usuário."""
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: str
    role: UserRole
    permissions: List[Permission] = []

class UserUpdate(BaseModel):
    """Modelo para atualização de usuário."""
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    permissions: Optional[List[Permission]] = None
    is_active: Optional[bool] = None

class TokenData(BaseModel):
    """Dados do token JWT."""
    username: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[UserRole] = None
    permissions: List[Permission] = []

class Token(BaseModel):
    """Token de acesso."""
    access_token: str
    token_type: str
    expires_in: int

class TokenPayload(BaseModel):
    """Payload do token JWT."""
    sub: str  # user_id
    username: str
    role: UserRole
    permissions: List[str]
    exp: int
    iat: int

