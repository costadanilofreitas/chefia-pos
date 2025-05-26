import unittest
from unittest.mock import MagicMock, patch
import asyncio
import json
from datetime import datetime

from ..models.terminal_models import TerminalConfig, TerminalSession, OfflineOrder, TerminalType, TerminalStatus, TerminalCapabilities
from ..services.terminal_service import TerminalService

class TestTerminalService(unittest.TestCase):
    def setUp(self):
        self.terminal_service = TerminalService()
        self.terminal_service.event_bus = MagicMock()
        
        # Configuração de teste
        self.test_config = TerminalConfig(
            id="test-terminal-1",
            name="Terminal de Teste",
            type=TerminalType.CIELO_LIO_V3,
            capabilities=TerminalCapabilities(
                screen_size="5.0",
                resolution="720x1280",
                touch_screen=True,
                printer=True,
                nfc=True,
                camera=False,
                barcode_scanner=True,
                wifi=True,
                mobile_data=True,
                bluetooth=False,
                battery_powered=True,
                memory="2GB",
                storage="16GB"
            ),
            api_key="test-api-key",
            api_secret="test-api-secret",
            merchant_id="test-merchant",
            terminal_id="test-terminal-id",
            restaurant_id="test-restaurant",
            store_id="test-store"
        )
        
    def test_create_terminal_config(self):
        # Executar o método de forma síncrona
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        
        # Verificar se o config foi armazenado corretamente
        self.assertEqual(result.id, self.test_config.id)
        self.assertEqual(result.name, self.test_config.name)
        self.assertEqual(result.type, self.test_config.type)
        
        # Verificar se o evento foi publicado
        self.terminal_service.event_bus.publish.assert_called_once()
        
    def test_get_terminal_config(self):
        # Primeiro criar a configuração
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        
        # Agora obter a configuração
        result = loop.run_until_complete(
            self.terminal_service.get_terminal_config(self.test_config.id)
        )
        
        # Verificar se os dados estão corretos
        self.assertEqual(result.id, self.test_config.id)
        self.assertEqual(result.name, self.test_config.name)
        
    def test_update_terminal_config(self):
        # Primeiro criar a configuração
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        
        # Modificar a configuração
        updated_config = self.test_config.copy()
        updated_config.name = "Terminal Atualizado"
        
        # Atualizar a configuração
        result = loop.run_until_complete(
            self.terminal_service.update_terminal_config(updated_config)
        )
        
        # Verificar se os dados foram atualizados
        self.assertEqual(result.name, "Terminal Atualizado")
        
        # Verificar se o evento foi publicado
        self.assertEqual(self.terminal_service.event_bus.publish.call_count, 2)
        
    def test_delete_terminal_config(self):
        # Primeiro criar a configuração
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        
        # Excluir a configuração
        result = loop.run_until_complete(
            self.terminal_service.delete_terminal_config(self.test_config.id)
        )
        
        # Verificar se a exclusão foi bem-sucedida
        self.assertTrue(result)
        
        # Verificar se o config não existe mais
        result = loop.run_until_complete(
            self.terminal_service.get_terminal_config(self.test_config.id)
        )
        self.assertIsNone(result)
        
        # Verificar se o evento foi publicado
        self.assertEqual(self.terminal_service.event_bus.publish.call_count, 2)
        
    def test_create_terminal_session(self):
        # Primeiro criar a configuração
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        
        # Criar uma sessão
        result = loop.run_until_complete(
            self.terminal_service.create_terminal_session(self.test_config.id, "waiter-1")
        )
        
        # Verificar se a sessão foi criada corretamente
        self.assertEqual(result.terminal_id, self.test_config.id)
        self.assertEqual(result.waiter_id, "waiter-1")
        self.assertEqual(result.status, TerminalStatus.ONLINE)
        
        # Verificar se o evento foi publicado
        self.assertEqual(self.terminal_service.event_bus.publish.call_count, 2)
        
    def test_update_terminal_status(self):
        # Primeiro criar a configuração e sessão
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        session = loop.run_until_complete(
            self.terminal_service.create_terminal_session(self.test_config.id, "waiter-1")
        )
        
        # Atualizar o status
        result = loop.run_until_complete(
            self.terminal_service.update_terminal_status(
                session.id, 
                TerminalStatus.BUSY,
                battery_level=75,
                signal_strength=80
            )
        )
        
        # Verificar se o status foi atualizado
        self.assertEqual(result.status, TerminalStatus.BUSY)
        self.assertEqual(result.battery_level, 75)
        self.assertEqual(result.signal_strength, 80)
        
        # Verificar se o evento foi publicado
        self.assertEqual(self.terminal_service.event_bus.publish.call_count, 3)
        
    def test_create_offline_order(self):
        # Primeiro criar a configuração e sessão
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        session = loop.run_until_complete(
            self.terminal_service.create_terminal_session(self.test_config.id, "waiter-1")
        )
        
        # Criar um pedido offline
        order = OfflineOrder(
            id="offline-order-1",
            terminal_id=self.test_config.id,
            waiter_id="waiter-1",
            table_id="table-1",
            items=[
                {"product_id": "prod-1", "name": "Água", "price": 5.00, "quantity": 2},
                {"product_id": "prod-2", "name": "Refrigerante", "price": 7.00, "quantity": 1}
            ],
            total=17.00
        )
        
        result = loop.run_until_complete(
            self.terminal_service.create_offline_order(order)
        )
        
        # Verificar se o pedido foi criado corretamente
        self.assertEqual(result.id, order.id)
        self.assertEqual(result.terminal_id, order.terminal_id)
        self.assertEqual(result.total, order.total)
        
        # Verificar se o pedido foi adicionado à lista de pendentes da sessão
        session = loop.run_until_complete(
            self.terminal_service.get_terminal_session(session.id)
        )
        self.assertIn(order.id, session.pending_orders)
        
        # Verificar se o evento foi publicado
        self.assertEqual(self.terminal_service.event_bus.publish.call_count, 3)
        
    def test_sync_terminal_data(self):
        # Primeiro criar a configuração, sessão e pedido offline
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            self.terminal_service.create_terminal_config(self.test_config)
        )
        session = loop.run_until_complete(
            self.terminal_service.create_terminal_session(self.test_config.id, "waiter-1")
        )
        order = OfflineOrder(
            id="offline-order-1",
            terminal_id=self.test_config.id,
            waiter_id="waiter-1",
            table_id="table-1",
            items=[
                {"product_id": "prod-1", "name": "Água", "price": 5.00, "quantity": 2},
                {"product_id": "prod-2", "name": "Refrigerante", "price": 7.00, "quantity": 1}
            ],
            total=17.00
        )
        loop.run_until_complete(
            self.terminal_service.create_offline_order(order)
        )
        
        # Sincronizar dados
        result = loop.run_until_complete(
            self.terminal_service.sync_terminal_data(self.test_config.id, session.id)
        )
        
        # Verificar se a sincronização foi bem-sucedida
        self.assertTrue(result["success"])
        self.assertEqual(result["synced_orders"], 1)
        
        # Verificar se o pedido foi marcado como sincronizado
        orders = loop.run_until_complete(
            self.terminal_service.get_offline_orders(self.test_config.id)
        )
        self.assertTrue(orders[0].synced)
        self.assertIsNotNone(orders[0].synced_at)
        self.assertIsNotNone(orders[0].server_order_id)
        
        # Verificar se a lista de pendentes foi limpa
        session = loop.run_until_complete(
            self.terminal_service.get_terminal_session(session.id)
        )
        self.assertEqual(len(session.pending_orders), 0)
        
        # Verificar se o evento foi publicado
        self.assertEqual(self.terminal_service.event_bus.publish.call_count, 4)


if __name__ == '__main__':
    unittest.main()
