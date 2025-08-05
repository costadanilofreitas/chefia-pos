"""
Módulo de testes para validação do sistema de suporte escalável.

Este módulo implementa testes automatizados para validar:
- Funcionalidades do chatbot
- Sistema de tickets
- Base de conhecimento
- Integração com WhatsApp via Twilio
- Análise de sentimento e priorização
"""

import unittest
import asyncio
from datetime import datetime, timedelta
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Importar módulos a serem testados
from src.support.support_service import (
    SupportService,
    TicketService,
    ChatbotService,
    KnowledgeBaseService,
    SupportAnalyticsService,
    TwilioService,
    BedrockService,
)


class MockDBService:
    """Mock do serviço de banco de dados para testes."""

    def __init__(self):
        self.data = {
            "support_tickets": [],
            "support_chats": [],
            "knowledge_articles": [],
        }

    async def insert(self, collection, document):
        """Simula inserção no banco de dados."""
        self.data[collection].append(document)
        return document

    async def find_one(self, collection, query):
        """Simula busca de um documento no banco de dados."""
        for doc in self.data[collection]:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                return doc
        return None

    async def find(self, collection, query, sort=None, skip=0, limit=None):
        """Simula busca de múltiplos documentos no banco de dados."""
        results = []
        for doc in self.data[collection]:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                results.append(doc)

        # Aplicar ordenação se fornecida
        if sort:
            for sort_field, sort_dir in sort:
                reverse = sort_dir < 0
                results.sort(key=lambda x: x.get(sort_field, ""), reverse=reverse)

        # Aplicar paginação
        if limit:
            return results[skip : skip + limit]
        else:
            return results[skip:]

    async def update(self, collection, query, update_data):
        """Simula atualização no banco de dados."""
        for doc in self.data[collection]:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break

            if match:
                if "$set" in update_data:
                    for key, value in update_data["$set"].items():
                        doc[key] = value

                if "$push" in update_data:
                    for key, value in update_data["$push"].items():
                        if key not in doc:
                            doc[key] = []
                        doc[key].append(value)

                if "$inc" in update_data:
                    for key, value in update_data["$inc"].items():
                        if key not in doc:
                            doc[key] = 0
                        doc[key] += value

                return True

        return False

    async def delete(self, collection, query):
        """Simula exclusão no banco de dados."""
        initial_count = len(self.data[collection])
        self.data[collection] = [
            doc
            for doc in self.data[collection]
            if not all(doc.get(k) == v for k, v in query.items())
        ]
        return len(self.data[collection]) < initial_count

    async def count(self, collection, query):
        """Simula contagem de documentos no banco de dados."""
        count = 0
        for doc in self.data[collection]:
            match = True
            for key, value in query.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                count += 1
        return count

    async def text_search(self, collection, query, filter_query=None, limit=None):
        """Simula pesquisa de texto no banco de dados."""
        results = []
        query_lower = query.lower()

        for doc in self.data[collection]:
            # Verificar filtro
            if filter_query:
                match = True
                for key, value in filter_query.items():
                    if key not in doc or doc[key] != value:
                        match = False
                        break
                if not match:
                    continue

            # Pesquisar em campos de texto
            found = False
            for key, value in doc.items():
                if isinstance(value, str) and query_lower in value.lower():
                    found = True
                    break

            if found:
                results.append(doc)

        # Aplicar limite
        if limit:
            return results[:limit]
        else:
            return results


class MockConfigService:
    """Mock do serviço de configuração para testes."""

    async def get_restaurant_config(self, restaurant_id):
        """Simula obtenção de configurações do restaurante."""
        return {
            "name": "Restaurante Teste",
            "support": {
                "welcome_message": "Bem-vindo ao suporte do Restaurante Teste!",
                "business_hours": "09:00-18:00",
                "default_language": "pt-BR",
            },
        }


class MockEventBus:
    """Mock do barramento de eventos para testes."""

    def __init__(self):
        self.published_events = []

    async def publish(self, event_type, event_data):
        """Simula publicação de evento."""
        self.published_events.append(
            {
                "type": event_type,
                "data": event_data,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        return True


class TestTicketService(unittest.TestCase):
    """Testes para o serviço de tickets."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.db_service = MockDBService()
        self.event_bus = MockEventBus()
        self.ticket_service = TicketService(self.db_service, self.event_bus)

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def test_create_ticket(self):
        """Testa a criação de um ticket."""
        # Dados de teste
        ticket_data = {
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "description": "A impressora não está funcionando corretamente.",
            "created_by": "user-123",
            "priority": "medium",
            "category": "hardware",
        }

        # Executar teste
        ticket = self.loop.run_until_complete(
            self.ticket_service.create_ticket(ticket_data)
        )

        # Verificar resultados
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket["subject"], "Problema com impressora")
        self.assertEqual(ticket["status"], "open")
        self.assertEqual(ticket["priority"], "medium")
        self.assertEqual(ticket["category"], "hardware")
        self.assertEqual(len(ticket["messages"]), 1)

        # Verificar evento publicado
        self.assertEqual(len(self.event_bus.published_events), 1)
        self.assertEqual(self.event_bus.published_events[0]["type"], "ticket.created")

    def test_get_ticket(self):
        """Testa a obtenção de um ticket pelo ID."""
        # Criar ticket para teste
        ticket_data = {
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "description": "A impressora não está funcionando corretamente.",
            "created_by": "user-123",
        }
        ticket = self.loop.run_until_complete(
            self.ticket_service.create_ticket(ticket_data)
        )

        # Executar teste
        retrieved_ticket = self.loop.run_until_complete(
            self.ticket_service.get_ticket(ticket["id"])
        )

        # Verificar resultados
        self.assertEqual(retrieved_ticket["id"], ticket["id"])
        self.assertEqual(retrieved_ticket["subject"], ticket["subject"])

    def test_update_ticket(self):
        """Testa a atualização de um ticket."""
        # Criar ticket para teste
        ticket_data = {
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "description": "A impressora não está funcionando corretamente.",
            "created_by": "user-123",
        }
        ticket = self.loop.run_until_complete(
            self.ticket_service.create_ticket(ticket_data)
        )

        # Dados de atualização
        update_data = {
            "status": "in_progress",
            "priority": "high",
            "assigned_to": "agent-456",
            "updated_by": "user-789",
        }

        # Executar teste
        updated_ticket = self.loop.run_until_complete(
            self.ticket_service.update_ticket(ticket["id"], update_data)
        )

        # Verificar resultados
        self.assertEqual(updated_ticket["status"], "in_progress")
        self.assertEqual(updated_ticket["priority"], "high")
        self.assertEqual(updated_ticket["assigned_to"], "agent-456")

        # Verificar evento publicado
        self.assertEqual(self.event_bus.published_events[1]["type"], "ticket.updated")

    def test_add_message(self):
        """Testa a adição de uma mensagem a um ticket."""
        # Criar ticket para teste
        ticket_data = {
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "description": "A impressora não está funcionando corretamente.",
            "created_by": "user-123",
        }
        ticket = self.loop.run_until_complete(
            self.ticket_service.create_ticket(ticket_data)
        )

        # Dados da mensagem
        message_data = {
            "content": "Já tentei reiniciar a impressora, mas não funcionou.",
            "sender_id": "user-123",
            "sender_type": "customer",
        }

        # Executar teste
        message = self.loop.run_until_complete(
            self.ticket_service.add_message(ticket["id"], message_data)
        )

        # Verificar resultados
        self.assertIsNotNone(message)
        self.assertEqual(message["content"], message_data["content"])
        self.assertEqual(message["sender_id"], message_data["sender_id"])

        # Obter ticket atualizado
        updated_ticket = self.loop.run_until_complete(
            self.ticket_service.get_ticket(ticket["id"])
        )

        # Verificar que a mensagem foi adicionada ao ticket
        self.assertEqual(
            len(updated_ticket["messages"]), 2
        )  # Descrição inicial + nova mensagem

        # Verificar evento publicado
        self.assertEqual(
            self.event_bus.published_events[2]["type"], "ticket.message.created"
        )

    def test_get_tickets(self):
        """Testa a listagem de tickets com filtros."""
        # Criar tickets para teste
        ticket_data1 = {
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "description": "A impressora não está funcionando corretamente.",
            "created_by": "user-123",
            "priority": "high",
            "category": "hardware",
        }

        ticket_data2 = {
            "restaurant_id": "restaurant-123",
            "subject": "Dúvida sobre relatório",
            "description": "Como exporto o relatório de vendas?",
            "created_by": "user-456",
            "priority": "low",
            "category": "software",
        }

        self.loop.run_until_complete(self.ticket_service.create_ticket(ticket_data1))
        self.loop.run_until_complete(self.ticket_service.create_ticket(ticket_data2))

        # Executar teste - todos os tickets
        all_tickets = self.loop.run_until_complete(
            self.ticket_service.get_tickets("restaurant-123")
        )

        # Verificar resultados
        self.assertEqual(all_tickets["total"], 2)
        self.assertEqual(len(all_tickets["items"]), 2)

        # Executar teste - filtrar por prioridade
        high_priority_tickets = self.loop.run_until_complete(
            self.ticket_service.get_tickets("restaurant-123", priority="high")
        )

        # Verificar resultados
        self.assertEqual(high_priority_tickets["total"], 1)
        self.assertEqual(
            high_priority_tickets["items"][0]["subject"], "Problema com impressora"
        )

        # Executar teste - filtrar por categoria
        software_tickets = self.loop.run_until_complete(
            self.ticket_service.get_tickets("restaurant-123", category="software")
        )

        # Verificar resultados
        self.assertEqual(software_tickets["total"], 1)
        self.assertEqual(
            software_tickets["items"][0]["subject"], "Dúvida sobre relatório"
        )


class TestChatbotService(unittest.TestCase):
    """Testes para o serviço de chatbot."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.db_service = MockDBService()
        self.config_service = MockConfigService()
        self.event_bus = MockEventBus()
        self.chatbot_service = ChatbotService(
            self.db_service, self.config_service, self.event_bus
        )

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def test_start_chat(self):
        """Testa o início de uma conversa de chatbot."""
        # Dados de teste
        chat_data = {
            "restaurant_id": "restaurant-123",
            "user_id": "user-123",
            "user_name": "João Silva",
            "channel": "web",
        }

        # Executar teste
        chat = self.loop.run_until_complete(self.chatbot_service.start_chat(chat_data))

        # Verificar resultados
        self.assertIsNotNone(chat)
        self.assertEqual(chat["restaurant_id"], "restaurant-123")
        self.assertEqual(chat["user_id"], "user-123")
        self.assertEqual(chat["status"], "active")
        self.assertEqual(chat["channel"], "web")
        self.assertGreater(len(chat["messages"]), 0)  # Deve ter mensagem de boas-vindas

        # Verificar evento publicado
        self.assertEqual(
            len(self.event_bus.published_events), 2
        )  # start + welcome message
        self.assertEqual(self.event_bus.published_events[0]["type"], "chat.started")

    def test_add_message(self):
        """Testa a adição de uma mensagem a uma conversa."""
        # Iniciar conversa para teste
        chat_data = {
            "restaurant_id": "restaurant-123",
            "user_id": "user-123",
            "user_name": "João Silva",
            "channel": "web",
        }
        chat = self.loop.run_until_complete(self.chatbot_service.start_chat(chat_data))

        # Limpar eventos publicados
        self.event_bus.published_events = []

        # Dados da mensagem
        message_data = {
            "content": "Como faço para configurar uma impressora?",
            "sender_id": "user-123",
            "sender_type": "user",
        }

        # Executar teste
        message = self.loop.run_until_complete(
            self.chatbot_service.add_message(chat["id"], message_data)
        )

        # Verificar resultados
        self.assertIsNotNone(message)
        self.assertEqual(message["content"], message_data["content"])
        self.assertEqual(message["sender_id"], message_data["sender_id"])

        # Obter conversa atualizada
        updated_chat = self.loop.run_until_complete(
            self.chatbot_service.get_chat(chat["id"])
        )

        # Verificar que a mensagem foi adicionada à conversa
        self.assertGreater(
            len(updated_chat["messages"]), 1
        )  # Boas-vindas + nova mensagem

        # Verificar evento publicado
        self.assertEqual(
            self.event_bus.published_events[0]["type"], "chat.message.created"
        )

    def test_end_chat(self):
        """Testa o encerramento de uma conversa."""
        # Iniciar conversa para teste
        chat_data = {
            "restaurant_id": "restaurant-123",
            "user_id": "user-123",
            "user_name": "João Silva",
            "channel": "web",
        }
        chat = self.loop.run_until_complete(self.chatbot_service.start_chat(chat_data))

        # Limpar eventos publicados
        self.event_bus.published_events = []

        # Executar teste
        closed_chat = self.loop.run_until_complete(
            self.chatbot_service.end_chat(chat["id"], "user_requested")
        )

        # Verificar resultados
        self.assertEqual(closed_chat["status"], "closed")
        self.assertIsNotNone(closed_chat["closed_at"])
        self.assertEqual(closed_chat["close_reason"], "user_requested")

        # Verificar eventos publicados
        self.assertEqual(self.event_bus.published_events[0]["type"], "chat.ended")
        self.assertEqual(
            self.event_bus.published_events[1]["type"], "chat.message.created"
        )  # Mensagem de encerramento

    def test_transfer_to_human(self):
        """Testa a transferência de uma conversa para um atendente humano."""
        # Iniciar conversa para teste
        chat_data = {
            "restaurant_id": "restaurant-123",
            "user_id": "user-123",
            "user_name": "João Silva",
            "channel": "web",
        }
        chat = self.loop.run_until_complete(self.chatbot_service.start_chat(chat_data))

        # Limpar eventos publicados
        self.event_bus.published_events = []

        # Executar teste
        transferred_chat = self.loop.run_until_complete(
            self.chatbot_service.transfer_to_human(chat["id"], "agent-456")
        )

        # Verificar resultados
        self.assertEqual(transferred_chat["status"], "transferred")
        self.assertIsNotNone(transferred_chat["transferred_at"])
        self.assertEqual(transferred_chat["transferred_to"], "agent-456")

        # Verificar que um ticket foi criado
        self.assertIsNotNone(transferred_chat.get("ticket_id"))

        # Verificar eventos publicados
        self.assertEqual(self.event_bus.published_events[0]["type"], "chat.transferred")
        self.assertEqual(
            self.event_bus.published_events[1]["type"], "chat.message.created"
        )  # Mensagem de transferência
        self.assertEqual(
            self.event_bus.published_events[2]["type"], "ticket.created"
        )  # Criação do ticket


class TestKnowledgeBaseService(unittest.TestCase):
    """Testes para o serviço de base de conhecimento."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.db_service = MockDBService()
        self.knowledge_service = KnowledgeBaseService(self.db_service)

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def test_create_article(self):
        """Testa a criação de um artigo."""
        # Dados de teste
        article_data = {
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "summary": "Guia para configuração de impressoras",
            "category": "hardware",
            "tags": ["impressora", "configuração", "hardware"],
            "created_by": "user-123",
        }

        # Executar teste
        article = self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data)
        )

        # Verificar resultados
        self.assertIsNotNone(article)
        self.assertEqual(article["title"], "Como configurar uma impressora")
        self.assertEqual(article["category"], "hardware")
        self.assertEqual(article["status"], "published")
        self.assertEqual(article["view_count"], 0)

    def test_get_article(self):
        """Testa a obtenção de um artigo pelo ID."""
        # Criar artigo para teste
        article_data = {
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "created_by": "user-123",
        }
        article = self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data)
        )

        # Executar teste
        retrieved_article = self.loop.run_until_complete(
            self.knowledge_service.get_article(article["id"])
        )

        # Verificar resultados
        self.assertEqual(retrieved_article["id"], article["id"])
        self.assertEqual(retrieved_article["title"], article["title"])
        self.assertEqual(
            retrieved_article["view_count"], 1
        )  # Incrementado após visualização

    def test_update_article(self):
        """Testa a atualização de um artigo."""
        # Criar artigo para teste
        article_data = {
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "created_by": "user-123",
        }
        article = self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data)
        )

        # Dados de atualização
        update_data = {
            "title": "Guia completo: Como configurar uma impressora",
            "content": "Guia atualizado. Passo 1: Conecte a impressora...",
            "tags": ["impressora", "configuração", "guia"],
            "updated_by": "user-456",
        }

        # Executar teste
        updated_article = self.loop.run_until_complete(
            self.knowledge_service.update_article(article["id"], update_data)
        )

        # Verificar resultados
        self.assertEqual(updated_article["title"], update_data["title"])
        self.assertEqual(updated_article["content"], update_data["content"])
        self.assertEqual(updated_article["tags"], update_data["tags"])

    def test_delete_article(self):
        """Testa a exclusão de um artigo."""
        # Criar artigo para teste
        article_data = {
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "created_by": "user-123",
        }
        article = self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data)
        )

        # Executar teste
        result = self.loop.run_until_complete(
            self.knowledge_service.delete_article(article["id"])
        )

        # Verificar resultados
        self.assertTrue(result)

        # Tentar obter o artigo excluído
        try:
            self.loop.run_until_complete(
                self.knowledge_service.get_article(article["id"])
            )
            self.fail("Artigo não foi excluído")
        except Exception as e:
            self.assertIn("404", str(e))

    def test_get_articles(self):
        """Testa a listagem de artigos com filtros."""
        # Criar artigos para teste
        article_data1 = {
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "category": "hardware",
            "tags": ["impressora", "configuração"],
            "created_by": "user-123",
        }

        article_data2 = {
            "restaurant_id": "restaurant-123",
            "title": "Como exportar relatórios",
            "content": "Para exportar relatórios, acesse...",
            "category": "software",
            "tags": ["relatório", "exportação"],
            "created_by": "user-456",
        }

        self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data1)
        )
        self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data2)
        )

        # Executar teste - todos os artigos
        all_articles = self.loop.run_until_complete(
            self.knowledge_service.get_articles("restaurant-123")
        )

        # Verificar resultados
        self.assertEqual(all_articles["total"], 2)
        self.assertEqual(len(all_articles["items"]), 2)

        # Executar teste - filtrar por categoria
        hardware_articles = self.loop.run_until_complete(
            self.knowledge_service.get_articles("restaurant-123", category="hardware")
        )

        # Verificar resultados
        self.assertEqual(hardware_articles["total"], 1)
        self.assertEqual(
            hardware_articles["items"][0]["title"], "Como configurar uma impressora"
        )

    def test_rate_article(self):
        """Testa a avaliação de um artigo."""
        # Criar artigo para teste
        article_data = {
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "created_by": "user-123",
        }
        article = self.loop.run_until_complete(
            self.knowledge_service.create_article(article_data)
        )

        # Executar teste - marcar como útil
        rated_article = self.loop.run_until_complete(
            self.knowledge_service.rate_article(article["id"], True)
        )

        # Verificar resultados
        self.assertEqual(rated_article["helpful_count"], 1)
        self.assertEqual(rated_article["not_helpful_count"], 0)

        # Executar teste - marcar como não útil
        rated_article = self.loop.run_until_complete(
            self.knowledge_service.rate_article(article["id"], False)
        )

        # Verificar resultados
        self.assertEqual(rated_article["helpful_count"], 1)
        self.assertEqual(rated_article["not_helpful_count"], 1)


class TestSupportAnalyticsService(unittest.TestCase):
    """Testes para o serviço de análise de suporte."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.db_service = MockDBService()
        self.analytics_service = SupportAnalyticsService(self.db_service)

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        # Criar dados de teste
        self._create_test_data()

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def _create_test_data(self):
        """Cria dados de teste para análise."""
        # Criar tickets
        now = datetime.utcnow()

        # Ticket fechado
        ticket1 = {
            "id": "ticket-1",
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "status": "closed",
            "created_at": (now - timedelta(days=5)).isoformat(),
            "updated_at": (now - timedelta(days=4)).isoformat(),
            "messages": [
                {
                    "id": "msg-1",
                    "content": "A impressora não está funcionando.",
                    "created_at": (now - timedelta(days=5)).isoformat(),
                },
                {
                    "id": "msg-2",
                    "content": "Tente reiniciar a impressora.",
                    "created_at": (now - timedelta(days=4, hours=23)).isoformat(),
                },
                {
                    "id": "msg-3",
                    "content": "Funcionou, obrigado!",
                    "update_status": "closed",
                    "created_at": (now - timedelta(days=4)).isoformat(),
                },
            ],
        }

        # Ticket aberto
        ticket2 = {
            "id": "ticket-2",
            "restaurant_id": "restaurant-123",
            "subject": "Dúvida sobre relatório",
            "status": "open",
            "created_at": (now - timedelta(days=1)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat(),
            "messages": [
                {
                    "id": "msg-4",
                    "content": "Como exporto o relatório de vendas?",
                    "created_at": (now - timedelta(days=1)).isoformat(),
                }
            ],
        }

        # Adicionar tickets ao banco de dados
        self.loop.run_until_complete(self.db_service.insert("support_tickets", ticket1))
        self.loop.run_until_complete(self.db_service.insert("support_tickets", ticket2))

        # Criar conversas de chatbot
        # Conversa encerrada
        chat1 = {
            "id": "chat-1",
            "restaurant_id": "restaurant-123",
            "user_id": "user-123",
            "status": "closed",
            "created_at": (now - timedelta(days=3)).isoformat(),
            "updated_at": (now - timedelta(days=3)).isoformat(),
            "closed_at": (now - timedelta(days=3)).isoformat(),
        }

        # Conversa transferida
        chat2 = {
            "id": "chat-2",
            "restaurant_id": "restaurant-123",
            "user_id": "user-456",
            "status": "transferred",
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(days=2)).isoformat(),
            "transferred_at": (now - timedelta(days=2)).isoformat(),
        }

        # Conversa ativa
        chat3 = {
            "id": "chat-3",
            "restaurant_id": "restaurant-123",
            "user_id": "user-789",
            "status": "active",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        # Adicionar conversas ao banco de dados
        self.loop.run_until_complete(self.db_service.insert("support_chats", chat1))
        self.loop.run_until_complete(self.db_service.insert("support_chats", chat2))
        self.loop.run_until_complete(self.db_service.insert("support_chats", chat3))

        # Criar artigos da base de conhecimento
        article1 = {
            "id": "article-1",
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "view_count": 50,
            "helpful_count": 30,
            "not_helpful_count": 5,
        }

        article2 = {
            "id": "article-2",
            "restaurant_id": "restaurant-123",
            "title": "Como exportar relatórios",
            "content": "Para exportar relatórios, acesse...",
            "view_count": 30,
            "helpful_count": 15,
            "not_helpful_count": 3,
        }

        # Adicionar artigos ao banco de dados
        self.loop.run_until_complete(
            self.db_service.insert("knowledge_articles", article1)
        )
        self.loop.run_until_complete(
            self.db_service.insert("knowledge_articles", article2)
        )

    def test_get_support_metrics(self):
        """Testa a obtenção de métricas de suporte."""
        # Executar teste
        metrics = self.loop.run_until_complete(
            self.analytics_service.get_support_metrics("restaurant-123")
        )

        # Verificar resultados
        self.assertIsNotNone(metrics)

        # Verificar métricas de tickets
        self.assertEqual(metrics["tickets"]["total"], 2)
        self.assertEqual(metrics["tickets"]["open"], 1)
        self.assertGreater(metrics["tickets"]["avg_resolution_time_hours"], 0)

        # Verificar métricas de chatbot
        self.assertEqual(metrics["chats"]["total"], 3)
        self.assertEqual(
            metrics["chats"]["escalation_rate"], 1 / 3
        )  # 1 transferido de 3 total

        # Verificar métricas de base de conhecimento
        self.assertEqual(metrics["knowledge_base"]["total_articles"], 2)
        self.assertEqual(metrics["knowledge_base"]["total_views"], 80)  # 50 + 30
        self.assertEqual(
            metrics["knowledge_base"]["helpfulness_rate"], 45 / 53
        )  # (30+15)/(30+15+5+3)


class TestTwilioService(unittest.TestCase):
    """Testes para o serviço de integração com Twilio."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.config_service = MockConfigService()
        self.twilio_service = TwilioService(self.config_service)

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def test_send_message(self):
        """Testa o envio de mensagem via WhatsApp."""
        # Executar teste
        result = self.loop.run_until_complete(
            self.twilio_service.send_message(
                "+5511999999999", "Olá, como posso ajudar?"
            )
        )

        # Verificar resultados
        self.assertIsNotNone(result)
        self.assertEqual(result["to"], "+5511999999999")
        self.assertEqual(result["status"], "sent")

    def test_receive_message(self):
        """Testa o recebimento de mensagem via webhook."""
        # Dados de teste
        message_data = {
            "from": "+5511999999999",
            "body": "Como faço para configurar uma impressora?",
        }

        # Executar teste
        result = self.loop.run_until_complete(
            self.twilio_service.receive_message(message_data)
        )

        # Verificar resultados
        self.assertEqual(result["from"], "+5511999999999")
        self.assertEqual(result["body"], "Como faço para configurar uma impressora?")


class TestBedrockService(unittest.TestCase):
    """Testes para o serviço de integração com Amazon Bedrock (Claude)."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.config_service = MockConfigService()
        self.bedrock_service = BedrockService(self.config_service)

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def test_generate_response(self):
        """Testa a geração de resposta usando Amazon Bedrock."""
        # Executar teste - problema técnico
        prompt1 = "Estou com um problema na impressora, não está funcionando."
        response1 = self.loop.run_until_complete(
            self.bedrock_service.generate_response(prompt1)
        )

        # Verificar resultados
        self.assertIsNotNone(response1)
        self.assertIn("problema_técnico", response1)

        # Executar teste - dúvida sobre preço
        prompt2 = "Qual é o preço do sistema?"
        response2 = self.loop.run_until_complete(
            self.bedrock_service.generate_response(prompt2)
        )

        # Verificar resultados
        self.assertIsNotNone(response2)
        self.assertIn("dúvida_preço", response2)

        # Executar teste - reclamação
        prompt3 = "O sistema está muito lento e travando, péssimo!"
        response3 = self.loop.run_until_complete(
            self.bedrock_service.generate_response(prompt3)
        )

        # Verificar resultados
        self.assertIsNotNone(response3)
        self.assertIn("reclamação", response3)
        self.assertIn("escalation_recommended", response3)
        self.assertIn("true", response3.lower())


class TestSupportService(unittest.TestCase):
    """Testes para o serviço principal de suporte."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.db_service = MockDBService()
        self.config_service = MockConfigService()
        self.event_bus = MockEventBus()
        self.support_service = SupportService(
            self.db_service, self.config_service, self.event_bus
        )

        # Configurar loop de eventos assíncrono
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        # Criar dados de teste
        self._create_test_data()

    def tearDown(self):
        """Limpeza após os testes."""
        self.loop.close()

    def _create_test_data(self):
        """Cria dados de teste para o serviço de suporte."""
        # Criar ticket
        ticket = {
            "id": "ticket-1",
            "restaurant_id": "restaurant-123",
            "subject": "Problema com impressora",
            "status": "open",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "messages": [
                {
                    "id": "msg-1",
                    "content": "A impressora não está funcionando.",
                    "created_at": datetime.utcnow().isoformat(),
                }
            ],
        }

        # Adicionar ticket ao banco de dados
        self.loop.run_until_complete(self.db_service.insert("support_tickets", ticket))

        # Criar artigo
        article = {
            "id": "article-1",
            "restaurant_id": "restaurant-123",
            "title": "Como configurar uma impressora",
            "content": "Passo 1: Conecte a impressora...",
            "view_count": 50,
            "helpful_count": 30,
            "not_helpful_count": 5,
        }

        # Adicionar artigo ao banco de dados
        self.loop.run_until_complete(
            self.db_service.insert("knowledge_articles", article)
        )

    def test_get_support_dashboard(self):
        """Testa a obtenção do dashboard de suporte."""
        # Executar teste
        dashboard = self.loop.run_until_complete(
            self.support_service.get_support_dashboard("restaurant-123", "user-123")
        )

        # Verificar resultados
        self.assertIsNotNone(dashboard)
        self.assertIn("metrics", dashboard)
        self.assertIn("recent_tickets", dashboard)
        self.assertIn("popular_articles", dashboard)

        # Verificar tickets recentes
        self.assertEqual(len(dashboard["recent_tickets"]), 1)
        self.assertEqual(dashboard["recent_tickets"][0]["id"], "ticket-1")

        # Verificar artigos populares
        self.assertEqual(len(dashboard["popular_articles"]), 1)
        self.assertEqual(dashboard["popular_articles"][0]["id"], "article-1")

    def test_search_support_resources(self):
        """Testa a pesquisa em recursos de suporte."""
        # Executar teste
        results = self.loop.run_until_complete(
            self.support_service.search_support_resources(
                "restaurant-123", "impressora"
            )
        )

        # Verificar resultados
        self.assertIsNotNone(results)
        self.assertIn("tickets", results)
        self.assertIn("articles", results)

        # Verificar tickets encontrados
        self.assertEqual(len(results["tickets"]), 1)
        self.assertEqual(results["tickets"][0]["id"], "ticket-1")

        # Verificar artigos encontrados
        self.assertEqual(len(results["articles"]), 1)
        self.assertEqual(results["articles"][0]["id"], "article-1")


if __name__ == "__main__":
    unittest.main()
