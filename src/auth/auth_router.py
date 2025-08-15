from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.auth.models import Permission, Token, User, UserRole
from src.auth.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    fake_users_db,
    get_current_active_user,
    has_role,
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
    responses={401: {"description": "Não autorizado"}},
)


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Endpoint para autenticação e obtenção de token JWT.

    - **username**: Nome de usuário
    - **password**: Senha

    Retorna um token JWT válido para autenticação nas APIs.
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
        data={"sub": user.username, "role": user.role, "permissions": user.permissions},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "operator_id": user.username,
        "operator_name": user.full_name,
        "roles": [user.role],
        "permissions": user.permissions,
        "require_password_change": False,
    }


@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """
    Verifica se o token JWT ainda é válido.

    Retorna informações do usuário se o token for válido.
    Usado para verificar persistência de login após reload.
    """
    return {
        "valid": True,
        "operator_id": current_user.username,
        "operator_name": current_user.full_name,
        "role": current_user.role,
        "permissions": current_user.permissions,
        "message": "Token válido",
    }


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Retorna informações do usuário autenticado.

    Requer autenticação via token JWT.
    """
    return current_user


@router.get("/verify-permission/{permission}")
async def verify_user_permission(
    permission: str, current_user: User = Depends(get_current_active_user)
):
    """
    Verifica se o usuário atual possui uma permissão específica.

    - **permission**: Permissão a ser verificada

    Retorna status 200 se o usuário tem a permissão, ou 403 se não tem.
    """
    if (
        Permission.ALL in current_user.permissions
        or permission in current_user.permissions
    ):
        return {"has_permission": True, "permission": permission}
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Usuário não possui a permissão: {permission}",
    )


@router.get("/verify-role/{role}")
async def verify_user_role(
    role: UserRole, current_user: User = Depends(get_current_active_user)
):
    """
    Verifica se o usuário atual possui um papel específico.

    - **role**: Papel a ser verificado

    Retorna status 200 se o usuário tem o papel, ou 403 se não tem.
    """
    if current_user.role == role or current_user.role == UserRole.MANAGER:
        return {"has_role": True, "role": role}
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Usuário não possui o papel: {role}",
    )


# Exemplo de rota protegida por permissão
# @router.get("/protected-by-permission")
# async def protected_by_permission(
#     current_user: User = Depends(has_permission(Permission.REPORT_READ))
# ):
#     """
#     Exemplo de endpoint protegido por permissão específica.
#
#     Requer a permissão REPORT_READ.
#     """
#     return {"message": "Você tem acesso a este recurso protegido por permissão"}


# Exemplo de rota protegida por papel
@router.get("/protected-by-role")
async def protected_by_role(current_user: User = Depends(has_role(UserRole.MANAGER))):
    """
    Exemplo de endpoint protegido por papel específico.

    Requer o papel de MANAGER.
    """
    return {"message": "Você tem acesso a este recurso protegido por papel"}
