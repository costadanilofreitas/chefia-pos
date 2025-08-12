from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime, date
import uuid


class AccountType(str, Enum):
    """Tipo de conta financeira."""

    RECEIVABLE = "receivable"  # Contas a receber
    PAYABLE = "payable"  # Contas a pagar
    BANK = "bank"  # Conta bancária
    CASH = "cash"  # Caixa
    CREDIT_CARD = "credit_card"  # Cartão de crédito
    OTHER = "other"  # Outros


class TransactionType(str, Enum):
    """Tipo de transação financeira."""

    INCOME = "income"  # Receita
    EXPENSE = "expense"  # Despesa
    TRANSFER = "transfer"  # Transferência entre contas
    ADJUSTMENT = "adjustment"  # Ajuste


class PaymentStatus(str, Enum):
    """Status de pagamento."""

    PENDING = "pending"  # Pendente
    PAID = "paid"  # Pago
    PARTIALLY_PAID = "partially_paid"  # Parcialmente pago
    OVERDUE = "overdue"  # Atrasado
    CANCELLED = "cancelled"  # Cancelado


class RecurrenceType(str, Enum):
    """Tipo de recorrência para transações periódicas."""

    NONE = "none"  # Sem recorrência
    DAILY = "daily"  # Diária
    WEEKLY = "weekly"  # Semanal
    BIWEEKLY = "biweekly"  # Quinzenal
    MONTHLY = "monthly"  # Mensal
    QUARTERLY = "quarterly"  # Trimestral
    SEMIANNUAL = "semiannual"  # Semestral
    ANNUAL = "annual"  # Anual


class SourceType(str, Enum):
    """Tipo de origem da transação."""

    ORDER = "order"  # Pedido
    SUPPLIER = "supplier"  # Fornecedor
    EMPLOYEE = "employee"  # Funcionário
    MANUAL = "manual"  # Lançamento manual
    SYSTEM = "system"  # Sistema (automático)
    OTHER = "other"  # Outros


class Account(BaseModel):
    """Conta financeira."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: AccountType
    description: Optional[str] = None
    is_active: bool = True
    balance: float = 0.0
    initial_balance: float = 0.0
    currency: str = "BRL"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Campos específicos para contas bancárias
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_type: Optional[str] = None  # "checking", "savings"

    # Campos específicos para cartões de crédito
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None


class AccountCreate(BaseModel):
    """Dados para criação de uma nova conta."""

    name: str
    type: AccountType
    description: Optional[str] = None
    initial_balance: float = 0.0
    currency: str = "BRL"
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_type: Optional[str] = None
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None


class AccountUpdate(BaseModel):
    """Dados para atualização de uma conta."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_type: Optional[str] = None
    credit_limit: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None


class Transaction(BaseModel):
    """Transação financeira."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_id: str
    type: TransactionType
    amount: float
    description: str
    date: date
    status: PaymentStatus = PaymentStatus.PENDING
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    category: Optional[str] = None
    reference: Optional[str] = None  # Número de referência externa
    source_type: SourceType
    source_id: Optional[str] = None  # ID do pedido, fornecedor, etc.
    notes: Optional[str] = None
    attachments: List[str] = []  # Lista de URLs ou caminhos para anexos
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class TransactionCreate(BaseModel):
    """Dados para criação de uma nova transação."""

    account_id: str
    type: TransactionType
    amount: float
    description: str
    date: date
    status: PaymentStatus = PaymentStatus.PENDING
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    category: Optional[str] = None
    reference: Optional[str] = None
    source_type: SourceType
    source_id: Optional[str] = None
    notes: Optional[str] = None
    attachments: List[str] = []
    created_by: str


class TransactionUpdate(BaseModel):
    """Dados para atualização de uma transação."""

    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[date] = None
    status: Optional[PaymentStatus] = None
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    category: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None


class Receivable(BaseModel):
    """Conta a receber (duplicata)."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: Optional[str] = None
    description: str
    amount: float
    issue_date: date
    due_date: date
    status: PaymentStatus = PaymentStatus.PENDING
    payment_date: Optional[date] = None
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None  # Número da duplicata ou referência
    source_type: SourceType
    source_id: Optional[str] = None  # ID do pedido, etc.
    notes: Optional[str] = None
    attachments: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    @validator("payment_amount")
    def validate_payment_amount(cls, v: Optional[float], values: Dict[str, Any]) -> Optional[float]:
        if v is not None and "amount" in values and v > values["amount"]:
            raise ValueError(
                "O valor do pagamento não pode ser maior que o valor da duplicata"
            )
        return v

    @validator("payment_date")
    def validate_payment_date(cls, v: Optional[date], values: Dict[str, Any]) -> Optional[date]:
        if v is not None and "issue_date" in values and v < values["issue_date"]:
            raise ValueError(
                "A data de pagamento não pode ser anterior à data de emissão"
            )
        return v


class ReceivableCreate(BaseModel):
    """Dados para criação de uma nova conta a receber."""

    customer_id: Optional[str] = None
    description: str
    amount: float
    issue_date: date
    due_date: date
    status: PaymentStatus = PaymentStatus.PENDING
    reference: Optional[str] = None
    source_type: SourceType
    source_id: Optional[str] = None
    notes: Optional[str] = None
    attachments: List[str] = []
    created_by: str


class ReceivableUpdate(BaseModel):
    """Dados para atualização de uma conta a receber."""

    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    status: Optional[PaymentStatus] = None
    payment_date: Optional[date] = None
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None


class Payable(BaseModel):
    """Conta a pagar."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: Optional[str] = None
    employee_id: Optional[str] = None  # Para pagamentos de salários
    description: str
    amount: float
    issue_date: date
    due_date: date
    status: PaymentStatus = PaymentStatus.PENDING
    payment_date: Optional[date] = None
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None  # Número da fatura, etc.
    source_type: SourceType
    source_id: Optional[str] = None  # ID do pedido de compra, etc.
    notes: Optional[str] = None
    attachments: List[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    @validator("payment_amount")
    def validate_payment_amount(cls, v: Optional[float], values: Dict[str, Any]) -> Optional[float]:
        if v is not None and "amount" in values and v > values["amount"]:
            raise ValueError(
                "O valor do pagamento não pode ser maior que o valor da conta"
            )
        return v

    @validator("payment_date")
    def validate_payment_date(cls, v: Optional[date], values: Dict[str, Any]) -> Optional[date]:
        if v is not None and "issue_date" in values and v < values["issue_date"]:
            raise ValueError(
                "A data de pagamento não pode ser anterior à data de emissão"
            )
        return v


class PayableCreate(BaseModel):
    """Dados para criação de uma nova conta a pagar."""

    supplier_id: Optional[str] = None
    employee_id: Optional[str] = None
    description: str
    amount: float
    issue_date: date
    due_date: date
    status: PaymentStatus = PaymentStatus.PENDING
    reference: Optional[str] = None
    source_type: SourceType
    source_id: Optional[str] = None
    notes: Optional[str] = None
    attachments: List[str] = []
    created_by: str


class PayableUpdate(BaseModel):
    """Dados para atualização de uma conta a pagar."""

    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    status: Optional[PaymentStatus] = None
    payment_date: Optional[date] = None
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    attachments: Optional[List[str]] = None


class RecurringTransaction(BaseModel):
    """Transação recorrente."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_id: str
    type: TransactionType
    amount: float
    description: str
    recurrence_type: RecurrenceType
    start_date: date
    end_date: Optional[date] = None
    day_of_month: Optional[int] = None  # Para recorrências mensais ou superiores
    day_of_week: Optional[int] = None  # Para recorrências semanais
    category: Optional[str] = None
    source_type: SourceType
    source_id: Optional[str] = None
    is_active: bool = True
    last_generated: Optional[date] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class RecurringTransactionCreate(BaseModel):
    """Dados para criação de uma nova transação recorrente."""

    account_id: str
    type: TransactionType
    amount: float
    description: str
    recurrence_type: RecurrenceType
    start_date: date
    end_date: Optional[date] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    category: Optional[str] = None
    source_type: SourceType
    source_id: Optional[str] = None
    notes: Optional[str] = None
    created_by: str


class RecurringTransactionUpdate(BaseModel):
    """Dados para atualização de uma transação recorrente."""

    amount: Optional[float] = None
    description: Optional[str] = None
    recurrence_type: Optional[RecurrenceType] = None
    end_date: Optional[date] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class FinancialReport(BaseModel):
    """Relatório financeiro."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "cash_flow", "balance_sheet", "income_statement", etc.
    start_date: date
    end_date: date
    data: Dict[str, Any]
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)


class FinancialReportCreate(BaseModel):
    """Dados para criação de um novo relatório financeiro."""

    type: str
    start_date: date
    end_date: date
    created_by: str


class AccountsEvent(BaseModel):
    """Evento relacionado a contas para o barramento de eventos."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "transaction_created", "receivable_paid", etc.
    data: Dict[str, Any]
    account_id: Optional[str] = None
    user_id: str
    created_at: datetime = Field(default_factory=datetime.now)
