from enum import Enum
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel as PydanticBaseModel
import uuid


class OrderStatus(str, Enum):
    """Status possíveis para um pedido."""

    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    """Métodos de pagamento suportados."""

    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PIX = "pix"
    VOUCHER = "voucher"
    IFOOD = "ifood"


class PaymentStatus(str, Enum):
    """Status possíveis para um pagamento."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class OrderType(str, Enum):
    """Tipos de pedido."""

    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"
    DELIVERY = "delivery"


class BaseModel:
    """Classe base para modelos do sistema."""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id", str(uuid.uuid4()))
        self.created_at = kwargs.get("created_at", datetime.now().isoformat())
        self.updated_at = kwargs.get("updated_at", self.created_at)

    def to_dict(self) -> Dict[str, Any]:
        """Converte o modelo para um dicionário."""
        return {
            "id": self.id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaseModel":
        """Cria um modelo a partir de um dicionário."""
        return cls(**data)


class Product(BaseModel):
    """Modelo para produtos."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = kwargs.get("name", "")
        self.description = kwargs.get("description", "")
        self.price = kwargs.get("price", 0.0)
        self.category = kwargs.get("category", "")
        self.image_url = kwargs.get("image_url", "")
        self.is_available = kwargs.get("is_available", True)
        self.stock_quantity = kwargs.get("stock_quantity", 0)
        self.is_combo = kwargs.get("is_combo", False)
        self.combo_items = kwargs.get("combo_items", [])

    def to_dict(self) -> Dict[str, Any]:
        """Converte o produto para um dicionário."""
        data = super().to_dict()
        data.update(
            {
                "name": self.name,
                "description": self.description,
                "price": self.price,
                "category": self.category,
                "image_url": self.image_url,
                "is_available": self.is_available,
                "stock_quantity": self.stock_quantity,
                "is_combo": self.is_combo,
                "combo_items": self.combo_items,
            }
        )
        return data


class OrderItem(PydanticBaseModel):
    """Modelo para itens de pedido."""

    id: str = ""
    created_at: str = ""
    updated_at: str = ""
    product_id: str = ""
    product_name: str = ""
    quantity: int = 1
    unit_price: float = 0.0
    total_price: float = 0.0
    notes: str = ""
    customizations: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

    def to_dict(self) -> Dict[str, Any]:
        """Converte o item de pedido para um dicionário."""
        data = super().to_dict()
        data.update(
            {
                "product_id": self.product_id,
                "product_name": self.product_name,
                "quantity": self.quantity,
                "unit_price": self.unit_price,
                "total_price": self.total_price,
                "notes": self.notes,
                "customizations": self.customizations,
            }
        )
        return data


class OrderItemCreate(PydanticBaseModel):
    """Modelo para criação de item de pedido."""

    product_id: str = ""
    product_name: str = ""
    quantity: int = 1
    unit_price: float = 0.0
    notes: str = ""
    customizations: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "notes": self.notes,
            "customizations": self.customizations,
        }


class OrderItemUpdate(PydanticBaseModel):
    """Modelo para atualização de item de pedido."""

    quantity: Optional[int] = None
    notes: Optional[str] = None
    customizations: Optional[List[Dict[str, Any]]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        data = {}
        if self.quantity is not None:
            data["quantity"] = self.quantity
        if self.notes is not None:
            data["notes"] = self.notes
        if self.customizations is not None:
            data["customizations"] = self.customizations
        return data


class Order(PydanticBaseModel):
    """Modelo para pedidos."""

    id: str = ""
    created_at: str = ""
    updated_at: str = ""
    customer_id: str = ""
    customer_name: str = ""
    items: List[Dict[str, Any]] = []
    status: OrderStatus = OrderStatus.PENDING
    total_amount: float = 0.0
    payment_method: Optional[str] = None
    payment_status: PaymentStatus = PaymentStatus.PENDING
    table_number: Optional[int] = None
    waiter_id: str = ""
    is_delivery: bool = False
    delivery_address: Dict[str, Any] = {}
    delivery_fee: float = 0.0
    notes: str = ""
    source: str = "pos"
    order_type: OrderType = OrderType.DINE_IN

    class Config:
        from_attributes = True

    def to_dict(self) -> Dict[str, Any]:
        """Converte o pedido para um dicionário."""
        data = super().to_dict()
        data.update(
            {
                "customer_id": self.customer_id,
                "customer_name": self.customer_name,
                "items": [item.to_dict() for item in self.items],
                "status": self.status,
                "total_amount": self.total_amount,
                "payment_method": self.payment_method,
                "payment_status": self.payment_status,
                "table_number": self.table_number,
                "waiter_id": self.waiter_id,
                "is_delivery": self.is_delivery,
                "delivery_address": self.delivery_address,
                "delivery_fee": self.delivery_fee,
                "notes": self.notes,
                "source": self.source,
                "order_type": self.order_type,
            }
        )
        return data

    def calculate_total(self) -> float:
        """Calcula o valor total do pedido."""
        items_total = sum(item.total_price for item in self.items)
        return items_total + self.delivery_fee


class OrderCreate(PydanticBaseModel):
    """Modelo para criação de pedido."""

    customer_id: str = ""
    customer_name: str = ""
    items: List[Dict[str, Any]] = []
    table_number: Optional[int] = None
    waiter_id: str = ""
    is_delivery: bool = False
    delivery_address: Dict[str, Any] = {}
    delivery_fee: float = 0.0
    notes: str = ""
    source: str = "pos"
    order_type: OrderType = OrderType.DINE_IN

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "items": self.items,
            "table_number": self.table_number,
            "waiter_id": self.waiter_id,
            "is_delivery": self.is_delivery,
            "delivery_address": self.delivery_address,
            "delivery_fee": self.delivery_fee,
            "notes": self.notes,
            "source": self.source,
            "order_type": self.order_type,
        }


class OrderUpdate(PydanticBaseModel):
    """Modelo para atualização de pedido."""

    status: Optional[OrderStatus] = None
    payment_method: Optional[str] = None
    payment_status: Optional[PaymentStatus] = None
    table_number: Optional[int] = None
    waiter_id: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        data = {}
        if self.status is not None:
            data["status"] = self.status
        if self.payment_method is not None:
            data["payment_method"] = self.payment_method
        if self.payment_status is not None:
            data["payment_status"] = self.payment_status
        if self.table_number is not None:
            data["table_number"] = self.table_number
        if self.waiter_id is not None:
            data["waiter_id"] = self.waiter_id
        if self.notes is not None:
            data["notes"] = self.notes
        return data


class ApplyCouponRequest(PydanticBaseModel):
    """Modelo para aplicação de cupom."""

    def __init__(self, **kwargs):
        self.coupon_code = kwargs.get("coupon_code", "")

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {"coupon_code": self.coupon_code}


class ApplyPointsRequest(PydanticBaseModel):
    """Modelo para aplicação de pontos."""

    def __init__(self, **kwargs):
        self.points_amount = kwargs.get("points_amount", 0)
        self.customer_id = kwargs.get("customer_id", "")

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {"points_amount": self.points_amount, "customer_id": self.customer_id}


class DiscountResponse(PydanticBaseModel):
    """Modelo para resposta de desconto."""

    def __init__(self, **kwargs):
        self.discount_amount = kwargs.get("discount_amount", 0.0)
        self.discount_type = kwargs.get("discount_type", "")
        self.description = kwargs.get("description", "")
        self.success = kwargs.get("success", False)

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "discount_amount": self.discount_amount,
            "discount_type": self.discount_type,
            "description": self.description,
            "success": self.success,
        }


class CashierOperation(BaseModel):
    """Modelo para operações de caixa."""

    class OperationType(str, Enum):
        OPENING = "opening"
        CLOSING = "closing"
        WITHDRAWAL = "withdrawal"
        DEPOSIT = "deposit"
        SALE = "sale"
        REFUND = "refund"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.cashier_id = kwargs.get("cashier_id", "")
        self.operator_id = kwargs.get("operator_id", "")
        self.operation_type = kwargs.get("operation_type", self.OperationType.OPENING)
        self.amount = kwargs.get("amount", 0.0)
        self.balance_before = kwargs.get("balance_before", 0.0)
        self.balance_after = kwargs.get("balance_after", 0.0)
        self.notes = kwargs.get("notes", "")
        self.related_order_id = kwargs.get("related_order_id", None)

    def to_dict(self) -> Dict[str, Any]:
        """Converte a operação de caixa para um dicionário."""
        data = super().to_dict()
        data.update(
            {
                "cashier_id": self.cashier_id,
                "operator_id": self.operator_id,
                "operation_type": self.operation_type,
                "amount": self.amount,
                "balance_before": self.balance_before,
                "balance_after": self.balance_after,
                "notes": self.notes,
                "related_order_id": self.related_order_id,
            }
        )
        return data


class Cashier(BaseModel):
    """Modelo para caixa."""

    class CashierStatus(str, Enum):
        CLOSED = "closed"
        OPEN = "open"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.terminal_id = kwargs.get("terminal_id", "")
        self.status = kwargs.get("status", self.CashierStatus.CLOSED)
        self.current_operator_id = kwargs.get("current_operator_id", "")
        self.opening_balance = kwargs.get("opening_balance", 0.0)
        self.current_balance = kwargs.get("current_balance", 0.0)
        self.expected_balance = kwargs.get("expected_balance", 0.0)
        self.opened_at = kwargs.get("opened_at", None)
        self.closed_at = kwargs.get("closed_at", None)
        self.operations = kwargs.get("operations", [])

    def to_dict(self) -> Dict[str, Any]:
        """Converte o caixa para um dicionário."""
        data = super().to_dict()
        data.update(
            {
                "terminal_id": self.terminal_id,
                "status": self.status,
                "current_operator_id": self.current_operator_id,
                "opening_balance": self.opening_balance,
                "current_balance": self.current_balance,
                "expected_balance": self.expected_balance,
                "opened_at": self.opened_at,
                "closed_at": self.closed_at,
                "operations": self.operations,
            }
        )
        return data


class BusinessDay(BaseModel):
    """Modelo para dia de operação."""

    class DayStatus(str, Enum):
        CLOSED = "closed"
        OPEN = "open"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.date = kwargs.get("date", datetime.now().date().isoformat())
        self.status = kwargs.get("status", self.DayStatus.CLOSED)
        self.opened_by = kwargs.get("opened_by", "")
        self.closed_by = kwargs.get("closed_by", "")
        self.opened_at = kwargs.get("opened_at", None)
        self.closed_at = kwargs.get("closed_at", None)
        self.total_sales = kwargs.get("total_sales", 0.0)
        self.total_orders = kwargs.get("total_orders", 0)
        self.notes = kwargs.get("notes", "")

    def to_dict(self) -> Dict[str, Any]:
        """Converte o dia de operação para um dicionário."""
        data = super().to_dict()
        data.update(
            {
                "date": self.date,
                "status": self.status,
                "opened_by": self.opened_by,
                "closed_by": self.closed_by,
                "opened_at": self.opened_at,
                "closed_at": self.closed_at,
                "total_sales": self.total_sales,
                "total_orders": self.total_orders,
                "notes": self.notes,
            }
        )
        return data
