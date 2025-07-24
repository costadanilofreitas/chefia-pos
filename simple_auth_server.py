#!/usr/bin/env python3
"""
Servidor simples de autenticação para teste de integração
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uvicorn

# Configurações
SECRET_KEY = "temporarysecretkey123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Contexto de criptografia
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

# Modelos
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class User(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    permissions: list[str]
    disabled: bool = False

class UserInDB(User):
    hashed_password: str

# Usuários de teste
fake_users_db = {
    "gerente": {
        "id": "1",
        "username": "gerente",
        "full_name": "Gerente Principal",
        "role": "gerente",
        "hashed_password": pwd_context.hash("senha123"),
        "permissions": [
            "produto:ler",
            "pedido:criar",
            "pedido:ler",
            "pedido:atualizar",
            "caixa:abrir",
            "caixa:fechar",
            "relatorio:ler"
        ],
        "disabled": False
    },
    "caixa": {
        "id": "2",
        "username": "caixa",
        "full_name": "Operador de Caixa",
        "role": "caixa",
        "hashed_password": pwd_context.hash("senha123"),
        "permissions": [
            "pedido:criar",
            "pedido:ler",
            "produto:ler",
            "caixa:abrir",
            "caixa:fechar"
        ],
        "disabled": False
    }
}

# Funções de autenticação
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, int(expire.timestamp())

async def get_current_user(token: str = Depends(oauth2_scheme)):
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
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=username)
    if user is None:
        raise credentials_exception
    return user

# Criar aplicação
app = FastAPI(
    title="POS Auth Service",
    description="Serviço de autenticação para teste",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints
@app.get("/")
async def root():
    return {"name": "POS Auth Service", "version": "1.0.0", "status": "online"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service", "timestamp": datetime.now().isoformat()}

@app.post("/api/v1/auth/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Endpoint para autenticação e obtenção de token JWT.
    """
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token, expires_timestamp = create_access_token(
        data={
            "sub": user.username, 
            "role": user.role, 
            "permissions": user.permissions
        },
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.get("/api/v1/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Retorna informações do usuário autenticado.
    """
    return current_user

@app.get("/api/v1/auth/verify-permission/{permission}")
async def verify_user_permission(
    permission: str,
    current_user: User = Depends(get_current_user)
):
    """
    Verifica se o usuário atual possui uma permissão específica.
    """
    if "all" in current_user.permissions or permission in current_user.permissions:
        return {"has_permission": True, "permission": permission}
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Usuário não possui a permissão: {permission}"
    )

if __name__ == "__main__":
    print("🚀 Iniciando servidor de autenticação...")
    print("📍 URL: http://localhost:8000")
    print("🔑 Credenciais de teste:")
    print("   - gerente / senha123")
    print("   - caixa / senha123")
    print("📋 Endpoints:")
    print("   - POST /api/v1/auth/token")
    print("   - GET /api/v1/auth/me")
    print("   - GET /api/v1/auth/verify-permission/{permission}")
    print("   - GET /health")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

