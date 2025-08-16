import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Union

from fastapi import HTTPException

from ..models.seat_models import (
    Seat,
    SeatCreate,
    SeatGroup,
    SeatGroupCreate,
    SeatOrderItem,
    SeatOrderItemCreate,
    SeatPayment,
    SeatPaymentCreate,
    SeatUpdate,
)
from ..services.partial_payment_service import BillSplitService, PaymentSessionService

logger = logging.getLogger(__name__)


class SeatService:
    """Serviço para gerenciar assentos."""

    def __init__(self) -> None:
        self.seats: Dict[str, Seat] = {}
        self.seat_order_items: Dict[str, List[SeatOrderItem]] = {}
        self.seat_payments: Dict[str, List[SeatPayment]] = {}
        self.seat_groups: Dict[str, SeatGroup] = {}

    async def create_seat(self, seat_data: SeatCreate) -> Seat:
        """
        Cria um novo assento.

        Args:
            seat_data: Dados do assento

        Returns:
            Seat: Assento criado
        """
        seat_id = str(uuid.uuid4())
        seat = Seat(
            id=seat_id,
            table_id=seat_data.table_id,
            number=seat_data.number,
            name=seat_data.name,
            status=seat_data.status,
        )

        self.seats[seat_id] = seat
        logger.info(f"Assento criado: {seat_id} para mesa {seat_data.table_id}")
        return seat

    async def get_seat(self, seat_id: str) -> Seat:
        """
        Obtém um assento pelo ID.

        Args:
            seat_id: ID do assento

        Returns:
            Seat: Assento

        Raises:
            HTTPException: Se o assento não for encontrado
        """
        if seat_id not in self.seats:
            logger.error(f"Assento não encontrado: {seat_id}")
            raise HTTPException(
                status_code=404, detail=f"Assento não encontrado: {seat_id}"
            )

        return self.seats[seat_id]

    async def get_seats_by_table(self, table_id: str) -> List[Seat]:
        """
        Obtém todos os assentos de uma mesa.

        Args:
            table_id: ID da mesa

        Returns:
            List[Seat]: Lista de assentos
        """
        return [s for s in self.seats.values() if s.table_id == table_id]

    async def update_seat(self, seat_id: str, seat_data: SeatUpdate) -> Seat:
        """
        Atualiza um assento.

        Args:
            seat_id: ID do assento
            seat_data: Dados para atualização

        Returns:
            Seat: Assento atualizado

        Raises:
            HTTPException: Se o assento não for encontrado
        """
        seat = await self.get_seat(seat_id)

        if seat_data.name is not None:
            seat.name = seat_data.name

        if seat_data.status is not None:
            seat.status = seat_data.status

        seat.updated_at = datetime.utcnow()
        self.seats[seat_id] = seat

        logger.info(f"Assento atualizado: {seat_id}")
        return seat

    async def delete_seat(self, seat_id: str) -> None:
        """
        Remove um assento.

        Args:
            seat_id: ID do assento

        Raises:
            HTTPException: Se o assento não for encontrado ou não puder ser removido
        """
        await self.get_seat(seat_id)  # Verificar se o assento existe

        # Verificar se o assento tem itens associados
        if seat_id in self.seat_order_items and self.seat_order_items[seat_id]:
            logger.error(
                f"Não é possível remover assento com itens associados: {seat_id}"
            )
            raise HTTPException(
                status_code=400,
                detail="Não é possível remover assento com itens associados",
            )

        # Verificar se o assento tem pagamentos associados
        if seat_id in self.seat_payments and self.seat_payments[seat_id]:
            logger.error(
                f"Não é possível remover assento com pagamentos associados: {seat_id}"
            )
            raise HTTPException(
                status_code=400,
                detail="Não é possível remover assento com pagamentos associados",
            )

        # Remover assento de grupos
        for _group_id, group in self.seat_groups.items():
            if seat_id in group.seat_ids:
                logger.error(
                    f"Não é possível remover assento que pertence a um grupo: {seat_id}"
                )
                raise HTTPException(
                    status_code=400,
                    detail="Não é possível remover assento que pertence a um grupo",
                )

        del self.seats[seat_id]
        logger.info(f"Assento removido: {seat_id}")


class SeatOrderService:
    """Serviço para gerenciar associações entre assentos e itens de pedido."""

    def __init__(self, seat_service: SeatService):
        self.seat_service = seat_service
        self.seat_order_items: Dict[str, List[SeatOrderItem]] = {}
        self.order_item_seats: Dict[str, List[SeatOrderItem]] = {}

    async def assign_item_to_seat(
        self, item_data: SeatOrderItemCreate
    ) -> SeatOrderItem:
        """
        Associa um item de pedido a um assento.

        Args:
            item_data: Dados da associação

        Returns:
            SeatOrderItem: Associação criada

        Raises:
            HTTPException: Se o assento não for encontrado ou a associação for inválida
        """
        # Verificar se o assento existe
        await self.seat_service.get_seat(item_data.seat_id)

        # Criar associação
        item_id = str(uuid.uuid4())
        seat_order_item = SeatOrderItem(
            id=item_id,
            order_item_id=item_data.order_item_id,
            seat_id=item_data.seat_id,
            quantity=item_data.quantity,
        )

        # Adicionar à lista de itens do assento
        if item_data.seat_id not in self.seat_order_items:
            self.seat_order_items[item_data.seat_id] = []
        self.seat_order_items[item_data.seat_id].append(seat_order_item)

        # Adicionar à lista de assentos do item
        if item_data.order_item_id not in self.order_item_seats:
            self.order_item_seats[item_data.order_item_id] = []
        self.order_item_seats[item_data.order_item_id].append(seat_order_item)

        logger.info(
            f"Item associado ao assento: {item_data.order_item_id} -> {item_data.seat_id}"
        )
        return seat_order_item

    async def get_items_by_seat(self, seat_id: str) -> List[SeatOrderItem]:
        """
        Obtém todos os itens associados a um assento.

        Args:
            seat_id: ID do assento

        Returns:
            List[SeatOrderItem]: Lista de associações

        Raises:
            HTTPException: Se o assento não for encontrado
        """
        await self.seat_service.get_seat(seat_id)  # Verificar se o assento existe
        return self.seat_order_items.get(seat_id, [])

    async def get_seats_by_item(self, order_item_id: str) -> List[SeatOrderItem]:
        """
        Obtém todos os assentos associados a um item.

        Args:
            order_item_id: ID do item de pedido

        Returns:
            List[SeatOrderItem]: Lista de associações
        """
        return self.order_item_seats.get(order_item_id, [])

    async def remove_item_from_seat(self, seat_id: str, order_item_id: str) -> None:
        """
        Remove a associação entre um item e um assento.

        Args:
            seat_id: ID do assento
            order_item_id: ID do item de pedido

        Raises:
            HTTPException: Se a associação não for encontrada
        """
        # Verificar se o assento existe
        await self.seat_service.get_seat(seat_id)

        # Verificar se a associação existe
        if seat_id not in self.seat_order_items:
            logger.error(f"Assento não tem itens associados: {seat_id}")
            raise HTTPException(
                status_code=404, detail="Assento não tem itens associados"
            )

        # Encontrar a associação
        item_found = False
        for i, item in enumerate(self.seat_order_items[seat_id]):
            if item.order_item_id == order_item_id:
                self.seat_order_items[seat_id].pop(i)
                item_found = True
                break

        if not item_found:
            logger.error(
                f"Item não está associado ao assento: {order_item_id} -> {seat_id}"
            )
            raise HTTPException(
                status_code=404, detail="Item não está associado ao assento"
            )

        # Remover da lista de assentos do item
        if order_item_id in self.order_item_seats:
            self.order_item_seats[order_item_id] = [
                item
                for item in self.order_item_seats[order_item_id]
                if item.seat_id != seat_id
            ]

        logger.info(f"Item removido do assento: {order_item_id} -> {seat_id}")

    async def get_items_by_order_and_seat(
        self, order_id: str, seat_id: str
    ) -> List[Dict[str, Any]]:
        """
        Obtém todos os itens de um pedido associados a um assento.

        Args:
            order_id: ID do pedido
            seat_id: ID do assento

        Returns:
            List[Dict[str, Any]]: Lista de itens com detalhes

        Raises:
            HTTPException: Se o assento não for encontrado
        """
        # Esta função é um placeholder e requer integração com o serviço de pedidos
        # para obter os detalhes completos dos itens

        # Verificar se o assento existe
        await self.seat_service.get_seat(seat_id)

        # Retornar lista vazia por enquanto
        return []


class SeatPaymentService:
    """Serviço para gerenciar pagamentos por assento."""

    def __init__(
        self,
        seat_service: SeatService,
        session_service: PaymentSessionService,
        split_service: BillSplitService,
    ):
        self.seat_service = seat_service
        self.session_service = session_service
        self.split_service = split_service
        self.seat_payments: Dict[str, List[SeatPayment]] = {}
        self.payment_seats: Dict[str, List[SeatPayment]] = {}
        self.seat_groups: Dict[str, SeatGroup] = {}

    async def create_seat_payment(self, payment_data: SeatPaymentCreate) -> SeatPayment:
        """
        Associa um pagamento a um assento.

        Args:
            payment_data: Dados da associação

        Returns:
            SeatPayment: Associação criada

        Raises:
            HTTPException: Se o assento não for encontrado ou a associação for inválida
        """
        # Verificar se o assento existe
        await self.seat_service.get_seat(payment_data.seat_id)

        # Criar associação
        payment_id = str(uuid.uuid4())
        seat_payment = SeatPayment(
            id=payment_id,
            payment_id=payment_data.payment_id,
            seat_id=payment_data.seat_id,
            amount=payment_data.amount,
        )

        # Adicionar à lista de pagamentos do assento
        if payment_data.seat_id not in self.seat_payments:
            self.seat_payments[payment_data.seat_id] = []
        self.seat_payments[payment_data.seat_id].append(seat_payment)

        # Adicionar à lista de assentos do pagamento
        if payment_data.payment_id not in self.payment_seats:
            self.payment_seats[payment_data.payment_id] = []
        self.payment_seats[payment_data.payment_id].append(seat_payment)

        logger.info(
            f"Pagamento associado ao assento: {payment_data.payment_id} -> {payment_data.seat_id}"
        )
        return seat_payment

    async def get_payments_by_seat(self, seat_id: str) -> List[SeatPayment]:
        """
        Obtém todos os pagamentos associados a um assento.

        Args:
            seat_id: ID do assento

        Returns:
            List[SeatPayment]: Lista de associações

        Raises:
            HTTPException: Se o assento não for encontrado
        """
        await self.seat_service.get_seat(seat_id)  # Verificar se o assento existe
        return self.seat_payments.get(seat_id, [])

    async def get_seats_by_payment(self, payment_id: str) -> List[SeatPayment]:
        """
        Obtém todos os assentos associados a um pagamento.

        Args:
            payment_id: ID do pagamento

        Returns:
            List[SeatPayment]: Lista de associações
        """
        return self.payment_seats.get(payment_id, [])

    async def create_seat_group(self, group_data: SeatGroupCreate) -> SeatGroup:
        """
        Cria um grupo de assentos para pagamento conjunto.

        Args:
            group_data: Dados do grupo

        Returns:
            SeatGroup: Grupo criado

        Raises:
            HTTPException: Se algum assento não for encontrado
        """
        # Verificar se todos os assentos existem
        for seat_id in group_data.seat_ids:
            await self.seat_service.get_seat(seat_id)

        # Criar grupo
        group_id = str(uuid.uuid4())
        group = SeatGroup(
            id=group_id, name=group_data.name, seat_ids=group_data.seat_ids
        )

        self.seat_groups[group_id] = group
        logger.info(
            f"Grupo de assentos criado: {group_id} com {len(group_data.seat_ids)} assentos"
        )
        return group

    async def get_seat_group(self, group_id: str) -> SeatGroup:
        """
        Obtém um grupo de assentos pelo ID.

        Args:
            group_id: ID do grupo

        Returns:
            SeatGroup: Grupo

        Raises:
            HTTPException: Se o grupo não for encontrado
        """
        if group_id not in self.seat_groups:
            logger.error(f"Grupo de assentos não encontrado: {group_id}")
            raise HTTPException(
                status_code=404, detail=f"Grupo de assentos não encontrado: {group_id}"
            )

        return self.seat_groups[group_id]

    async def get_groups_by_seat(self, seat_id: str) -> List[SeatGroup]:
        """
        Obtém todos os grupos que contêm um assento.

        Args:
            seat_id: ID do assento

        Returns:
            List[SeatGroup]: Lista de grupos

        Raises:
            HTTPException: Se o assento não for encontrado
        """
        await self.seat_service.get_seat(seat_id)  # Verificar se o assento existe

        return [
            group for group in self.seat_groups.values() if seat_id in group.seat_ids
        ]

    async def create_seat_bill_split(
        self, session_id: str, seat_ids: List[str], include_shared_items: bool = True
    ) -> Dict[str, Any]:
        """
        Cria uma divisão de conta baseada em assentos.

        Args:
            session_id: ID da sessão de pagamento
            seat_ids: Lista de IDs de assentos
            include_shared_items: Se deve incluir itens compartilhados

        Returns:
            Dict[str, Any]: Informações sobre a divisão criada

        Raises:
            HTTPException: Se a sessão ou algum assento não for encontrado
        """
        # Verificar se a sessão existe
        session = await self.session_service.get_session(session_id)

        # Verificar se todos os assentos existem
        for seat_id in seat_ids:
            await self.seat_service.get_seat(seat_id)

        # Esta função é um placeholder e requer integração com o serviço de pedidos
        # para calcular os valores por assento

        # Por enquanto, vamos criar uma divisão personalizada com valores iguais
        amount_per_seat = session.total_amount / len(seat_ids)

        parts: List[Dict[str, Any]] = []
        for seat_id in seat_ids:
            seat = await self.seat_service.get_seat(seat_id)
            parts.append(
                {
                    "name": seat.name or f"Assento {seat.number}",
                    "amount": amount_per_seat,
                    "seat_id": seat_id,
                }
            )

        # Criar divisão personalizada
        formatted_parts: List[Dict[str, Union[str, float]]] = []
        for p in parts:
            # Cast explicitamente para os tipos esperados
            formatted_parts.append(
                {
                    "name": str(p["name"]),
                    "amount": float(p["amount"]),  # amount_per_seat is already float
                }
            )

        result = await self.split_service.create_custom_split(
            session_id=session_id,
            parts=formatted_parts,
        )

        # Associar partes a assentos
        split = result["split"]
        created_parts = result["parts"]

        for i, _part in enumerate(created_parts):
            seat_id = str(parts[i]["seat_id"])
            # Aqui seria necessário persistir a associação entre parte e assento
            # em um banco de dados real

        return {
            "split": split,
            "parts": created_parts,
            "seat_assignments": {p["seat_id"]: p["amount"] for p in parts},
        }
