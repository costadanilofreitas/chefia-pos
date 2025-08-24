# 🚨 Error Handling Catalog - Chefia POS

## Metadata
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Status**: Production Ready
- **Compliance**: ISO 27001, PCI-DSS

---

## 1. ERROR CODE STRUCTURE

### Format: `[MODULE]-[CATEGORY]-[NUMBER]`
```yaml
pattern: "^[A-Z]{3}-[A-Z]{3}-[0-9]{4}$"
examples:
  - POS-VAL-1001  # POS module, Validation error, code 1001
  - KDS-NET-2003  # KDS module, Network error, code 2003
  - PAY-AUTH-3001 # Payment module, Authentication error, code 3001
```

### Module Codes
```yaml
POS: Point of Sale
KDS: Kitchen Display System
PAY: Payment Processing
ORD: Order Management
STK: Stock/Inventory
CUS: Customer Management
AUT: Authentication/Authorization
INT: Integrations
FIS: Fiscal/Tax
PER: Peripherals
SYS: System/Infrastructure
```

### Category Codes
```yaml
VAL: Validation Error
AUTH: Authentication/Authorization
NET: Network/Communication
DAT: Database/Data
BUS: Business Logic
INT: Integration
CFG: Configuration
PER: Permission
RES: Resource Not Found
LIM: Rate Limit/Quota
TIM: Timeout
SYS: System Error
```

---

## 2. COMPLETE ERROR CATALOG

### AUTHENTICATION & AUTHORIZATION (AUT)

#### AUT-AUTH-1001: Invalid Credentials
```python
{
    "code": "AUT-AUTH-1001",
    "message": "Credenciais inválidas",
    "user_message": "Usuário ou senha incorretos",
    "severity": "WARNING",
    "http_status": 401,
    "recovery": "Verify credentials and retry",
    "log_level": "WARNING",
    "notify_admin": False
}
```

#### AUT-AUTH-1002: Token Expired
```python
{
    "code": "AUT-AUTH-1002",
    "message": "Token de autenticação expirado",
    "user_message": "Sua sessão expirou. Por favor, faça login novamente",
    "severity": "INFO",
    "http_status": 401,
    "recovery": "Refresh token or re-authenticate",
    "log_level": "INFO",
    "notify_admin": False
}
```

#### AUT-PER-1003: Insufficient Permissions
```python
{
    "code": "AUT-PER-1003",
    "message": "Permissões insuficientes para esta operação",
    "user_message": "Você não tem permissão para realizar esta ação",
    "severity": "WARNING",
    "http_status": 403,
    "recovery": "Request permission from administrator",
    "log_level": "WARNING",
    "notify_admin": False
}
```

### POINT OF SALE (POS)

#### POS-VAL-2001: Invalid Product
```python
{
    "code": "POS-VAL-2001",
    "message": "Produto inválido ou não encontrado",
    "user_message": "Produto não encontrado no catálogo",
    "severity": "WARNING",
    "http_status": 400,
    "recovery": "Verify product code or sync catalog",
    "log_level": "WARNING",
    "notify_admin": False
}
```

#### POS-BUS-2002: Insufficient Stock
```python
{
    "code": "POS-BUS-2002",
    "message": "Estoque insuficiente para o produto",
    "user_message": "Produto sem estoque disponível",
    "severity": "WARNING",
    "http_status": 409,
    "recovery": "Check stock levels or use alternative product",
    "log_level": "INFO",
    "notify_admin": True
}
```

#### POS-BUS-2003: Cashier Not Open
```python
{
    "code": "POS-BUS-2003",
    "message": "Caixa não está aberto",
    "user_message": "É necessário abrir o caixa antes de realizar vendas",
    "severity": "ERROR",
    "http_status": 412,
    "recovery": "Open cashier before processing sales",
    "log_level": "ERROR",
    "notify_admin": False
}
```

### PAYMENT (PAY)

#### PAY-VAL-3001: Invalid Payment Amount
```python
{
    "code": "PAY-VAL-3001",
    "message": "Valor de pagamento inválido",
    "user_message": "O valor do pagamento está incorreto",
    "severity": "ERROR",
    "http_status": 400,
    "recovery": "Verify payment amount and retry",
    "log_level": "ERROR",
    "notify_admin": False
}
```

#### PAY-INT-3002: Gateway Timeout
```python
{
    "code": "PAY-INT-3002",
    "message": "Timeout na comunicação com gateway de pagamento",
    "user_message": "Não foi possível processar o pagamento. Tente novamente",
    "severity": "CRITICAL",
    "http_status": 504,
    "recovery": "Retry payment or use alternative method",
    "log_level": "ERROR",
    "notify_admin": True,
    "retry_after": 30
}
```

#### PAY-BUS-3003: Payment Already Processed
```python
{
    "code": "PAY-BUS-3003",
    "message": "Pagamento já processado",
    "user_message": "Este pagamento já foi processado",
    "severity": "WARNING",
    "http_status": 409,
    "recovery": "Verify payment status",
    "log_level": "WARNING",
    "notify_admin": False
}
```

### KITCHEN DISPLAY (KDS)

#### KDS-NET-4001: Connection Lost
```python
{
    "code": "KDS-NET-4001",
    "message": "Conexão perdida com o servidor",
    "user_message": "Conexão perdida. Reconectando...",
    "severity": "ERROR",
    "http_status": 503,
    "recovery": "Automatic reconnection in progress",
    "log_level": "ERROR",
    "notify_admin": True,
    "auto_retry": True
}
```

#### KDS-BUS-4002: Station Not Configured
```python
{
    "code": "KDS-BUS-4002",
    "message": "Estação de cozinha não configurada",
    "user_message": "Esta estação precisa ser configurada",
    "severity": "ERROR",
    "http_status": 412,
    "recovery": "Configure station in settings",
    "log_level": "ERROR",
    "notify_admin": True
}
```

### INTEGRATIONS (INT)

#### INT-NET-5001: iFood Webhook Failed
```python
{
    "code": "INT-NET-5001",
    "message": "Falha ao processar webhook do iFood",
    "user_message": "Erro ao receber pedido do iFood",
    "severity": "CRITICAL",
    "http_status": 500,
    "recovery": "Webhook added to retry queue",
    "log_level": "ERROR",
    "notify_admin": True,
    "retry_strategy": "exponential_backoff"
}
```

#### INT-AUTH-5002: WhatsApp Authentication Failed
```python
{
    "code": "INT-AUTH-5002",
    "message": "Falha na autenticação com WhatsApp/Twilio",
    "user_message": "Erro na configuração do WhatsApp",
    "severity": "CRITICAL",
    "http_status": 401,
    "recovery": "Verify Twilio credentials",
    "log_level": "ERROR",
    "notify_admin": True
}
```

### FISCAL (FIS)

#### FIS-CFG-6001: SAT Not Configured
```python
{
    "code": "FIS-CFG-6001",
    "message": "SAT não configurado ou não ativado",
    "user_message": "Equipamento fiscal não configurado",
    "severity": "CRITICAL",
    "http_status": 503,
    "recovery": "Configure and activate SAT device",
    "log_level": "ERROR",
    "notify_admin": True,
    "compliance_risk": True
}
```

#### FIS-NET-6002: SEFAZ Unavailable
```python
{
    "code": "FIS-NET-6002",
    "message": "SEFAZ indisponível",
    "user_message": "Serviço fiscal temporariamente indisponível",
    "severity": "CRITICAL",
    "http_status": 503,
    "recovery": "Enable contingency mode",
    "log_level": "ERROR",
    "notify_admin": True,
    "contingency_mode": True
}
```

### PERIPHERALS (PER)

#### PER-CFG-7001: Printer Not Found
```python
{
    "code": "PER-CFG-7001",
    "message": "Impressora não encontrada",
    "user_message": "Impressora não conectada ou configurada",
    "severity": "ERROR",
    "http_status": 503,
    "recovery": "Check printer connection and configuration",
    "log_level": "ERROR",
    "notify_admin": False
}
```

#### PER-DAT-7002: Print Queue Full
```python
{
    "code": "PER-DAT-7002",
    "message": "Fila de impressão cheia",
    "user_message": "Muitos documentos na fila de impressão",
    "severity": "WARNING",
    "http_status": 429,
    "recovery": "Wait for queue to process",
    "log_level": "WARNING",
    "notify_admin": True
}
```

### DATABASE (DAT)

#### DAT-NET-8001: Connection Pool Exhausted
```python
{
    "code": "DAT-NET-8001",
    "message": "Pool de conexões esgotado",
    "user_message": "Sistema temporariamente sobrecarregado",
    "severity": "CRITICAL",
    "http_status": 503,
    "recovery": "Increase connection pool size",
    "log_level": "ERROR",
    "notify_admin": True,
    "performance_impact": True
}
```

#### DAT-DAT-8002: Transaction Deadlock
```python
{
    "code": "DAT-DAT-8002",
    "message": "Deadlock detectado na transação",
    "user_message": "Conflito ao processar operação. Tentando novamente...",
    "severity": "ERROR",
    "http_status": 409,
    "recovery": "Automatic retry with backoff",
    "log_level": "ERROR",
    "notify_admin": False,
    "auto_retry": True
}
```

### SYSTEM (SYS)

#### SYS-SYS-9001: Out of Memory
```python
{
    "code": "SYS-SYS-9001",
    "message": "Memória insuficiente",
    "user_message": "Sistema com recursos limitados",
    "severity": "CRITICAL",
    "http_status": 503,
    "recovery": "Restart service or increase memory",
    "log_level": "CRITICAL",
    "notify_admin": True,
    "requires_restart": True
}
```

#### SYS-SYS-9002: Disk Space Low
```python
{
    "code": "SYS-SYS-9002",
    "message": "Espaço em disco baixo",
    "user_message": "Espaço de armazenamento limitado",
    "severity": "CRITICAL",
    "http_status": 507,
    "recovery": "Clean up old data or increase disk space",
    "log_level": "CRITICAL",
    "notify_admin": True,
    "threshold_percent": 90
}
```

---

## 3. ERROR HANDLING IMPLEMENTATION

### Base Exception Classes
```python
# src/core/exceptions/base.py
from typing import Optional, Dict, Any
from enum import Enum

class ErrorSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class ChefiaException(Exception):
    """Base exception for Chefia POS system."""
    
    def __init__(
        self,
        code: str,
        message: str,
        user_message: Optional[str] = None,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        http_status: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.user_message = user_message or message
        self.severity = severity
        self.http_status = http_status
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API response."""
        return {
            "error": {
                "code": self.code,
                "message": self.user_message,
                "details": self.details
            }
        }
    
    def to_log_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for logging."""
        return {
            "code": self.code,
            "message": self.message,
            "severity": self.severity.value,
            "details": self.details
        }
```

### Error Handler Middleware
```python
# src/core/middleware/error_handler.py
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import traceback
import logging

logger = logging.getLogger(__name__)

async def error_handler_middleware(request: Request, call_next):
    """Global error handler middleware."""
    try:
        response = await call_next(request)
        return response
    
    except ChefiaException as e:
        # Log structured error
        logger.log(
            getattr(logging, e.severity.value),
            "Application error",
            extra=e.to_log_dict()
        )
        
        # Notify admin if critical
        if e.severity == ErrorSeverity.CRITICAL:
            await notify_admin(e)
        
        # Return user-friendly response
        return JSONResponse(
            status_code=e.http_status,
            content=e.to_dict()
        )
    
    except Exception as e:
        # Log unexpected error
        logger.critical(
            "Unexpected error",
            extra={
                "error": str(e),
                "traceback": traceback.format_exc(),
                "path": request.url.path
            }
        )
        
        # Notify admin
        await notify_admin_critical(e, request)
        
        # Return generic error
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "SYS-SYS-9999",
                    "message": "Erro interno do sistema"
                }
            }
        )
```

### Recovery Strategies
```python
# src/core/recovery/strategies.py
from typing import Callable, Any
import asyncio
from functools import wraps

class RecoveryStrategies:
    """Error recovery strategies."""
    
    @staticmethod
    def exponential_backoff(
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0
    ):
        """Retry with exponential backoff."""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                last_exception = None
                
                for attempt in range(max_retries):
                    try:
                        return await func(*args, **kwargs)
                    except Exception as e:
                        last_exception = e
                        
                        if attempt < max_retries - 1:
                            delay = min(
                                base_delay * (2 ** attempt),
                                max_delay
                            )
                            await asyncio.sleep(delay)
                            
                            logger.warning(
                                f"Retry attempt {attempt + 1}/{max_retries}",
                                extra={"error": str(e)}
                            )
                
                raise last_exception
            
            return wrapper
        return decorator
    
    @staticmethod
    def circuit_breaker(
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0
    ):
        """Circuit breaker pattern."""
        def decorator(func: Callable):
            state = {"failures": 0, "last_failure": None, "open": False}
            
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Check if circuit is open
                if state["open"]:
                    if (datetime.now() - state["last_failure"]).seconds < recovery_timeout:
                        raise ChefiaException(
                            code="SYS-NET-9003",
                            message="Circuit breaker is open",
                            user_message="Service temporarily unavailable"
                        )
                    else:
                        state["open"] = False
                        state["failures"] = 0
                
                try:
                    result = await func(*args, **kwargs)
                    state["failures"] = 0
                    return result
                
                except Exception as e:
                    state["failures"] += 1
                    state["last_failure"] = datetime.now()
                    
                    if state["failures"] >= failure_threshold:
                        state["open"] = True
                        logger.error(
                            "Circuit breaker opened",
                            extra={"function": func.__name__}
                        )
                    
                    raise
            
            return wrapper
        return decorator
```

---

## 4. ERROR MONITORING & ALERTING

### Monitoring Configuration
```python
# src/core/monitoring/error_monitor.py
from typing import Dict, List
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta

class ErrorMonitor:
    """Monitor and analyze error patterns."""
    
    def __init__(self):
        self.error_counts = defaultdict(int)
        self.error_history = defaultdict(list)
        self.alert_thresholds = {
            "CRITICAL": 1,
            "ERROR": 10,
            "WARNING": 50
        }
    
    async def track_error(self, error: ChefiaException):
        """Track error occurrence."""
        self.error_counts[error.code] += 1
        self.error_history[error.code].append({
            "timestamp": datetime.now(),
            "details": error.details
        })
        
        # Check for alert conditions
        await self.check_alert_conditions(error)
    
    async def check_alert_conditions(self, error: ChefiaException):
        """Check if error should trigger alert."""
        count = self.error_counts[error.code]
        threshold = self.alert_thresholds.get(
            error.severity.value,
            100
        )
        
        if count >= threshold:
            await self.send_alert(error, count)
    
    async def send_alert(self, error: ChefiaException, count: int):
        """Send alert to administrators."""
        alert = {
            "type": "ERROR_THRESHOLD",
            "code": error.code,
            "message": error.message,
            "severity": error.severity.value,
            "count": count,
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to multiple channels
        await asyncio.gather(
            self.send_email_alert(alert),
            self.send_slack_alert(alert),
            self.send_sms_alert(alert) if error.severity == ErrorSeverity.CRITICAL else None
        )
```

### Alert Templates
```python
# src/core/monitoring/alert_templates.py
def format_error_alert(alert: dict) -> dict:
    """Format error alert for notification."""
    return {
        "subject": f"[{alert['severity']}] Error Alert: {alert['code']}",
        "body": f"""
        Error Code: {alert['code']}
        Message: {alert['message']}
        Severity: {alert['severity']}
        Occurrences: {alert['count']}
        Time: {alert['timestamp']}
        
        Action Required:
        - Check application logs for details
        - Review error recovery status
        - Contact development team if critical
        """,
        "priority": "high" if alert['severity'] == "CRITICAL" else "normal"
    }
```

---

## 5. USER-FACING ERROR MESSAGES

### Message Localization
```python
# src/core/i18n/error_messages.py
ERROR_MESSAGES = {
    "pt_BR": {
        "AUT-AUTH-1001": "Usuário ou senha incorretos",
        "POS-BUS-2002": "Produto sem estoque disponível",
        "PAY-INT-3002": "Não foi possível processar o pagamento. Tente novamente",
        "KDS-NET-4001": "Conexão perdida. Reconectando...",
        "SYS-SYS-9999": "Erro interno do sistema. Nossa equipe foi notificada"
    },
    "en_US": {
        "AUT-AUTH-1001": "Invalid username or password",
        "POS-BUS-2002": "Product out of stock",
        "PAY-INT-3002": "Payment processing failed. Please try again",
        "KDS-NET-4001": "Connection lost. Reconnecting...",
        "SYS-SYS-9999": "Internal system error. Our team has been notified"
    }
}

def get_user_message(code: str, locale: str = "pt_BR") -> str:
    """Get localized user message for error code."""
    return ERROR_MESSAGES.get(locale, {}).get(
        code,
        "Ocorreu um erro. Por favor, tente novamente"
    )
```

---

## 6. ERROR RECOVERY PROCEDURES

### Automated Recovery
```yaml
recovery_procedures:
  network_errors:
    - Automatic retry with exponential backoff
    - Circuit breaker activation after 5 failures
    - Fallback to offline mode if available
    
  database_errors:
    - Connection pool refresh
    - Automatic transaction retry for deadlocks
    - Failover to read replica for read operations
    
  integration_errors:
    - Add to retry queue
    - Process with exponential backoff
    - Move to dead letter queue after max retries
    
  payment_errors:
    - Idempotency key validation
    - Status verification before retry
    - Manual reconciliation queue for failures
```

### Manual Recovery
```yaml
manual_procedures:
  fiscal_contingency:
    1. Enable contingency mode in settings
    2. Continue operations offline
    3. Queue fiscal documents for transmission
    4. Transmit when service recovers
    
  database_corruption:
    1. Stop affected service
    2. Run integrity check
    3. Restore from last backup if needed
    4. Replay transaction log
    
  payment_reconciliation:
    1. Export failed transactions
    2. Verify with payment gateway
    3. Update transaction status manually
    4. Process refunds if needed
```

---

## 7. TESTING ERROR SCENARIOS

### Error Injection
```python
# tests/error_injection.py
import pytest
from unittest.mock import patch

class ErrorInjector:
    """Inject errors for testing."""
    
    @staticmethod
    def network_timeout():
        """Simulate network timeout."""
        raise asyncio.TimeoutError("Network timeout")
    
    @staticmethod
    def database_connection_error():
        """Simulate database connection error."""
        raise ConnectionError("Database connection failed")
    
    @staticmethod
    def payment_gateway_error():
        """Simulate payment gateway error."""
        raise ChefiaException(
            code="PAY-INT-3002",
            message="Gateway timeout",
            user_message="Payment processing failed"
        )

@pytest.mark.asyncio
async def test_error_recovery():
    """Test error recovery mechanisms."""
    
    # Test network retry
    with patch('httpx.AsyncClient.post', side_effect=ErrorInjector.network_timeout):
        with pytest.raises(asyncio.TimeoutError):
            await process_payment(test_payment_data)
    
    # Verify retry was attempted
    assert mock_logger.warning.called
    assert "Retry attempt" in mock_logger.warning.call_args[0][0]
```

---

## 8. COMPLIANCE & AUDIT

### Error Logging Requirements
```yaml
compliance:
  pci_dss:
    - Never log sensitive card data
    - Mask PAN in error messages
    - Retain error logs for 1 year
    
  lgpd:
    - Anonymize personal data in logs
    - Allow error log deletion on request
    - Encrypt error logs at rest
    
  fiscal:
    - Log all fiscal document errors
    - Maintain audit trail for 5 years
    - Report critical fiscal errors immediately
```

### Audit Trail
```python
# src/core/audit/error_audit.py
class ErrorAuditTrail:
    """Maintain error audit trail for compliance."""
    
    async def log_error_for_audit(self, error: ChefiaException, context: dict):
        """Log error for audit purposes."""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "error_code": error.code,
            "severity": error.severity.value,
            "user_id": context.get("user_id"),
            "session_id": context.get("session_id"),
            "ip_address": self.anonymize_ip(context.get("ip_address")),
            "action": context.get("action"),
            "module": error.code.split("-")[0],
            "compliance_tags": self.get_compliance_tags(error)
        }
        
        await self.store_audit_entry(audit_entry)
```

---

*Document Version: 1.0.0*
*Last Updated: January 2025*
*Next Review: Monthly*