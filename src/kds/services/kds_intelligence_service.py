from typing import List, Dict, Any, Optional, Tuple
import logging
import asyncio
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from src.product.models.product import Product
from src.order.services.order_service import OrderService
from src.core.events.event_bus import EventBus, Event

logger = logging.getLogger(__name__)

class KDSIntelligenceService:
    """
    Serviço de inteligência para o Kitchen Display System (KDS).
    
    Implementa lógica de sincronização de preparo de itens, priorização de pedidos
    e otimização de fluxo de trabalho na cozinha, inspirado no sistema Groomer do Madero.
    """
    
    def __init__(self, order_service: OrderService, event_bus: EventBus):
        self.order_service = order_service
        self.event_bus = event_bus
        self.register_event_handlers()
        
    def register_event_handlers(self):
        """Registra handlers para eventos relevantes."""
        self.event_bus.subscribe("order.created", self.handle_new_order)
        self.event_bus.subscribe("order.updated", self.handle_order_update)
        self.event_bus.subscribe("order_item.status_changed", self.handle_item_status_change)
        
    async def handle_new_order(self, event: Event):
        """
        Processa um novo pedido, calculando tempos de preparo e sincronização.
        
        Args:
            event: Evento contendo dados do novo pedido
        """
        order_data = event.data
        order_id = order_data.get("order_id")
        
        logger.info(f"KDS Intelligence: Processando novo pedido {order_id}")
        
        # Obter detalhes completos do pedido
        order = await self.order_service.get_order(order_id)
        if not order:
            logger.error(f"KDS Intelligence: Pedido {order_id} não encontrado")
            return
            
        # Calcular tempos de preparo e sincronização
        await self.calculate_preparation_times(order)
        
    async def handle_order_update(self, event: Event):
        """
        Processa atualizações em pedidos existentes.
        
        Args:
            event: Evento contendo dados da atualização do pedido
        """
        order_data = event.data
        order_id = order_data.get("order_id")
        
        logger.info(f"KDS Intelligence: Atualizando pedido {order_id}")
        
        # Verificar se é necessário recalcular tempos
        if self.should_recalculate_times(order_data):
            order = await self.order_service.get_order(order_id)
            if order:
                await self.calculate_preparation_times(order)
    
    async def handle_item_status_change(self, event: Event):
        """
        Processa mudanças de status em itens de pedidos.
        
        Args:
            event: Evento contendo dados da mudança de status do item
        """
        item_data = event.data
        order_id = item_data.get("order_id")
        item_id = item_data.get("item_id")
        new_status = item_data.get("status")
        
        logger.info(f"KDS Intelligence: Item {item_id} do pedido {order_id} mudou para status {new_status}")
        
        # Registrar tempo real de início ou conclusão do preparo
        if new_status == "preparing":
            await self.record_preparation_start(order_id, item_id)
        elif new_status == "ready":
            await self.record_preparation_end(order_id, item_id)
            
        # Verificar se é necessário recalcular tempos para outros itens do pedido
        order = await self.order_service.get_order(order_id)
        if order:
            await self.update_preparation_times(order, item_id)
            
    async def calculate_preparation_times(self, order: Dict[str, Any]) -> None:
        """
        Calcula os tempos de preparo e sincronização para todos os itens de um pedido.
        
        Args:
            order: Dados completos do pedido
        """
        items = order.get("items", [])
        if not items:
            logger.warning(f"KDS Intelligence: Pedido {order.get('order_id')} não possui itens")
            return
            
        # Obter tempos estimados de preparo para cada item
        item_prep_times = await self.get_preparation_times(items)
        
        # Identificar o item com maior tempo de preparo
        longest_prep_time, longest_item_id = self.find_longest_preparation_time(item_prep_times)
        
        # Calcular o momento ideal para iniciar o preparo de cada item
        start_times = self.calculate_start_times(item_prep_times, longest_prep_time)
        
        # Ajustar com base na capacidade das estações e dependências
        adjusted_start_times = await self.adjust_start_times(start_times, items)
        
        # Salvar os tempos calculados no banco de dados
        await self.save_preparation_schedule(order.get("order_id"), adjusted_start_times)
        
        # Publicar evento com os tempos calculados
        self.publish_preparation_schedule(order.get("order_id"), adjusted_start_times)
        
    async def get_preparation_times(self, items: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Obtém os tempos estimados de preparo para cada item.
        
        Args:
            items: Lista de itens do pedido
            
        Returns:
            Dicionário com item_id como chave e tempo estimado em segundos como valor
        """
        prep_times = {}
        
        for item in items:
            item_id = item.get("item_id")
            product_id = item.get("product_id")
            
            # Obter tempo estimado do produto
            estimated_time = await self.get_product_preparation_time(product_id)
            
            # Ajustar com base em customizações ou quantidade
            adjusted_time = self.adjust_time_for_customizations(estimated_time, item)
            
            prep_times[item_id] = adjusted_time
            
        return prep_times
        
    async def get_product_preparation_time(self, product_id: str) -> int:
        """
        Obtém o tempo estimado de preparo para um produto.
        
        Args:
            product_id: ID do produto
            
        Returns:
            Tempo estimado em segundos
        """
        # Implementação simplificada - em produção, buscar do banco de dados
        # Tempos de preparo padrão por categoria (em segundos)
        default_times = {
            "burger": 300,      # 5 minutos
            "pizza": 600,       # 10 minutos
            "pasta": 480,       # 8 minutos
            "salad": 180,       # 3 minutos
            "dessert": 120,     # 2 minutos
            "drink": 60,        # 1 minuto
            "side": 240,        # 4 minutos
            "appetizer": 360,   # 6 minutos
        }
        
        # Em uma implementação real, buscar do banco de dados
        # Simulando busca do produto
        # product = await Product.get(product_id)
        # return product.estimated_prep_time
        
        # Implementação temporária com valores fixos
        # Simular diferentes tempos baseados no ID do produto
        product_hash = hash(product_id) % 8
        category = list(default_times.keys())[product_hash]
        return default_times[category]
        
    def adjust_time_for_customizations(self, base_time: int, item: Dict[str, Any]) -> int:
        """
        Ajusta o tempo de preparo com base em customizações ou quantidade.
        
        Args:
            base_time: Tempo base em segundos
            item: Dados do item com customizações
            
        Returns:
            Tempo ajustado em segundos
        """
        adjusted_time = base_time
        
        # Ajustar com base na quantidade
        quantity = item.get("quantity", 1)
        if quantity > 1:
            # Não é linear - preparar 2 do mesmo item não leva 2x o tempo
            adjusted_time = int(base_time * (1 + 0.2 * (quantity - 1)))
            
        # Ajustar com base em customizações
        customizations = item.get("customizations", {})
        if customizations:
            # Adicionar tempo extra para cada customização
            # Em uma implementação real, diferentes customizações teriam diferentes impactos
            num_customizations = len(customizations)
            adjusted_time += num_customizations * 30  # 30 segundos por customização
            
        return adjusted_time
        
    def find_longest_preparation_time(self, prep_times: Dict[str, int]) -> Tuple[int, str]:
        """
        Identifica o item com o maior tempo de preparo.
        
        Args:
            prep_times: Dicionário com tempos de preparo por item
            
        Returns:
            Tupla com o maior tempo e o ID do item correspondente
        """
        if not prep_times:
            return 0, ""
            
        longest_item_id = max(prep_times, key=prep_times.get)
        longest_time = prep_times[longest_item_id]
        
        return longest_time, longest_item_id
        
    def calculate_start_times(self, prep_times: Dict[str, int], longest_time: int) -> Dict[str, int]:
        """
        Calcula o momento ideal para iniciar o preparo de cada item.
        
        Args:
            prep_times: Dicionário com tempos de preparo por item
            longest_time: Tempo do item mais demorado
            
        Returns:
            Dicionário com item_id como chave e tempo de início (em segundos após recebimento do pedido) como valor
        """
        start_times = {}
        
        for item_id, prep_time in prep_times.items():
            # Calcular quando o preparo deve começar para terminar junto com o item mais demorado
            # Tempo de início = tempo do mais demorado - tempo deste item
            start_time = max(0, longest_time - prep_time)
            start_times[item_id] = start_time
            
        return start_times
        
    async def adjust_start_times(self, start_times: Dict[str, int], items: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Ajusta os tempos de início com base em dependências e capacidade das estações.
        
        Args:
            start_times: Dicionário com tempos de início calculados
            items: Lista de itens do pedido
            
        Returns:
            Dicionário com tempos de início ajustados
        """
        # Em uma implementação completa, considerar:
        # 1. Dependências entre itens (ex: molho precisa estar pronto antes do prato principal)
        # 2. Capacidade das estações de trabalho
        # 3. Carga atual da cozinha
        
        # Implementação simplificada - apenas retorna os tempos calculados
        # Em uma implementação real, aplicar lógica de ajuste aqui
        return start_times
        
    async def save_preparation_schedule(self, order_id: str, start_times: Dict[str, int]) -> None:
        """
        Salva os tempos calculados no banco de dados.
        
        Args:
            order_id: ID do pedido
            start_times: Dicionário com tempos de início por item
        """
        # Em uma implementação real, salvar no banco de dados
        # Exemplo:
        # for item_id, start_time in start_times.items():
        #     await KDSItemStatus.create(
        #         order_item_id=item_id,
        #         estimated_start_time=start_time,
        #         order_id=order_id
        #     )
        
        # Log para simulação
        logger.info(f"KDS Intelligence: Salvando agenda de preparo para pedido {order_id}: {start_times}")
        
    def publish_preparation_schedule(self, order_id: str, start_times: Dict[str, int]) -> None:
        """
        Publica evento com os tempos calculados.
        
        Args:
            order_id: ID do pedido
            start_times: Dicionário com tempos de início por item
        """
        event_data = {
            "order_id": order_id,
            "preparation_schedule": start_times,
            "timestamp": datetime.now().isoformat()
        }
        
        self.event_bus.publish("kds.preparation_schedule_updated", Event(data=event_data))
        
    def should_recalculate_times(self, order_data: Dict[str, Any]) -> bool:
        """
        Determina se é necessário recalcular os tempos de preparo.
        
        Args:
            order_data: Dados da atualização do pedido
            
        Returns:
            True se for necessário recalcular, False caso contrário
        """
        # Recalcular se:
        # 1. Itens foram adicionados ou removidos
        # 2. Status do pedido mudou para um estado que afeta o preparo
        # 3. Prioridade do pedido foi alterada
        
        # Implementação simplificada - sempre recalcular
        return True
        
    async def record_preparation_start(self, order_id: str, item_id: str) -> None:
        """
        Registra o início real do preparo de um item.
        
        Args:
            order_id: ID do pedido
            item_id: ID do item
        """
        # Em uma implementação real, salvar no banco de dados
        # Exemplo:
        # await KDSItemStatus.filter(order_item_id=item_id).update(
        #     actual_start_time=datetime.now(),
        #     status="preparing"
        # )
        
        # Log para simulação
        logger.info(f"KDS Intelligence: Registrando início de preparo do item {item_id} do pedido {order_id}")
        
        # Publicar evento
        event_data = {
            "order_id": order_id,
            "item_id": item_id,
            "status": "preparing",
            "timestamp": datetime.now().isoformat()
        }
        
        self.event_bus.publish("kds.item_preparation_started", Event(data=event_data))
        
    async def record_preparation_end(self, order_id: str, item_id: str) -> None:
        """
        Registra a conclusão do preparo de um item.
        
        Args:
            order_id: ID do pedido
            item_id: ID do item
        """
        # Em uma implementação real, salvar no banco de dados
        # Exemplo:
        # item_status = await KDSItemStatus.filter(order_item_id=item_id).first()
        # if item_status:
        #     actual_prep_time = (datetime.now() - item_status.actual_start_time).total_seconds()
        #     await item_status.update(
        #         actual_end_time=datetime.now(),
        #         status="ready",
        #         actual_prep_time=actual_prep_time
        #     )
        
        # Log para simulação
        logger.info(f"KDS Intelligence: Registrando conclusão de preparo do item {item_id} do pedido {order_id}")
        
        # Publicar evento
        event_data = {
            "order_id": order_id,
            "item_id": item_id,
            "status": "ready",
            "timestamp": datetime.now().isoformat()
        }
        
        self.event_bus.publish("kds.item_preparation_completed", Event(data=event_data))
        
    async def update_preparation_times(self, order: Dict[str, Any], changed_item_id: str) -> None:
        """
        Atualiza os tempos de preparo dos itens restantes após mudança de status de um item.
        
        Args:
            order: Dados completos do pedido
            changed_item_id: ID do item que teve status alterado
        """
        # Verificar itens pendentes
        pending_items = [item for item in order.get("items", []) 
                        if item.get("item_id") != changed_item_id and 
                        item.get("status") not in ["ready", "delivered"]]
        
        if not pending_items:
            logger.info(f"KDS Intelligence: Todos os itens do pedido {order.get('order_id')} estão prontos ou em preparo")
            return
            
        # Recalcular tempos apenas para itens pendentes
        # Em uma implementação real, considerar o progresso atual dos itens em preparo
        
        # Log para simulação
        logger.info(f"KDS Intelligence: Atualizando tempos de preparo para {len(pending_items)} itens pendentes do pedido {order.get('order_id')}")
        
    async def prioritize_orders(self, station_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Prioriza pedidos com base em vários fatores.
        
        Args:
            station_id: ID opcional da estação para filtrar pedidos
            
        Returns:
            Lista de pedidos priorizados
        """
        # Em uma implementação real, obter pedidos ativos do banco de dados
        # Exemplo:
        # active_orders = await self.order_service.get_active_orders()
        
        # Implementação simulada
        active_orders = []  # Simulação - em produção, buscar do banco
        
        # Calcular pontuação de prioridade para cada pedido
        prioritized_orders = []
        for order in active_orders:
            priority_score = self.calculate_priority_score(order)
            prioritized_orders.append({
                "order": order,
                "priority_score": priority_score
            })
            
        # Ordenar por pontuação de prioridade (maior primeiro)
        prioritized_orders.sort(key=lambda x: x["priority_score"], reverse=True)
        
        # Retornar apenas os dados do pedido, já ordenados
        return [item["order"] for item in prioritized_orders]
        
    def calculate_priority_score(self, order: Dict[str, Any]) -> float:
        """
        Calcula uma pontuação de prioridade para um pedido.
        
        Args:
            order: Dados do pedido
            
        Returns:
            Pontuação de prioridade (maior = mais prioritário)
        """
        score = 0.0
        
        # Fator 1: Tempo de espera (pedidos mais antigos têm prioridade)
        created_at = datetime.fromisoformat(order.get("created_at"))
        wait_time_minutes = (datetime.now() - created_at).total_seconds() / 60
        score += min(wait_time_minutes * 2, 100)  # Máximo de 100 pontos por tempo de espera
        
        # Fator 2: Tipo de pedido (delivery > para viagem > local)
        order_type = order.get("type", "local")
        if order_type == "delivery":
            score += 30
        elif order_type == "takeout":
            score += 15
            
        # Fator 3: VIP ou cliente frequente
        if order.get("is_vip", False):
            score += 50
            
        # Fator 4: Complexidade (pedidos mais simples podem ser priorizados para "limpar a fila")
        num_items = len(order.get("items", []))
        if num_items <= 2:
            score += 10  # Bônus para pedidos pequenos
        elif num_items >= 6:
            score -= 10  # Penalidade para pedidos muito grandes
            
        # Fator 5: Prioridade manual (definida por gerente)
        score += order.get("manual_priority", 0) * 20
        
        return score
        
    async def get_station_workload(self, station_id: str) -> Dict[str, Any]:
        """
        Obtém a carga de trabalho atual de uma estação.
        
        Args:
            station_id: ID da estação
            
        Returns:
            Dados sobre a carga de trabalho
        """
        # Em uma implementação real, consultar o banco de dados
        # Exemplo:
        # items_in_progress = await KDSItemStatus.filter(
        #     station_id=station_id,
        #     status="preparing"
        # ).count()
        # 
        # items_pending = await KDSItemStatus.filter(
        #     station_id=station_id,
        #     status="pending"
        # ).count()
        
        # Implementação simulada
        items_in_progress = 3  # Simulação
        items_pending = 5      # Simulação
        
        return {
            "station_id": station_id,
            "items_in_progress": items_in_progress,
            "items_pending": items_pending,
            "total_workload": items_in_progress + items_pending,
            "timestamp": datetime.now().isoformat()
        }
        
    async def get_preparation_metrics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Obtém métricas de preparo para um período.
        
        Args:
            start_date: Data de início
            end_date: Data de fim
            
        Returns:
            Métricas de preparo
        """
        # Em uma implementação real, consultar o banco de dados
        # Exemplo:
        # completed_items = await KDSItemStatus.filter(
        #     actual_end_time__gte=start_date,
        #     actual_end_time__lte=end_date,
        #     status="ready"
        # )
        # 
        # total_items = len(completed_items)
        # avg_prep_time = sum(item.actual_prep_time for item in completed_items) / total_items if total_items > 0 else 0
        # accuracy = sum(1 for item in completed_items if abs(item.actual_prep_time - item.estimated_prep_time) < 60) / total_items if total_items > 0 else 0
        
        # Implementação simulada
        return {
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_items_completed": 120,
            "avg_preparation_time": 240,  # segundos
            "estimation_accuracy": 0.85,  # 85% das estimativas com erro < 1 minuto
            "stations_performance": {
                "grill": {"items": 45, "avg_time": 300},
                "fry": {"items": 35, "avg_time": 180},
                "salad": {"items": 25, "avg_time": 150},
                "dessert": {"items": 15, "avg_time": 120}
            }
        }

# Função para obter uma instância do serviço
_kds_intelligence_service = None

def get_kds_intelligence_service(order_service=None, event_bus=None) -> KDSIntelligenceService:
    """
    Obtém uma instância do serviço de inteligência do KDS.
    
    Args:
        order_service: Instância opcional do serviço de pedidos
        event_bus: Instância opcional do barramento de eventos
        
    Returns:
        Instância do serviço de inteligência do KDS
    """
    global _kds_intelligence_service
    
    if _kds_intelligence_service is None:
        from src.order.services.order_service import get_order_service
        from src.core.events.event_bus import get_event_bus
        
        _order_service = order_service or get_order_service()
        _event_bus = event_bus or get_event_bus()
        
        _kds_intelligence_service = KDSIntelligenceService(_order_service, _event_bus)
        
    return _kds_intelligence_service
