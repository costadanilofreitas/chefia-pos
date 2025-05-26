from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime
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


class BaseModel:
    """Classe base para modelos do sistema."""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.created_at = kwargs.get('created_at', datetime.now().isoformat())
        self.updated_at = kwargs.get('updated_at', self.created_at)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o modelo para um dicionário."""
        return {
            "id": self.id,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseModel':
        """Cria um modelo a partir de um dicionário."""
        return cls(**data)


class Product(BaseModel):
    """Modelo para produtos."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = kwargs.get('name', '')
        self.description = kwargs.get('description', '')
        self.price = kwargs.get('price', 0.0)
        self.category = kwargs.get('category', '')
        self.image_url = kwargs.get('image_url', '')
        self.is_available = kwargs.get('is_available', True)
        self.stock_quantity = kwargs.get('stock_quantity', 0)
        self.is_combo = kwargs.get('is_combo', False)
        self.combo_items = kwargs.get('combo_items', [])
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o produto para um dicionário."""
        data = super().to_dict()
        data.update({
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "category": self.category,
            "image_url": self.image_url,
            "is_available": self.is_available,
            "stock_quantity": self.stock_quantity,
            "is_combo": self.is_combo,
            "combo_items": self.combo_items
        })
        return data


class OrderItem(BaseModel):
    """Modelo para itens de pedido."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.product_id = kwargs.get('product_id', '')
        self.product_name = kwargs.get('product_name', '')
        self.quantity = kwargs.get('quantity', 1)
        self.unit_price = kwargs.get('unit_price', 0.0)
        self.total_price = kwargs.get('total_price', self.quantity * self.unit_price)
        self.notes = kwargs.get('notes', '')
        self.customizations = kwargs.get('customizations', [])
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o item de pedido para um dicionário."""
        data = super().to_dict()
        data.update({
            "product_id": self.product_id,
            "product_name": self.product_name,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total_price": self.total_price,
            "notes": self.notes,
            "customizations": self.customizations
        })
        return data


class Order(BaseModel):
    """Modelo para pedidos."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.customer_id = kwargs.get('customer_id', '')
        self.customer_name = kwargs.get('customer_name', '')
        self.items = [OrderItem(**item) if isinstance(item, dict) else item 
                     for item in kwargs.get('items', [])]
        self.status = kwargs.get('status', OrderStatus.PENDING)
        self.total_amount = kwargs.get('total_amount', 0.0)
        self.payment_method = kwargs.get('payment_method', None)
        self.payment_status = kwargs.get('payment_status', PaymentStatus.PENDING)
        self.table_number = kwargs.get('table_number', None)
        self.waiter_id = kwargs.get('waiter_id', '')
        self.is_delivery = kwargs.get('is_delivery', False)
        self.delivery_address = kwargs.get('delivery_address', {})
        self.delivery_fee = kwargs.get('delivery_fee', 0.0)
        self.notes = kwargs.get('notes', '')
        self.source = kwargs.get('source', 'pos')  # pos, ifood, whatsapp, etc.
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o pedido para um dicionário."""
        data = super().to_dict()
        data.update({
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
            "source": self.source
        })
        return data
    
    def calculate_total(self) -> float:
        """Calcula o valor total do pedido."""
        items_total = sum(item.total_price for item in self.items)
        return items_total + self.delivery_fee


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
        self.cashier_id = kwargs.get('cashier_id', '')
        self.operator_id = kwargs.get('operator_id', '')
        self.operation_type = kwargs.get('operation_type', self.OperationType.OPENING)
        self.amount = kwargs.get('amount', 0.0)
        self.balance_before = kwargs.get('balance_before', 0.0)
        self.balance_after = kwargs.get('balance_after', 0.0)
        self.notes = kwargs.get('notes', '')
        self.related_order_id = kwargs.get('related_order_id', None)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte a operação de caixa para um dicionário."""
        data = super().to_dict()
        data.update({
            "cashier_id": self.cashier_id,
            "operator_id": self.operator_id,
            "operation_type": self.operation_type,
            "amount": self.amount,
            "balance_before": self.balance_before,
            "balance_after": self.balance_after,
            "notes": self.notes,
            "related_order_id": self.related_order_id
        })
        return data


class Cashier(BaseModel):
    """Modelo para caixa."""
    
    class CashierStatus(str, Enum):
        CLOSED = "closed"
        OPEN = "open"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.terminal_id = kwargs.get('terminal_id', '')
        self.status = kwargs.get('status', self.CashierStatus.CLOSED)
        self.current_operator_id = kwargs.get('current_operator_id', '')
        self.opening_balance = kwargs.get('opening_balance', 0.0)
        self.current_balance = kwargs.get('current_balance', 0.0)
        self.expected_balance = kwargs.get('expected_balance', 0.0)
        self.opened_at = kwargs.get('opened_at', None)
        self.closed_at = kwargs.get('closed_at', None)
        self.operations = kwargs.get('operations', [])
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o caixa para um dicionário."""
        data = super().to_dict()
        data.update({
            "terminal_id": self.terminal_id,
            "status": self.status,
            "current_operator_id": self.current_operator_id,
            "opening_balance": self.opening_balance,
            "current_balance": self.current_balance,
            "expected_balance": self.expected_balance,
            "opened_at": self.opened_at,
            "closed_at": self.closed_at,
            "operations": self.operations
        })
        return data


class BusinessDay(BaseModel):
    """Modelo para dia de operação."""
    
    class DayStatus(str, Enum):
        CLOSED = "closed"
        OPEN = "open"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.date = kwargs.get('date', datetime.now().date().isoformat())
        self.status = kwargs.get('status', self.DayStatus.CLOSED)
        self.opened_by = kwargs.get('opened_by', '')
        self.closed_by = kwargs.get('closed_by', '')
        self.opened_at = kwargs.get('opened_at', None)
        self.closed_at = kwargs.get('closed_at', None)
        self.total_sales = kwargs.get('total_sales', 0.0)
        self.total_orders = kwargs.get('total_orders', 0)
        self.notes = kwargs.get('notes', '')
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte o dia de operação para um dicionário."""
        data = super().to_dict()
        data.update({
            "date": self.date,
            "status": self.status,
            "opened_by": self.opened_by,
            "closed_by": self.closed_by,
            "opened_at": self.opened_at,
            "closed_at": self.closed_at,
            "total_sales": self.total_sales,
            "total_orders": self.total_orders,
            "notes": self.notes
        })
        return data
