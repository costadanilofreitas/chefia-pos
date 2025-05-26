from typing import Dict, Any, Optional, List, Union
import os
import json
import uuid
from datetime import datetime
import aiohttp
import asyncio
from fastapi import HTTPException

from src.remote_orders.models.remote_order_models import (
    RemoteOrder, RemoteOrderStatus, RemotePlatform, 
    RemotePlatformConfig, RemoteOrderCreate, RemoteOrderUpdate,
    RemoteOrderResponse
)
from src.core.events.event_bus import get_event_bus, Event, EventType
from src.product.models.product import Order, OrderCreate, OrderStatus, PaymentStatus, PaymentMethod
from src.order.services.order_service import order_service

# Diretório para armazenamento de dados
DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data")
REMOTE_ORDERS_FILE = os.path.join(DATA_DIR, "remote_orders.json")
REMOTE_PLATFORMS_FILE = os.path.join(DATA_DIR, "remote_platforms.json")

# Garantir que os diretórios existem
os.makedirs(DATA_DIR, exist_ok=True)

# Inicializar arquivos de dados se não existirem
for file_path in [REMOTE_ORDERS_FILE, REMOTE_PLATFORMS_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump([], f)

class RemoteOrderService:
    """Serviço para gerenciamento de pedidos remotos."""
    
    def __init__(self):
        self.event_bus = get_event_bus()
        self._adapters = {}
        self._load_adapters()
        
    def _load_adapters(self):
        """Carrega os adaptadores para as plataformas configuradas."""
        from src.remote_orders.adapters.ifood_adapter import IFoodAdapter
        
        # Registrar adaptadores disponíveis
        self._adapters = {
            RemotePlatform.IFOOD: IFoodAdapter(),
            # Adicionar outros adaptadores conforme necessário
        }
    
    def _load_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Carrega dados de um arquivo JSON."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_data(self, file_path: str, data: List[Dict[str, Any]]) -> None:
        """Salva dados em um arquivo JSON."""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

    def _load_remote_orders(self) -> List[Dict[str, Any]]:
        return self._load_data(REMOTE_ORDERS_FILE)

    def _save_remote_orders(self, orders: List[Dict[str, Any]]) -> None:
        self._save_data(REMOTE_ORDERS_FILE, orders)

    def _load_platform_configs(self) -> List[Dict[str, Any]]:
        return self._load_data(REMOTE_PLATFORMS_FILE)

    def _save_platform_configs(self, configs: List[Dict[str, Any]]) -> None:
        self._save_data(REMOTE_PLATFORMS_FILE, configs)
    
    async def get_platform_config(self, platform: Union[str, RemotePlatform]) -> Optional[RemotePlatformConfig]:
        """Obtém a configuração de uma plataforma."""
        if isinstance(platform, str):
            platform = RemotePlatform(platform)
            
        configs = self._load_platform_configs()
        config_dict = next((c for c in configs if c.get("platform") == platform), None)
        
        if not config_dict:
            return None
            
        return RemotePlatformConfig(**config_dict)
    
    async def update_platform_config(self, config: RemotePlatformConfig) -> RemotePlatformConfig:
        """Atualiza a configuração de uma plataforma."""
        configs = self._load_platform_configs()
        
        # Verificar se já existe configuração para esta plataforma
        config_index = next((i for i, c in enumerate(configs) if c.get("platform") == config.platform), None)
        
        if config_index is not None:
            # Atualizar configuração existente
            configs[config_index] = config.dict()
        else:
            # Adicionar nova configuração
            configs.append(config.dict())
            
        self._save_platform_configs(configs)
        return config
    
    async def list_platform_configs(self) -> List[RemotePlatformConfig]:
        """Lista todas as configurações de plataformas."""
        configs = self._load_platform_configs()
        return [RemotePlatformConfig(**c) for c in configs]
    
    async def process_remote_order(self, platform: Union[str, RemotePlatform], order_data: Dict[str, Any]) -> RemoteOrder:
        """Processa um pedido remoto e o converte para um pedido interno."""
        if isinstance(platform, str):
            platform = RemotePlatform(platform)
            
        # Verificar se a plataforma está habilitada
        config = await self.get_platform_config(platform)
        if not config or not config.enabled:
            raise HTTPException(status_code=400, detail=f"Plataforma {platform} não está habilitada")
            
        # Obter o adaptador para a plataforma
        adapter = self._adapters.get(platform)
        if not adapter:
            raise HTTPException(status_code=400, detail=f"Adaptador para plataforma {platform} não encontrado")
            
        # Converter dados para o formato interno
        try:
            remote_order = await adapter.convert_to_remote_order(order_data, config)
        except Exception as e:
            # Registrar erro e notificar
            await self.event_bus.publish(Event(
                event_type=EventType.REMOTE_ORDER_ERROR,
                data={"platform": platform, "error": str(e), "order_data": order_data}
            ))
            raise HTTPException(status_code=400, detail=f"Erro ao processar pedido: {str(e)}")
            
        # Verificar se o pedido já existe
        existing_order = await self.get_remote_order_by_external_id(platform, remote_order.external_order_id)
        if existing_order:
            # Atualizar pedido existente
            return await self.update_remote_order(
                existing_order.id, 
                RemoteOrderUpdate(status=remote_order.status)
            )
            
        # Salvar o pedido remoto
        remote_orders = self._load_remote_orders()
        remote_order_dict = remote_order.dict()
        remote_orders.append(remote_order_dict)
        self._save_remote_orders(remote_orders)
        
        # Publicar evento de pedido recebido
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_RECEIVED,
            data=remote_order_dict
        ))
        
        # Se configurado para aceitar automaticamente, criar pedido interno
        if config.auto_accept:
            await self.accept_remote_order(remote_order.id)
            
        return remote_order
    
    async def get_remote_order(self, order_id: str) -> Optional[RemoteOrder]:
        """Busca um pedido remoto pelo ID."""
        remote_orders = self._load_remote_orders()
        order_dict = next((o for o in remote_orders if o["id"] == order_id), None)
        
        if not order_dict:
            return None
            
        return RemoteOrder(**order_dict)
    
    async def get_remote_order_by_external_id(self, platform: Union[str, RemotePlatform], external_id: str) -> Optional[RemoteOrder]:
        """Busca um pedido remoto pelo ID externo."""
        if isinstance(platform, str):
            platform = RemotePlatform(platform)
            
        remote_orders = self._load_remote_orders()
        order_dict = next((o for o in remote_orders 
                          if o["platform"] == platform and o["external_order_id"] == external_id), None)
        
        if not order_dict:
            return None
            
        return RemoteOrder(**order_dict)
    
    async def list_remote_orders(
        self, 
        platform: Optional[Union[str, RemotePlatform]] = None,
        status: Optional[RemoteOrderStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[RemoteOrder]:
        """Lista pedidos remotos com filtros."""
        remote_orders = self._load_remote_orders()
        
        # Aplicar filtros
        if platform:
            if isinstance(platform, str):
                platform = RemotePlatform(platform)
            remote_orders = [o for o in remote_orders if o["platform"] == platform]
            
        if status:
            remote_orders = [o for o in remote_orders if o["status"] == status]
            
        if start_date:
            remote_orders = [o for o in remote_orders if o["created_at"] >= start_date]
            
        if end_date:
            remote_orders = [o for o in remote_orders if o["created_at"] <= end_date]
            
        # Ordenar por data de criação (mais recentes primeiro)
        remote_orders.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Aplicar paginação
        paginated_orders = remote_orders[offset:offset + limit]
        
        return [RemoteOrder(**o) for o in paginated_orders]
    
    async def update_remote_order(self, order_id: str, update_data: RemoteOrderUpdate) -> RemoteOrder:
        """Atualiza um pedido remoto."""
        remote_orders = self._load_remote_orders()
        order_index = next((i for i, o in enumerate(remote_orders) if o["id"] == order_id), None)
        
        if order_index is None:
            raise HTTPException(status_code=404, detail="Pedido remoto não encontrado")
            
        # Atualizar campos
        update_dict = update_data.dict(exclude_unset=True)
        remote_orders[order_index].update(update_dict)
        remote_orders[order_index]["updated_at"] = datetime.now().isoformat()
        
        self._save_remote_orders(remote_orders)
        
        # Obter o pedido atualizado
        updated_order = RemoteOrder(**remote_orders[order_index])
        
        # Publicar evento de atualização
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_STATUS_CHANGED,
            data=updated_order.dict()
        ))
        
        # Se o status foi atualizado para um status que requer notificação à plataforma
        if update_data.status:
            await self._notify_platform_status_change(updated_order)
            
        return updated_order
    
    async def _notify_platform_status_change(self, remote_order: RemoteOrder) -> None:
        """Notifica a plataforma sobre mudança de status."""
        adapter = self._adapters.get(remote_order.platform)
        if not adapter:
            return
            
        config = await self.get_platform_config(remote_order.platform)
        if not config:
            return
            
        try:
            await adapter.update_order_status(remote_order, config)
        except Exception as e:
            # Registrar erro, mas não falhar a operação
            await self.event_bus.publish(Event(
                event_type=EventType.REMOTE_ORDER_ERROR,
                data={
                    "platform": remote_order.platform,
                    "order_id": remote_order.id,
                    "error": str(e),
                    "operation": "update_status"
                }
            ))
    
    async def accept_remote_order(self, order_id: str) -> RemoteOrder:
        """Aceita um pedido remoto e cria um pedido interno."""
        remote_order = await self.get_remote_order(order_id)
        if not remote_order:
            raise HTTPException(status_code=404, detail="Pedido remoto não encontrado")
            
        if remote_order.status != RemoteOrderStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Pedido remoto não está pendente (status atual: {remote_order.status})")
            
        # Converter para OrderCreate
        order_create = await self._convert_to_internal_order(remote_order)
        
        # Criar pedido interno
        try:
            internal_order = await order_service.create_order(order_create)
        except Exception as e:
            # Atualizar status para erro
            await self.update_remote_order(
                remote_order.id,
                RemoteOrderUpdate(status=RemoteOrderStatus.ERROR, notes=f"Erro ao criar pedido interno: {str(e)}")
            )
            raise HTTPException(status_code=500, detail=f"Erro ao criar pedido interno: {str(e)}")
            
        # Atualizar pedido remoto com referência ao pedido interno
        updated_order = await self.update_remote_order(
            remote_order.id,
            RemoteOrderUpdate(
                status=RemoteOrderStatus.ACCEPTED,
                internal_order_id=internal_order.id
            )
        )
        
        # Publicar evento de pedido aceito
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_ACCEPTED,
            data=updated_order.dict()
        ))
        
        return updated_order
    
    async def reject_remote_order(self, order_id: str, reason: str) -> RemoteOrder:
        """Rejeita um pedido remoto."""
        remote_order = await self.get_remote_order(order_id)
        if not remote_order:
            raise HTTPException(status_code=404, detail="Pedido remoto não encontrado")
            
        if remote_order.status != RemoteOrderStatus.PENDING:
            raise HTTPException(status_code=400, detail=f"Pedido remoto não está pendente (status atual: {remote_order.status})")
            
        # Atualizar status para rejeitado
        updated_order = await self.update_remote_order(
            remote_order.id,
            RemoteOrderUpdate(
                status=RemoteOrderStatus.REJECTED,
                notes=reason
            )
        )
        
        # Publicar evento de pedido rejeitado
        await self.event_bus.publish(Event(
            event_type=EventType.REMOTE_ORDER_REJECTED,
            data={
                "order": updated_order.dict(),
                "reason": reason
            }
        ))
        
        return updated_order
    
    async def _convert_to_internal_order(self, remote_order: RemoteOrder) -> OrderCreate:
        """Converte um pedido remoto para o formato de criação de pedido interno."""
        # Mapear itens
        items = []
        for item in remote_order.items:
            items.append({
                "product_id": item.id,  # Assumindo que o ID do item remoto corresponde ao ID do produto
                "quantity": item.quantity,
                "notes": item.notes,
                "customizations": item.customizations
            })
        
        # Determinar o tipo de pedido
        order_type = "DELIVERY"  # Padrão para pedidos remotos
        
        # Criar OrderCreate
        order_create = OrderCreate(
            customer_id=remote_order.customer.document,  # Usar documento como ID do cliente
            customer_name=remote_order.customer.name,
            items=items,
            order_type=order_type,
            notes=f"Pedido {remote_order.platform.upper()} #{remote_order.external_order_id}",
            delivery_address=remote_order.customer.address,
            delivery_fee=remote_order.delivery_fee,
            external_reference={
                "platform": remote_order.platform,
                "external_id": remote_order.external_order_id
            }
        )
        
        return order_create
    
    async def handle_order_status_change(self, order_id: str, status: OrderStatus) -> None:
        """Manipula mudanças de status em pedidos internos para atualizar pedidos remotos."""
        # Buscar pedido remoto pelo ID interno
        remote_orders = self._load_remote_orders()
        remote_order_dict = next((o for o in remote_orders if o.get("internal_order_id") == order_id), None)
        
        if not remote_order_dict:
            return  # Não é um pedido remoto
            
        remote_order = RemoteOrder(**remote_order_dict)
        
        # Mapear status interno para status remoto
        status_mapping = {
            OrderStatus.PENDING: RemoteOrderStatus.PENDING,
            OrderStatus.PREPARING: RemoteOrderStatus.PREPARING,
            OrderStatus.READY: RemoteOrderStatus.READY,
            OrderStatus.DELIVERING: RemoteOrderStatus.DELIVERING,
            OrderStatus.DELIVERED: RemoteOrderStatus.DELIVERED,
            OrderStatus.CANCELLED: RemoteOrderStatus.CANCELLED
        }
        
        remote_status = status_mapping.get(status)
        if not remote_status:
            return  # Status não mapeável
            
        # Atualizar status do pedido remoto
        await self.update_remote_order(
            remote_order.id,
            RemoteOrderUpdate(status=remote_status)
        )

# Instância singleton do serviço
remote_order_service = RemoteOrderService()
