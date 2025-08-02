# /home/ubuntu/pos-modern/src/logging/models/log_models.py

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import enum

class LogLevel(str, enum.Enum):
    """Log level enumeration."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class LogSource(str, enum.Enum):
    """Log source enumeration."""
    SYSTEM = "system"
    USER = "user"
    API = "api"
    DATABASE = "database"
    NETWORK = "network"
    SECURITY = "security"
    POS = "pos"
    KDS = "kds"
    WAITER = "waiter"
    KIOSK = "kiosk"
    STOCK = "stock"
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    SUPPLIER = "supplier"
    PAYMENT = "payment"
    INTEGRATION = "integration"

class LogEntry(BaseModel):
    """Model for a log entry."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: LogLevel
    source: LogSource
    module: str
    message: str
    details: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    tags: List[str] = []
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": "2025-05-24T12:34:56",
                "level": "info",
                "source": "pos",
                "module": "order",
                "message": "Order created successfully",
                "details": {
                    "order_id": "123e4567-e89b-12d3-a456-426614174000",
                    "total_amount": 45.90,
                    "items_count": 3
                },
                "user_id": "user123",
                "user_name": "John Doe",
                "ip_address": "192.168.1.100",
                "request_id": "req-123456",
                "session_id": "sess-789012",
                "tags": ["order", "creation"]
            }
        }

class LogQuery(BaseModel):
    """Model for querying logs."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    levels: Optional[List[LogLevel]] = None
    sources: Optional[List[LogSource]] = None
    modules: Optional[List[str]] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    ip_address: Optional[str] = None
    session_id: Optional[str] = None
    search_text: Optional[str] = None
    tags: Optional[List[str]] = None
    limit: int = 100
    offset: int = 0
    sort_by: str = "timestamp"
    sort_order: str = "desc"
    
    class Config:
        schema_extra = {
            "example": {
                "start_date": "2025-05-24T00:00:00",
                "end_date": "2025-05-24T23:59:59",
                "levels": ["error", "critical"],
                "sources": ["pos", "kds"],
                "modules": ["order", "payment"],
                "search_text": "failed",
                "tags": ["payment"],
                "limit": 50,
                "offset": 0,
                "sort_by": "timestamp",
                "sort_order": "desc"
            }
        }

class LogStats(BaseModel):
    """Model for log statistics."""
    total_entries: int
    entries_by_level: Dict[str, int]
    entries_by_source: Dict[str, int]
    entries_by_module: Dict[str, int]
    entries_by_hour: Dict[str, int]
    most_common_tags: List[Dict[str, Any]]
    most_active_users: List[Dict[str, Any]]
    most_common_errors: List[Dict[str, Any]]
    
    class Config:
        schema_extra = {
            "example": {
                "total_entries": 1250,
                "entries_by_level": {
                    "debug": 500,
                    "info": 600,
                    "warning": 100,
                    "error": 45,
                    "critical": 5
                },
                "entries_by_source": {
                    "pos": 800,
                    "kds": 200,
                    "waiter": 150,
                    "system": 100
                },
                "entries_by_module": {
                    "order": 500,
                    "payment": 300,
                    "product": 200,
                    "user": 150,
                    "auth": 100
                },
                "entries_by_hour": {
                    "00": 10,
                    "01": 5,
                    "12": 120,
                    "13": 150
                },
                "most_common_tags": [
                    {"tag": "order", "count": 500},
                    {"tag": "payment", "count": 300}
                ],
                "most_active_users": [
                    {"user_id": "user123", "user_name": "John Doe", "count": 300},
                    {"user_id": "user456", "user_name": "Jane Smith", "count": 250}
                ],
                "most_common_errors": [
                    {"message": "Payment failed", "count": 20},
                    {"message": "Database connection error", "count": 15}
                ]
            }
        }

class LogConfig(BaseModel):
    """Model for log configuration."""
    enabled: bool = True
    retention_days: int = 30
    max_entries: int = 1000000
    default_level: LogLevel = LogLevel.INFO
    console_logging: bool = True
    file_logging: bool = True
    database_logging: bool = True
    log_file_path: str = "/var/log/pos-modern/app.log"
    log_rotation: bool = True
    log_rotation_size_mb: int = 10
    log_rotation_count: int = 5
    excluded_sources: List[LogSource] = []
    excluded_levels: List[LogLevel] = []
    
    class Config:
        schema_extra = {
            "example": {
                "enabled": True,
                "retention_days": 30,
                "max_entries": 1000000,
                "default_level": "info",
                "console_logging": True,
                "file_logging": True,
                "database_logging": True,
                "log_file_path": "/var/log/pos-modern/app.log",
                "log_rotation": True,
                "log_rotation_size_mb": 10,
                "log_rotation_count": 5,
                "excluded_sources": ["system"],
                "excluded_levels": ["debug"]
            }
        }
