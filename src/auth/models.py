from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    MANAGER = "gerente"
    CASHIER = "caixa"
    WAITER = "garcom"
    COOK = "cozinheiro"


class Permission(str, Enum):
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
    
    # Permissao especial
    ALL = "all"


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, example="caixa01")
    full_name: str = Field(..., min_length=3, max_length=100, example="João da Silva")
    role: UserRole = Field(..., example=UserRole.CASHIER)
    disabled: bool = Field(False, example=False)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, example="senha123")


class User(UserBase):
    id: str
    permissions: List[str] = []

    class Config:
        orm_mode = True


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    permissions: List[str] = []

