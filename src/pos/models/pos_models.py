from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union, Any
from enum import Enum
from datetime import datetime, time
import uuid

# Enums para o módulo de Frente de Caixa
class POSSessionStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    SUSPENDED = "suspended"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    VOUCHER = "voucher"
    MIXED = "mixed"
    IFOOD = "ifood"
    OTHER = "other"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    REFUNDED = "refunded"
    CANCELED = "canceled"

class PrinterType(str, Enum):
    RECEIPT = "receipt"
    KITCHEN = "kitchen"
    REPORT = "report"

class ReceiptType(str, Enum):
    ORDER = "order"
    PAYMENT = "payment"
    OPENING = "opening"
    CLOSING = "closing"
    REPORT = "report"

# Modelos para o módulo de Frente de Caixa
class POSConfig(BaseModel):
    """Configuração do terminal POS."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    terminal_id: str
    terminal_name: str
    printer_configs: List[Dict[str, Any]] = []
    default_printer: Optional[str] = None
    allow_discounts: bool = True
    max_discount_percent: float = 10.0
    allow_price_override: bool = False
    allow_returns: bool = True
    default_payment_method: PaymentMethod = PaymentMethod.CASH
    tax_included: bool = True
    currency_symbol: str = "R$"
    decimal_places: int = 2
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class POSSession(BaseModel):
    """Sessão de operação do POS (período entre login e logout do operador)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    terminal_id: str
    cashier_id: str
    user_id: str
    business_day_id: str
    status: POSSessionStatus = POSSessionStatus.OPEN
    opening_balance: float = 0.0
    closing_balance: float = 0.0
    expected_balance: float = 0.0
    cash_sales: float = 0.0
    card_sales: float = 0.0
    pix_sales: float = 0.0
    other_sales: float = 0.0
    cash_refunds: float = 0.0
    card_refunds: float = 0.0
    pix_refunds: float = 0.0
    other_refunds: float = 0.0
    cash_in: float = 0.0
    cash_out: float = 0.0
    discounts: float = 0.0
    order_count: int = 0
    opened_at: datetime = Field(default_factory=datetime.now)
    closed_at: Optional[datetime] = None
    notes: Optional[str] = None

class POSSessionCreate(BaseModel):
    """Dados para criação de uma nova sessão POS."""
    terminal_id: str
    cashier_id: str
    business_day_id: str
    opening_balance: float = 0.0
    notes: Optional[str] = None

class POSSessionUpdate(BaseModel):
    """Dados para atualização de uma sessão POS."""
    status: Optional[POSSessionStatus] = None
    closing_balance: Optional[float] = None
    notes: Optional[str] = None

class POSSessionSummary(BaseModel):
    """Resumo de uma sessão POS."""
    id: str
    terminal_id: str
    cashier_id: str
    status: POSSessionStatus
    opened_at: datetime
    closed_at: Optional[datetime] = None
    order_count: int
    total_sales: float

class PaymentTransaction(BaseModel):
    """Transação de pagamento."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    session_id: str
    amount: float
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PENDING
    reference: Optional[str] = None  # Referência externa (ex: ID da transação no SiTef)
    card_brand: Optional[str] = None
    card_last_digits: Optional[str] = None
    authorization_code: Optional[str] = None
    installments: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = None

class PaymentTransactionCreate(BaseModel):
    """Dados para criação de uma nova transação de pagamento."""
    order_id: str
    session_id: str
    amount: float
    method: PaymentMethod
    reference: Optional[str] = None
    card_brand: Optional[str] = None
    card_last_digits: Optional[str] = None
    authorization_code: Optional[str] = None
    installments: Optional[int] = None
    notes: Optional[str] = None

class PaymentTransactionUpdate(BaseModel):
    """Dados para atualização de uma transação de pagamento."""
    status: Optional[PaymentStatus] = None
    reference: Optional[str] = None
    authorization_code: Optional[str] = None
    notes: Optional[str] = None

class Receipt(BaseModel):
    """Recibo impresso."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ReceiptType
    reference_id: str  # ID do pedido, sessão, etc.
    content: str
    printed_at: datetime = Field(default_factory=datetime.now)
    printer_id: str
    user_id: str
    terminal_id: str
    reprint_count: int = 0
    last_reprinted_at: Optional[datetime] = None

class ReceiptCreate(BaseModel):
    """Dados para criação de um novo recibo."""
    type: ReceiptType
    reference_id: str
    content: str
    printer_id: str
    user_id: str
    terminal_id: str

class CashOperation(BaseModel):
    """Operação de caixa (entrada ou saída de dinheiro)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    amount: float
    is_cash_in: bool  # True para entrada, False para saída
    reason: str
    reference_id: Optional[str] = None  # ID de pedido, etc.
    created_at: datetime = Field(default_factory=datetime.now)
    user_id: str
    approved_by: Optional[str] = None  # ID do usuário que aprovou (para saídas)
    notes: Optional[str] = None

class CashOperationCreate(BaseModel):
    """Dados para criação de uma nova operação de caixa."""
    session_id: str
    amount: float
    is_cash_in: bool
    reason: str
    reference_id: Optional[str] = None
    user_id: str
    approved_by: Optional[str] = None
    notes: Optional[str] = None

class POSReport(BaseModel):
    """Relatório do POS."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "X", "Z", "sales", "products", etc.
    start_date: datetime
    end_date: datetime
    business_day_id: Optional[str] = None
    session_id: Optional[str] = None
    terminal_id: Optional[str] = None
    user_id: str
    content: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.now)

class POSReportCreate(BaseModel):
    """Dados para criação de um novo relatório."""
    type: str
    start_date: datetime
    end_date: datetime
    business_day_id: Optional[str] = None
    session_id: Optional[str] = None
    terminal_id: Optional[str] = None
    user_id: str
    parameters: Optional[Dict[str, Any]] = None

class SITEFConfig(BaseModel):
    """Configuração de integração com SiTef."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    terminal_id: str
    ip_address: str
    port: int
    store_id: str
    terminal_number: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class SATConfig(BaseModel):
    """Configuração de integração com SAT."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    terminal_id: str
    model: str
    activation_code: str
    signature_ac: str
    cnpj: str
    ie: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class PrinterConfig(BaseModel):
    """Configuração de impressora."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    terminal_id: str
    name: str
    type: PrinterType
    model: str
    connection_type: str  # "usb", "network", "bluetooth"
    connection_params: Dict[str, Any]
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class POSEvent(BaseModel):
    """Evento do POS para o barramento de eventos."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    data: Dict[str, Any]
    terminal_id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
