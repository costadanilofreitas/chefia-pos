from __future__ import annotations

from typing import Dict, Any, Optional


class CoreException(Exception):
    """Exceção base para todas as exceções do sistema POS Modern."""

    def __init__(self, message: str, code: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            message: Mensagem de erro
            code: Código de erro (opcional)
            details: Detalhes adicionais do erro (opcional)
        """
        self.message = message
        self.code = code or "UNKNOWN_ERROR"
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Converte a exceção para um dicionário."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class ValidationException(CoreException):
    """Exceção para erros de validação de dados."""

    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            message: Mensagem de erro
            field: Campo que falhou na validação (opcional)
            details: Detalhes adicionais do erro (opcional)
        """
        _details = details or {}
        if field:
            _details["field"] = field

        super().__init__(message, "VALIDATION_ERROR", _details)


class ResourceNotFoundException(CoreException):
    """Exceção para recursos não encontrados."""

    def __init__(self, resource_type: str, resource_id: str, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            resource_type: Tipo do recurso não encontrado
            resource_id: ID do recurso não encontrado
            details: Detalhes adicionais do erro (opcional)
        """
        message = f"{resource_type} com ID {resource_id} não encontrado"
        _details = details or {}
        _details.update({"resource_type": resource_type, "resource_id": resource_id})

        super().__init__(message, "RESOURCE_NOT_FOUND", _details)


class AuthorizationException(CoreException):
    """Exceção para erros de autorização."""

    def __init__(self, message: str = "Acesso não autorizado", details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            message: Mensagem de erro
            details: Detalhes adicionais do erro (opcional)
        """
        super().__init__(message, "AUTHORIZATION_ERROR", details)


class ExternalServiceException(CoreException):
    """Exceção para erros em serviços externos."""

    def __init__(self, service_name: str, message: str, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            service_name: Nome do serviço externo
            message: Mensagem de erro
            details: Detalhes adicionais do erro (opcional)
        """
        _message = f"Erro no serviço externo {service_name}: {message}"
        _details = details or {}
        _details["service_name"] = service_name

        super().__init__(_message, "EXTERNAL_SERVICE_ERROR", _details)


class DatabaseException(CoreException):
    """Exceção para erros de banco de dados."""

    def __init__(self, message: str, operation: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            message: Mensagem de erro
            operation: Operação que falhou (opcional)
            details: Detalhes adicionais do erro (opcional)
        """
        _details = details or {}
        if operation:
            _details["operation"] = operation

        super().__init__(message, "DATABASE_ERROR", _details)


class BusinessRuleException(CoreException):
    """Exceção para violações de regras de negócio."""

    def __init__(self, message: str, rule: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Inicializa a exceção.

        Args:
            message: Mensagem de erro
            rule: Regra de negócio violada (opcional)
            details: Detalhes adicionais do erro (opcional)
        """
        _details = details or {}
        if rule:
            _details["rule"] = rule

        super().__init__(message, "BUSINESS_RULE_VIOLATION", _details)
