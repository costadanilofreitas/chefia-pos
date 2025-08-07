from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime
import uuid


class DayStatus(str, Enum):
    """Status possíveis para um dia de operação."""

    CLOSED = "closed"
    OPEN = "open"


class BusinessDayBase(BaseModel):
    """Modelo base para dia de operação."""

    date: str = Field(
        ..., description="Data do dia de operação no formato ISO (YYYY-MM-DD)"
    )
    notes: Optional[str] = Field(
        None, description="Observações sobre o dia de operação"
    )


class BusinessDayCreate(BusinessDayBase):
    """Modelo para criação de um dia de operação."""

    opened_by: str = Field(..., description="ID do usuário que abriu o dia")


class BusinessDayUpdate(BaseModel):
    """Modelo para atualização de um dia de operação."""

    notes: Optional[str] = Field(
        None, description="Observações sobre o dia de operação"
    )


class BusinessDayClose(BaseModel):
    """Modelo para fechamento de um dia de operação."""

    closed_by: str = Field(..., description="ID do usuário que fechou o dia")
    notes: Optional[str] = Field(None, description="Observações sobre o fechamento")


class BusinessDay(BusinessDayBase):
    """Modelo completo de um dia de operação."""

    id: str = Field(..., description="ID único do dia de operação")
    status: DayStatus = Field(..., description="Status do dia (aberto ou fechado)")
    opened_by: str = Field(..., description="ID do usuário que abriu o dia")
    closed_by: Optional[str] = Field(None, description="ID do usuário que fechou o dia")
    opened_at: str = Field(..., description="Data e hora de abertura no formato ISO")
    closed_at: Optional[str] = Field(
        None, description="Data e hora de fechamento no formato ISO"
    )
    total_sales: float = Field(0.0, description="Valor total de vendas do dia")
    total_orders: int = Field(0, description="Quantidade total de pedidos do dia")
    created_at: str = Field(..., description="Data e hora de criação do registro")
    updated_at: str = Field(
        ..., description="Data e hora da última atualização do registro"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "date": "2025-05-23",
                "status": "open",
                "opened_by": "gerente_id",
                "closed_by": None,
                "opened_at": "2025-05-23T08:00:00Z",
                "closed_at": None,
                "total_sales": 0.0,
                "total_orders": 0,
                "notes": "Dia normal de operação",
                "created_at": "2025-05-23T08:00:00Z",
                "updated_at": "2025-05-23T08:00:00Z",
            }
        }


class BusinessDaySummary(BaseModel):
    """Resumo de um dia de operação."""

    id: str
    date: str
    status: DayStatus
    opened_at: str
    closed_at: Optional[str]
    total_sales: float
    total_orders: int

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "date": "2025-05-23",
                "status": "open",
                "opened_at": "2025-05-23T08:00:00Z",
                "closed_at": None,
                "total_sales": 1250.75,
                "total_orders": 45,
            }
        }


class DailySalesReport(BaseModel):
    """Relatório de vendas diárias."""

    business_day_id: str
    date: str
    total_sales: float
    total_orders: int
    sales_by_payment_method: Dict[str, float]
    sales_by_hour: Dict[str, float]
    top_selling_products: List[Dict[str, Any]]
    average_ticket: float

    class Config:
        json_schema_extra = {
            "example": {
                "business_day_id": "123e4567-e89b-12d3-a456-426614174000",
                "date": "2025-05-23",
                "total_sales": 1250.75,
                "total_orders": 45,
                "sales_by_payment_method": {
                    "credit_card": 750.50,
                    "debit_card": 350.25,
                    "cash": 150.00,
                },
                "sales_by_hour": {
                    "08:00": 120.50,
                    "09:00": 230.75,
                    "10:00": 180.25,
                    "11:00": 320.50,
                    "12:00": 398.75,
                },
                "top_selling_products": [
                    {
                        "product_id": "p1",
                        "name": "X-Burger",
                        "quantity": 25,
                        "total": 375.00,
                    },
                    {
                        "product_id": "p2",
                        "name": "Batata Frita",
                        "quantity": 20,
                        "total": 180.00,
                    },
                    {
                        "product_id": "p3",
                        "name": "Refrigerante",
                        "quantity": 30,
                        "total": 150.00,
                    },
                ],
                "average_ticket": 27.79,
            }
        }


# Funções auxiliares para conversão entre modelos e entidades de domínio


def business_day_to_dict(business_day: BusinessDay) -> dict:
    """Converte um modelo BusinessDay para um dicionário."""
    return business_day.dict()


def dict_to_business_day(data: dict) -> BusinessDay:
    """Converte um dicionário para um modelo BusinessDay."""
    return BusinessDay(**data)


def create_business_day(
    business_day_create: BusinessDayCreate, user_id: str
) -> BusinessDay:
    """Cria um novo dia de operação a partir do modelo de criação."""
    now = datetime.now().isoformat()
    return BusinessDay(
        id=str(uuid.uuid4()),
        date=business_day_create.date,
        status=DayStatus.OPEN,
        opened_by=user_id,
        closed_by=None,
        opened_at=now,
        closed_at=None,
        total_sales=0.0,
        total_orders=0,
        notes=business_day_create.notes,
        created_at=now,
        updated_at=now,
    )
