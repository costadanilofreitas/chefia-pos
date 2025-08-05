from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import os

from src.kds.models.kds_models import (
    KDSOrder, 
    KDSOrderItem, 
    KDSOrderStatus, 
    KDSOrderPriority,
    KDSOrderUpdate,
    KDSOrderItemUpdate,
    KDSSession,
    KDSSessionCreate,
    KDSSessionUpdate,
    KDSStats
)
from src.kds.events.kds_events import get_kds_event_publisher

# Simulação de banco de dados com arquivo JSON
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
KDS_ORDERS_FILE = os.path.join(DATA_DIR, "kds_orders.json")
KDS_SESSIONS_FILE = os.path.join(DATA_DIR, "kds_sessions.json")
KDS_STATS_FILE = os.path.join(DATA_DIR, "kds_stats.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [KDS_ORDERS_FILE, KDS_SESSIONS_FILE, KDS_STATS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            if file_path == KDS_STATS_FILE:
                json.dump(KDSStats().dict(), f)
            else:
                json.dump([], f)

class KDSService:
    """Serviço para gerenciamento do KDS."""
    
    def __init__(self):
        self.event_publisher = get_kds_event_publisher()
    
    async def process_new_order(self, order_data: Dict[str, Any]) -> KDSOrder:
        """Processa um novo pedido recebido do sistema de pedidos."""
        # Converter o pedido para o formato KDS
        kds_items = []
        for item in order_data.get("items", []):
            kds_item = KDSOrderItem(
                id=item["id"],
                product_id=item["product_id"],
                product_name=item["product_name"],
                quantity=item["quantity"],
                customizations=item.get("customizations", []),
                sections=item.get("sections", []),
                notes=item.get("notes"),
                status=KDSOrderStatus.PENDING
            )
            kds_items.append(kds_item)
        
        # Determinar a prioridade com base no tipo de pedido
        priority = KDSOrderPriority.NORMAL
        if order_data.get("order_type") == "delivery":
            priority = KDSOrderPriority.HIGH
        
        # Criar o pedido KDS
        kds_order = KDSOrder(
            id=order_data["id"],
            order_number=order_data["order_number"],
            order_type=order_data["order_type"],
            table_number=order_data.get("table_number"),
            customer_name=order_data.get("customer_name"),
            items=kds_items,
            status=KDSOrderStatus.PENDING,
            priority=priority,
            notes=order_data.get("notes"),
            created_at=datetime.now()
        )
        
        # Calcular tempo estimado de conclusão
        total_prep_time = 0
        for item in kds_items:
            # Aqui poderia buscar o tempo de preparo de cada produto
            # Por enquanto, usamos um valor padrão de 5 minutos por item
            item.preparation_time = 5
            total_prep_time += item.preparation_time * item.quantity
        
        # Ajustar com base na quantidade de pedidos pendentes
        pending_orders = await self.get_orders_by_status(KDSOrderStatus.PENDING)
        preparing_orders = await self.get_orders_by_status(KDSOrderStatus.PREPARING)
        
        # Fator de ajuste baseado na carga atual
        load_factor = 1.0 + (0.1 * (len(pending_orders) + len(preparing_orders)))
        
        # Tempo estimado ajustado
        adjusted_prep_time = total_prep_time * load_factor
        kds_order.estimated_completion_time = datetime.now() + timedelta(minutes=adjusted_prep_time)
        
        # Salvar o pedido
        await self._save_order(kds_order)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        # Publicar evento
        await self.event_publisher.publish_order_received(kds_order)
        
        return kds_order
    
    async def get_order(self, order_id: str) -> Optional[KDSOrder]:
        """Busca um pedido pelo ID."""
        orders = await self._load_orders()
        order_dict = next((o for o in orders if o["id"] == order_id), None)
        
        if not order_dict:
            return None
        
        return KDSOrder(**order_dict)
    
    async def get_orders_by_status(self, status: KDSOrderStatus) -> List[KDSOrder]:
        """Busca pedidos por status."""
        orders = await self._load_orders()
        filtered_orders = [o for o in orders if o["status"] == status]
        
        return [KDSOrder(**o) for o in filtered_orders]
    
    async def get_all_orders(
        self,
        status: Optional[KDSOrderStatus] = None,
        priority: Optional[KDSOrderPriority] = None,
        order_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[KDSOrder]:
        """Lista todos os pedidos com filtros opcionais."""
        orders = await self._load_orders()
        
        # Aplicar filtros
        if status:
            orders = [o for o in orders if o["status"] == status]
        
        if priority:
            orders = [o for o in orders if o["priority"] == priority]
        
        if order_type:
            orders = [o for o in orders if o["order_type"] == order_type]
        
        # Ordenar por prioridade e data de criação
        orders.sort(key=lambda x: (
            # Ordem de prioridade: URGENT > HIGH > NORMAL > LOW
            ["low", "normal", "high", "urgent"].index(x["priority"]),
            # Data de criação (mais antigo primeiro)
            x["created_at"]
        ), reverse=True)
        
        # Aplicar paginação
        paginated_orders = orders[offset:offset + limit]
        
        return [KDSOrder(**o) for o in paginated_orders]
    
    async def update_order_status(
        self, 
        order_id: str, 
        update_data: KDSOrderUpdate
    ) -> Optional[KDSOrder]:
        """Atualiza o status de um pedido."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Armazenar status anterior para o evento
        previous_status = order.status
        
        # Atualizar campos
        if update_data.status is not None:
            order.status = update_data.status
            
            # Atualizar timestamps com base no status
            if update_data.status == KDSOrderStatus.PREPARING and not order.started_at:
                order.started_at = datetime.now()
            elif update_data.status == KDSOrderStatus.READY and not order.completed_at:
                order.completed_at = datetime.now()
        
        if update_data.priority is not None:
            order.priority = update_data.priority
        
        if update_data.notes is not None:
            order.notes = update_data.notes
        
        order.updated_at = datetime.now()
        
        # Salvar o pedido atualizado
        await self._save_order(order)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        # Publicar evento
        if update_data.status is not None and update_data.status != previous_status:
            await self.event_publisher.publish_order_status_changed(
                order_id=order_id,
                status=update_data.status,
                previous_status=previous_status
            )
        
        return order
    
    async def update_item_status(
        self, 
        order_id: str, 
        item_id: str, 
        update_data: KDSOrderItemUpdate
    ) -> Optional[KDSOrderItem]:
        """Atualiza o status de um item de pedido."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Encontrar o item
        item = next((i for i in order.items if i.id == item_id), None)
        if not item:
            return None
        
        # Armazenar status anterior para o evento
        previous_status = item.status
        
        # Atualizar campos
        if update_data.status is not None:
            item.status = update_data.status
            
            # Atualizar timestamps com base no status
            if update_data.status == KDSOrderStatus.PREPARING and not item.started_at:
                item.started_at = datetime.now()
            elif update_data.status == KDSOrderStatus.READY and not item.completed_at:
                item.completed_at = datetime.now()
        
        if update_data.notes is not None:
            item.notes = update_data.notes
        
        # Verificar se todos os itens têm o mesmo status
        # Se sim, atualizar o status do pedido
        if update_data.status is not None:
            all_items_status = [i.status for i in order.items]
            if all(s == update_data.status for s in all_items_status):
                order.status = update_data.status
                
                # Atualizar timestamps do pedido
                if update_data.status == KDSOrderStatus.PREPARING and not order.started_at:
                    order.started_at = datetime.now()
                elif update_data.status == KDSOrderStatus.READY and not order.completed_at:
                    order.completed_at = datetime.now()
        
        order.updated_at = datetime.now()
        
        # Salvar o pedido atualizado
        await self._save_order(order)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        # Publicar evento
        if update_data.status is not None and update_data.status != previous_status:
            await self.event_publisher.publish_item_status_changed(
                order_id=order_id,
                item_id=item_id,
                status=update_data.status,
                previous_status=previous_status
            )
        
        return item
    
    async def cancel_order(self, order_id: str) -> Optional[KDSOrder]:
        """Cancela um pedido."""
        order = await self.get_order(order_id)
        if not order:
            return None
        
        # Armazenar status anterior para o evento
        previous_status = order.status
        
        # Atualizar status
        order.status = KDSOrderStatus.CANCELLED
        order.updated_at = datetime.now()
        
        # Atualizar status de todos os itens
        for item in order.items:
            item.status = KDSOrderStatus.CANCELLED
        
        # Salvar o pedido atualizado
        await self._save_order(order)
        
        # Atualizar estatísticas
        await self._update_stats()
        
        # Publicar evento
        await self.event_publisher.publish_order_status_changed(
            order_id=order_id,
            status=KDSOrderStatus.CANCELLED,
            previous_status=previous_status
        )
        
        return order
    
    async def create_session(self, session_data: KDSSessionCreate) -> KDSSession:
        """Cria uma nova sessão do KDS."""
        session = KDSSession(
            name=session_data.name,
            station_type=session_data.station_type
        )
        
        # Salvar a sessão
        sessions = await self._load_sessions()
        sessions.append(session.dict())
        await self._save_sessions(sessions)
        
        # Publicar evento
        await self.event_publisher.publish_session_created(session.dict())
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[KDSSession]:
        """Busca uma sessão pelo ID."""
        sessions = await self._load_sessions()
        session_dict = next((s for s in sessions if s["id"] == session_id), None)
        
        if not session_dict:
            return None
        
        return KDSSession(**session_dict)
    
    async def get_all_sessions(self, active_only: bool = False) -> List[KDSSession]:
        """Lista todas as sessões."""
        sessions = await self._load_sessions()
        
        if active_only:
            sessions = [s for s in sessions if s["active"]]
        
        return [KDSSession(**s) for s in sessions]
    
    async def update_session(
        self, 
        session_id: str, 
        update_data: KDSSessionUpdate
    ) -> Optional[KDSSession]:
        """Atualiza uma sessão."""
        sessions = await self._load_sessions()
        session_index = next((i for i, s in enumerate(sessions) if s["id"] == session_id), None)
        
        if session_index is None:
            return None
        
        # Atualizar campos
        session = sessions[session_index]
        
        if update_data.name is not None:
            session["name"] = update_data.name
        
        if update_data.station_type is not None:
            session["station_type"] = update_data.station_type
        
        if update_data.active is not None:
            session["active"] = update_data.active
        
        session["updated_at"] = datetime.now().isoformat()
        
        # Salvar a sessão atualizada
        await self._save_sessions(sessions)
        
        # Publicar evento
        await self.event_publisher.publish_session_updated(session)
        
        return KDSSession(**session)
    
    async def get_stats(self) -> KDSStats:
        """Retorna estatísticas do KDS."""
        try:
            with open(KDS_STATS_FILE, 'r') as f:
                stats_dict = json.load(f)
                return KDSStats(**stats_dict)
        except (FileNotFoundError, json.JSONDecodeError):
            # Se o arquivo não existir ou estiver vazio, retornar estatísticas padrão
            return KDSStats()
    
    async def _update_stats(self) -> None:
        """Atualiza as estatísticas do KDS."""
        # Carregar todos os pedidos
        orders = await self._load_orders()
        
        # Contar pedidos por status
        pending_orders = [o for o in orders if o["status"] == KDSOrderStatus.PENDING]
        preparing_orders = [o for o in orders if o["status"] == KDSOrderStatus.PREPARING]
        ready_orders = [o for o in orders if o["status"] == KDSOrderStatus.READY]
        delivered_orders = [o for o in orders if o["status"] == KDSOrderStatus.DELIVERED]
        cancelled_orders = [o for o in orders if o["status"] == KDSOrderStatus.CANCELLED]
        
        # Calcular tempo médio de preparo
        completed_orders = [o for o in orders if o["status"] in [KDSOrderStatus.READY, KDSOrderStatus.DELIVERED]]
        
        avg_prep_time = None
        if completed_orders:
            prep_times = []
            for order in completed_orders:
                if order.get("started_at") and order.get("completed_at"):
                    started = datetime.fromisoformat(order["started_at"])
                    completed = datetime.fromisoformat(order["completed_at"])
                    prep_time = (completed - started).total_seconds() / 60  # Em minutos
                    prep_times.append(prep_time)
            
            if prep_times:
                avg_prep_time = sum(prep_times) / len(prep_times)
        
        # Calcular carga atual
        current_load = None
        if len(pending_orders) + len(preparing_orders) > 0:
            # Carga baseada na quantidade de pedidos pendentes e em preparo
            # Considerando que 10 pedidos seria 100% de carga
            current_load = min(100, (len(pending_orders) + len(preparing_orders) * 2) * 10)
        
        # Criar objeto de estatísticas
        stats = KDSStats(
            total_orders=len(orders),
            pending_orders=len(pending_orders),
            preparing_orders=len(preparing_orders),
            ready_orders=len(ready_orders),
            delivered_orders=len(delivered_orders),
            cancelled_orders=len(cancelled_orders),
            average_preparation_time=avg_prep_time,
            current_load=current_load
        )
        
        # Salvar estatísticas
        with open(KDS_STATS_FILE, 'w') as f:
            json.dump(stats.dict(), f)
        
        # Publicar evento
        await self.event_publisher.publish_stats_updated(stats.dict())
    
    async def _load_orders(self) -> List[Dict[str, Any]]:
        """Carrega os pedidos do arquivo JSON."""
        try:
            with open(KDS_ORDERS_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    async def _save_order(self, order: KDSOrder) -> None:
        """Salva um pedido no arquivo JSON."""
        orders = await self._load_orders()
        
        # Verificar se o pedido já existe
        order_index = next((i for i, o in enumerate(orders) if o["id"] == order.id), None)
        
        if order_index is not None:
            # Atualizar pedido existente
            orders[order_index] = order.dict()
        else:
            # Adicionar novo pedido
            orders.append(order.dict())
        
        # Salvar no arquivo
        with open(KDS_ORDERS_FILE, 'w') as f:
            json.dump(orders, f)
    
    async def _load_sessions(self) -> List[Dict[str, Any]]:
        """Carrega as sessões do arquivo JSON."""
        try:
            with open(KDS_SESSIONS_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    async def _save_sessions(self, sessions: List[Dict[str, Any]]) -> None:
        """Salva as sessões no arquivo JSON."""
        with open(KDS_SESSIONS_FILE, 'w') as f:
            json.dump(sessions, f)

# Singleton para o serviço KDS
_kds_service_instance = None

def get_kds_service() -> KDSService:
    """Retorna a instância singleton do serviço KDS."""
    global _kds_service_instance
    if _kds_service_instance is None:
        _kds_service_instance = KDSService()
    return _kds_service_instance
