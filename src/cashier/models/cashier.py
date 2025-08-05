from pydantic import BaseModel, Field
from typing import Optional, Dict
from enum import Enum
from datetime import datetime
import uuid


class CashierStatus(str, Enum):
    """Status possíveis para um caixa."""

    CLOSED = "closed"
    OPEN = "open"


class OperationType(str, Enum):
    """Tipos de operações de caixa."""

    OPENING = "opening"
    CLOSING = "closing"
    WITHDRAWAL = "withdrawal"  # Ruptura (retirada de dinheiro)
    DEPOSIT = "deposit"
    SALE = "sale"
    REFUND = "refund"


class PaymentMethod(str, Enum):
    """Métodos de pagamento suportados."""

    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    VOUCHER = "voucher"
    IFOOD = "ifood"


class CashierBase(BaseModel):
    """Modelo base para caixa."""

    terminal_id: str = Field(
        ..., description="ID do terminal/dispositivo onde o caixa está operando"
    )
    business_day_id: str = Field(
        ..., description="ID do dia de operação ao qual o caixa está associado"
    )


class CashierCreate(CashierBase):
    """Modelo para criação de um caixa."""

    opening_balance: float = Field(0.0, description="Saldo inicial do caixa")
    operator_id: str = Field(..., description="ID do usuário que está abrindo o caixa")
    notes: Optional[str] = Field(
        None, description="Observações sobre a abertura do caixa"
    )


class CashierUpdate(BaseModel):
    """Modelo para atualização de um caixa."""

    notes: Optional[str] = Field(None, description="Observações sobre o caixa")


class CashierClose(BaseModel):
    """Modelo para fechamento de um caixa."""

    operator_id: str = Field(..., description="ID do usuário que está fechando o caixa")
    physical_cash_amount: float = Field(
        ..., description="Valor físico em dinheiro contado no fechamento"
    )
    notes: Optional[str] = Field(
        None, description="Observações sobre o fechamento do caixa"
    )


class CashierOperation(BaseModel):
    """Modelo para operações de caixa."""

    operation_type: OperationType = Field(..., description="Tipo de operação")
    amount: float = Field(..., description="Valor da operação")
    operator_id: str = Field(
        ..., description="ID do usuário que está realizando a operação"
    )
    payment_method: Optional[PaymentMethod] = Field(
        None, description="Método de pagamento (para vendas/reembolsos)"
    )
    related_entity_id: Optional[str] = Field(
        None, description="ID da entidade relacionada (venda, pedido, etc.)"
    )
    notes: Optional[str] = Field(None, description="Observações sobre a operação")


class CashierWithdrawal(BaseModel):
    """Modelo para ruptura (retirada de dinheiro) do caixa."""

    amount: float = Field(..., gt=0, description="Valor a ser retirado do caixa")
    operator_id: str = Field(
        ..., description="ID do usuário que está realizando a retirada"
    )
    reason: str = Field(..., description="Motivo da retirada")
    authorized_by: Optional[str] = Field(
        None, description="ID do usuário que autorizou a retirada (se aplicável)"
    )
    notes: Optional[str] = Field(
        None, description="Observações adicionais sobre a retirada"
    )


class Cashier(CashierBase):
    """Modelo completo de um caixa."""

    id: str = Field(..., description="ID único do caixa")
    status: CashierStatus = Field(
        ..., description="Status do caixa (aberto ou fechado)"
    )
    current_operator_id: Optional[str] = Field(
        None, description="ID do operador atual do caixa"
    )
    opening_balance: float = Field(0.0, description="Saldo inicial do caixa")
    current_balance: float = Field(0.0, description="Saldo atual do caixa")
    expected_balance: float = Field(
        0.0, description="Saldo esperado do caixa (calculado)"
    )
    physical_cash_amount: Optional[float] = Field(
        None, description="Valor físico em dinheiro contado no fechamento"
    )
    cash_difference: Optional[float] = Field(
        None, description="Diferença entre saldo esperado e físico"
    )
    opened_at: Optional[str] = Field(
        None, description="Data e hora de abertura no formato ISO"
    )
    closed_at: Optional[str] = Field(
        None, description="Data e hora de fechamento no formato ISO"
    )
    created_at: str = Field(..., description="Data e hora de criação do registro")
    updated_at: str = Field(
        ..., description="Data e hora da última atualização do registro"
    )
    notes: Optional[str] = Field(None, description="Observações sobre o caixa")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "terminal_id": "POS-001",
                "business_day_id": "day-123",
                "status": "open",
                "current_operator_id": "operator-123",
                "opening_balance": 100.0,
                "current_balance": 350.75,
                "expected_balance": 350.75,
                "physical_cash_amount": None,
                "cash_difference": None,
                "opened_at": "2025-05-23T08:00:00Z",
                "closed_at": None,
                "created_at": "2025-05-23T08:00:00Z",
                "updated_at": "2025-05-23T10:30:00Z",
                "notes": "Caixa principal",
            }
        }


class CashierSummary(BaseModel):
    """Resumo de um caixa."""

    id: str
    terminal_id: str
    business_day_id: str
    status: CashierStatus
    current_operator_id: Optional[str]
    current_balance: float
    opened_at: Optional[str]
    closed_at: Optional[str]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "terminal_id": "POS-001",
                "business_day_id": "day-123",
                "status": "open",
                "current_operator_id": "operator-123",
                "current_balance": 350.75,
                "opened_at": "2025-05-23T08:00:00Z",
                "closed_at": None,
            }
        }


class CashierOperationResponse(BaseModel):
    """Resposta para operações de caixa."""

    id: str
    cashier_id: str
    operation_type: OperationType
    amount: float
    operator_id: str
    payment_method: Optional[PaymentMethod]
    related_entity_id: Optional[str]
    balance_before: float
    balance_after: float
    created_at: str
    notes: Optional[str]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "op-123",
                "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
                "operation_type": "sale",
                "amount": 50.75,
                "operator_id": "operator-123",
                "payment_method": "credit_card",
                "related_entity_id": "sale-123",
                "balance_before": 300.0,
                "balance_after": 350.75,
                "created_at": "2025-05-23T10:30:00Z",
                "notes": "Venda de combo",
            }
        }


class CashierReport(BaseModel):
    """Relatório de caixa."""

    cashier_id: str
    terminal_id: str
    business_day_id: str
    operator_id: str
    opening_balance: float
    closing_balance: float
    physical_cash_amount: Optional[float]
    cash_difference: Optional[float]
    total_sales: float
    total_refunds: float
    total_withdrawals: float
    total_deposits: float
    sales_by_payment_method: Dict[str, float]
    operations_count: Dict[str, int]
    opened_at: str
    closed_at: Optional[str]
    duration_minutes: Optional[int]

    class Config:
        json_schema_extra = {
            "example": {
                "cashier_id": "123e4567-e89b-12d3-a456-426614174000",
                "terminal_id": "POS-001",
                "business_day_id": "day-123",
                "operator_id": "operator-123",
                "opening_balance": 100.0,
                "closing_balance": 450.75,
                "physical_cash_amount": 150.0,
                "cash_difference": 0.0,
                "total_sales": 500.0,
                "total_refunds": 50.0,
                "total_withdrawals": 100.0,
                "total_deposits": 0.0,
                "sales_by_payment_method": {
                    "credit_card": 300.0,
                    "debit_card": 150.0,
                    "cash": 50.0,
                },
                "operations_count": {"sale": 10, "refund": 1, "withdrawal": 1},
                "opened_at": "2025-05-23T08:00:00Z",
                "closed_at": "2025-05-23T18:00:00Z",
                "duration_minutes": 600,
            }
        }


# Funções auxiliares para conversão entre modelos e entidades de domínio


def cashier_to_dict(cashier: Cashier) -> dict:
    """Converte um modelo Cashier para um dicionário."""
    return cashier.dict()


def dict_to_cashier(data: dict) -> Cashier:
    """Converte um dicionário para um modelo Cashier."""
    return Cashier(**data)


def create_cashier(cashier_create: CashierCreate, operator_id: str) -> Cashier:
    """Cria um novo caixa a partir do modelo de criação."""
    now = datetime.now().isoformat()
    return Cashier(
        id=str(uuid.uuid4()),
        terminal_id=cashier_create.terminal_id,
        business_day_id=cashier_create.business_day_id,
        status=CashierStatus.OPEN,
        current_operator_id=operator_id,
        opening_balance=cashier_create.opening_balance,
        current_balance=cashier_create.opening_balance,
        expected_balance=cashier_create.opening_balance,
        physical_cash_amount=None,
        cash_difference=None,
        opened_at=now,
        closed_at=None,
        created_at=now,
        updated_at=now,
        notes=cashier_create.notes,
    )


def create_operation(
    cashier_id: str,
    operation: CashierOperation,
    balance_before: float,
    balance_after: float,
) -> CashierOperationResponse:
    """Cria uma nova operação de caixa."""
    now = datetime.now().isoformat()
    return CashierOperationResponse(
        id=str(uuid.uuid4()),
        cashier_id=cashier_id,
        operation_type=operation.operation_type,
        amount=operation.amount,
        operator_id=operation.operator_id,
        payment_method=operation.payment_method,
        related_entity_id=operation.related_entity_id,
        balance_before=balance_before,
        balance_after=balance_after,
        created_at=now,
        notes=operation.notes,
    )
