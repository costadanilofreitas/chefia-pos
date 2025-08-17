"""
Repository para operações de banco de dados com Remote Orders.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from sqlalchemy import and_, delete, func, select, update
from sqlalchemy.orm import selectinload

from src.core.database import get_database_manager
from src.remote_orders.models.db_models import RemoteOrder as DBRemoteOrder
from src.remote_orders.models.db_models import RemoteOrderItem as DBRemoteOrderItem
from src.remote_orders.models.db_models import (
    RemotePlatformConfig as DBRemotePlatformConfig,
)
from src.remote_orders.models.remote_order_models import (
    RemoteOrder,
    RemoteOrderCustomer,
    RemoteOrderItem,
    RemoteOrderPayment,
    RemoteOrderStatus,
    RemoteOrderUpdate,
    RemotePlatform,
    RemotePlatformConfig,
)


class RemoteOrderRepository:
    """Repository para gerenciar operações de Remote Orders no banco."""

    def __init__(self):
        self.db_manager = get_database_manager()

    async def create_remote_order(self, remote_order: RemoteOrder) -> RemoteOrder:
        """Cria um novo pedido remoto no banco."""
        async with self.db_manager.get_session() as session:
            # Criar registro principal
            db_order = DBRemoteOrder(
                remote_order_id=UUID(remote_order.id),
                provider=remote_order.platform.value,
                provider_order_id=remote_order.external_order_id,
                status=remote_order.status.value,
                customer_name=remote_order.customer.name,
                customer_phone=remote_order.customer.phone,
                customer_email=remote_order.customer.email,
                customer_document=remote_order.customer.document,
                customer_address=remote_order.customer.address,
                subtotal=float(remote_order.subtotal),
                delivery_fee=float(remote_order.delivery_fee or 0),
                service_fee=float(remote_order.service_fee or 0),
                discount=float(remote_order.discount or 0),
                total=float(remote_order.total),
                payment_method=remote_order.payment.method,
                payment_status=remote_order.payment.status,
                payment_total=float(remote_order.payment.total),
                payment_prepaid=remote_order.payment.prepaid,
                payment_online=remote_order.payment.online,
                notes=remote_order.notes,
                scheduled_for=remote_order.scheduled_for,
                raw_data=remote_order.raw_data,
            )

            session.add(db_order)
            await session.flush()  # Para obter o ID

            # Criar itens
            for item in remote_order.items:
                db_item = DBRemoteOrderItem(
                    remote_order_id=db_order.remote_order_id,
                    provider_item_id=item.external_id or item.id,
                    name=item.name,
                    quantity=float(item.quantity),
                    unit_price=float(item.unit_price),
                    subtotal=float(item.total_price),
                    notes=item.notes,
                    customizations=item.customizations,
                )
                session.add(db_item)

            await session.commit()

            # Recarregar com relacionamentos
            await session.refresh(db_order, ["items"])
            return await self._db_to_model(db_order)

    async def get_remote_order(self, order_id: str) -> Optional[RemoteOrder]:
        """Busca um pedido remoto pelo ID."""
        async with self.db_manager.get_session() as session:
            stmt = (
                select(DBRemoteOrder)
                .options(selectinload(DBRemoteOrder.items))
                .where(DBRemoteOrder.remote_order_id == UUID(order_id))
            )

            result = await session.execute(stmt)
            db_order = result.scalar_one_or_none()

            if db_order:
                return await self._db_to_model(db_order)
            return None

    async def get_remote_order_by_external_id(
        self, platform: Union[str, RemotePlatform], external_id: str
    ) -> Optional[RemoteOrder]:
        """Busca um pedido remoto pelo ID externo e plataforma."""
        platform_str = (
            platform.value if isinstance(platform, RemotePlatform) else platform
        )

        async with self.db_manager.get_session() as session:
            stmt = (
                select(DBRemoteOrder)
                .options(selectinload(DBRemoteOrder.items))
                .where(
                    and_(
                        DBRemoteOrder.provider == platform_str,
                        DBRemoteOrder.provider_order_id == external_id,
                    )
                )
            )

            result = await session.execute(stmt)
            db_order = result.scalar_one_or_none()

            if db_order:
                return await self._db_to_model(db_order)
            return None

    async def list_remote_orders(
        self,
        platform: Optional[Union[str, RemotePlatform]] = None,
        status: Optional[RemoteOrderStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[RemoteOrder]:
        """Lista pedidos remotos com filtros."""
        async with self.db_manager.get_session() as session:
            stmt = select(DBRemoteOrder).options(selectinload(DBRemoteOrder.items))

            # Aplicar filtros
            conditions = []

            if platform:
                platform_str = (
                    platform.value if isinstance(platform, RemotePlatform) else platform
                )
                conditions.append(DBRemoteOrder.provider == platform_str)

            if status:
                conditions.append(DBRemoteOrder.status == status.value)

            if start_date:
                start_dt = datetime.fromisoformat(start_date)
                conditions.append(DBRemoteOrder.created_at >= start_dt)

            if end_date:
                end_dt = datetime.fromisoformat(end_date)
                conditions.append(DBRemoteOrder.created_at <= end_dt)

            if conditions:
                stmt = stmt.where(and_(*conditions))

            # Ordenar e paginar
            stmt = stmt.order_by(DBRemoteOrder.created_at.desc())
            stmt = stmt.offset(offset).limit(limit)

            result = await session.execute(stmt)
            db_orders = result.scalars().all()

            return [await self._db_to_model(db_order) for db_order in db_orders]

    async def update_remote_order(
        self, order_id: str, update_data: RemoteOrderUpdate
    ) -> RemoteOrder:
        """Atualiza um pedido remoto."""
        async with self.db_manager.get_session() as session:
            # Construir dados de atualização
            update_dict = {}

            if update_data.status:
                update_dict["status"] = update_data.status.value

            if update_data.internal_order_id:
                update_dict["order_id"] = str(UUID(update_data.internal_order_id))

            if update_data.notes is not None:
                update_dict["notes"] = update_data.notes

            # Executar atualização
            stmt = (
                update(DBRemoteOrder)
                .where(DBRemoteOrder.remote_order_id == UUID(order_id))
                .values(**update_dict)
            )

            await session.execute(stmt)
            await session.commit()

            # Retornar pedido atualizado
            result = await self.get_remote_order(order_id)
            if result is None:
                raise ValueError(f"Order {order_id} not found after update")
            return result

    async def delete_remote_order(self, order_id: str) -> bool:
        """Remove um pedido remoto."""
        async with self.db_manager.get_session() as session:
            stmt = delete(DBRemoteOrder).where(
                DBRemoteOrder.remote_order_id == UUID(order_id)
            )

            result = await session.execute(stmt)
            await session.commit()

            return result.rowcount > 0

    async def get_orders_summary(self) -> Dict[str, Any]:
        """Obtém resumo estatístico dos pedidos remotos."""
        async with self.db_manager.get_session() as session:
            # Contar por status
            status_counts = {}
            for status in RemoteOrderStatus:
                stmt = select(func.count(DBRemoteOrder.remote_order_id)).where(
                    DBRemoteOrder.status == status.value
                )
                result = await session.execute(stmt)
                status_counts[status.value] = result.scalar() or 0

            # Contar por plataforma
            platform_counts = {}
            for platform in RemotePlatform:
                stmt = select(func.count(DBRemoteOrder.remote_order_id)).where(
                    DBRemoteOrder.provider == platform.value
                )
                result = await session.execute(stmt)
                platform_counts[platform.value] = result.scalar() or 0

            # Estatísticas do dia
            today = date.today()
            stmt_today = select(
                func.count(DBRemoteOrder.remote_order_id),
                func.coalesce(func.sum(DBRemoteOrder.total), 0),
            ).where(func.date(DBRemoteOrder.created_at) == today)

            result = await session.execute(stmt_today)
            total_today, revenue_today = result.one()

            return {
                "status_counts": status_counts,
                "platform_counts": platform_counts,
                "total_orders": sum(status_counts.values()),
                "total_today": total_today or 0,
                "revenue_today": float(revenue_today or 0),
                "pending_orders": status_counts.get("pending", 0),
                "active_orders": (
                    status_counts.get("accepted", 0)
                    + status_counts.get("preparing", 0)
                    + status_counts.get("ready", 0)
                ),
            }

    async def get_stats_by_platform(
        self, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Obtém estatísticas por plataforma."""
        async with self.db_manager.get_session() as session:
            # Construir condições de data
            date_conditions = []
            if start_date:
                date_conditions.append(
                    DBRemoteOrder.created_at >= datetime.fromisoformat(start_date)
                )
            if end_date:
                date_conditions.append(
                    DBRemoteOrder.created_at <= datetime.fromisoformat(end_date)
                )

            platform_stats = {}

            for platform in RemotePlatform:
                conditions = [
                    DBRemoteOrder.provider == platform.value
                ] + date_conditions

                # Total de pedidos
                stmt_total = select(func.count(DBRemoteOrder.remote_order_id)).where(
                    and_(*conditions)
                )
                total_result = await session.execute(stmt_total)
                total_orders = total_result.scalar() or 0

                # Pedidos completados
                completed_conditions = conditions + [
                    DBRemoteOrder.status == RemoteOrderStatus.DELIVERED.value
                ]
                stmt_completed = select(
                    func.count(DBRemoteOrder.remote_order_id),
                    func.coalesce(func.sum(DBRemoteOrder.total), 0),
                ).where(and_(*completed_conditions))

                completed_result = await session.execute(stmt_completed)
                completed_orders, total_revenue = completed_result.one()

                # Taxa de aceitação
                rejected_conditions = conditions + [
                    DBRemoteOrder.status == RemoteOrderStatus.REJECTED.value
                ]
                stmt_rejected = select(func.count(DBRemoteOrder.remote_order_id)).where(
                    and_(*rejected_conditions)
                )
                rejected_result = await session.execute(stmt_rejected)
                rejected_orders = rejected_result.scalar() or 0

                acceptance_rate = (
                    ((total_orders - rejected_orders) / total_orders * 100)
                    if total_orders > 0
                    else 0
                )

                platform_stats[platform.value] = {
                    "total_orders": total_orders,
                    "completed_orders": completed_orders or 0,
                    "total_revenue": float(total_revenue or 0),
                    "average_order_value": (
                        float(total_revenue) / completed_orders
                        if completed_orders and completed_orders > 0
                        else 0
                    ),
                    "acceptance_rate": round(acceptance_rate, 2),
                }

            return platform_stats

    # Métodos para configurações de plataformas
    async def get_platform_config(
        self, platform: Union[str, RemotePlatform]
    ) -> Optional[RemotePlatformConfig]:
        """Obtém configuração de uma plataforma."""
        platform_str = (
            platform.value if isinstance(platform, RemotePlatform) else platform
        )

        async with self.db_manager.get_session() as session:
            stmt = select(DBRemotePlatformConfig).where(
                DBRemotePlatformConfig.platform == platform_str
            )

            result = await session.execute(stmt)
            db_config = result.scalar_one_or_none()

            if db_config:
                return await self._db_config_to_model(db_config)
            return None

    async def update_platform_config(
        self, config: RemotePlatformConfig
    ) -> RemotePlatformConfig:
        """Atualiza configuração de uma plataforma."""
        async with self.db_manager.get_session() as session:
            # Verificar se já existe
            stmt_select = select(DBRemotePlatformConfig).where(
                DBRemotePlatformConfig.platform == config.platform.value
            )
            result = await session.execute(stmt_select)
            existing_config = result.scalar_one_or_none()

            if existing_config:
                # Atualizar existente
                stmt_update = (
                    update(DBRemotePlatformConfig)
                    .where(DBRemotePlatformConfig.platform == config.platform.value)
                    .values(
                        enabled=config.enabled,
                        api_key=config.api_key,
                        api_secret=config.api_secret,
                        webhook_url=config.webhook_url,
                        auto_accept=config.auto_accept,
                        default_preparation_time=config.default_preparation_time,
                        notification_email=config.notification_email,
                        notification_phone=config.notification_phone,
                    )
                )
                await session.execute(stmt_update)
            else:
                # Criar novo
                db_config = DBRemotePlatformConfig(
                    platform=config.platform.value,
                    enabled=config.enabled,
                    api_key=config.api_key,
                    api_secret=config.api_secret,
                    webhook_url=config.webhook_url,
                    auto_accept=config.auto_accept,
                    default_preparation_time=config.default_preparation_time,
                    notification_email=config.notification_email,
                    notification_phone=config.notification_phone,
                )
                session.add(db_config)

            await session.commit()
            result = await self.get_platform_config(config.platform)
            if result is None:
                raise ValueError(f"Platform config {config.platform} not found after save")
            return result

    async def list_platform_configs(self) -> List[RemotePlatformConfig]:
        """Lista todas as configurações de plataformas."""
        async with self.db_manager.get_session() as session:
            stmt = select(DBRemotePlatformConfig)
            result = await session.execute(stmt)
            db_configs = result.scalars().all()

            return [
                await self._db_config_to_model(db_config) for db_config in db_configs
            ]

    async def _db_to_model(self, db_order: DBRemoteOrder) -> RemoteOrder:
        """Converte modelo de banco para modelo Pydantic."""
        # Converter itens
        items = []
        for db_item in db_order.items:
            item = RemoteOrderItem(
                id=str(db_item.item_id),
                external_id=db_item.provider_item_id,
                name=db_item.name,
                quantity=int(db_item.quantity),
                unit_price=float(db_item.unit_price),
                total_price=float(db_item.subtotal),
                notes=db_item.notes,
                customizations=db_item.customizations or [],
            )
            items.append(item)

        # Converter dados do cliente
        customer = RemoteOrderCustomer(
            name=str(db_order.customer_name or "Cliente"),
            phone=str(db_order.customer_phone) if db_order.customer_phone else None,
            email=str(db_order.customer_email) if db_order.customer_email else None,
            address=dict(db_order.customer_address) if db_order.customer_address else None,
            document=str(db_order.customer_document) if db_order.customer_document else None,
        )

        # Converter dados de pagamento
        payment = RemoteOrderPayment(
            method=str(db_order.payment_method or "ONLINE"),
            status=str(db_order.payment_status or "PAID"),
            total=float(db_order.payment_total or db_order.total),
            prepaid=bool(db_order.payment_prepaid),
            online=bool(db_order.payment_online),
        )

        return RemoteOrder(
            id=str(db_order.remote_order_id),
            platform=RemotePlatform(db_order.provider),
            external_order_id=str(db_order.provider_order_id),
            internal_order_id=str(db_order.order_id) if db_order.order_id else None,
            status=RemoteOrderStatus(db_order.status),
            items=items,
            customer=customer,
            payment=payment,
            subtotal=float(db_order.subtotal),
            delivery_fee=float(db_order.delivery_fee or 0),
            service_fee=float(db_order.service_fee or 0),
            discount=float(db_order.discount or 0),
            total=float(db_order.total),
            notes=str(db_order.notes) if db_order.notes else None,
            scheduled_for=db_order.scheduled_for if isinstance(db_order.scheduled_for, datetime) else None,
            raw_data=dict(db_order.raw_data) if db_order.raw_data else {},
            created_at=db_order.created_at if isinstance(db_order.created_at, datetime) else datetime.now(),
            updated_at=db_order.updated_at if isinstance(db_order.updated_at, datetime) else datetime.now(),
        )

    async def _db_config_to_model(
        self, db_config: DBRemotePlatformConfig
    ) -> RemotePlatformConfig:
        """Converte configuração de banco para modelo Pydantic."""
        return RemotePlatformConfig(
            platform=RemotePlatform(db_config.platform),
            enabled=bool(db_config.enabled),
            api_key=str(db_config.api_key),
            api_secret=str(db_config.api_secret),
            webhook_url=str(db_config.webhook_url),
            auto_accept=bool(db_config.auto_accept),
            default_preparation_time=int(db_config.default_preparation_time),
            notification_email=str(db_config.notification_email) if db_config.notification_email else None,
            notification_phone=str(db_config.notification_phone) if db_config.notification_phone else None,
        )
