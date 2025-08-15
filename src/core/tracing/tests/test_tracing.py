import unittest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.core.tracing.event_logger import EventLogger
from src.core.tracing.trace_repository import TraceRepository
from src.core.tracing.transaction_tracker import (
    EventType,
    TransactionEvent,
    TransactionOrigin,
    TransactionStatus,
    TransactionTracker,
    TransactionType,
)


class TestTransactionTracker(unittest.TestCase):
    def setUp(self):
        self.event_logger = MagicMock()
        self.tracker = TransactionTracker(event_logger=self.event_logger)

    def test_generate_transaction_id(self):
        # Testar geração de ID
        tx_id = self.tracker.generate_transaction_id(
            TransactionType.ORDER, TransactionOrigin.POS, sequence=1234
        )

        # Verificar formato
        parts = tx_id.split("-")
        self.assertEqual(len(parts), 5)
        self.assertEqual(parts[0], "ORD")
        self.assertEqual(parts[1], "POS")
        self.assertEqual(len(parts[2]), 12)  # Timestamp
        self.assertEqual(parts[3], "1234")  # Sequência
        self.assertEqual(len(parts[4]), 4)  # Checksum

    def test_validate_transaction_id(self):
        # Gerar ID válido
        tx_id = self.tracker.generate_transaction_id(
            TransactionType.ORDER, TransactionOrigin.POS
        )

        # Verificar validação
        self.assertTrue(self.tracker.validate_transaction_id(tx_id))

        # Testar ID inválido
        invalid_id = "INVALID-ID"
        self.assertFalse(self.tracker.validate_transaction_id(invalid_id))

        # Testar ID com formato correto mas checksum inválido
        parts = tx_id.split("-")
        invalid_checksum_id = f"{parts[0]}-{parts[1]}-{parts[2]}-{parts[3]}-XXXX"
        self.assertFalse(self.tracker.validate_transaction_id(invalid_checksum_id))

    def test_start_transaction(self):
        # Iniciar transação
        tx_id = self.tracker.start_transaction(
            TransactionType.ORDER,
            TransactionOrigin.POS,
            "order_module",
            {"order_id": "12345"},
        )

        # Verificar chamada ao logger
        self.event_logger.log_event.assert_called_once()
        event = self.event_logger.log_event.call_args[0][0]

        self.assertEqual(event.transaction_id, tx_id)
        self.assertEqual(event.event_type, EventType.CREATED)
        self.assertEqual(event.module, "order_module")
        self.assertEqual(event.status, TransactionStatus.PENDING)
        self.assertEqual(event.data, {"order_id": "12345"})

    def test_update_transaction(self):
        # Gerar ID válido
        tx_id = self.tracker.generate_transaction_id(
            TransactionType.ORDER, TransactionOrigin.POS
        )

        # Atualizar transação
        result = self.tracker.update_transaction(
            tx_id,
            EventType.UPDATED,
            "order_module",
            TransactionStatus.PROCESSING,
            {"status": "processing"},
        )

        # Verificar resultado e chamada ao logger
        self.assertTrue(result)
        self.event_logger.log_event.assert_called_once()
        event = self.event_logger.log_event.call_args[0][0]

        self.assertEqual(event.transaction_id, tx_id)
        self.assertEqual(event.event_type, EventType.UPDATED)
        self.assertEqual(event.module, "order_module")
        self.assertEqual(event.status, TransactionStatus.PROCESSING)
        self.assertEqual(event.data, {"status": "processing"})

        # Testar com ID inválido
        self.event_logger.log_event.reset_mock()
        result = self.tracker.update_transaction(
            "INVALID-ID",
            EventType.UPDATED,
            "order_module",
            TransactionStatus.PROCESSING,
        )

        # Verificar que não houve chamada ao logger
        self.assertFalse(result)
        self.event_logger.log_event.assert_not_called()

    def test_complete_transaction(self):
        # Gerar ID válido
        tx_id = self.tracker.generate_transaction_id(
            TransactionType.ORDER, TransactionOrigin.POS
        )

        # Completar transação com sucesso
        result = self.tracker.complete_transaction(
            tx_id, "order_module", True, {"order_status": "completed"}
        )

        # Verificar resultado e chamada ao logger
        self.assertTrue(result)
        self.event_logger.log_event.assert_called_once()
        event = self.event_logger.log_event.call_args[0][0]

        self.assertEqual(event.transaction_id, tx_id)
        self.assertEqual(event.event_type, EventType.COMPLETED)
        self.assertEqual(event.module, "order_module")
        self.assertEqual(event.status, TransactionStatus.COMPLETED)
        self.assertEqual(event.data, {"order_status": "completed"})

        # Completar transação com falha
        self.event_logger.log_event.reset_mock()
        result = self.tracker.complete_transaction(
            tx_id, "order_module", False, {"error": "payment_failed"}
        )

        # Verificar resultado e chamada ao logger
        self.assertTrue(result)
        self.event_logger.log_event.assert_called_once()
        event = self.event_logger.log_event.call_args[0][0]

        self.assertEqual(event.transaction_id, tx_id)
        self.assertEqual(event.event_type, EventType.FAILED)
        self.assertEqual(event.module, "order_module")
        self.assertEqual(event.status, TransactionStatus.FAILED)
        self.assertEqual(event.data, {"error": "payment_failed"})


class TestEventLogger(unittest.TestCase):
    def setUp(self):
        self.event_bus = AsyncMock()
        self.database = AsyncMock()
        self.logger = EventLogger(
            event_bus=self.event_bus, database=self.database, log_to_console=True
        )

    @patch("asyncio.create_task")
    def test_log_event(self, mock_create_task):
        # Criar evento
        event = TransactionEvent(
            transaction_id="ORD-POS-230525142233-0001-A7F3",
            event_type=EventType.CREATED,
            module="order_module",
            status=TransactionStatus.PENDING,
            data={"order_id": "12345"},
        )

        # Registrar evento
        result = self.logger.log_event(event)

        # Verificar resultado
        self.assertTrue(result)

        # Verificar chamadas assíncronas
        self.assertEqual(mock_create_task.call_count, 2)

    @patch("logging.error")
    @patch("asyncio.create_task")
    def test_log_event_error(self, mock_create_task, mock_error):
        # Configurar mock para lançar exceção
        mock_create_task.side_effect = Exception("Test error")

        # Criar evento
        event = TransactionEvent(
            transaction_id="ORD-POS-230525142233-0001-A7F3",
            event_type=EventType.CREATED,
            module="order_module",
            status=TransactionStatus.PENDING,
        )

        # Registrar evento (deve capturar exceção)
        result = self.logger.log_event(event)

        # Verificar resultado e log de erro
        self.assertFalse(result)
        mock_error.assert_called_once()


class TestTraceRepository(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.database = AsyncMock()
        self.events_collection = AsyncMock()
        self.transactions_collection = AsyncMock()

        self.database.transaction_events = self.events_collection
        self.database.transactions = self.transactions_collection

        self.repository = TraceRepository(self.database)

    async def test_save_event(self):
        # Criar evento
        event = TransactionEvent(
            transaction_id="ORD-POS-230525142233-0001-A7F3",
            event_type=EventType.CREATED,
            module="order_module",
            status=TransactionStatus.PENDING,
            data={"order_id": "12345"},
        )

        # Configurar mock para find_one
        self.transactions_collection.find_one.return_value = None

        # Salvar evento
        result = await self.repository.save_event(event)

        # Verificar resultado
        self.assertTrue(result)

        # Verificar chamadas
        self.events_collection.insert_one.assert_called_once()
        self.transactions_collection.find_one.assert_called_once()
        self.transactions_collection.insert_one.assert_called_once()

    async def test_update_transaction_summary_existing(self):
        # Criar evento
        event_dict = {
            "transaction_id": "ORD-POS-230525142233-0001-A7F3",
            "timestamp": datetime.utcnow(),
            "event_type": "updated",
            "module": "order_module",
            "status": "processing",
            "data": {"status": "processing"},
            "metadata": {},
        }

        # Configurar mock para find_one
        self.transactions_collection.find_one.return_value = {
            "transaction_id": "ORD-POS-230525142233-0001-A7F3",
            "type": "ORD",
            "origin": "POS",
            "status": "pending",
            "start_time": datetime.utcnow(),
            "last_update": datetime.utcnow(),
            "end_time": None,
            "duration_ms": None,
            "event_count": 1,
            "first_module": "order_module",
            "last_module": "order_module",
            "modules": ["order_module"],
        }

        # Atualizar resumo da transação
        await self.repository._update_transaction_summary(event_dict)

        # Verificar chamadas
        self.transactions_collection.find_one.assert_called_once()
        self.transactions_collection.update_one.assert_called_once()
        self.transactions_collection.insert_one.assert_not_called()

    async def test_get_events_by_transaction_id(self):
        # Configurar mock para find
        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = [
            {"_id": "id1", "transaction_id": "tx1", "event_type": "created"},
            {"_id": "id2", "transaction_id": "tx1", "event_type": "updated"},
        ]
        self.events_collection.find.return_value = mock_cursor

        # Buscar eventos
        events = await self.repository.get_events_by_transaction_id("tx1")

        # Verificar resultado
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["transaction_id"], "tx1")
        self.assertEqual(events[0]["event_type"], "created")
        self.assertNotIn("_id", events[0])

        # Verificar chamadas
        self.events_collection.find.assert_called_once()

    async def test_search_transactions(self):
        # Configurar mock para find
        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = [
            {"_id": "id1", "transaction_id": "tx1", "type": "ORD"},
            {"_id": "id2", "transaction_id": "tx2", "type": "PAY"},
        ]
        self.transactions_collection.find.return_value = mock_cursor

        # Buscar transações
        transactions = await self.repository.search_transactions(
            filters={"type": "ORD"},
            sort_by="start_time",
            sort_direction=-1,
            skip=0,
            limit=10,
        )

        # Verificar resultado
        self.assertEqual(len(transactions), 2)
        self.assertEqual(transactions[0]["transaction_id"], "tx1")
        self.assertEqual(transactions[0]["type"], "ORD")
        self.assertNotIn("_id", transactions[0])

        # Verificar chamadas
        self.transactions_collection.find.assert_called_once()


if __name__ == "__main__":
    unittest.main()
