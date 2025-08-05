from typing import List, Dict, Optional, Any, Union
import logging
from datetime import datetime
import uuid
from fastapi import HTTPException

from ..models.payment_models import PaymentStatus, PaymentMethod
from ..models.partial_payment_models import (
    PaymentSession,
    PaymentSessionStatus,
    PartialPayment,
    BillSplit,
    BillSplitMethod,
    BillSplitPart,
    SeatPayment,
)
from ..services.payment_service import PaymentService

logger = logging.getLogger(__name__)


class PaymentSessionService:
    """Serviço para gerenciar sessões de pagamento."""

    def __init__(self, payment_service: PaymentService):
        self.payment_service = payment_service
        self.sessions: Dict[str, PaymentSession] = {}
        self.partial_payments: Dict[str, List[PartialPayment]] = {}

    async def create_session(
        self, order_id: str, total_amount: float
    ) -> PaymentSession:
        """
        Cria uma nova sessão de pagamento para um pedido.

        Args:
            order_id: ID do pedido
            total_amount: Valor total do pedido

        Returns:
            PaymentSession: Sessão de pagamento criada
        """
        session_id = str(uuid.uuid4())
        session = PaymentSession(
            id=session_id,
            order_id=order_id,
            total_amount=total_amount,
            paid_amount=0,
            remaining_amount=total_amount,
            status=PaymentSessionStatus.OPEN,
        )

        self.sessions[session_id] = session
        self.partial_payments[session_id] = []

        logger.info(f"Sessão de pagamento criada: {session_id} para pedido {order_id}")
        return session

    async def get_session(self, session_id: str) -> PaymentSession:
        """
        Obtém uma sessão de pagamento pelo ID.

        Args:
            session_id: ID da sessão

        Returns:
            PaymentSession: Sessão de pagamento

        Raises:
            HTTPException: Se a sessão não for encontrada
        """
        if session_id not in self.sessions:
            logger.error(f"Sessão de pagamento não encontrada: {session_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Sessão de pagamento não encontrada: {session_id}",
            )

        return self.sessions[session_id]

    async def get_sessions_by_order(self, order_id: str) -> List[PaymentSession]:
        """
        Obtém todas as sessões de pagamento para um pedido.

        Args:
            order_id: ID do pedido

        Returns:
            List[PaymentSession]: Lista de sessões de pagamento
        """
        return [s for s in self.sessions.values() if s.order_id == order_id]

    async def update_session(
        self,
        session_id: str,
        paid_amount: Optional[float] = None,
        status: Optional[PaymentSessionStatus] = None,
    ) -> PaymentSession:
        """
        Atualiza uma sessão de pagamento.

        Args:
            session_id: ID da sessão
            paid_amount: Novo valor pago
            status: Novo status

        Returns:
            PaymentSession: Sessão atualizada

        Raises:
            HTTPException: Se a sessão não for encontrada
        """
        session = await self.get_session(session_id)

        if paid_amount is not None:
            session.paid_amount = paid_amount
            session.remaining_amount = session.total_amount - paid_amount

        if status is not None:
            session.status = status
            if status == PaymentSessionStatus.CLOSED:
                session.closed_at = datetime.utcnow()

        session.updated_at = datetime.utcnow()
        self.sessions[session_id] = session

        logger.info(f"Sessão de pagamento atualizada: {session_id}")
        return session

    async def close_session(self, session_id: str) -> PaymentSession:
        """
        Fecha uma sessão de pagamento.

        Args:
            session_id: ID da sessão

        Returns:
            PaymentSession: Sessão fechada

        Raises:
            HTTPException: Se a sessão não for encontrada ou não puder ser fechada
        """
        session = await self.get_session(session_id)

        if session.status != PaymentSessionStatus.OPEN:
            logger.error(
                f"Não é possível fechar sessão com status {session.status}: {session_id}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível fechar sessão com status {session.status}",
            )

        if session.remaining_amount > 0:
            logger.error(
                f"Não é possível fechar sessão com valor restante: {session_id}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível fechar sessão com valor restante de {session.remaining_amount}",
            )

        return await self.update_session(session_id, status=PaymentSessionStatus.CLOSED)

    async def cancel_session(self, session_id: str) -> PaymentSession:
        """
        Cancela uma sessão de pagamento.

        Args:
            session_id: ID da sessão

        Returns:
            PaymentSession: Sessão cancelada

        Raises:
            HTTPException: Se a sessão não for encontrada ou não puder ser cancelada
        """
        session = await self.get_session(session_id)

        if session.status != PaymentSessionStatus.OPEN:
            logger.error(
                f"Não é possível cancelar sessão com status {session.status}: {session_id}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível cancelar sessão com status {session.status}",
            )

        # Cancelar pagamentos pendentes
        for payment in self.partial_payments.get(session_id, []):
            if payment.status == PaymentStatus.PENDING:
                await self.payment_service.update_payment(
                    payment.id, status=PaymentStatus.CANCELLED
                )

        return await self.update_session(
            session_id, status=PaymentSessionStatus.CANCELLED
        )

    async def add_partial_payment(
        self,
        session_id: str,
        method: PaymentMethod,
        amount: float,
        customer_name: Optional[str] = None,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Dict[str, Any] = {},
    ) -> PartialPayment:
        """
        Adiciona um pagamento parcial a uma sessão.

        Args:
            session_id: ID da sessão
            method: Método de pagamento
            amount: Valor do pagamento
            customer_name: Nome do cliente
            customer_email: Email do cliente
            customer_phone: Telefone do cliente
            description: Descrição do pagamento
            metadata: Metadados adicionais

        Returns:
            PartialPayment: Pagamento parcial criado

        Raises:
            HTTPException: Se a sessão não for encontrada ou o pagamento for inválido
        """
        session = await self.get_session(session_id)

        if session.status != PaymentSessionStatus.OPEN:
            logger.error(
                f"Não é possível adicionar pagamento a sessão com status {session.status}: {session_id}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível adicionar pagamento a sessão com status {session.status}",
            )

        if amount <= 0:
            logger.error(f"Valor de pagamento inválido: {amount}")
            raise HTTPException(
                status_code=400, detail="Valor de pagamento deve ser maior que zero"
            )

        if amount > session.remaining_amount:
            logger.error(
                f"Valor de pagamento excede valor restante: {amount} > {session.remaining_amount}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Valor de pagamento excede valor restante ({amount} > {session.remaining_amount})",
            )

        # Criar pagamento parcial
        payment_data = {
            "order_id": session.order_id,
            "method": method,
            "amount": amount,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "description": description or f"Pagamento parcial - Sessão {session_id}",
            "metadata": {**metadata, "session_id": session_id, "is_partial": True},
        }

        # Usar o serviço de pagamento existente para criar o pagamento base
        payment = await self.payment_service.create_payment(**payment_data)

        # Converter para pagamento parcial
        partial_payment = PartialPayment(
            **payment.dict(),
            session_id=session_id,
            is_partial=True,
            percentage_of_total=round((amount / session.total_amount) * 100, 2),
        )

        # Adicionar à lista de pagamentos da sessão
        if session_id not in self.partial_payments:
            self.partial_payments[session_id] = []
        self.partial_payments[session_id].append(partial_payment)

        # Atualizar valor pago na sessão
        new_paid_amount = session.paid_amount + amount
        await self.update_session(session_id, paid_amount=new_paid_amount)

        # Se o valor restante for zero, fechar a sessão
        if session.remaining_amount <= 0:
            await self.close_session(session_id)

        logger.info(
            f"Pagamento parcial adicionado: {partial_payment.id} à sessão {session_id}"
        )
        return partial_payment

    async def get_payments_by_session(self, session_id: str) -> List[PartialPayment]:
        """
        Obtém todos os pagamentos de uma sessão.

        Args:
            session_id: ID da sessão

        Returns:
            List[PartialPayment]: Lista de pagamentos parciais

        Raises:
            HTTPException: Se a sessão não for encontrada
        """
        await self.get_session(session_id)  # Verificar se a sessão existe

        return self.partial_payments.get(session_id, [])


class BillSplitService:
    """Serviço para gerenciar divisões de conta."""

    def __init__(self, session_service: PaymentSessionService):
        self.session_service = session_service
        self.splits: Dict[str, BillSplit] = {}
        self.split_parts: Dict[str, List[BillSplitPart]] = {}
        self.seat_payments: Dict[str, List[SeatPayment]] = {}

    async def create_split(
        self, session_id: str, split_method: BillSplitMethod, number_of_parts: int = 1
    ) -> BillSplit:
        """
        Cria uma nova divisão de conta.

        Args:
            session_id: ID da sessão de pagamento
            split_method: Método de divisão
            number_of_parts: Número de partes

        Returns:
            BillSplit: Divisão de conta criada

        Raises:
            HTTPException: Se a sessão não for encontrada ou a divisão for inválida
        """
        # Verificar se a sessão existe
        session = await self.session_service.get_session(session_id)

        if session.status != PaymentSessionStatus.OPEN:
            logger.error(
                f"Não é possível criar divisão para sessão com status {session.status}: {session_id}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível criar divisão para sessão com status {session.status}",
            )

        # Verificar se já existe uma divisão para esta sessão
        existing_splits = [
            s for s in self.splits.values() if s.session_id == session_id
        ]
        if existing_splits:
            logger.error(f"Já existe uma divisão para a sessão: {session_id}")
            raise HTTPException(
                status_code=400, detail="Já existe uma divisão para esta sessão"
            )

        # Criar divisão
        split_id = str(uuid.uuid4())
        split = BillSplit(
            id=split_id,
            session_id=session_id,
            split_method=split_method,
            number_of_parts=number_of_parts,
        )

        self.splits[split_id] = split
        self.split_parts[split_id] = []

        logger.info(f"Divisão de conta criada: {split_id} para sessão {session_id}")
        return split

    async def get_split(self, split_id: str) -> BillSplit:
        """
        Obtém uma divisão de conta pelo ID.

        Args:
            split_id: ID da divisão

        Returns:
            BillSplit: Divisão de conta

        Raises:
            HTTPException: Se a divisão não for encontrada
        """
        if split_id not in self.splits:
            logger.error(f"Divisão de conta não encontrada: {split_id}")
            raise HTTPException(
                status_code=404, detail=f"Divisão de conta não encontrada: {split_id}"
            )

        return self.splits[split_id]

    async def get_split_by_session(self, session_id: str) -> Optional[BillSplit]:
        """
        Obtém a divisão de conta para uma sessão.

        Args:
            session_id: ID da sessão

        Returns:
            Optional[BillSplit]: Divisão de conta ou None se não existir
        """
        splits = [s for s in self.splits.values() if s.session_id == session_id]
        return splits[0] if splits else None

    async def add_split_part(
        self, split_id: str, amount: float, name: Optional[str] = None
    ) -> BillSplitPart:
        """
        Adiciona uma parte à divisão de conta.

        Args:
            split_id: ID da divisão
            amount: Valor da parte
            name: Nome ou identificador da parte

        Returns:
            BillSplitPart: Parte da divisão criada

        Raises:
            HTTPException: Se a divisão não for encontrada ou a parte for inválida
        """
        split = await self.get_split(split_id)

        if amount <= 0:
            logger.error(f"Valor da parte inválido: {amount}")
            raise HTTPException(
                status_code=400, detail="Valor da parte deve ser maior que zero"
            )

        # Verificar se o total das partes não excede o valor da sessão
        session = await self.session_service.get_session(split.session_id)
        existing_parts = self.split_parts.get(split_id, [])
        total_parts_amount = sum(p.amount for p in existing_parts) + amount

        if total_parts_amount > session.total_amount:
            logger.error(
                f"Valor total das partes excede o valor da sessão: {total_parts_amount} > {session.total_amount}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Valor total das partes excede o valor da sessão ({total_parts_amount} > {session.total_amount})",
            )

        # Criar parte
        part_id = str(uuid.uuid4())
        part = BillSplitPart(id=part_id, split_id=split_id, name=name, amount=amount)

        if split_id not in self.split_parts:
            self.split_parts[split_id] = []
        self.split_parts[split_id].append(part)

        logger.info(f"Parte adicionada à divisão: {part_id} para divisão {split_id}")
        return part

    async def get_split_parts(self, split_id: str) -> List[BillSplitPart]:
        """
        Obtém todas as partes de uma divisão.

        Args:
            split_id: ID da divisão

        Returns:
            List[BillSplitPart]: Lista de partes

        Raises:
            HTTPException: Se a divisão não for encontrada
        """
        await self.get_split(split_id)  # Verificar se a divisão existe

        return self.split_parts.get(split_id, [])

    async def create_equal_split(
        self, session_id: str, number_of_parts: int, names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Cria uma divisão igualitária.

        Args:
            session_id: ID da sessão
            number_of_parts: Número de partes
            names: Lista de nomes para as partes

        Returns:
            Dict[str, Any]: Informações sobre a divisão criada

        Raises:
            HTTPException: Se a sessão não for encontrada ou a divisão for inválida
        """
        session = await self.session_service.get_session(session_id)

        if number_of_parts < 1:
            logger.error(f"Número de partes inválido: {number_of_parts}")
            raise HTTPException(
                status_code=400, detail="Número de partes deve ser pelo menos 1"
            )

        # Criar divisão
        split = await self.create_split(
            session_id=session_id,
            split_method=BillSplitMethod.EQUAL,
            number_of_parts=number_of_parts,
        )

        # Calcular valor por parte
        amount_per_part = round(session.total_amount / number_of_parts, 2)

        # Ajustar o último valor para garantir que a soma seja exata
        last_amount = session.total_amount - (amount_per_part * (number_of_parts - 1))

        # Criar partes
        parts = []
        for i in range(number_of_parts):
            name = names[i] if names and i < len(names) else f"Parte {i+1}"
            amount = last_amount if i == number_of_parts - 1 else amount_per_part

            part = await self.add_split_part(
                split_id=split.id, amount=amount, name=name
            )
            parts.append(part)

        return {"split": split, "parts": parts, "amount_per_part": amount_per_part}

    async def create_custom_split(
        self, session_id: str, parts: List[Dict[str, Union[str, float]]]
    ) -> Dict[str, Any]:
        """
        Cria uma divisão personalizada.

        Args:
            session_id: ID da sessão
            parts: Lista de partes com nome e valor

        Returns:
            Dict[str, Any]: Informações sobre a divisão criada

        Raises:
            HTTPException: Se a sessão não for encontrada ou a divisão for inválida
        """
        session = await self.session_service.get_session(session_id)

        if not parts:
            logger.error("Lista de partes vazia")
            raise HTTPException(
                status_code=400, detail="É necessário fornecer pelo menos uma parte"
            )

        # Verificar se o total das partes é igual ao valor da sessão
        total_parts = sum(float(p["amount"]) for p in parts)
        if (
            abs(total_parts - session.total_amount) > 0.01
        ):  # Tolerância para arredondamento
            logger.error(
                f"Valor total das partes ({total_parts}) não corresponde ao valor da sessão ({session.total_amount})"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Valor total das partes ({total_parts}) não corresponde ao valor da sessão ({session.total_amount})",
            )

        # Criar divisão
        split = await self.create_split(
            session_id=session_id,
            split_method=BillSplitMethod.CUSTOM,
            number_of_parts=len(parts),
        )

        # Criar partes
        created_parts = []
        for part_data in parts:
            name = part_data.get("name", "")
            amount = float(part_data["amount"])

            part = await self.add_split_part(
                split_id=split.id, amount=amount, name=name
            )
            created_parts.append(part)

        return {"split": split, "parts": created_parts}

    async def pay_split_part(
        self,
        part_id: str,
        method: PaymentMethod,
        customer_name: Optional[str] = None,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Paga uma parte da divisão.

        Args:
            part_id: ID da parte
            method: Método de pagamento
            customer_name: Nome do cliente
            customer_email: Email do cliente
            customer_phone: Telefone do cliente

        Returns:
            Dict[str, Any]: Informações sobre o pagamento

        Raises:
            HTTPException: Se a parte não for encontrada ou já estiver paga
        """
        # Encontrar a parte
        part = None
        split_id = None

        for s_id, parts in self.split_parts.items():
            for p in parts:
                if p.id == part_id:
                    part = p
                    split_id = s_id
                    break
            if part:
                break

        if not part:
            logger.error(f"Parte não encontrada: {part_id}")
            raise HTTPException(
                status_code=404, detail=f"Parte não encontrada: {part_id}"
            )

        if part.is_paid:
            logger.error(f"Parte já está paga: {part_id}")
            raise HTTPException(status_code=400, detail="Esta parte já está paga")

        # Obter divisão e sessão
        split = await self.get_split(split_id)
        session = await self.session_service.get_session(split.session_id)

        # Criar pagamento parcial
        payment = await self.session_service.add_partial_payment(
            session_id=session.id,
            method=method,
            amount=part.amount,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            description=f"Pagamento de parte da divisão - {part.name or part.id}",
            metadata={"split_id": split.id, "part_id": part.id},
        )

        # Atualizar parte
        part.is_paid = True
        part.payment_id = payment.id
        part.updated_at = datetime.utcnow()

        # Atualizar lista de partes
        for i, p in enumerate(self.split_parts[split_id]):
            if p.id == part_id:
                self.split_parts[split_id][i] = part
                break

        return {
            "part": part,
            "payment": payment,
            "session": await self.session_service.get_session(
                session.id
            ),  # Obter sessão atualizada
        }

    async def add_seat_payment(
        self, payment_id: str, seat_id: str, amount: float
    ) -> SeatPayment:
        """
        Associa um pagamento a um assento.

        Args:
            payment_id: ID do pagamento
            seat_id: ID do assento
            amount: Valor associado ao assento

        Returns:
            SeatPayment: Associação criada
        """
        seat_payment = SeatPayment(
            id=str(uuid.uuid4()), payment_id=payment_id, seat_id=seat_id, amount=amount
        )

        if payment_id not in self.seat_payments:
            self.seat_payments[payment_id] = []
        self.seat_payments[payment_id].append(seat_payment)

        logger.info(f"Pagamento associado ao assento: {payment_id} -> {seat_id}")
        return seat_payment

    async def get_seat_payments(self, payment_id: str) -> List[SeatPayment]:
        """
        Obtém todas as associações de um pagamento com assentos.

        Args:
            payment_id: ID do pagamento

        Returns:
            List[SeatPayment]: Lista de associações
        """
        return self.seat_payments.get(payment_id, [])
