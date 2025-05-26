from src.core.events.event_bus import Event, EventType, get_event_bus
from src.cashier.models.cashier import Cashier, CashierStatus, CashierOperationResponse, OperationType
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Eventos relacionados ao caixa
async def publish_cashier_opened(cashier: Cashier) -> None:
    """Publica evento de abertura de caixa."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.CASHIER_OPENED,
        data={
            'cashier': {
                'id': cashier.id,
                'terminal_id': cashier.terminal_id,
                'business_day_id': cashier.business_day_id,
                'operator_id': cashier.current_operator_id,
                'opening_balance': cashier.opening_balance,
                'opened_at': cashier.opened_at
            },
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de abertura de caixa publicado: {cashier.id} - Terminal: {cashier.terminal_id}")


async def publish_cashier_closed(cashier: Cashier) -> None:
    """Publica evento de fechamento de caixa."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.CASHIER_CLOSED,
        data={
            'cashier': {
                'id': cashier.id,
                'terminal_id': cashier.terminal_id,
                'business_day_id': cashier.business_day_id,
                'operator_id': cashier.current_operator_id,
                'opening_balance': cashier.opening_balance,
                'closing_balance': cashier.current_balance,
                'physical_cash_amount': cashier.physical_cash_amount,
                'cash_difference': cashier.cash_difference,
                'opened_at': cashier.opened_at,
                'closed_at': cashier.closed_at
            },
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de fechamento de caixa publicado: {cashier.id} - Terminal: {cashier.terminal_id}")


async def publish_cashier_operation(operation: CashierOperationResponse, cashier: Cashier) -> None:
    """Publica evento de operação de caixa."""
    event_bus = get_event_bus()
    
    # Determinar o tipo de evento com base no tipo de operação
    event_type = None
    if operation.operation_type == OperationType.SALE:
        event_type = EventType.SALE_COMPLETED
    elif operation.operation_type == OperationType.REFUND:
        event_type = EventType.REFUND_COMPLETED
    elif operation.operation_type == OperationType.WITHDRAWAL:
        event_type = EventType.CASHIER_WITHDRAWAL
    elif operation.operation_type == OperationType.DEPOSIT:
        event_type = EventType.CASHIER_DEPOSIT
    else:
        event_type = EventType.CASHIER_OPERATION
    
    event = Event(
        event_type=event_type,
        data={
            'operation': {
                'id': operation.id,
                'cashier_id': operation.cashier_id,
                'operation_type': operation.operation_type,
                'amount': operation.amount,
                'operator_id': operation.operator_id,
                'payment_method': operation.payment_method,
                'related_entity_id': operation.related_entity_id,
                'balance_before': operation.balance_before,
                'balance_after': operation.balance_after,
                'created_at': operation.created_at
            },
            'cashier': {
                'id': cashier.id,
                'terminal_id': cashier.terminal_id,
                'business_day_id': cashier.business_day_id,
                'current_balance': cashier.current_balance
            },
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de operação de caixa publicado: {operation.operation_type} - Valor: {operation.amount} - Caixa: {cashier.id}")


async def publish_cashier_updated(cashier: Cashier, updated_fields: Dict[str, Any]) -> None:
    """Publica evento de atualização de caixa."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.CASHIER_UPDATED,
        data={
            'cashier': {
                'id': cashier.id,
                'terminal_id': cashier.terminal_id,
                'business_day_id': cashier.business_day_id,
                'status': cashier.status,
                'current_balance': cashier.current_balance
            },
            'updated_fields': updated_fields,
            'timestamp': Event.timestamp,
        }
    )
    await event_bus.publish(event)
    logger.info(f"Evento de atualização de caixa publicado: {cashier.id} - campos: {list(updated_fields.keys())}")
