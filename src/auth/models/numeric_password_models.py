from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
import re


class OperatorCredential(BaseModel):
    """Modelo para credenciais de operador com senha numérica."""

    id: str
    operator_id: str
    password_hash: str
    salt: str
    failed_attempts: int = 0
    last_failed_attempt: Optional[datetime] = None
    is_locked: bool = False
    lock_expiration: Optional[datetime] = None
    last_password_change: datetime
    created_at: datetime
    updated_at: datetime


class OperatorCredentialCreate(BaseModel):
    """Modelo para criação de credenciais de operador."""

    operator_id: str
    password: str = Field(..., min_length=6, max_length=6)

    @validator("password")
    def validate_numeric_password(cls, v):
        """Valida que a senha contém apenas dígitos numéricos."""
        if not re.match(r"^\d{6}$", v):
            raise ValueError("A senha deve conter exatamente 6 dígitos numéricos")

        # Verificar sequências óbvias
        if v in [
            "123456",
            "654321",
            "111111",
            "222222",
            "333333",
            "444444",
            "555555",
            "666666",
            "777777",
            "888888",
            "999999",
            "000000",
        ]:
            raise ValueError("Senha muito simples ou sequencial")

        return v


class OperatorCredentialUpdate(BaseModel):
    """Modelo para atualização de credenciais de operador."""

    current_password: str
    new_password: str = Field(..., min_length=6, max_length=6)

    @validator("new_password")
    def validate_numeric_password(cls, v):
        """Valida que a senha contém apenas dígitos numéricos."""
        if not re.match(r"^\d{6}$", v):
            raise ValueError("A senha deve conter exatamente 6 dígitos numéricos")

        # Verificar sequências óbvias
        if v in [
            "123456",
            "654321",
            "111111",
            "222222",
            "333333",
            "444444",
            "555555",
            "666666",
            "777777",
            "888888",
            "999999",
            "000000",
        ]:
            raise ValueError("Senha muito simples ou sequencial")

        return v


class OperatorCredentialReset(BaseModel):
    """Modelo para reset de senha de operador."""

    operator_id: str
    new_password: Optional[str] = Field(None, min_length=6, max_length=6)
    generate_temporary: bool = True

    @validator("new_password")
    def validate_numeric_password(cls, v):
        """Valida que a senha contém apenas dígitos numéricos."""
        if v is None:
            return v

        if not re.match(r"^\d{6}$", v):
            raise ValueError("A senha deve conter exatamente 6 dígitos numéricos")

        return v


class LoginRequest(BaseModel):
    """Modelo para solicitação de login."""

    operator_id: str
    password: str = Field(..., min_length=6, max_length=6)


class LoginResponse(BaseModel):
    """Modelo para resposta de login."""

    access_token: str
    token_type: str
    expires_in: int
    operator_id: str
    operator_name: str
    roles: List[str]
    permissions: List[str]
    require_password_change: bool = False


class AuthConfig(BaseModel):
    """Configurações de autenticação."""

    max_failed_attempts: int = 5
    lock_duration_minutes: int = 30
    session_expiry_minutes: int = 480  # 8 horas
    password_expiry_days: int = 90  # 3 meses


# Modelos adicionais para o repositório
class NumericPasswordCredentials(BaseModel):
    """Modelo para credenciais completas de senha numérica."""

    operator_id: str
    password_hash: str
    name: str
    role: str
    store_id: str
    terminal_id: str
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None


class AuthUser(BaseModel):
    """Modelo para usuário autenticado."""

    operator_id: str
    name: str
    role: str
    store_id: str
    terminal_id: str
    permissions: List[str] = []
    is_active: bool = True


class LoginAttempt(BaseModel):
    """Modelo para tentativa de login."""

    operator_id: str
    timestamp: datetime
    success: bool
    ip_address: Optional[str] = None
