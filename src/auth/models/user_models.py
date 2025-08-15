from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel

# Importar modelos existentes


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

    # Categorias
    CATEGORY_CREATE = "category:create"
    CATEGORY_READ = "category:read"
    CATEGORY_UPDATE = "category:update"
    CATEGORY_DELETE = "category:delete"

    # Menus/Cardápios
    MENU_CREATE = "menu:create"
    MENU_READ = "menu:read"
    MENU_UPDATE = "menu:update"
    MENU_DELETE = "menu:delete"

    # Pedidos
    ORDER_CREATE = "order:create"
    ORDER_READ = "order:read"
    ORDER_UPDATE = "order:update"
    ORDER_DELETE = "order:delete"

    # Caixa
    CASHIER_OPEN = "cashier:open"
    CASHIER_CLOSE = "cashier:close"
    CASHIER_WITHDRAW = "cashier:withdraw"

    # Dia
    DAY_OPEN = "day:open"
    DAY_CLOSE = "day:close"

    # Relatorios
    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"
    REPORT_READ = "report:read"

    # Administracao
    ADMIN_USERS = "admin:users"
    ADMIN_SETTINGS = "admin:settings"

    # Cupons
    COUPONS_CREATE = "coupons.create"
    COUPONS_READ = "coupons.read"
    COUPONS_UPDATE = "coupons.update"
    COUPONS_DELETE = "coupons.delete"

    # Campanhas
    CAMPAIGNS_CREATE = "campaigns.create"
    CAMPAIGNS_READ = "campaigns.read"
    CAMPAIGNS_UPDATE = "campaigns.update"
    CAMPAIGNS_DELETE = "campaigns.delete"

    # Clientes
    CUSTOMERS_CREATE = "customers.create"
    CUSTOMERS_READ = "customers.read"
    CUSTOMERS_UPDATE = "customers.update"
    CUSTOMERS_DELETE = "customers.delete"

    # Usuarios
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"

    # Vendas
    SALE_CREATE = "sale:create"
    SALE_READ = "sale:read"
    SALE_UPDATE = "sale:update"
    SALE_DELETE = "sale:delete"

    # Permissao especial
    ALL = "all"


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
    password: Optional[str] = None


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
