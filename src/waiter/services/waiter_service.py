from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os

from src.waiter.models.waiter_models import (
    WaiterOrder, 
    WaiterOrderItem, 
    WaiterOrderStatus,
    WaiterOrderType,
    WaiterOrderCreate,
    WaiterOrderUpdate,
    WaiterOrderItemCreate,
    WaiterOrderItemUpdate,
    WaiterSession,
    WaiterSessionCreate,
    WaiterSessionUpdate,
    WaiterTable,
    WaiterTableCreate,
    WaiterTableUpdate,
    WaiterStats
)
from src.waiter.events.waiter_events import get_waiter_event_publisher
from src.product.services.product_service import get_product_service

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
WAITER_ORDERS_FILE = os.path.join(DATA_DIR, "waiter_orders.json")
WAITER_SESSIONS_FILE = os.path.join(DATA_DIR, "waiter_sessions.json")
WAITER_TABLES_FILE = os.path.join(DATA_DIR, "waiter_tables.json")
WAITER_STATS_FILE = os.path.join(DATA_DIR, "waiter_stats.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [WAITER_ORDERS_FILE, WAITER_SESSIONS_FILE, WAITER_TABLES_FILE, WAITER_STATS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            if file_path == WAITER_STATS_FILE:
                json.dump(WaiterStats().dict(), f)
            else:
                json.dump([], f)

class WaiterService:
    """Serviço para gerenciamento do módulo de garçom."""
    
    def __init__(self):
        self.event_publisher = get_waiter_event_publisher()
    
    async def create_order(self, order_data: WaiterOrderCreate) -> WaiterOrder:
        """Cria um novo pedido."""
        # Carregar dados existentes
        orders = await self._load_orders()
        
        # Gerar número de pedido
        order_number = await self._generate_order_number()
        
        # Criar novo pedido
        order = WaiterOrder(
            waiter_id=order_data.waiter_id,
            waiter_name=order_data.waiter_name,
            table_number=order_data.table_number,
            customer_count=order_data.customer_count,
            order_number=order_number,
            order_type=order_data.order_type,
            status=WaiterOrderStatus.DRAFT,
            notes=order_data.notes,
            local_id=order_data.local_id
        )
        
        # Processar itens do pedido
        product_service = get_product_service()
        subtotal = 0.0
        order_items = []
        
        for item_data in order_data.items:
            # Buscar produto
            product = await product_service.get_product(item_data.product_id)
            if not product:
                raise ValueError(f"Produto com ID {item_data.product_id} não encontrado")
            
            # Calcular preço do item
            unit_price = product.price
            
            # Ajustar preço para produtos compostos (ex: pizza meio-a-meio)
            if product.type == "composite" and item_data.sections:
                section_product_ids = {
                    section.section_id: section.product_id
                    for section in item_data.sections
                }
                unit_price = await product_service.calculate_composite_product_price(
                    product.id, section_product_ids
                )
            
            # Ajustar preço para customizações
            price_adjustment = 0.0
            for customization in item_data.customizations:
                price_adjustment += customization.price_adjustment
            
            unit_price += price_adjustment
            total_price = unit_price * item_data.quantity
            subtotal += total_price
            
            # Criar item de pedido
            order_item = WaiterOrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_type=product.type,
                quantity=item_data.quantity,
                unit_price=unit_price,
                total_price=total_price,
                customizations=item_data.customizations,
                sections=item_data.sections,
                notes=item_data.notes
            )
            
            # Adicionar item ao pedido
            order_items.append(order_item)
        
        # Atualizar pedido com itens e totais
        order.items = order_items
        order.subtotal = subtotal
        order.total = subtotal - order.discount + order.tax
        
        # Adicionar pedido
        orders.append(order.dict())
        
        # Salvar dados
        await self._save_orders(orders)
        
        # Atualizar mesa
        await self._update_table_status(order.table_number, "occupied", order.id, order.customer_count)
        
        # Publicar evento
        await self.event_publisher.publish_order_created(order)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        return order
    
    async def get_order(self, order_id: str) -> Optional[WaiterOrder]:
        """Busca um pedido pelo ID."""
        orders = await self._load_orders()
        
        order_dict = next((o for o in orders if o["id"] == order_id), None)
        if not order_dict:
            return None
        
        return WaiterOrder(**order_dict)
    
    async def get_orders_by_table(self, table_number: str) -> List[WaiterOrder]:
        """Busca pedidos por número de mesa."""
        orders = await self._load_orders()
        
        filtered_orders = [o for o in orders if o["table_number"] == table_number]
        
        return [WaiterOrder(**o) for o in filtered_orders]
    
    async def get_orders_by_waiter(self, waiter_id: str) -> List[WaiterOrder]:
        """Busca pedidos por ID do garçom."""
        orders = await self._load_orders()
        
        filtered_orders = [o for o in orders if o["waiter_id"] == waiter_id]
        
        return [WaiterOrder(**o) for o in filtered_orders]
    
    async def get_all_orders(
        self,
        status: Optional[WaiterOrderStatus] = None,
        order_type: Optional[WaiterOrderType] = None,
        waiter_id: Optional[str] = None,
        table_number: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[WaiterOrder]:
        """Lista todos os pedidos com filtros opcionais."""
        orders = await self._load_orders()
        
        # Aplicar filtros
        if status:
            orders = [o for o in orders if o["status"] == status]
        
        if order_type:
            orders = [o for o in orders if o["order_type"] == order_type]
        
        if waiter_id:
            orders = [o for o in orders if o["waiter_id"] == waiter_id]
        
        if table_number:
            orders = [o for o in orders if o["table_number"] == table_number]
        
        if start_date:
            orders = [o for o in orders if o["created_at"] >= start_date]
        
        if end_date:
            orders = [o for o in orders if o["created_at"] <= end_date]
        
        # Ordenar por data de criação (mais recente primeiro)
        orders.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Aplicar paginação
        paginated_orders = orders[offset:offset + limit]
        
        return [WaiterOrder(**o) for o in paginated_orders]
    
    async def update_order(
        self, 
        order_id: str, 
        update_data: WaiterOrderUpdate
    ) -> Optional[WaiterOrder]:
        """Atualiza um pedido."""
        orders = await self._load_orders()
        
        # Encontrar o pedido a ser atualizado
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        if order_index is None:
            return None
        
        # Verificar se o pedido pode ser modificado
        if orders[order_index]["status"] not in [
            WaiterOrderStatus.DRAFT, 
            WaiterOrderStatus.SENT
        ]:
            raise ValueError("Não é possível modificar um pedido que já foi entregue ou cancelado")
        
        # Filtrar campos não nulos do update_data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        # Atualizar campos
        orders[order_index].update(update_dict)
        orders[order_index]["updated_at"] = datetime.now().isoformat()
        
        # Se o status for alterado para SENT, definir sent_at
        if update_data.status == WaiterOrderStatus.SENT and not orders[order_index].get("sent_at"):
            orders[order_index]["sent_at"] = datetime.now().isoformat()
        
        # Se o status for alterado para DELIVERED, definir completed_at
        if update_data.status == WaiterOrderStatus.DELIVERED and not orders[order_index].get("completed_at"):
            orders[order_index]["completed_at"] = datetime.now().isoformat()
            
            # Atualizar mesa para disponível
            await self._update_table_status(
                orders[order_index]["table_number"], 
                "cleaning", 
                None, 
                None
            )
        
        # Salvar dados
        await self._save_orders(orders)
        
        # Publicar evento
        await self.event_publisher.publish_order_updated(order_id, update_dict)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        return WaiterOrder(**orders[order_index])
    
    async def send_order_to_kitchen(self, order_id: str) -> Optional[WaiterOrder]:
        """Envia um pedido para a cozinha."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Verificar se o pedido pode ser enviado
        if order.status != WaiterOrderStatus.DRAFT:
            raise ValueError("Apenas pedidos em rascunho podem ser enviados para a cozinha")
        
        # Atualizar status
        update_data = WaiterOrderUpdate(status=WaiterOrderStatus.SENT)
        updated_order = await self.update_order(order_id, update_data)
        
        if updated_order:
            # Publicar evento específico de envio para a cozinha
            await self.event_publisher.publish_order_sent(updated_order)
        
        return updated_order
    
    async def cancel_order(
        self, 
        order_id: str, 
        reason: Optional[str] = None
    ) -> Optional[WaiterOrder]:
        """Cancela um pedido."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Verificar se o pedido pode ser cancelado
        if order.status in [WaiterOrderStatus.DELIVERED, WaiterOrderStatus.CANCELLED]:
            raise ValueError("Não é possível cancelar um pedido que já foi entregue ou cancelado")
        
        # Atualizar status
        update_data = WaiterOrderUpdate(
            status=WaiterOrderStatus.CANCELLED,
            notes=f"Cancelado: {reason}" if reason else order.notes
        )
        updated_order = await self.update_order(order_id, update_data)
        
        if updated_order:
            # Publicar evento específico de cancelamento
            await self.event_publisher.publish_order_cancelled(order_id, reason)
            
            # Se o pedido estava em uma mesa, atualizar a mesa para disponível
            if order.table_number:
                await self._update_table_status(order.table_number, "available", None, None)
        
        return updated_order
    
    async def add_order_item(
        self, 
        order_id: str, 
        item_data: WaiterOrderItemCreate
    ) -> Optional[WaiterOrderItem]:
        """Adiciona um item a um pedido existente."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Verificar se o pedido pode ser modificado
        if order.status not in [WaiterOrderStatus.DRAFT, WaiterOrderStatus.SENT]:
            raise ValueError("Não é possível adicionar itens a um pedido que já foi entregue ou cancelado")
        
        # Buscar produto
        product_service = get_product_service()
        product = await product_service.get_product(item_data.product_id)
        if not product:
            raise ValueError(f"Produto com ID {item_data.product_id} não encontrado")
        
        # Calcular preço do item
        unit_price = product.price
        
        # Ajustar preço para produtos compostos (ex: pizza meio-a-meio)
        if product.type == "composite" and item_data.sections:
            section_product_ids = {
                section.section_id: section.product_id
                for section in item_data.sections
            }
            unit_price = await product_service.calculate_composite_product_price(
                product.id, section_product_ids
            )
        
        # Ajustar preço para customizações
        price_adjustment = 0.0
        for customization in item_data.customizations:
            price_adjustment += customization.price_adjustment
        
        unit_price += price_adjustment
        total_price = unit_price * item_data.quantity
        
        # Criar item de pedido
        order_item = WaiterOrderItem(
            order_id=order_id,
            product_id=product.id,
            product_name=product.name,
            product_type=product.type,
            quantity=item_data.quantity,
            unit_price=unit_price,
            total_price=total_price,
            customizations=item_data.customizations,
            sections=item_data.sections,
            notes=item_data.notes
        )
        
        # Atualizar pedido
        orders = await self._load_orders()
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        
        if order_index is not None:
            # Adicionar item
            if "items" not in orders[order_index]:
                orders[order_index]["items"] = []
            
            orders[order_index]["items"].append(order_item.dict())
            
            # Atualizar totais
            orders[order_index]["subtotal"] += total_price
            orders[order_index]["total"] = orders[order_index]["subtotal"] - orders[order_index]["discount"] + orders[order_index]["tax"]
            orders[order_index]["updated_at"] = datetime.now().isoformat()
            
            # Salvar dados
            await self._save_orders(orders)
            
            # Publicar evento
            await self.event_publisher.publish_order_updated(
                order_id, 
                {"items": orders[order_index]["items"], "subtotal": orders[order_index]["subtotal"], "total": orders[order_index]["total"]}
            )
        
        return order_item
    
    async def update_order_item(
        self, 
        order_id: str,
        item_id: str, 
        update_data: WaiterOrderItemUpdate
    ) -> Optional[WaiterOrderItem]:
        """Atualiza um item de pedido."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Verificar se o pedido pode ser modificado
        if order.status not in [WaiterOrderStatus.DRAFT, WaiterOrderStatus.SENT]:
            raise ValueError("Não é possível modificar itens de um pedido que já foi entregue ou cancelado")
        
        # Encontrar o item
        item_index = next((i for i, item in enumerate(order.items) if item.id == item_id), None)
        if item_index is None:
            return None
        
        # Obter item atual
        item = order.items[item_index]
        
        # Calcular diferença de preço
        old_total = item.total_price
        
        # Atualizar campos
        if update_data.quantity is not None:
            item.quantity = update_data.quantity
            item.total_price = item.unit_price * update_data.quantity
        
        if update_data.customizations is not None:
            # Recalcular preço unitário
            product_service = get_product_service()
            product = await product_service.get_product(item.product_id)
            if not product:
                raise ValueError(f"Produto com ID {item.product_id} não encontrado")
            
            unit_price = product.price
            
            # Ajustar preço para customizações
            price_adjustment = 0.0
            for customization in update_data.customizations:
                price_adjustment += customization.price_adjustment
            
            unit_price += price_adjustment
            item.unit_price = unit_price
            item.total_price = unit_price * item.quantity
            item.customizations = update_data.customizations
        
        if update_data.notes is not None:
            item.notes = update_data.notes
        
        # Calcular diferença de preço
        price_difference = item.total_price - old_total
        
        # Atualizar pedido
        orders = await self._load_orders()
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        
        if order_index is not None:
            # Atualizar item
            orders[order_index]["items"][item_index] = item.dict()
            
            # Atualizar totais
            orders[order_index]["subtotal"] += price_difference
            orders[order_index]["total"] = orders[order_index]["subtotal"] - orders[order_index]["discount"] + orders[order_index]["tax"]
            orders[order_index]["updated_at"] = datetime.now().isoformat()
            
            # Salvar dados
            await self._save_orders(orders)
            
            # Publicar evento
            await self.event_publisher.publish_order_updated(
                order_id, 
                {"items": orders[order_index]["items"], "subtotal": orders[order_index]["subtotal"], "total": orders[order_index]["total"]}
            )
        
        return item
    
    async def remove_order_item(self, order_id: str, item_id: str) -> bool:
        """Remove um item de um pedido."""
        order = await self.get_order(order_id)
        if not order:
            return False
        
        # Verificar se o pedido pode ser modificado
        if order.status not in [WaiterOrderStatus.DRAFT, WaiterOrderStatus.SENT]:
            raise ValueError("Não é possível remover itens de um pedido que já foi entregue ou cancelado")
        
        # Encontrar o item
        item_index = next((i for i, item in enumerate(order.items) if item.id == item_id), None)
        if item_index is None:
            return False
        
        # Obter item a ser removido
        item = order.items[item_index]
        
        # Atualizar pedido
        orders = await self._load_orders()
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order_id), None)
        
        if order_index is not None:
            # Remover item
            orders[order_index]["items"].pop(item_index)
            
            # Atualizar totais
            orders[order_index]["subtotal"] -= item.total_price
            orders[order_index]["total"] = orders[order_index]["subtotal"] - orders[order_index]["discount"] + orders[order_index]["tax"]
            orders[order_index]["updated_at"] = datetime.now().isoformat()
            
            # Salvar dados
            await self._save_orders(orders)
            
            # Publicar evento
            await self.event_publisher.publish_order_updated(
                order_id, 
                {"items": orders[order_index]["items"], "subtotal": orders[order_index]["subtotal"], "total": orders[order_index]["total"]}
            )
            
            return True
        
        return False
    
    async def create_session(self, session_data: WaiterSessionCreate) -> WaiterSession:
        """Cria uma nova sessão do módulo de garçom."""
        session = WaiterSession(
            waiter_id=session_data.waiter_id,
            waiter_name=session_data.waiter_name,
            device_id=session_data.device_id,
            device_type=session_data.device_type,
            is_personal_device=session_data.is_personal_device
        )
        
        # Salvar a sessão
        sessions = await self._load_sessions()
        sessions.append(session.dict())
        await self._save_sessions(sessions)
        
        # Publicar evento
        await self.event_publisher.publish_session_created(session.dict())
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[WaiterSession]:
        """Busca uma sessão pelo ID."""
        sessions = await self._load_sessions()
        session_dict = next((s for s in sessions if s["id"] == session_id), None)
        
        if not session_dict:
            return None
        
        return WaiterSession(**session_dict)
    
    async def get_session_by_device(self, device_id: str) -> Optional[WaiterSession]:
        """Busca uma sessão pelo ID do dispositivo."""
        sessions = await self._load_sessions()
        session_dict = next((s for s in sessions if s["device_id"] == device_id and s["active"]), None)
        
        if not session_dict:
            return None
        
        return WaiterSession(**session_dict)
    
    async def get_all_sessions(self, active_only: bool = False) -> List[WaiterSession]:
        """Lista todas as sessões."""
        sessions = await self._load_sessions()
        
        if active_only:
            sessions = [s for s in sessions if s["active"]]
        
        return [WaiterSession(**s) for s in sessions]
    
    async def update_session(
        self, 
        session_id: str, 
        update_data: WaiterSessionUpdate
    ) -> Optional[WaiterSession]:
        """Atualiza uma sessão."""
        sessions = await self._load_sessions()
        session_index = next((i for i, s in enumerate(sessions) if s["id"] == session_id), None)
        
        if session_index is None:
            return None
        
        # Atualizar campos
        session = sessions[session_index]
        
        if update_data.active is not None:
            session["active"] = update_data.active
        
        if update_data.last_sync_at is not None:
            session["last_sync_at"] = update_data.last_sync_at.isoformat()
        
        session["updated_at"] = datetime.now().isoformat()
        
        # Salvar a sessão atualizada
        await self._save_sessions(sessions)
        
        # Publicar evento
        await self.event_publisher.publish_session_updated(session)
        
        return WaiterSession(**session)
    
    async def create_table(self, table_data: WaiterTableCreate) -> WaiterTable:
        """Cria uma nova mesa."""
        table = WaiterTable(
            number=table_data.number,
            name=table_data.name,
            capacity=table_data.capacity
        )
        
        # Salvar a mesa
        tables = await self._load_tables()
        
        # Verificar se já existe uma mesa com o mesmo número
        if any(t["number"] == table.number for t in tables):
            raise ValueError(f"Já existe uma mesa com o número {table.number}")
        
        tables.append(table.dict())
        await self._save_tables(tables)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        return table
    
    async def get_table(self, table_id: str) -> Optional[WaiterTable]:
        """Busca uma mesa pelo ID."""
        tables = await self._load_tables()
        table_dict = next((t for t in tables if t["id"] == table_id), None)
        
        if not table_dict:
            return None
        
        return WaiterTable(**table_dict)
    
    async def get_table_by_number(self, table_number: str) -> Optional[WaiterTable]:
        """Busca uma mesa pelo número."""
        tables = await self._load_tables()
        table_dict = next((t for t in tables if t["number"] == table_number), None)
        
        if not table_dict:
            return None
        
        return WaiterTable(**table_dict)
    
    async def get_all_tables(self, status: Optional[str] = None) -> List[WaiterTable]:
        """Lista todas as mesas."""
        tables = await self._load_tables()
        
        if status:
            tables = [t for t in tables if t["status"] == status]
        
        # Ordenar por número
        tables.sort(key=lambda x: x["number"])
        
        return [WaiterTable(**t) for t in tables]
    
    async def update_table(
        self, 
        table_id: str, 
        update_data: WaiterTableUpdate
    ) -> Optional[WaiterTable]:
        """Atualiza uma mesa."""
        tables = await self._load_tables()
        table_index = next((i for i, t in enumerate(tables) if t["id"] == table_id), None)
        
        if table_index is None:
            return None
        
        # Atualizar campos
        table = tables[table_index]
        
        if update_data.name is not None:
            table["name"] = update_data.name
        
        if update_data.capacity is not None:
            table["capacity"] = update_data.capacity
        
        if update_data.status is not None:
            table["status"] = update_data.status
            
            # Se a mesa estiver sendo ocupada, registrar o horário
            if update_data.status == "occupied" and update_data.current_order_id:
                table["occupied_at"] = datetime.now().isoformat()
        
        if update_data.current_order_id is not None:
            table["current_order_id"] = update_data.current_order_id
        
        if update_data.customer_count is not None:
            table["customer_count"] = update_data.customer_count
        
        if update_data.occupied_at is not None:
            table["occupied_at"] = update_data.occupied_at.isoformat()
        
        table["last_updated_at"] = datetime.now().isoformat()
        
        # Salvar a mesa atualizada
        await self._save_tables(tables)
        
        # Publicar evento
        await self.event_publisher.publish_table_updated(table)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        return WaiterTable(**table)
    
    async def _update_table_status(
        self, 
        table_number: str, 
        status: str,
        order_id: Optional[str] = None,
        customer_count: Optional[int] = None
    ) -> Optional[WaiterTable]:
        """Atualiza o status de uma mesa."""
        table = await self.get_table_by_number(table_number)
        if not table:
            return None
        
        update_data = WaiterTableUpdate(
            status=status,
            current_order_id=order_id,
            customer_count=customer_count
        )
        
        return await self.update_table(table.id, update_data)
    
    async def get_stats(self) -> WaiterStats:
        """Retorna estatísticas do módulo de garçom."""
        try:
            with open(WAITER_STATS_FILE, 'r') as f:
                stats_dict = json.load(f)
                return WaiterStats(**stats_dict)
        except (FileNotFoundError, json.JSONDecodeError):
            # Se o arquivo não existir ou estiver vazio, retornar estatísticas padrão
            return WaiterStats()
    
    async def _update_stats(self) -> None:
        """Atualiza as estatísticas do módulo de garçom."""
        # Carregar todos os pedidos
        orders = await self._load_orders()
        
        # Contar pedidos por status
        draft_orders = [o for o in orders if o["status"] == WaiterOrderStatus.DRAFT]
        sent_orders = [o for o in orders if o["status"] == WaiterOrderStatus.SENT]
        preparing_orders = [o for o in orders if o["status"] == WaiterOrderStatus.PREPARING]
        ready_orders = [o for o in orders if o["status"] == WaiterOrderStatus.READY]
        delivered_orders = [o for o in orders if o["status"] == WaiterOrderStatus.DELIVERED]
        cancelled_orders = [o for o in orders if o["status"] == WaiterOrderStatus.CANCELLED]
        
        # Carregar todas as mesas
        tables = await self._load_tables()
        
        # Contar mesas por status
        available_tables = [t for t in tables if t["status"] == "available"]
        occupied_tables = [t for t in tables if t["status"] == "occupied"]
        reserved_tables = [t for t in tables if t["status"] == "reserved"]
        cleaning_tables = [t for t in tables if t["status"] == "cleaning"]
        
        # Calcular tempo médio de serviço
        avg_service_time = None
        if delivered_orders:
            service_times = []
            for order in delivered_orders:
                if order.get("sent_at") and order.get("completed_at"):
                    sent = datetime.fromisoformat(order["sent_at"])
                    completed = datetime.fromisoformat(order["completed_at"])
                    service_time = (completed - sent).total_seconds() / 60  # Em minutos
                    service_times.append(service_time)
            
            if service_times:
                avg_service_time = sum(service_times) / len(service_times)
        
        # Contar pedidos pendentes de sincronização
        pending_sync_orders = [o for o in orders if o.get("sync_status") == "pending_sync"]
        
        # Criar objeto de estatísticas
        stats = WaiterStats(
            total_orders=len(orders),
            draft_orders=len(draft_orders),
            sent_orders=len(sent_orders),
            preparing_orders=len(preparing_orders),
            ready_orders=len(ready_orders),
            delivered_orders=len(delivered_orders),
            cancelled_orders=len(cancelled_orders),
            total_tables=len(tables),
            available_tables=len(available_tables),
            occupied_tables=len(occupied_tables),
            reserved_tables=len(reserved_tables),
            cleaning_tables=len(cleaning_tables),
            average_service_time=avg_service_time,
            pending_sync_count=len(pending_sync_orders)
        )
        
        # Salvar estatísticas
        with open(WAITER_STATS_FILE, 'w') as f:
            json.dump(stats.dict(), f)
    
    async def update_order_status_from_event(
        self, 
        order_id: str, 
        status: WaiterOrderStatus
    ) -> Optional[WaiterOrder]:
        """Atualiza o status de um pedido a partir de um evento."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Atualizar status
        update_data = WaiterOrderUpdate(status=status)
        return await self.update_order(order_id, update_data)
    
    async def update_order_from_event(self, order_data: Dict[str, Any]) -> Optional[WaiterOrder]:
        """Atualiza um pedido a partir de um evento."""
        order_id = order_data.get("id") or order_data.get("order_id")
        if not order_id:
            return None
        
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Extrair atualizações
        updates = order_data.get("updates", {})
        if not updates and "order" in order_data:
            # Se não houver atualizações específicas, mas houver um objeto order,
            # extrair as diferenças
            new_order = order_data["order"]
            updates = {
                k: v for k, v in new_order.items()
                if k in ["status", "table_number", "customer_count", "notes"]
                and getattr(order, k) != v
            }
        
        if not updates:
            return order
        
        # Criar objeto de atualização
        update_data = WaiterOrderUpdate(**updates)
        return await self.update_order(order_id, update_data)
    
    async def sync_device_data(self, device_id: str) -> Dict[str, Any]:
        """Sincroniza dados de um dispositivo."""
        # Buscar sessão do dispositivo
        session = await self.get_session_by_device(device_id)
        if not session:
            raise ValueError(f"Sessão não encontrada para o dispositivo {device_id}")
        
        # Buscar pedidos pendentes de sincronização
        orders = await self._load_orders()
        pending_sync_orders = [o for o in orders if o.get("sync_status") == "pending_sync"]
        
        # Marcar pedidos como sincronizados
        for order in pending_sync_orders:
            order["sync_status"] = "synced"
        
        # Salvar dados
        await self._save_orders(orders)
        
        # Atualizar timestamp de sincronização da sessão
        update_data = WaiterSessionUpdate(last_sync_at=datetime.now())
        await self.update_session(session.id, update_data)
        
        # Publicar evento
        sync_stats = {
            "orders_synced": len(pending_sync_orders),
            "timestamp": datetime.now().isoformat()
        }
        await self.event_publisher.publish_sync_completed(device_id, sync_stats)
        
        return {
            "success": True,
            "synced_orders": len(pending_sync_orders),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _generate_order_number(self) -> str:
        """Gera um número de pedido único."""
        # Formato: AAAAMMDD-XXXX (ano, mês, dia, sequencial)
        today = datetime.now().strftime("%Y%m%d")
        
        # Buscar pedidos de hoje
        orders = await self._load_orders()
        today_orders = [
            o for o in orders 
            if o.get("order_number", "").startswith(today)
        ]
        
        # Gerar sequencial
        sequential = len(today_orders) + 1
        
        return f"{today}-{sequential:04d}"
    
    async def _load_orders(self) -> List[Dict[str, Any]]:
        """Carrega os pedidos do arquivo JSON."""
        try:
            with open(WAITER_ORDERS_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    async def _save_orders(self, orders: List[Dict[str, Any]]) -> None:
        """Salva os pedidos no arquivo JSON."""
        with open(WAITER_ORDERS_FILE, 'w') as f:
            json.dump(orders, f)
    
    async def _load_sessions(self) -> List[Dict[str, Any]]:
        """Carrega as sessões do arquivo JSON."""
        try:
            with open(WAITER_SESSIONS_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    async def _save_sessions(self, sessions: List[Dict[str, Any]]) -> None:
        """Salva as sessões no arquivo JSON."""
        with open(WAITER_SESSIONS_FILE, 'w') as f:
            json.dump(sessions, f)
    
    async def _load_tables(self) -> List[Dict[str, Any]]:
        """Carrega as mesas do arquivo JSON."""
        try:
            with open(WAITER_TABLES_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    async def _save_tables(self, tables: List[Dict[str, Any]]) -> None:
        """Salva as mesas no arquivo JSON."""
        with open(WAITER_TABLES_FILE, 'w') as f:
            json.dump(tables, f)

# Singleton para o serviço do módulo de garçom
_waiter_service_instance = None

def get_waiter_service() -> WaiterService:
    """Retorna a instância singleton do serviço do módulo de garçom."""
    global _waiter_service_instance
    if _waiter_service_instance is None:
        _waiter_service_instance = WaiterService()
    return _waiter_service_instance
