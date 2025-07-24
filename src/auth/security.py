from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.auth.models import UserInDB, TokenData, UserRole, Permission

# Configurações de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "temporarysecretkey123456789")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Contexto de criptografia para senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Esquema OAuth2 para autenticação via token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

# Simulação de banco de dados de usuários (em produção, usar banco de dados real)
fake_users_db = {
    "gerente": {
        "id": "1",
        "username": "gerente",
        "full_name": "Gerente Principal",
        "role": UserRole.MANAGER,
        "hashed_password": pwd_context.hash("senha123"),
        "permissions": [
            Permission.PRODUCT_READ,
            Permission.PRODUCT_CREATE,
            Permission.ORDER_CREATE,
            Permission.ORDER_READ,
            Permission.ORDER_UPDATE,
            Permission.CASHIER_OPEN,
            Permission.CASHIER_CLOSE,
            Permission.REPORTS_VIEW
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    "caixa": {
        "id": "2",
        "username": "caixa",
        "full_name": "Operador de Caixa",
        "role": UserRole.CASHIER,
        "hashed_password": pwd_context.hash("senha123"),
        "permissions": [
            Permission.ORDER_CREATE,
            Permission.ORDER_READ,
            Permission.PRODUCT_READ,
            Permission.CASHIER_OPEN,
            Permission.CASHIER_CLOSE
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    "garcom": {
        "id": "3",
        "username": "garcom",
        "full_name": "Garçom",
        "role": UserRole.WAITER,
        "hashed_password": pwd_context.hash("senha123"),
        "permissions": [
            Permission.ORDER_CREATE, 
            Permission.ORDER_READ, 
            Permission.PRODUCT_READ
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    "cozinheiro": {
        "id": "4",
        "username": "cozinheiro",
        "full_name": "Cozinheiro",
        "role": UserRole.KITCHEN,
        "hashed_password": pwd_context.hash("senha123"),
        "permissions": [
            Permission.ORDER_READ, 
            Permission.ORDER_UPDATE
        ],
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
}


def verify_password(plain_password, hashed_password):
    """Verifica se a senha em texto plano corresponde ao hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """Gera um hash para a senha."""
    return pwd_context.hash(password)


def get_user(db, username: str):
    """Busca um usuário pelo nome de usuário."""
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None


def authenticate_user(db, username: str, password: str):
    """Autentica um usuário verificando nome de usuário e senha."""
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Cria um token JWT com os dados fornecidos e tempo de expiração."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, int(expire.timestamp())


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Obtém o usuário atual a partir do token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(
            username=username, 
            role=payload.get("role"),
            permissions=payload.get("permissions", [])
        )
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    """Verifica se o usuário atual está ativo."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return current_user


def has_permission(required_permission: str):
    """Verifica se o usuário tem a permissão necessária."""
    async def permission_dependency(current_user: UserInDB = Depends(get_current_active_user)):
        if required_permission in current_user.permissions:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente"
        )
    return permission_dependency


def has_role(required_role: UserRole):
    """Verifica se o usuário tem o papel necessário."""
    async def role_dependency(current_user: UserInDB = Depends(get_current_active_user)):
        if current_user.role == required_role or current_user.role == UserRole.MANAGER:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Papel {required_role} necessário"
        )
    return role_dependency
