from typing import List, Optional
from datetime import datetime
import uuid
import json
import os  # Added for path joining
from fastapi import HTTPException

from src.pos.models.pos_models import (
    POSSession,
    POSSessionCreate,
    POSSessionUpdate,
    POSSessionStatus,
    POSSessionSummary,
    PaymentTransaction,
    PaymentTransactionCreate,
    PaymentTransactionUpdate,
    PaymentMethod,
    PaymentStatus,
    Receipt,
    ReceiptCreate,
    ReceiptType,
    CashOperation,
    CashOperationCreate,
    POSReport,
    POSReportCreate,
    POSConfig,
)
from src.pos.events.pos_events import get_pos_event_publisher, get_pos_event_handler
from src.core.events.event_bus import get_event_bus
from src.core.dependencies import CONFIG_DIR  # Import config directory


# Serviço do POS
class POSService:
    """Serviço para gerenciamento do POS."""

    def __init__(self):
        self.event_publisher = get_pos_event_publisher()
        self.event_handler = get_pos_event_handler()
        self.event_bus = get_event_bus()

        # Dados em memória para simulação (em produção, usaria banco de dados)
        self.sessions = {}
        self.payments = {}
        self.cash_operations = {}
        self.receipts = {}
        self.reports = {}
        self.pos_configs = {}  # This might not be needed if we read from file

    async def initialize(self):
        """Inicializa o serviço, assinando eventos relevantes."""
        await self.event_handler.subscribe_to_events()

    async def shutdown(self):
        """Finaliza o serviço, cancelando assinaturas de eventos."""
        await self.event_handler.unsubscribe_from_events()

    async def get_instance_config(self, pos_id: int) -> Optional[POSConfig]:
        """Busca a configuração específica para uma instância POS pelo ID."""
        config_file_path = os.path.join(CONFIG_DIR, "pos", f"{pos_id}.json")

        if not os.path.exists(config_file_path):
            # The license check dependency already handles non-existence returning 403
            # If we reach here, the file should exist, but we double-check.
            # If somehow the file disappeared between check and read, return None.
            return None

        try:
            with open(config_file_path, "r") as f:
                config_data = json.load(f)

            # Assume the JSON contains fields for POSConfig
            # Add default values or validation if necessary
            # Ensure pos_id is included if it's part of the POSConfig model
            if "pos_id" not in config_data:
                config_data["pos_id"] = pos_id  # Add pos_id if missing

            return POSConfig(**config_data)

        except (FileNotFoundError, json.JSONDecodeError, TypeError) as e:
            # Log the error in a real application
            print(f"Error reading or parsing config file {config_file_path}: {e}")
            # Raise an internal server error as the config file is expected to be valid
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load configuration for POS ID {pos_id}",
            )

    # Métodos para Sessões POS
    async def create_session(
        self, session_data: POSSessionCreate, user_id: str, pos_id: int
    ) -> POSSession:
        """Cria uma nova sessão POS."""
        # Verificar se já existe uma sessão aberta para o mesmo caixa
        for session in self.sessions.values():
            if (
                session.cashier_id == session_data.cashier_id
                and session.status == POSSessionStatus.OPEN
            ):
                raise ValueError(
                    f"Já existe uma sessão aberta para o caixa {session_data.cashier_id}"
                )

        # Verificar se o dia de operação está aberto
        # Em produção, consultaria o serviço de Business Day
        # Simulação: assume que o dia está aberto

        # Criar nova sessão
        session_id = str(uuid.uuid4())
        session = POSSession(
            id=session_id,
            pos_id=pos_id,  # Store the licensed POS ID
            terminal_id=session_data.terminal_id,
            cashier_id=session_data.cashier_id,
            user_id=user_id,
            business_day_id=session_data.business_day_id,
            opening_balance=session_data.opening_balance,
            notes=session_data.notes,
        )

        self.sessions[session_id] = session

        # Publicar evento de abertura de sessão
        await self.event_publisher.publish_session_opened(session.dict())

        return session

    async def get_session(self, session_id: str) -> Optional[POSSession]:
        """Busca uma sessão POS pelo ID."""
        return self.sessions.get(session_id)

    async def list_sessions(
        self,
        pos_id: Optional[int] = None,
        terminal_id: Optional[str] = None,
        cashier_id: Optional[str] = None,
        user_id: Optional[str] = None,
        business_day_id: Optional[str] = None,
        status: Optional[POSSessionStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[POSSessionSummary]:
        """Lista sessões POS com filtros."""
        filtered_sessions = []

        for session in self.sessions.values():
            # Aplicar filtros
            if pos_id is not None and session.pos_id != pos_id:
                continue
            if terminal_id and session.terminal_id != terminal_id:
                continue
            if cashier_id and session.cashier_id != cashier_id:
                continue
            if user_id and session.user_id != user_id:
                continue
            if business_day_id and session.business_day_id != business_day_id:
                continue
            if status and session.status != status:
                continue

            # Filtros de data
            if start_date:
                start_dt = datetime.fromisoformat(start_date)
                if session.opened_at < start_dt:
                    continue

            if end_date:
                end_dt = datetime.fromisoformat(end_date)
                if session.opened_at > end_dt:
                    continue

            # Criar resumo da sessão
            total_sales = (
                session.cash_sales
                + session.card_sales
                + session.pix_sales
                + session.other_sales
            )

            summary = POSSessionSummary(
                id=session.id,
                pos_id=session.pos_id,
                terminal_id=session.terminal_id,
                cashier_id=session.cashier_id,
                status=session.status,
                opened_at=session.opened_at,
                closed_at=session.closed_at,
                order_count=session.order_count,
                total_sales=total_sales,
            )

            filtered_sessions.append(summary)

        # Aplicar paginação
        paginated_sessions = filtered_sessions[offset : offset + limit]

        return paginated_sessions

    async def update_session(
        self, session_id: str, session_update: POSSessionUpdate
    ) -> Optional[POSSession]:
        """Atualiza uma sessão POS."""
        session = self.sessions.get(session_id)
        if not session:
            return None

        # Atualizar campos
        update_data = session_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(session, key, value)

        # Atualizar timestamp
        session.updated_at = datetime.now()

        return session

    async def close_session(
        self, session_id: str, closing_balance: float, notes: Optional[str] = None
    ) -> Optional[POSSession]:
        """Fecha uma sessão POS."""
        session = self.sessions.get(session_id)
        if not session:
            return None

        if session.status != POSSessionStatus.OPEN:
            raise ValueError("Apenas sessões abertas podem ser fechadas")

        # Calcular saldo esperado
        expected_balance = (
            session.opening_balance
            + session.cash_sales
            - session.cash_refunds
            + session.cash_in
            - session.cash_out
        )

        # Atualizar sessão
        session.status = POSSessionStatus.CLOSED
        session.closing_balance = closing_balance
        session.expected_balance = expected_balance
        session.closed_at = datetime.now()

        if notes:
            session.notes = notes

        # Publicar evento de fechamento de sessão
        await self.event_publisher.publish_session_closed(session.dict())

        return session

    async def suspend_session(
        self, session_id: str, reason: str
    ) -> Optional[POSSession]:
        """Suspende uma sessão POS."""
        session = self.sessions.get(session_id)
        if not session:
            return None

        if session.status != POSSessionStatus.OPEN:
            raise ValueError("Apenas sessões abertas podem ser suspensas")

        # Atualizar sessão
        session.status = POSSessionStatus.SUSPENDED
        session.notes = f"Suspensa: {reason}"

        # Publicar evento de suspensão de sessão
        await self.event_publisher.publish_session_suspended(session.dict(), reason)

        return session

    # Métodos para Transações de Pagamento
    async def create_payment(
        self, payment_data: PaymentTransactionCreate
    ) -> PaymentTransaction:
        """Cria uma nova transação de pagamento."""
        # Verificar se a sessão existe e está aberta
        session = self.sessions.get(payment_data.session_id)
        if not session:
            raise ValueError(f"Sessão {payment_data.session_id} não encontrada")

        if session.status != POSSessionStatus.OPEN:
            raise ValueError("Pagamentos só podem ser processados em sessões abertas")

        # Criar nova transação
        payment_id = str(uuid.uuid4())
        payment = PaymentTransaction(id=payment_id, **payment_data.dict())

        self.payments[payment_id] = payment

        # Atualizar estatísticas da sessão
        if payment.method == PaymentMethod.CASH:
            session.cash_sales += payment.amount
        elif payment.method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD]:
            session.card_sales += payment.amount
        elif payment.method == PaymentMethod.PIX:
            session.pix_sales += payment.amount
        else:
            session.other_sales += payment.amount

        session.order_count += 1  # Assuming one payment per order for simplicity

        # Publicar evento de pagamento processado
        await self.event_publisher.publish_payment_processed(payment.dict())

        return payment

    async def get_payment(self, payment_id: str) -> Optional[PaymentTransaction]:
        """Busca uma transação de pagamento pelo ID."""
        return self.payments.get(payment_id)

    async def list_payments(
        self,
        order_id: Optional[str] = None,
        session_id: Optional[str] = None,
        method: Optional[PaymentMethod] = None,
        status: Optional[PaymentStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[PaymentTransaction]:
        """Lista transações de pagamento com filtros."""
        filtered_payments = []

        for payment in self.payments.values():
            # Aplicar filtros
            if order_id and payment.order_id != order_id:
                continue
            if session_id and payment.session_id != session_id:
                continue
            if method and payment.method != method:
                continue
            if status and payment.status != status:
                continue

            # Filtros de data
            if start_date:
                start_dt = datetime.fromisoformat(start_date)
                if payment.created_at < start_dt:
                    continue

            if end_date:
                end_dt = datetime.fromisoformat(end_date)
                if payment.created_at > end_dt:
                    continue

            filtered_payments.append(payment)

        # Aplicar paginação
        paginated_payments = filtered_payments[offset : offset + limit]

        return paginated_payments

    async def update_payment(
        self, payment_id: str, payment_update: PaymentTransactionUpdate
    ) -> Optional[PaymentTransaction]:
        """Atualiza uma transação de pagamento."""
        payment = self.payments.get(payment_id)
        if not payment:
            return None

        # Atualizar campos
        update_data = payment_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(payment, key, value)

        # Atualizar timestamp
        payment.updated_at = datetime.now()

        return payment

    async def refund_payment(
        self, payment_id: str, amount: Optional[float] = None, reason: str = ""
    ) -> Optional[PaymentTransaction]:
        """Reembolsa uma transação de pagamento."""
        payment = self.payments.get(payment_id)
        if not payment:
            return None

        if payment.status == PaymentStatus.REFUNDED:
            raise ValueError("Pagamento já foi reembolsado")

        if payment.status == PaymentStatus.CANCELED:
            raise ValueError("Pagamento já foi cancelado")

        # Verificar se a sessão existe e está aberta
        session = self.sessions.get(payment.session_id)
        if not session:
            raise ValueError(f"Sessão {payment.session_id} não encontrada")

        if session.status != POSSessionStatus.OPEN:
            raise ValueError("Reembolsos só podem ser processados em sessões abertas")

        # Determinar valor do reembolso
        refund_amount = amount if amount is not None else payment.amount

        if refund_amount > payment.amount:
            raise ValueError(
                "Valor do reembolso não pode ser maior que o valor do pagamento"
            )

        # Atualizar estatísticas da sessão
        if payment.method == PaymentMethod.CASH:
            session.cash_refunds += refund_amount
        elif payment.method in [PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD]:
            session.card_refunds += refund_amount
        elif payment.method == PaymentMethod.PIX:
            session.pix_refunds += refund_amount
        else:
            session.other_refunds += refund_amount

        # Atualizar status do pagamento
        if refund_amount == payment.amount:
            payment.status = PaymentStatus.REFUNDED
        else:
            # Assuming partial refund means the original payment is still considered 'paid' but noted
            payment.notes = (
                f"{payment.notes or ''}\nReembolso Parcial: {refund_amount} - {reason}"
            )
            # Or introduce a PARTIALLY_REFUNDED status if needed
            # payment.status = PaymentStatus.PARTIALLY_REFUNDED

        payment.updated_at = datetime.now()

        # Publish refund event if needed
        # await self.event_publisher.publish_payment_refunded(payment.dict(), refund_amount, reason)

        return payment

    # Métodos para Operações de Caixa
    async def create_cash_operation(
        self, operation_data: CashOperationCreate
    ) -> CashOperation:
        """Cria uma nova operação de caixa."""
        # Verificar se a sessão existe e está aberta
        session = self.sessions.get(operation_data.session_id)
        if not session:
            raise ValueError(f"Sessão {operation_data.session_id} não encontrada")

        if session.status != POSSessionStatus.OPEN:
            raise ValueError(
                "Operações de caixa só podem ser realizadas em sessões abertas"
            )

        # Verificar se é uma saída e se requer aprovação (simplificado)
        # if not operation_data.is_cash_in and not operation_data.approved_by:
        #     raise ValueError("Operações de saída de caixa requerem aprovação")

        # Criar nova operação
        operation_id = str(uuid.uuid4())
        operation = CashOperation(id=operation_id, **operation_data.dict())

        self.cash_operations[operation_id] = operation

        # Atualizar estatísticas da sessão
        if operation.is_cash_in:
            session.cash_in += operation.amount
        else:
            session.cash_out += operation.amount

        # Publicar evento de operação de caixa
        await self.event_publisher.publish_cash_operation(operation.dict())

        return operation

    async def get_cash_operation(self, operation_id: str) -> Optional[CashOperation]:
        """Busca uma operação de caixa pelo ID."""
        return self.cash_operations.get(operation_id)

    async def list_cash_operations(
        self,
        session_id: Optional[str] = None,
        is_cash_in: Optional[bool] = None,
        user_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CashOperation]:
        """Lista operações de caixa com filtros."""
        filtered_ops = []
        for op in self.cash_operations.values():
            if session_id and op.session_id != session_id:
                continue
            if is_cash_in is not None and op.is_cash_in != is_cash_in:
                continue
            if user_id and op.user_id != user_id:
                continue
            # Add date filters if needed
            filtered_ops.append(op)
        return filtered_ops[offset : offset + limit]

    # Métodos para Recibos
    async def create_receipt(self, receipt_data: ReceiptCreate) -> Receipt:
        """Cria um novo recibo."""
        receipt_id = str(uuid.uuid4())
        receipt = Receipt(id=receipt_id, **receipt_data.dict())
        self.receipts[receipt_id] = receipt
        # Publish event if needed
        # await self.event_publisher.publish_receipt_generated(receipt.dict())
        return receipt

    async def get_receipt(self, receipt_id: str) -> Optional[Receipt]:
        """Busca um recibo pelo ID."""
        return self.receipts.get(receipt_id)

    async def list_receipts(
        self,
        order_id: Optional[str] = None,
        session_id: Optional[str] = None,
        type: Optional[ReceiptType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Receipt]:
        """Lista recibos com filtros."""
        filtered_receipts = []
        for r in self.receipts.values():
            if order_id and r.order_id != order_id:
                continue
            if session_id and r.session_id != session_id:
                continue
            if type and r.type != type:
                continue
            filtered_receipts.append(r)
        return filtered_receipts[offset : offset + limit]

    # Métodos para Relatórios
    async def generate_report(self, report_data: POSReportCreate) -> POSReport:
        """Gera um novo relatório POS."""
        report_id = str(uuid.uuid4())
        # Logic to calculate report data based on report_data parameters
        # This is a placeholder
        calculated_data = {
            "total_sales": 1000.0,
            "total_orders": 50,
            "cash_total": 500.0,
            "card_total": 400.0,
            "pix_total": 100.0,
            "average_ticket": 20.0,
        }
        report = POSReport(id=report_id, **report_data.dict(), data=calculated_data)
        self.reports[report_id] = report
        # Publish event if needed
        # await self.event_publisher.publish_report_generated(report.dict())
        return report

    async def get_report(self, report_id: str) -> Optional[POSReport]:
        """Busca um relatório pelo ID."""
        return self.reports.get(report_id)

    async def list_reports(
        self,
        type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[POSReport]:
        """Lista relatórios com filtros."""
        filtered_reports = []
        for r in self.reports.values():
            if type and r.type != type:
                continue
            # Add date filters if needed
            filtered_reports.append(r)
        return filtered_reports[offset : offset + limit]


# Singleton instance
_pos_service = None


def get_pos_service() -> POSService:
    """Retorna a instância singleton do serviço POS."""
    global _pos_service
    if _pos_service is None:
        _pos_service = POSService()
        # Consider initializing here if needed, or manage lifecycle elsewhere
        # asyncio.create_task(_pos_service.initialize())
    return _pos_service
