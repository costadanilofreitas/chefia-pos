from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from .transaction_tracker import TransactionEvent, EventType


class TraceRepository:
    """
    Repositório para armazenamento e consulta de dados de rastreamento de transações.
    Fornece métodos para persistência, recuperação e análise de eventos de transação.
    """

    def __init__(self, database: AsyncIOMotorDatabase):
        self.database = database
        self.events_collection = database.transaction_events
        self.transactions_collection = database.transactions

        # Inicializar índices
        self._ensure_indexes()

    async def _ensure_indexes(self):
        """
        Garante que os índices necessários estejam criados nas coleções.
        """
        try:
            # Índices para eventos
            await self.events_collection.create_index("transaction_id")
            await self.events_collection.create_index("timestamp")
            await self.events_collection.create_index(
                [("transaction_id", 1), ("timestamp", 1)]
            )
            await self.events_collection.create_index("event_type")
            await self.events_collection.create_index("status")
            await self.events_collection.create_index("module")

            # Índices para transações
            await self.transactions_collection.create_index(
                "transaction_id", unique=True
            )
            await self.transactions_collection.create_index("type")
            await self.transactions_collection.create_index("origin")
            await self.transactions_collection.create_index("start_time")
            await self.transactions_collection.create_index("end_time")
            await self.transactions_collection.create_index("status")

        except Exception as e:
            logging.error(f"Erro ao criar índices: {str(e)}")

    async def save_event(self, event: Union[TransactionEvent, Dict[str, Any]]) -> bool:
        """
        Salva um evento de transação no repositório.
        """
        try:
            # Converter para dicionário se for um objeto TransactionEvent
            if isinstance(event, TransactionEvent):
                event_dict = event.to_dict()
            else:
                event_dict = event

            # Inserir evento
            await self.events_collection.insert_one(event_dict)

            # Atualizar ou criar registro da transação
            await self._update_transaction_summary(event_dict)

            return True

        except Exception as e:
            logging.error(f"Erro ao salvar evento: {str(e)}")
            return False

    async def _update_transaction_summary(self, event: Dict[str, Any]) -> None:
        """
        Atualiza o resumo da transação com base no evento.
        """
        transaction_id = event["transaction_id"]
        timestamp = (
            datetime.fromisoformat(event["timestamp"])
            if isinstance(event["timestamp"], str)
            else event["timestamp"]
        )
        status = event["status"]
        event_type = event["event_type"]
        module = event["module"]

        # Verificar se a transação já existe
        transaction = await self.transactions_collection.find_one(
            {"transaction_id": transaction_id}
        )

        if transaction:
            # Atualizar transação existente
            update = {
                "$set": {
                    "status": status,
                    "last_update": timestamp,
                    "last_module": module,
                },
                "$inc": {"event_count": 1},
                "$push": {"modules": module},
            }

            # Se for evento de conclusão, atualizar end_time
            if event_type in [
                EventType.COMPLETED,
                EventType.FAILED,
                EventType.CANCELED,
            ]:
                update["$set"]["end_time"] = timestamp
                update["$set"]["duration_ms"] = (
                    timestamp - transaction["start_time"]
                ).total_seconds() * 1000

            await self.transactions_collection.update_one(
                {"transaction_id": transaction_id}, update
            )

        else:
            # Extrair tipo e origem do ID da transação
            parts = transaction_id.split("-")
            if len(parts) >= 2:
                tx_type, origin = parts[0], parts[1]
            else:
                tx_type, origin = "UNKNOWN", "UNKNOWN"

            # Criar nova transação
            new_transaction = {
                "transaction_id": transaction_id,
                "type": tx_type,
                "origin": origin,
                "status": status,
                "start_time": timestamp,
                "last_update": timestamp,
                "end_time": None,
                "duration_ms": None,
                "event_count": 1,
                "first_module": module,
                "last_module": module,
                "modules": [module],
            }

            await self.transactions_collection.insert_one(new_transaction)

    async def get_events_by_transaction_id(
        self, transaction_id: str
    ) -> List[Dict[str, Any]]:
        """
        Recupera todos os eventos associados a uma transação específica.
        """
        try:
            cursor = self.events_collection.find(
                {"transaction_id": transaction_id}
            ).sort(
                "timestamp", 1
            )  # Ordenar por timestamp (crescente)

            events = []
            async for event in cursor:
                # Remover o _id do MongoDB para serialização JSON
                if "_id" in event:
                    del event["_id"]
                events.append(event)

            return events

        except Exception as e:
            logging.error(f"Erro ao recuperar eventos da transação: {str(e)}")
            return []

    async def get_transaction_summary(
        self, transaction_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Recupera o resumo de uma transação específica.
        """
        try:
            transaction = await self.transactions_collection.find_one(
                {"transaction_id": transaction_id}
            )

            if transaction and "_id" in transaction:
                del transaction["_id"]

            return transaction

        except Exception as e:
            logging.error(f"Erro ao recuperar resumo da transação: {str(e)}")
            return None

    async def search_transactions(
        self,
        filters: Dict[str, Any],
        sort_by: str = "start_time",
        sort_direction: int = -1,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Pesquisa transações com base em filtros específicos.
        """
        try:
            cursor = (
                self.transactions_collection.find(filters)
                .sort(sort_by, sort_direction)
                .skip(skip)
                .limit(limit)
            )

            transactions = []
            async for transaction in cursor:
                if "_id" in transaction:
                    del transaction["_id"]
                transactions.append(transaction)

            return transactions

        except Exception as e:
            logging.error(f"Erro ao pesquisar transações: {str(e)}")
            return []

    async def get_transaction_stats(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        group_by: str = "type",
    ) -> List[Dict[str, Any]]:
        """
        Recupera estatísticas agregadas de transações.
        """
        try:
            # Definir período de tempo
            if not start_time:
                start_time = datetime.utcnow() - timedelta(days=1)
            if not end_time:
                end_time = datetime.utcnow()

            # Construir pipeline de agregação
            pipeline = [
                {"$match": {"start_time": {"$gte": start_time, "$lte": end_time}}},
                {
                    "$group": {
                        "_id": f"${group_by}",
                        "count": {"$sum": 1},
                        "completed": {
                            "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                        },
                        "failed": {
                            "$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}
                        },
                        "avg_duration_ms": {"$avg": "$duration_ms"},
                        "max_duration_ms": {"$max": "$duration_ms"},
                        "min_duration_ms": {"$min": "$duration_ms"},
                    }
                },
                {
                    "$project": {
                        "category": "$_id",
                        "count": 1,
                        "completed": 1,
                        "failed": 1,
                        "success_rate": {
                            "$multiply": [
                                {"$divide": ["$completed", {"$max": ["$count", 1]}]},
                                100,
                            ]
                        },
                        "avg_duration_ms": 1,
                        "max_duration_ms": 1,
                        "min_duration_ms": 1,
                        "_id": 0,
                    }
                },
                {"$sort": {"count": -1}},
            ]

            # Executar agregação
            cursor = self.transactions_collection.aggregate(pipeline)

            stats = []
            async for stat in cursor:
                stats.append(stat)

            return stats

        except Exception as e:
            logging.error(f"Erro ao recuperar estatísticas de transações: {str(e)}")
            return []

    async def cleanup_old_events(self, days_to_keep: int = 30) -> int:
        """
        Remove eventos antigos do repositório.
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

            # Remover eventos antigos
            result = await self.events_collection.delete_many(
                {"timestamp": {"$lt": cutoff_date}}
            )

            deleted_count = result.deleted_count

            # Atualizar contadores de eventos nas transações
            # (Isso é uma simplificação, em um sistema real seria mais complexo)
            await self.transactions_collection.update_many(
                {"last_update": {"$lt": cutoff_date}}, {"$set": {"event_count": 0}}
            )

            return deleted_count

        except Exception as e:
            logging.error(f"Erro ao limpar eventos antigos: {str(e)}")
            return 0
