# Refatoração de Alta Prioridade - Tratamento de Erros

## Visão Geral
Este documento detalha a implementação de um sistema padronizado de tratamento de erros para o POS Modern, garantindo consistência, rastreabilidade e melhor experiência do usuário em todos os módulos.

## Objetivos
- Padronizar o tratamento de exceções em todos os módulos
- Melhorar a qualidade das mensagens de erro para usuários finais
- Facilitar o diagnóstico de problemas através de logs estruturados
- Aumentar a robustez do sistema em cenários de falha

## Implementação

### 1. Hierarquia de Exceções

```python
# src/core/exceptions/base_exceptions.py

class POSModernException(Exception):
    """Exceção base para todas as exceções do sistema POS Modern."""
    
    def __init__(self, message: str, code: str = None, details: dict = None):
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
    
    def to_dict(self) -> dict:
        """Converte a exceção para um dicionário."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }


class ValidationException(POSModernException):
    """Exceção para erros de validação de dados."""
    
    def __init__(self, message: str, field: str = None, details: dict = None):
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


class ResourceNotFoundException(POSModernException):
    """Exceção para recursos não encontrados."""
    
    def __init__(self, resource_type: str, resource_id: str, details: dict = None):
        """
        Inicializa a exceção.
        
        Args:
            resource_type: Tipo do recurso não encontrado
            resource_id: ID do recurso não encontrado
            details: Detalhes adicionais do erro (opcional)
        """
        message = f"{resource_type} com ID {resource_id} não encontrado"
        _details = details or {}
        _details.update({
            "resource_type": resource_type,
            "resource_id": resource_id
        })
        
        super().__init__(message, "RESOURCE_NOT_FOUND", _details)


class AuthorizationException(POSModernException):
    """Exceção para erros de autorização."""
    
    def __init__(self, message: str = "Acesso não autorizado", details: dict = None):
        """
        Inicializa a exceção.
        
        Args:
            message: Mensagem de erro
            details: Detalhes adicionais do erro (opcional)
        """
        super().__init__(message, "AUTHORIZATION_ERROR", details)


class ExternalServiceException(POSModernException):
    """Exceção para erros em serviços externos."""
    
    def __init__(self, service_name: str, message: str, details: dict = None):
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


class DatabaseException(POSModernException):
    """Exceção para erros de banco de dados."""
    
    def __init__(self, message: str, operation: str = None, details: dict = None):
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


class BusinessRuleException(POSModernException):
    """Exceção para violações de regras de negócio."""
    
    def __init__(self, message: str, rule: str = None, details: dict = None):
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
```

### 2. Middleware para FastAPI

```python
# src/core/middleware/error_handling.py

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Callable, Dict, Any

from src.core.exceptions.base_exceptions import POSModernException

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
                    "details": {
                        "path": request.url.path,
                        "method": request.method
                    }
                }
            }
        )

def register_exception_handlers(app):
    """
    Registra handlers para exceções específicas.
    
    Args:
        app: Aplicação FastAPI
    """
    @app.exception_handler(POSModernException)
    async def pos_modern_exception_handler(request: Request, exc: POSModernException):
        """Handler para exceções do POS Modern."""
        # Mapear códigos de erro para status HTTP
        status_code_map = {
            "VALIDATION_ERROR": status.HTTP_400_BAD_REQUEST,
            "RESOURCE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
            "AUTHORIZATION_ERROR": status.HTTP_403_FORBIDDEN,
            "EXTERNAL_SERVICE_ERROR": status.HTTP_502_BAD_GATEWAY,
            "DATABASE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "BUSINESS_RULE_VIOLATION": status.HTTP_422_UNPROCESSABLE_ENTITY
        }
        
        status_code = status_code_map.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Registrar erro no log
        log_method = logger.warning if status_code < 500 else logger.error
        log_method(f"{exc.code}: {exc.message}", extra={"details": exc.details})
        
        return JSONResponse(
            status_code=status_code,
            content=exc.to_dict()
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
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
                    "details": details
                }
            }
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
                    "details": {}
                }
            }
        )
```

### 3. Utilitário de Logging Estruturado

```python
# src/core/utils/logging_utils.py

import logging
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

class StructuredLogFormatter(logging.Formatter):
    """Formatador para logs estruturados em JSON."""
    
    def format(self, record):
        """
        Formata o registro de log como JSON estruturado.
        
        Args:
            record: Registro de log
            
        Returns:
            str: Log formatado como JSON
        """
        log_data = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Adicionar informações de exceção se disponíveis
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }
        
        # Adicionar detalhes extras se disponíveis
        if hasattr(record, "details") and record.details:
            log_data["details"] = record.details
        
        return json.dumps(log_data)

def configure_logging(log_level: str = "INFO", log_file: Optional[str] = None):
    """
    Configura o sistema de logging.
    
    Args:
        log_level: Nível de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Caminho para o arquivo de log (opcional)
    """
    # Converter string de nível para constante do logging
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Criar formatador estruturado
    formatter = StructuredLogFormatter()
    
    # Configurar handler para console
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    # Configurar handlers
    handlers = [console_handler]
    
    # Adicionar handler para arquivo se especificado
    if log_file:
        # Garantir que o diretório existe
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)
    
    # Configurar logger raiz
    logging.basicConfig(
        level=numeric_level,
        handlers=handlers,
        force=True
    )
    
    # Configurar loggers de bibliotecas externas
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)

def log_with_context(logger, level: str, message: str, details: Dict[str, Any] = None):
    """
    Registra uma mensagem de log com contexto adicional.
    
    Args:
        logger: Logger a ser utilizado
        level: Nível de log (debug, info, warning, error, critical)
        message: Mensagem de log
        details: Detalhes adicionais (opcional)
    """
    log_method = getattr(logger, level.lower())
    
    extra = {"details": details} if details else {}
    log_method(message, extra=extra)
```

### 4. Exemplo de Uso em um Serviço

```python
# Exemplo de uso em src/payment/services/payment_service.py

import logging
from typing import Dict, Any, Optional

from src.core.exceptions.base_exceptions import (
    ResourceNotFoundException, 
    ValidationException,
    ExternalServiceException,
    BusinessRuleException
)
from src.core.utils.logging_utils import log_with_context
from src.payment.models.payment_models import Payment, PaymentStatus

logger = logging.getLogger(__name__)

class PaymentService:
    """Serviço para gerenciamento de pagamentos."""
    
    async def get_payment(self, payment_id: str) -> Payment:
        """
        Obtém um pagamento pelo ID.
        
        Args:
            payment_id: ID do pagamento
            
        Returns:
            Payment: Pagamento encontrado
            
        Raises:
            ResourceNotFoundException: Se o pagamento não for encontrado
        """
        try:
            # Buscar pagamento no banco de dados
            payment = await self._get_payment_from_db(payment_id)
            
            if not payment:
                # Registrar erro e lançar exceção
                log_with_context(
                    logger, "warning", 
                    f"Pagamento {payment_id} não encontrado",
                    {"payment_id": payment_id}
                )
                raise ResourceNotFoundException("Pagamento", payment_id)
            
            return payment
            
        except Exception as e:
            # Se não for uma exceção conhecida, registrar e relançar
            if not isinstance(e, ResourceNotFoundException):
                log_with_context(
                    logger, "error", 
                    f"Erro ao buscar pagamento {payment_id}: {str(e)}",
                    {"payment_id": payment_id}
                )
                raise
            raise
    
    async def process_payment(self, payment_data: Dict[str, Any]) -> Payment:
        """
        Processa um novo pagamento.
        
        Args:
            payment_data: Dados do pagamento
            
        Returns:
            Payment: Pagamento processado
            
        Raises:
            ValidationException: Se os dados do pagamento forem inválidos
            ExternalServiceException: Se houver erro no serviço de pagamento
            BusinessRuleException: Se houver violação de regra de negócio
        """
        try:
            # Validar dados do pagamento
            self._validate_payment_data(payment_data)
            
            # Processar pagamento no gateway
            try:
                payment_result = await self._process_in_gateway(payment_data)
            except Exception as e:
                # Registrar erro e lançar exceção específica
                log_with_context(
                    logger, "error", 
                    f"Erro no gateway de pagamento: {str(e)}",
                    {"payment_data": payment_data}
                )
                raise ExternalServiceException(
                    "Gateway de Pagamento", 
                    str(e),
                    {"payment_method": payment_data.get("method")}
                )
            
            # Verificar resultado
            if payment_result.get("status") == "rejected":
                # Registrar erro e lançar exceção de regra de negócio
                reason = payment_result.get("reason", "Motivo desconhecido")
                log_with_context(
                    logger, "warning", 
                    f"Pagamento rejeitado: {reason}",
                    {"payment_data": payment_data, "result": payment_result}
                )
                raise BusinessRuleException(
                    f"Pagamento rejeitado: {reason}",
                    "payment_approval",
                    {"reason": reason, "details": payment_result.get("details", {})}
                )
            
            # Salvar pagamento no banco de dados
            payment = await self._save_payment(payment_data, payment_result)
            
            # Registrar sucesso
            log_with_context(
                logger, "info", 
                f"Pagamento {payment.id} processado com sucesso",
                {"payment_id": payment.id, "status": payment.status}
            )
            
            return payment
            
        except Exception as e:
            # Se não for uma exceção conhecida, registrar e relançar
            if not isinstance(e, (ValidationException, ExternalServiceException, BusinessRuleException)):
                log_with_context(
                    logger, "error", 
                    f"Erro ao processar pagamento: {str(e)}",
                    {"payment_data": payment_data}
                )
                raise
            raise
    
    def _validate_payment_data(self, payment_data: Dict[str, Any]):
        """
        Valida os dados do pagamento.
        
        Args:
            payment_data: Dados do pagamento
            
        Raises:
            ValidationException: Se os dados forem inválidos
        """
        # Verificar campos obrigatórios
        required_fields = ["amount", "method", "order_id"]
        for field in required_fields:
            if field not in payment_data or not payment_data[field]:
                raise ValidationException(
                    f"Campo obrigatório não informado: {field}",
                    field
                )
        
        # Validar valor
        amount = payment_data.get("amount")
        if amount and (not isinstance(amount, (int, float)) or amount <= 0):
            raise ValidationException(
                "Valor do pagamento deve ser maior que zero",
                "amount",
                {"provided_value": amount}
            )
        
        # Validar método de pagamento
        valid_methods = ["credit_card", "debit_card", "pix", "cash"]
        method = payment_data.get("method")
        if method and method not in valid_methods:
            raise ValidationException(
                f"Método de pagamento inválido: {method}",
                "method",
                {"valid_methods": valid_methods}
            )
```

### 5. Integração com a Aplicação Principal

```python
# src/main.py (ou arquivo principal da aplicação)

from fastapi import FastAPI
import logging

from src.core.middleware.error_handling import register_exception_handlers, error_handling_middleware
from src.core.utils.logging_utils import configure_logging

# Configurar logging
configure_logging(
    log_level="INFO",
    log_file="/var/log/pos-modern/app.log"
)

logger = logging.getLogger(__name__)

# Criar aplicação
app = FastAPI(title="POS Modern API")

# Registrar middleware de tratamento de erros
app.middleware("http")(error_handling_middleware)

# Registrar handlers de exceções
register_exception_handlers(app)

# Registrar routers
# ...

@app.on_event("startup")
async def startup_event():
    """Evento executado na inicialização da aplicação."""
    logger.info("Aplicação iniciada")

@app.on_event("shutdown")
async def shutdown_event():
    """Evento executado no encerramento da aplicação."""
    logger.info("Aplicação encerrada")
```

## Benefícios

1. **Consistência**: Tratamento padronizado de erros em toda a aplicação
2. **Rastreabilidade**: Logs estruturados facilitam o diagnóstico de problemas
3. **Experiência do Usuário**: Mensagens de erro claras e informativas
4. **Manutenibilidade**: Código mais limpo e organizado
5. **Segurança**: Controle sobre quais informações são expostas nos erros

## Próximos Passos

1. Implementar esta estrutura em todos os módulos do sistema
2. Criar documentação para desenvolvedores sobre o uso correto do sistema de erros
3. Configurar alertas para erros críticos
4. Implementar dashboard de monitoramento de erros
