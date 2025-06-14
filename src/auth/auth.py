from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from src.auth.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Função para obter o usuário atual a partir do token de autenticação.
    
    Esta é uma implementação simplificada para testes e desenvolvimento.
    Em produção, deve validar o token JWT e buscar o usuário no banco de dados.
    """
    # Usuário simulado para testes
    return User(
        id="test_user_id",
        username="test_user",
        full_name="Test User",
        role=UserRole.MANAGER,
        permissions=["all"]
    )
