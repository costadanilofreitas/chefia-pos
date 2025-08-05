from src.core.events.event_bus import get_event_bus, EventBus
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

# Eventos relacionados ao POS
POS_SESSION_OPENED = "pos.session.opened"
POS_SESSION_CLOSED = "pos.session.closed"
POS_SESSION_SUSPENDED = "pos.session.suspended"
POS_PAYMENT_PROCESSED = "pos.payment.processed"
POS_PAYMENT_FAILED = "pos.payment.failed"
POS_CASH_OPERATION = "pos.cash.operation"
POS_RECEIPT_PRINTED = "pos.receipt.printed"
POS_REPORT_GENERATED = "pos.report.generated"
POS_ERROR = "pos.error"

class POSEventPublisher:
    """Publicador de eventos do POS para o barramento de eventos."""
    
    def __init__(self, event_bus: Optional[EventBus] = None):
        self.event_bus = event_bus or get_event_bus()
    
    async def publish_session_opened(self, session_data: Dict[str, Any]):
        """Publica evento de abertura de sessão POS."""
        await self.event_bus.publish(POS_SESSION_OPENED, {
            "session_id": session_data["id"],
            "terminal_id": session_data["terminal_id"],
            "cashier_id": session_data["cashier_id"],
            "user_id": session_data["user_id"],
            "business_day_id": session_data["business_day_id"],
            "opening_balance": session_data["opening_balance"],
            "opened_at": session_data["opened_at"].isoformat(),
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_session_closed(self, session_data: Dict[str, Any]):
        """Publica evento de fechamento de sessão POS."""
        await self.event_bus.publish(POS_SESSION_CLOSED, {
            "session_id": session_data["id"],
            "terminal_id": session_data["terminal_id"],
            "cashier_id": session_data["cashier_id"],
            "user_id": session_data["user_id"],
            "business_day_id": session_data["business_day_id"],
            "opening_balance": session_data["opening_balance"],
            "closing_balance": session_data["closing_balance"],
            "expected_balance": session_data["expected_balance"],
            "cash_sales": session_data["cash_sales"],
            "card_sales": session_data["card_sales"],
            "pix_sales": session_data["pix_sales"],
            "other_sales": session_data["other_sales"],
            "cash_refunds": session_data["cash_refunds"],
            "card_refunds": session_data["card_refunds"],
            "pix_refunds": session_data["pix_refunds"],
            "other_refunds": session_data["other_refunds"],
            "cash_in": session_data["cash_in"],
            "cash_out": session_data["cash_out"],
            "discounts": session_data["discounts"],
            "order_count": session_data["order_count"],
            "opened_at": session_data["opened_at"].isoformat(),
            "closed_at": session_data["closed_at"].isoformat() if session_data.get("closed_at") else None,
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_session_suspended(self, session_data: Dict[str, Any], reason: str):
        """Publica evento de suspensão de sessão POS."""
        await self.event_bus.publish(POS_SESSION_SUSPENDED, {
            "session_id": session_data["id"],
            "terminal_id": session_data["terminal_id"],
            "cashier_id": session_data["cashier_id"],
            "user_id": session_data["user_id"],
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_payment_processed(self, payment_data: Dict[str, Any]):
        """Publica evento de pagamento processado."""
        await self.event_bus.publish(POS_PAYMENT_PROCESSED, {
            "payment_id": payment_data["id"],
            "order_id": payment_data["order_id"],
            "session_id": payment_data["session_id"],
            "amount": payment_data["amount"],
            "method": payment_data["method"],
            "status": payment_data["status"],
            "reference": payment_data.get("reference"),
            "card_brand": payment_data.get("card_brand"),
            "card_last_digits": payment_data.get("card_last_digits"),
            "authorization_code": payment_data.get("authorization_code"),
            "installments": payment_data.get("installments"),
            "created_at": payment_data["created_at"].isoformat(),
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_payment_failed(self, payment_data: Dict[str, Any], error_message: str):
        """Publica evento de falha no pagamento."""
        await self.event_bus.publish(POS_PAYMENT_FAILED, {
            "payment_id": payment_data.get("id", str(uuid.uuid4())),
            "order_id": payment_data["order_id"],
            "session_id": payment_data["session_id"],
            "amount": payment_data["amount"],
            "method": payment_data["method"],
            "error_message": error_message,
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_cash_operation(self, operation_data: Dict[str, Any]):
        """Publica evento de operação de caixa."""
        await self.event_bus.publish(POS_CASH_OPERATION, {
            "operation_id": operation_data["id"],
            "session_id": operation_data["session_id"],
            "amount": operation_data["amount"],
            "is_cash_in": operation_data["is_cash_in"],
            "reason": operation_data["reason"],
            "reference_id": operation_data.get("reference_id"),
            "user_id": operation_data["user_id"],
            "approved_by": operation_data.get("approved_by"),
            "created_at": operation_data["created_at"].isoformat(),
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_receipt_printed(self, receipt_data: Dict[str, Any]):
        """Publica evento de recibo impresso."""
        await self.event_bus.publish(POS_RECEIPT_PRINTED, {
            "receipt_id": receipt_data["id"],
            "type": receipt_data["type"],
            "reference_id": receipt_data["reference_id"],
            "printer_id": receipt_data["printer_id"],
            "user_id": receipt_data["user_id"],
            "terminal_id": receipt_data["terminal_id"],
            "printed_at": receipt_data["printed_at"].isoformat(),
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_report_generated(self, report_data: Dict[str, Any]):
        """Publica evento de relatório gerado."""
        await self.event_bus.publish(POS_REPORT_GENERATED, {
            "report_id": report_data["id"],
            "type": report_data["type"],
            "start_date": report_data["start_date"].isoformat(),
            "end_date": report_data["end_date"].isoformat(),
            "business_day_id": report_data.get("business_day_id"),
            "session_id": report_data.get("session_id"),
            "terminal_id": report_data.get("terminal_id"),
            "user_id": report_data["user_id"],
            "created_at": report_data["created_at"].isoformat(),
            "timestamp": datetime.now().isoformat()
        })
    
    async def publish_error(self, error_data: Dict[str, Any]):
        """Publica evento de erro no POS."""
        await self.event_bus.publish(POS_ERROR, {
            "error_id": str(uuid.uuid4()),
            "terminal_id": error_data["terminal_id"],
            "session_id": error_data.get("session_id"),
            "user_id": error_data.get("user_id"),
            "error_type": error_data["error_type"],
            "error_message": error_data["error_message"],
            "details": error_data.get("details", {}),
            "timestamp": datetime.now().isoformat()
        })

# Singleton para o publicador de eventos
_pos_event_publisher = None

def get_pos_event_publisher() -> POSEventPublisher:
    """Retorna a instância singleton do publicador de eventos do POS."""
    global _pos_event_publisher
    if _pos_event_publisher is None:
        _pos_event_publisher = POSEventPublisher()
    return _pos_event_publisher


class POSEventHandler:
    """Manipulador de eventos do POS."""
    
    def __init__(self, event_bus: Optional[EventBus] = None):
        self.event_bus = event_bus or get_event_bus()
        self.subscriptions = []
    
    async def subscribe_to_events(self):
        """Assina os eventos relevantes para o POS."""
        # Eventos do módulo de Business Day
        self.subscriptions.append(
            await self.event_bus.subscribe("business_day.opened", self.handle_business_day_opened)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("business_day.closed", self.handle_business_day_closed)
        )
        
        # Eventos do módulo de Cashier
        self.subscriptions.append(
            await self.event_bus.subscribe("cashier.opened", self.handle_cashier_opened)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("cashier.closed", self.handle_cashier_closed)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("cashier.operation", self.handle_cashier_operation)
        )
        
        # Eventos do módulo de Order
        self.subscriptions.append(
            await self.event_bus.subscribe("order.created", self.handle_order_created)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("order.updated", self.handle_order_updated)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("order.canceled", self.handle_order_canceled)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("order.payment_status_changed", self.handle_order_payment_status_changed)
        )
        
        # Eventos externos
        self.subscriptions.append(
            await self.event_bus.subscribe("external_order.received", self.handle_external_order_received)
        )
        self.subscriptions.append(
            await self.event_bus.subscribe("ifood.order_status_changed", self.handle_ifood_order_status_changed)
        )
    
    async def unsubscribe_from_events(self):
        """Cancela as assinaturas de eventos."""
        for subscription_id in self.subscriptions:
            await self.event_bus.unsubscribe(subscription_id)
        self.subscriptions = []
    
    # Handlers para eventos do Business Day
    async def handle_business_day_opened(self, event_data: Dict[str, Any]):
        """Manipula evento de abertura de dia de operação."""
        # Lógica para atualizar o estado do POS quando um dia é aberto
        print(f"Business day opened: {event_data}")
    
    async def handle_business_day_closed(self, event_data: Dict[str, Any]):
        """Manipula evento de fechamento de dia de operação."""
        # Lógica para atualizar o estado do POS quando um dia é fechado
        # Pode incluir fechamento automático de sessões abertas
        print(f"Business day closed: {event_data}")
    
    # Handlers para eventos do Cashier
    async def handle_cashier_opened(self, event_data: Dict[str, Any]):
        """Manipula evento de abertura de caixa."""
        # Lógica para atualizar o estado do POS quando um caixa é aberto
        print(f"Cashier opened: {event_data}")
    
    async def handle_cashier_closed(self, event_data: Dict[str, Any]):
        """Manipula evento de fechamento de caixa."""
        # Lógica para atualizar o estado do POS quando um caixa é fechado
        print(f"Cashier closed: {event_data}")
    
    async def handle_cashier_operation(self, event_data: Dict[str, Any]):
        """Manipula evento de operação de caixa."""
        # Lógica para atualizar o estado do POS quando ocorre uma operação de caixa
        print(f"Cashier operation: {event_data}")
    
    # Handlers para eventos do Order
    async def handle_order_created(self, event_data: Dict[str, Any]):
        """Manipula evento de criação de pedido."""
        # Lógica para atualizar o estado do POS quando um pedido é criado
        print(f"Order created: {event_data}")
    
    async def handle_order_updated(self, event_data: Dict[str, Any]):
        """Manipula evento de atualização de pedido."""
        # Lógica para atualizar o estado do POS quando um pedido é atualizado
        print(f"Order updated: {event_data}")
    
    async def handle_order_canceled(self, event_data: Dict[str, Any]):
        """Manipula evento de cancelamento de pedido."""
        # Lógica para atualizar o estado do POS quando um pedido é cancelado
        print(f"Order canceled: {event_data}")
    
    async def handle_order_payment_status_changed(self, event_data: Dict[str, Any]):
        """Manipula evento de mudança de status de pagamento de pedido."""
        # Lógica para atualizar o estado do POS quando o status de pagamento de um pedido muda
        print(f"Order payment status changed: {event_data}")
    
    # Handlers para eventos externos
    async def handle_external_order_received(self, event_data: Dict[str, Any]):
        """Manipula evento de recebimento de pedido externo."""
        # Lógica para processar pedidos recebidos de sistemas externos
        print(f"External order received: {event_data}")
    
    async def handle_ifood_order_status_changed(self, event_data: Dict[str, Any]):
        """Manipula evento de mudança de status de pedido do iFood."""
        # Lógica para atualizar o estado do POS quando o status de um pedido do iFood muda
        print(f"iFood order status changed: {event_data}")

# Singleton para o manipulador de eventos
_pos_event_handler = None

def get_pos_event_handler() -> POSEventHandler:
    """Retorna a instância singleton do manipulador de eventos do POS."""
    global _pos_event_handler
    if _pos_event_handler is None:
        _pos_event_handler = POSEventHandler()
    return _pos_event_handler
