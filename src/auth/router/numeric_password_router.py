from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, Any, Optional
import os

from ..models.numeric_password_models import (
    LoginRequest,
    LoginResponse,
    OperatorCredentialCreate,
    OperatorCredentialUpdate,
    OperatorCredentialReset,
    AuthConfig,
)
from ..services.numeric_password_service import NumericPasswordService


# Dependências
def get_numeric_password_service():
    # Em produção, injetar dependências reais
    from ..repositories.numeric_password_repository import NumericPasswordRepository

    repository = NumericPasswordRepository()
    config = AuthConfig(
        max_failed_attempts=int(os.getenv("MAX_FAILED_ATTEMPTS", "5")),
        lock_duration_minutes=int(os.getenv("LOCK_DURATION_MINUTES", "30")),
        session_expiry_minutes=int(os.getenv("SESSION_EXPIRY_MINUTES", "480")),
        password_expiry_days=int(os.getenv("PASSWORD_EXPIRY_DAYS", "90")),
    )
    return NumericPasswordService(repository=repository, config=config)


# Criar router
router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    service: NumericPasswordService = Depends(get_numeric_password_service),
):
    """Autentica um operador com senha numérica."""
    try:
        return await service.authenticate(login_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/credentials", response_model=Dict[str, Any])
async def create_credential(
    credential_data: OperatorCredentialCreate,
    service: NumericPasswordService = Depends(get_numeric_password_service),
):
    """Cria uma nova credencial para um operador."""
    try:
        credential = await service.create_credential(credential_data)
        return {
            "message": "Credencial criada com sucesso",
            "operator_id": credential.operator_id,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/credentials/{operator_id}/password", response_model=Dict[str, Any])
async def update_password(
    operator_id: str,
    update_data: OperatorCredentialUpdate,
    service: NumericPasswordService = Depends(get_numeric_password_service),
):
    """Atualiza a senha de um operador."""
    try:
        credential = await service.update_password(operator_id, update_data)
        return {
            "message": "Senha atualizada com sucesso",
            "operator_id": credential.operator_id,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/credentials/{operator_id}/reset", response_model=Dict[str, Any])
async def reset_password(
    operator_id: str,
    reset_data: Optional[OperatorCredentialReset] = Body(None),
    service: NumericPasswordService = Depends(get_numeric_password_service),
):
    """Reseta a senha de um operador."""
    if reset_data is None:
        reset_data = OperatorCredentialReset(operator_id=operator_id)
    else:
        reset_data.operator_id = operator_id

    try:
        result = await service.reset_password(reset_data)
        response = {"message": "Senha resetada com sucesso", "operator_id": operator_id}

        if result["temporary_password"]:
            response["temporary_password"] = result["temporary_password"]

        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/config", response_model=AuthConfig)
async def get_auth_config(
    service: NumericPasswordService = Depends(get_numeric_password_service),
):
    """Obtém as configurações de autenticação."""
    return service.config
