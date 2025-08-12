from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid

from src.waiter.models.table_layout_models import (
    TableLayout,
    TableStatus,
    TableLayoutConfig,
)

logger = logging.getLogger(__name__)


class TableLayoutService:
    """Serviço para gerenciamento de layouts de mesa para o módulo de garçom."""

    def __init__(self, db_service):
        """
        Inicializa o serviço de layout de mesas.

        Args:
            db_service: Serviço de banco de dados para persistência
        """
        self.db_service = db_service
        self.collection_name = "table_layouts"
        self.config_collection_name = "table_layout_configs"

    async def create_layout(self, layout_data: Dict[str, Any]) -> TableLayout:
        """
        Cria um novo layout de mesas.

        Args:
            layout_data: Dados do layout a ser criado

        Returns:
            TableLayout: Layout criado
        """
        # Gerar ID se não fornecido
        if "id" not in layout_data:
            layout_data["id"] = str(uuid.uuid4())

        # Definir timestamps
        now = datetime.now()
        layout_data["created_at"] = now
        layout_data["updated_at"] = now

        # Criar objeto TableLayout
        layout = TableLayout(**layout_data)

        # Persistir no banco de dados
        await self.db_service.insert_one(self.collection_name, layout.dict())

        # Se for o primeiro layout para este restaurante/loja, definir como ativo
        config = await self.get_layout_config(layout.restaurant_id, layout.store_id)
        if not config:
            config_data = {
                "restaurant_id": layout.restaurant_id,
                "store_id": layout.store_id,
                "active_layout_id": layout.id,
                "available_layouts": [layout.id],
            }
            await self.create_layout_config(config_data)
        else:
            # Adicionar à lista de layouts disponíveis
            if layout.id not in config.available_layouts:
                config.available_layouts.append(layout.id)
                await self.update_layout_config(
                    config.restaurant_id, config.store_id, config.dict()
                )

        return layout

    async def get_layout(self, layout_id: str) -> Optional[TableLayout]:
        """
        Obtém um layout pelo ID.

        Args:
            layout_id: ID do layout

        Returns:
            TableLayout: Layout encontrado ou None
        """
        layout_data = await self.db_service.find_one(
            self.collection_name, {"id": layout_id}
        )

        if not layout_data:
            return None

        return TableLayout(**layout_data)

    async def get_layouts_by_restaurant(
        self, restaurant_id: str, store_id: str
    ) -> List[TableLayout]:
        """
        Obtém todos os layouts de um restaurante/loja.

        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja

        Returns:
            List[TableLayout]: Lista de layouts
        """
        layouts_data = await self.db_service.find(
            self.collection_name, {"restaurant_id": restaurant_id, "store_id": store_id}
        )

        return [TableLayout(**layout_data) for layout_data in layouts_data]

    async def get_active_layout(
        self, restaurant_id: str, store_id: str
    ) -> Optional[TableLayout]:
        """
        Obtém o layout ativo para um restaurante/loja.

        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja

        Returns:
            TableLayout: Layout ativo ou None
        """
        config = await self.get_layout_config(restaurant_id, store_id)

        if not config:
            return None

        return await self.get_layout(config.active_layout_id)

    async def update_layout(
        self, layout_id: str, layout_data: Dict[str, Any]
    ) -> Optional[TableLayout]:
        """
        Atualiza um layout existente.

        Args:
            layout_id: ID do layout a ser atualizado
            layout_data: Novos dados do layout

        Returns:
            TableLayout: Layout atualizado ou None
        """
        # Verificar se o layout existe
        existing_layout = await self.get_layout(layout_id)
        if not existing_layout:
            return None

        # Atualizar timestamp
        layout_data["updated_at"] = datetime.now()

        # Manter ID, restaurant_id e store_id originais
        layout_data["id"] = layout_id
        layout_data["restaurant_id"] = existing_layout.restaurant_id
        layout_data["store_id"] = existing_layout.store_id

        # Atualizar no banco de dados
        await self.db_service.update_one(
            self.collection_name, {"id": layout_id}, {"$set": layout_data}
        )

        # Retornar layout atualizado
        return await self.get_layout(layout_id)

    async def delete_layout(self, layout_id: str) -> bool:
        """
        Exclui um layout.

        Args:
            layout_id: ID do layout a ser excluído

        Returns:
            bool: True se excluído com sucesso
        """
        # Verificar se o layout existe
        layout = await self.get_layout(layout_id)
        if not layout:
            return False

        # Verificar se é o layout ativo
        config = await self.get_layout_config(layout.restaurant_id, layout.store_id)
        if config and config.active_layout_id == layout_id:
            return False  # Não permitir excluir o layout ativo

        # Excluir do banco de dados
        result = await self.db_service.delete_one(
            self.collection_name, {"id": layout_id}
        )

        # Atualizar configuração se necessário
        if config and layout_id in config.available_layouts:
            config.available_layouts.remove(layout_id)
            await self.update_layout_config(
                config.restaurant_id, config.store_id, config.dict()
            )

        return result

    async def set_active_layout(
        self, restaurant_id: str, store_id: str, layout_id: str
    ) -> bool:
        """
        Define o layout ativo para um restaurante/loja.

        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja
            layout_id: ID do layout a ser definido como ativo

        Returns:
            bool: True se definido com sucesso
        """
        # Verificar se o layout existe
        layout = await self.get_layout(layout_id)
        if not layout:
            return False

        # Verificar se o layout pertence ao restaurante/loja
        if layout.restaurant_id != restaurant_id or layout.store_id != store_id:
            return False

        # Obter configuração atual
        config = await self.get_layout_config(restaurant_id, store_id)

        if not config:
            # Criar nova configuração
            config_data = {
                "restaurant_id": restaurant_id,
                "store_id": store_id,
                "active_layout_id": layout_id,
                "available_layouts": [layout_id],
            }
            await self.create_layout_config(config_data)
        else:
            # Atualizar configuração existente
            config.active_layout_id = layout_id
            if layout_id not in config.available_layouts:
                config.available_layouts.append(layout_id)

            await self.update_layout_config(restaurant_id, store_id, config.dict())

        return True

    async def update_table_status(
        self,
        layout_id: str,
        table_id: str,
        status: TableStatus,
        order_id: Optional[str] = None,
        waiter_id: Optional[str] = None,
    ) -> bool:
        """
        Atualiza o status de uma mesa.

        Args:
            layout_id: ID do layout
            table_id: ID da mesa
            status: Novo status
            order_id: ID do pedido (opcional)
            waiter_id: ID do garçom (opcional)

        Returns:
            bool: True se atualizado com sucesso
        """
        # Obter layout
        layout = await self.get_layout(layout_id)
        if not layout:
            return False

        # Encontrar a mesa
        table_index = next(
            (i for i, t in enumerate(layout.tables) if t.id == table_id), -1
        )
        if table_index == -1:
            return False

        # Atualizar status
        layout.tables[table_index].status = status
        layout.tables[table_index].updated_at = datetime.now()

        # Atualizar order_id se fornecido
        if order_id is not None:
            layout.tables[table_index].current_order_id = order_id

        # Atualizar waiter_id se fornecido
        if waiter_id is not None:
            layout.tables[table_index].waiter_id = waiter_id

        # Persistir alterações
        await self.db_service.update_one(
            self.collection_name,
            {"id": layout_id},
            {
                "$set": {
                    "tables": [t.dict() for t in layout.tables],
                    "updated_at": datetime.now(),
                }
            },
        )

        return True

    async def get_tables_by_status(
        self, restaurant_id: str, store_id: str, status: Optional[TableStatus] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtém mesas pelo status.

        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja
            status: Status para filtrar (opcional)

        Returns:
            List[Dict]: Lista de mesas com informações do layout
        """
        # Obter layout ativo
        layout = await self.get_active_layout(restaurant_id, store_id)
        if not layout:
            return []

        # Filtrar mesas pelo status
        tables = []
        for table in layout.tables:
            if status is None or table.status == status:
                table_data = table.dict()
                table_data["layout_id"] = layout.id
                table_data["layout_name"] = layout.name
                tables.append(table_data)

        return tables

    async def get_table_with_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Encontra a mesa associada a um pedido.

        Args:
            order_id: ID do pedido

        Returns:
            Dict: Informações da mesa ou None
        """
        # Buscar em todos os layouts
        layouts = await self.db_service.find(self.collection_name, {})

        for layout_data in layouts:
            layout = TableLayout(**layout_data)
            for table in layout.tables:
                if table.current_order_id == order_id:
                    table_data = table.dict()
                    table_data["layout_id"] = layout.id
                    table_data["layout_name"] = layout.name
                    return table_data

        return None

    # Métodos para configuração de layout

    async def create_layout_config(
        self, config_data: Dict[str, Any]
    ) -> TableLayoutConfig:
        """
        Cria uma nova configuração de layout.

        Args:
            config_data: Dados da configuração

        Returns:
            TableLayoutConfig: Configuração criada
        """
        # Definir timestamps
        now = datetime.now()
        config_data["created_at"] = now
        config_data["updated_at"] = now

        # Criar objeto TableLayoutConfig
        config = TableLayoutConfig(**config_data)

        # Persistir no banco de dados
        await self.db_service.insert_one(self.config_collection_name, config.dict())

        return config

    async def get_layout_config(
        self, restaurant_id: str, store_id: str
    ) -> Optional[TableLayoutConfig]:
        """
        Obtém a configuração de layout para um restaurante/loja.

        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja

        Returns:
            TableLayoutConfig: Configuração encontrada ou None
        """
        config_data = await self.db_service.find_one(
            self.config_collection_name,
            {"restaurant_id": restaurant_id, "store_id": store_id},
        )

        if not config_data:
            return None

        return TableLayoutConfig(**config_data)

    async def update_layout_config(
        self, restaurant_id: str, store_id: str, config_data: Dict[str, Any]
    ) -> Optional[TableLayoutConfig]:
        """
        Atualiza a configuração de layout.

        Args:
            restaurant_id: ID do restaurante
            store_id: ID da loja
            config_data: Novos dados da configuração

        Returns:
            TableLayoutConfig: Configuração atualizada ou None
        """
        # Verificar se a configuração existe
        existing_config = await self.get_layout_config(restaurant_id, store_id)
        if not existing_config:
            return None

        # Atualizar timestamp
        config_data["updated_at"] = datetime.now()

        # Manter restaurant_id e store_id originais
        config_data["restaurant_id"] = restaurant_id
        config_data["store_id"] = store_id

        # Atualizar no banco de dados
        await self.db_service.update_one(
            self.config_collection_name,
            {"restaurant_id": restaurant_id, "store_id": store_id},
            {"$set": config_data},
        )

        # Retornar configuração atualizada
        return await self.get_layout_config(restaurant_id, store_id)
