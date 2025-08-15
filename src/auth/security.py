from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any, Callable, Coroutine, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from src.auth.models import Permission, TokenData, UserInDB, UserRole

# Configurações de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "temporarysecretkey123456789")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Contexto de criptografia para senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Esquema OAuth2 para autenticação via token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

# Simulação de banco de dados de usuários (em produção, usar banco de dados real)
fake_users_db: Dict[str, Dict[str, Any]] = {
    "123": {
        "id": "1",
        "username": "123",
        "full_name": "Gerente Principal",
        "role": UserRole.MANAGER,
        "hashed_password": pwd_context.hash("456789"),
        "permissions": [
            Permission.PRODUCT_READ,
            Permission.PRODUCT_CREATE,
            Permission.PRODUCT_UPDATE,
            Permission.PRODUCT_DELETE,
            Permission.CATEGORY_READ,
            Permission.CATEGORY_CREATE,
            Permission.CATEGORY_UPDATE,
            Permission.CATEGORY_DELETE,
            Permission.ORDER_CREATE,
            Permission.ORDER_READ,
            Permission.ORDER_UPDATE,
            Permission.CASHIER_OPEN,
            Permission.CASHIER_CLOSE,
            Permission.DAY_OPEN,
            Permission.DAY_CLOSE,
            Permission.REPORTS_VIEW,
            "coupons.create",
            "coupons.read",
            "coupons.update",
            "coupons.delete",
            "campaigns.create",
            "campaigns.read",
            "campaigns.update",
            "campaigns.delete",
            "customers.create",
            "customers.read",
            "customers.update",
            "customers.delete",
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    },
    "456": {
        "id": "2",
        "username": "456",
        "full_name": "Administrador",
        "role": UserRole.ADMIN,
        "hashed_password": pwd_context.hash("123456"),
        "permissions": [
            Permission.PRODUCT_READ,
            Permission.PRODUCT_CREATE,
            Permission.ORDER_CREATE,
            Permission.ORDER_READ,
            Permission.ORDER_UPDATE,
            Permission.CASHIER_OPEN,
            Permission.CASHIER_CLOSE,
            Permission.REPORTS_VIEW,
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    },
    "789": {
        "id": "3",
        "username": "789",
        "full_name": "Operador de Caixa",
        "role": UserRole.CASHIER,
        "hashed_password": pwd_context.hash("654321"),
        "permissions": [
            Permission.ORDER_CREATE,
            Permission.ORDER_READ,
            Permission.PRODUCT_READ,
            Permission.CASHIER_OPEN,
            Permission.CASHIER_CLOSE,
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    },
    "111": {
        "id": "4",
        "username": "111",
        "full_name": "Garçom",
        "role": UserRole.WAITER,
        "hashed_password": pwd_context.hash("222333"),
        "permissions": [
            Permission.ORDER_CREATE,
            Permission.ORDER_READ,
            Permission.PRODUCT_READ,
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    },
    "555": {
        "id": "5",
        "username": "555",
        "full_name": "Cozinheiro",
        "role": UserRole.KITCHEN,
        "hashed_password": pwd_context.hash("666777"),
        "permissions": [Permission.ORDER_READ, Permission.ORDER_UPDATE],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    },
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Gera um hash para a senha."""
    return pwd_context.hash(password)


def get_user(db: Dict[str, Dict[str, Any]], username: str) -> Optional[UserInDB]:
    """Busca um usuário pelo nome de usuário."""
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None


def authenticate_user(
    db: Dict[str, Dict[str, Any]], username: str, password: str
) -> Optional[UserInDB]:
    """Autentica um usuário verificando nome de usuário e senha."""
    user = get_user(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> tuple[str, int]:
    """Cria um token JWT com os dados fornecidos e tempo de expiração."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, int(expire.timestamp())


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Obtém o usuário atual a partir do token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(
            username=username,
            role=payload.get("role"),
            permissions=payload.get("permissions", []),
        )
    except JWTError as e:
        raise credentials_exception from e
    username = token_data.username
    if username is None:
        raise credentials_exception
    user = get_user(fake_users_db, username=username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user),
) -> UserInDB:
    """Verifica se o usuário atual está ativo."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return current_user


def has_permission(
    required_permission: str,
) -> Callable[[UserInDB], Coroutine[Any, Any, UserInDB]]:
    """Verifica se o usuário tem a permissão necessária."""

    async def permission_dependency(
        current_user: UserInDB = Depends(get_current_active_user),
    ) -> UserInDB:
        if required_permission in current_user.permissions:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permissão insuficiente"
        )

    return permission_dependency


def has_role(
    required_role: UserRole,
) -> Callable[[UserInDB], Coroutine[Any, Any, UserInDB]]:
    """Verifica se o usuário tem o papel necessário."""

    async def role_dependency(
        current_user: UserInDB = Depends(get_current_active_user),
    ) -> UserInDB:
        if current_user.role == required_role or current_user.role == UserRole.MANAGER:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Papel {required_role} necessário",
        )

    return role_dependency
