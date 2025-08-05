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
            "line": record.lineno,
        }

        # Adicionar informações de exceção se disponíveis
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info),
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
    logging.basicConfig(level=numeric_level, handlers=handlers, force=True)

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
