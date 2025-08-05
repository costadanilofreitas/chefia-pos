# /home/ubuntu/pos-modern/src/supplier/models/supplier_models.py

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime
import uuid
import re


class Address(BaseModel):
    """Model for a supplier address."""

    street: str
    number: str
    complement: Optional[str] = None
    neighborhood: str
    city: str
    state: str
    zip_code: str
    country: str = "Brasil"

    @validator("zip_code")
    def validate_zip_code(cls, v):
        # Remove non-numeric characters
        v = re.sub(r"\D", "", v)

        # Check if it's a valid Brazilian CEP
        if len(v) != 8:
            raise ValueError("CEP must have 8 digits")

        # Format as 00000-000
        return f"{v[:5]}-{v[5:]}"

    class Config:
        schema_extra = {
            "example": {
                "street": "Avenida Paulista",
                "number": "1000",
                "complement": "Sala 123",
                "neighborhood": "Bela Vista",
                "city": "São Paulo",
                "state": "SP",
                "zip_code": "01310-100",
                "country": "Brasil",
            }
        }


class Contact(BaseModel):
    """Model for a supplier contact."""

    name: str
    role: Optional[str] = None
    email: EmailStr
    phone: str
    is_primary: bool = False
    notes: Optional[str] = None

    @validator("phone")
    def validate_phone(cls, v):
        # Remove non-numeric characters
        v = re.sub(r"\D", "", v)

        # Check if it's a valid Brazilian phone number
        if len(v) < 10 or len(v) > 11:
            raise ValueError("Phone must have 10 or 11 digits")

        # Format as (00) 00000-0000 or (00) 0000-0000
        if len(v) == 11:
            return f"({v[:2]}) {v[2:7]}-{v[7:]}"
        else:
            return f"({v[:2]}) {v[2:6]}-{v[6:]}"

    class Config:
        schema_extra = {
            "example": {
                "name": "João Silva",
                "role": "Gerente de Vendas",
                "email": "joao.silva@fornecedor.com",
                "phone": "(11) 98765-4321",
                "is_primary": True,
                "notes": "Prefere contato por email",
            }
        }


class PaymentTerm(BaseModel):
    """Model for supplier payment terms."""

    days: int
    discount_percentage: float = 0.0
    description: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "days": 30,
                "discount_percentage": 2.5,
                "description": "2.5% de desconto para pagamento em 30 dias",
            }
        }


class SupplierProduct(BaseModel):
    """Model for a product supplied by a supplier."""

    product_id: str
    product_name: str
    supplier_code: Optional[str] = None
    unit_price: float
    min_order_quantity: int = 1
    lead_time_days: int = 7
    is_preferred: bool = False
    last_purchase_date: Optional[datetime] = None
    last_purchase_price: Optional[float] = None

    class Config:
        schema_extra = {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "product_name": "Hambúrguer Congelado 120g",
                "supplier_code": "HAMB-120",
                "unit_price": 2.50,
                "min_order_quantity": 50,
                "lead_time_days": 3,
                "is_preferred": True,
                "last_purchase_date": "2025-05-20T10:00:00",
                "last_purchase_price": 2.45,
            }
        }


class Supplier(BaseModel):
    """Model for a supplier."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    trading_name: Optional[str] = None
    document: str  # CNPJ or CPF
    document_type: str = "CNPJ"  # CNPJ or CPF
    address: Address
    contacts: List[Contact] = []
    payment_terms: List[PaymentTerm] = []
    website: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[int] = None  # 1-5 stars
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("document")
    def validate_document(cls, v, values):
        # Remove non-numeric characters
        v = re.sub(r"\D", "", v)

        # Check document type
        doc_type = values.get("document_type", "CNPJ")

        if doc_type == "CNPJ":
            if len(v) != 14:
                raise ValueError("CNPJ must have 14 digits")

            # Format as 00.000.000/0000-00
            return f"{v[:2]}.{v[2:5]}.{v[5:8]}/{v[8:12]}-{v[12:]}"
        else:  # CPF
            if len(v) != 11:
                raise ValueError("CPF must have 11 digits")

            # Format as 000.000.000-00
            return f"{v[:3]}.{v[3:6]}.{v[6:9]}-{v[9:]}"

    class Config:
        schema_extra = {
            "example": {
                "name": "Alimentos Premium Ltda",
                "trading_name": "Premium Foods",
                "document": "12.345.678/0001-90",
                "document_type": "CNPJ",
                "address": {
                    "street": "Avenida Industrial",
                    "number": "1000",
                    "complement": "Galpão 7",
                    "neighborhood": "Distrito Industrial",
                    "city": "São Paulo",
                    "state": "SP",
                    "zip_code": "04000-000",
                    "country": "Brasil",
                },
                "contacts": [
                    {
                        "name": "Maria Oliveira",
                        "role": "Gerente de Contas",
                        "email": "maria@premiumfoods.com",
                        "phone": "(11) 98765-4321",
                        "is_primary": True,
                    }
                ],
                "payment_terms": [
                    {
                        "days": 30,
                        "discount_percentage": 2.0,
                        "description": "2% de desconto para pagamento em 30 dias",
                    },
                    {
                        "days": 15,
                        "discount_percentage": 3.5,
                        "description": "3.5% de desconto para pagamento em 15 dias",
                    },
                ],
                "website": "https://www.premiumfoods.com",
                "category": "Alimentos",
                "rating": 5,
                "is_active": True,
                "notes": "Fornecedor preferencial para carnes",
            }
        }


class SupplierCreate(BaseModel):
    """Model for creating a supplier."""

    name: str
    trading_name: Optional[str] = None
    document: str
    document_type: str = "CNPJ"
    address: Address
    contacts: List[Contact] = []
    payment_terms: List[PaymentTerm] = []
    website: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[int] = None
    is_active: bool = True
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    """Model for updating a supplier."""

    name: Optional[str] = None
    trading_name: Optional[str] = None
    document: Optional[str] = None
    document_type: Optional[str] = None
    address: Optional[Address] = None
    contacts: Optional[List[Contact]] = None
    payment_terms: Optional[List[PaymentTerm]] = None
    website: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class PurchaseOrderItem(BaseModel):
    """Model for a purchase order item."""

    product_id: str
    product_name: str
    supplier_code: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    notes: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "product_id": "123e4567-e89b-12d3-a456-426614174000",
                "product_name": "Hambúrguer Congelado 120g",
                "supplier_code": "HAMB-120",
                "quantity": 100,
                "unit_price": 2.50,
                "total_price": 250.00,
                "notes": "Entregar congelado",
            }
        }


class PurchaseOrderStatus(str, enum.Enum):
    """Enum for purchase order status."""

    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class PurchaseOrder(BaseModel):
    """Model for a purchase order."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    supplier_name: str
    order_number: str
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT
    items: List[PurchaseOrderItem] = []
    total_amount: float
    expected_delivery_date: Optional[datetime] = None
    payment_term_days: int = 30
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

    class Config:
        schema_extra = {
            "example": {
                "supplier_id": "123e4567-e89b-12d3-a456-426614174000",
                "supplier_name": "Alimentos Premium Ltda",
                "order_number": "PO-2025-0001",
                "status": "draft",
                "items": [
                    {
                        "product_id": "123e4567-e89b-12d3-a456-426614174000",
                        "product_name": "Hambúrguer Congelado 120g",
                        "supplier_code": "HAMB-120",
                        "quantity": 100,
                        "unit_price": 2.50,
                        "total_price": 250.00,
                    },
                    {
                        "product_id": "223e4567-e89b-12d3-a456-426614174001",
                        "product_name": "Pão de Hambúrguer",
                        "supplier_code": "PAO-H",
                        "quantity": 200,
                        "unit_price": 0.75,
                        "total_price": 150.00,
                    },
                ],
                "total_amount": 400.00,
                "expected_delivery_date": "2025-06-01T10:00:00",
                "payment_term_days": 30,
                "notes": "Entregar no período da manhã",
                "created_by": "user123",
            }
        }


class PurchaseOrderCreate(BaseModel):
    """Model for creating a purchase order."""

    supplier_id: str
    items: List[PurchaseOrderItem]
    expected_delivery_date: Optional[datetime] = None
    payment_term_days: int = 30
    notes: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    """Model for updating a purchase order."""

    items: Optional[List[PurchaseOrderItem]] = None
    expected_delivery_date: Optional[datetime] = None
    payment_term_days: Optional[int] = None
    notes: Optional[str] = None


class SupplierQuery(BaseModel):
    """Model for querying suppliers."""

    name: Optional[str] = None
    document: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    min_rating: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    product_id: Optional[str] = None
    limit: int = 100
    offset: int = 0

    class Config:
        schema_extra = {
            "example": {
                "name": "Premium",
                "category": "Alimentos",
                "is_active": True,
                "min_rating": 4,
                "state": "SP",
                "limit": 50,
                "offset": 0,
            }
        }
