from typing import Dict, List, Any
import asyncio
import json
import logging
from .transaction_tracker import TransactionEvent


class EventLogger:
    """
    Componente responsável pelo registro de eventos de transação.
    Suporta múltiplos destinos para os logs (banco de dados, arquivo, console, etc.)
    """

    def __init__(
        self,
        event_bus=None,
        database=None,
        log_to_console=False,
        log_to_file=False,
        log_file_path=None,
    ):
        self.event_bus = event_bus
        self.database = database
        self.log_to_console = log_to_console
        self.log_to_file = log_to_file
        self.log_file_path = log_file_path or "transaction_events.log"

        # Configurar logger para arquivo se necessário
        if self.log_to_file:
            self.file_logger = logging.getLogger("transaction_events")
            self.file_logger.setLevel(logging.INFO)

            file_handler = logging.FileHandler(self.log_file_path)
            file_handler.setFormatter(logging.Formatter("%(asctime)s - %(message)s"))
            self.file_logger.addHandler(file_handler)

    def log_event(self, event: TransactionEvent) -> bool:
        """
        Registra um evento de transação em todos os destinos configurados.
        """
        try:
            # Converter evento para dicionário
            event_dict = event.to_dict()

            # Publicar no barramento de eventos se disponível
            if self.event_bus:
                asyncio.create_task(self.publish_to_event_bus(event_dict))

            # Salvar no banco de dados se disponível
            if self.database:
                asyncio.create_task(self.save_to_database(event_dict))

            # Registrar no console se configurado
            if self.log_to_console:
                self.log_to_console_output(event_dict)

            # Registrar em arquivo se configurado
            if self.log_to_file:
                self.log_to_file_output(event_dict)

            return True

        except Exception as e:
            logging.error(f"Erro ao registrar evento de transação: {str(e)}")
            return False

    async def publish_to_event_bus(self, event_dict: Dict[str, Any]) -> None:
        """
        Publica o evento no barramento de eventos.
        """
        try:
            await self.event_bus.publish(
                topic="transaction.events",
                message=event_dict,
                metadata={
                    "transaction_id": event_dict["transaction_id"],
                    "event_type": event_dict["event_type"],
                    "status": event_dict["status"],
                },
            )
        except Exception as e:
            logging.error(f"Erro ao publicar evento no barramento: {str(e)}")

    async def save_to_database(self, event_dict: Dict[str, Any]) -> None:
        """
        Salva o evento no banco de dados.
        """
        try:
            # Adaptar conforme a interface do banco de dados
            await self.database.transaction_events.insert_one(event_dict)
        except Exception as e:
            logging.error(f"Erro ao salvar evento no banco de dados: {str(e)}")

    def log_to_console_output(self, event_dict: Dict[str, Any]) -> None:
        """
        Registra o evento no console.
        """
        try:
            # Formatar para melhor legibilidade
            formatted_event = (
                f"[{event_dict['timestamp']}] "
                f"Transaction: {event_dict['transaction_id']} | "
                f"Event: {event_dict['event_type']} | "
                f"Module: {event_dict['module']} | "
                f"Status: {event_dict['status']}"
            )
            print(formatted_event)
        except Exception as e:
            logging.error(f"Erro ao registrar evento no console: {str(e)}")

    def log_to_file_output(self, event_dict: Dict[str, Any]) -> None:
        """
        Registra o evento em arquivo.
        """
        try:
            # Converter para JSON e registrar
            event_json = json.dumps(event_dict)
            self.file_logger.info(event_json)
        except Exception as e:
            logging.error(f"Erro ao registrar evento em arquivo: {str(e)}")

    async def get_events_by_transaction_id(
        self, transaction_id: str
    ) -> List[Dict[str, Any]]:
        """
        Recupera todos os eventos associados a uma transação específica.
        """
        if not self.database:
            return []

        try:
            # Consultar eventos no banco de dados
            cursor = self.database.transaction_events.find(
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

    async def get_events_by_criteria(
        self, criteria: Dict[str, Any], limit: int = 100, skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Recupera eventos com base em critérios específicos.
        """
        if not self.database:
            return []

        try:
            # Consultar eventos no banco de dados ordenado por timestamp (decrescente)
            cursor = (
                self.database.transaction_events.find(criteria)
                .sort("timestamp", -1)
                .skip(skip)
                .limit(limit)
            )

            events = []
            async for event in cursor:
                # Remover o _id do MongoDB para serialização JSON
                if "_id" in event:
                    del event["_id"]
                events.append(event)

            return events

        except Exception as e:
            logging.error(f"Erro ao recuperar eventos por critérios: {str(e)}")
            return []
