from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Callable

from src.core.exceptions.base_exceptions import CoreException

logger = logging.getLogger(__name__)


async def error_handling_middleware(request: Request, call_next: Callable):
    """
    Middleware para tratamento padronizado de erros.

    Args:
        request: Requisição HTTP
        call_next: Próxima função a ser chamada

    Returns:
        Response: Resposta HTTP
    """
    try:
        return await call_next(request)
    except Exception as exc:
        # Registrar erro no log
        logger.exception(f"Erro não tratado: {str(exc)}")

        # Converter para resposta JSON padronizada
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Ocorreu um erro interno no servidor",
                    "details": {"path": request.url.path, "method": request.method},
                }
            },
        )


def register_exception_handlers(app):
    """
    Registra handlers para exceções específicas.

    Args:
        app: Aplicação FastAPI
    """

    @app.exception_handler(CoreException)
    async def pos_modern_exception_handler(request: Request, exc: CoreException):
        """Handler para exceções do POS Modern."""
        # Mapear códigos de erro para status HTTP
        status_code_map = {
            "VALIDATION_ERROR": status.HTTP_400_BAD_REQUEST,
            "RESOURCE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
            "AUTHORIZATION_ERROR": status.HTTP_403_FORBIDDEN,
            "EXTERNAL_SERVICE_ERROR": status.HTTP_502_BAD_GATEWAY,
            "DATABASE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "BUSINESS_RULE_VIOLATION": status.HTTP_422_UNPROCESSABLE_ENTITY,
        }

        status_code = status_code_map.get(
            exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR
        )

        # Registrar erro no log
        log_method = logger.warning if status_code < 500 else logger.error
        log_method(f"{exc.code}: {exc.message}", extra={"details": exc.details})

        return JSONResponse(status_code=status_code, content=exc.to_dict())

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        """Handler para erros de validação do FastAPI."""
        # Extrair detalhes dos erros
        details = {}
        for error in exc.errors():
            loc = ".".join([str(l) for l in error["loc"] if l != "body"])
            details[loc] = error["msg"]

        # Registrar erro no log
        logger.warning(f"Erro de validação: {details}")

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Erro de validação nos dados enviados",
                    "details": details,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Handler para exceções HTTP do Starlette."""
        # Registrar erro no log
        log_method = logger.warning if exc.status_code < 500 else logger.error
        log_method(f"HTTP {exc.status_code}: {exc.detail}")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "details": {},
                }
            },
        )
