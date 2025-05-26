from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class UserRole(str, Enum):
    MANAGER = "gerente"
    CASHIER = "caixa"
    WAITER = "garcom"
    COOK = "cozinheiro"


class Permission(str, Enum):
    # Vendas
    SALE_CREATE = "venda:criar"
    SALE_READ = "venda:ler"
    SALE_UPDATE = "venda:atualizar"
    SALE_DELETE = "venda:deletar"
    
    # Produtos
    PRODUCT_CREATE = "produto:criar"
    PRODUCT_READ = "produto:ler"
    PRODUCT_UPDATE = "produto:atualizar"
    PRODUCT_DELETE = "produto:deletar"
    
    # Caixa
    CASHIER_OPEN = "caixa:abrir"
    CASHIER_CLOSE = "caixa:fechar"
    CASHIER_WITHDRAW = "caixa:retirar"
    
    # Dia
    DAY_OPEN = "dia:abrir"
    DAY_CLOSE = "dia:fechar"
    
    # Pedidos
    ORDER_CREATE = "pedido:criar"
    ORDER_READ = "pedido:ler"
    ORDER_UPDATE = "pedido:atualizar"
    
    # Relatórios
    REPORT_READ = "relatorio:ler"
    
    # Usuários
    USER_CREATE = "usuario:criar"
    USER_READ = "usuario:ler"
    USER_UPDATE = "usuario:atualizar"
    USER_DELETE = "usuario:deletar"
    
    # Permissão especial
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
