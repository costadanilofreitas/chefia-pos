"""
Módulo de suporte escalável com chatbot para o sistema POS Modern.

Este módulo implementa um sistema de suporte completo com:
- Chatbot integrado para atendimento de primeiro nível
- Sistema de tickets para problemas complexos
- Base de conhecimento/FAQ para autoatendimento
- Integração com WhatsApp via Twilio
- Análise de sentimento e priorização automática
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
import json
import logging

from src.core.auth.auth_service import get_current_user, User
from src.core.db.db_service import get_db_service
from src.core.config.config_service import get_config_service
from src.core.events.event_bus import get_event_bus

# Configuração de logging
logger = logging.getLogger(__name__)


class SupportService:
    """Serviço principal para gerenciamento do sistema de suporte."""

    def __init__(self, db_service, config_service, event_bus):
        self.db_service = db_service
        self.config_service = config_service
        self.event_bus = event_bus
        self.ticket_service = TicketService(db_service, event_bus)
        self.chatbot_service = ChatbotService(db_service, config_service, event_bus)
        self.knowledge_service = KnowledgeBaseService(db_service)
        self.analytics_service = SupportAnalyticsService(db_service)

    async def get_support_dashboard(
        self, restaurant_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Obtém o dashboard de suporte com métricas e tickets recentes."""
        # Obter métricas de suporte
        metrics = await self.analytics_service.get_support_metrics(restaurant_id)

        # Obter tickets recentes
        recent_tickets = await self.ticket_service.get_recent_tickets(
            restaurant_id, limit=5
        )

        # Obter artigos populares da base de conhecimento
        popular_articles = await self.knowledge_service.get_popular_articles(
            restaurant_id, limit=5
        )

        # Verificar se há conversas de chatbot ativas
        active_chats = await self.chatbot_service.get_active_chats(
            restaurant_id, user_id
        )

        return {
            "metrics": metrics,
            "recent_tickets": recent_tickets,
            "popular_articles": popular_articles,
            "active_chats": active_chats,
        }

    async def search_support_resources(
        self, restaurant_id: str, query: str
    ) -> Dict[str, Any]:
        """Pesquisa em todos os recursos de suporte (tickets, artigos, etc)."""
        # Pesquisar em tickets
        tickets = await self.ticket_service.search_tickets(restaurant_id, query)

        # Pesquisar na base de conhecimento
        articles = await self.knowledge_service.search_articles(restaurant_id, query)

        # Pesquisar em conversas de chatbot
        chats = await self.chatbot_service.search_chats(restaurant_id, query)

        return {"tickets": tickets, "articles": articles, "chats": chats}


class TicketService:
    """Serviço para gerenciamento de tickets de suporte."""

    def __init__(self, db_service, event_bus):
        self.db_service = db_service
        self.event_bus = event_bus

    async def create_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo ticket de suporte."""
        # Validar dados do ticket
        if not ticket_data.get("subject"):
            raise ValueError("O assunto do ticket é obrigatório")

        if not ticket_data.get("description"):
            raise ValueError("A descrição do ticket é obrigatório")

        # Gerar ID único para o ticket
        ticket_id = str(uuid.uuid4())

        # Preparar dados do ticket
        now = datetime.utcnow()
        ticket = {
            "id": ticket_id,
            "restaurant_id": ticket_data.get("restaurant_id"),
            "subject": ticket_data.get("subject"),
            "description": ticket_data.get("description"),
            "status": "open",
            "priority": ticket_data.get("priority", "medium"),
            "category": ticket_data.get("category", "general"),
            "created_by": ticket_data.get("created_by"),
            "assigned_to": ticket_data.get("assigned_to"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "tags": ticket_data.get("tags", []),
            "attachments": ticket_data.get("attachments", []),
            "source": ticket_data.get("source", "portal"),
            "messages": [
                {
                    "id": str(uuid.uuid4()),
                    "ticket_id": ticket_id,
                    "content": ticket_data.get("description"),
                    "sender_id": ticket_data.get("created_by"),
                    "sender_type": "customer",
                    "created_at": now.isoformat(),
                    "attachments": ticket_data.get("attachments", []),
                }
            ],
        }

        # Salvar ticket no banco de dados
        await self.db_service.insert("support_tickets", ticket)

        # Publicar evento de criação de ticket
        await self.event_bus.publish(
            "ticket.created",
            {
                "ticket_id": ticket_id,
                "restaurant_id": ticket_data.get("restaurant_id"),
                "created_by": ticket_data.get("created_by"),
            },
        )

        # Analisar sentimento e ajustar prioridade se necessário
        await self._analyze_and_adjust_priority(ticket)

        return ticket

    async def get_ticket(self, ticket_id: str) -> Dict[str, Any]:
        """Obtém um ticket pelo ID."""
        ticket = await self.db_service.find_one("support_tickets", {"id": ticket_id})

        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket não encontrado")

        return ticket

    async def update_ticket(
        self, ticket_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Atualiza um ticket existente."""
        # Obter ticket atual
        ticket = await self.get_ticket(ticket_id)

        # Campos que não podem ser atualizados diretamente
        protected_fields = [
            "id",
            "restaurant_id",
            "created_by",
            "created_at",
            "messages",
        ]

        # Remover campos protegidos
        for field in protected_fields:
            if field in update_data:
                del update_data[field]

        # Atualizar timestamp
        update_data["updated_at"] = datetime.utcnow().isoformat()

        # Atualizar ticket no banco de dados
        await self.db_service.update(
            "support_tickets", {"id": ticket_id}, {"$set": update_data}
        )

        # Publicar evento de atualização de ticket
        await self.event_bus.publish(
            "ticket.updated",
            {
                "ticket_id": ticket_id,
                "updated_by": update_data.get("updated_by"),
                "status": update_data.get("status"),
                "assigned_to": update_data.get("assigned_to"),
            },
        )

        # Obter ticket atualizado
        updated_ticket = await self.get_ticket(ticket_id)

        return updated_ticket

    async def add_message(
        self, ticket_id: str, message_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Adiciona uma mensagem a um ticket existente."""
        # Obter ticket atual
        ticket = await self.get_ticket(ticket_id)

        # Validar dados da mensagem
        if not message_data.get("content"):
            raise ValueError("O conteúdo da mensagem é obrigatório")

        # Gerar ID único para a mensagem
        message_id = str(uuid.uuid4())

        # Preparar dados da mensagem
        now = datetime.utcnow()
        message = {
            "id": message_id,
            "ticket_id": ticket_id,
            "content": message_data.get("content"),
            "sender_id": message_data.get("sender_id"),
            "sender_type": message_data.get("sender_type", "customer"),
            "created_at": now.isoformat(),
            "attachments": message_data.get("attachments", []),
        }

        # Adicionar mensagem ao ticket
        if "messages" not in ticket:
            ticket["messages"] = []

        ticket["messages"].append(message)

        # Atualizar timestamp do ticket
        ticket["updated_at"] = now.isoformat()

        # Atualizar status do ticket se necessário
        if message_data.get("update_status"):
            ticket["status"] = message_data.get("update_status")

        # Atualizar ticket no banco de dados
        await self.db_service.update(
            "support_tickets",
            {"id": ticket_id},
            {
                "$set": {"updated_at": now.isoformat(), "status": ticket["status"]},
                "$push": {"messages": message},
            },
        )

        # Publicar evento de nova mensagem
        await self.event_bus.publish(
            "ticket.message.created",
            {
                "ticket_id": ticket_id,
                "message_id": message_id,
                "sender_id": message_data.get("sender_id"),
                "sender_type": message_data.get("sender_type"),
            },
        )

        # Analisar sentimento e ajustar prioridade se necessário
        if message_data.get("sender_type") == "customer":
            await self._analyze_and_adjust_priority(ticket, message["content"])

        return message

    async def get_tickets(
        self,
        restaurant_id: str,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        assigned_to: Optional[str] = None,
        created_by: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Lista tickets com filtros e paginação."""
        # Construir filtro
        filter_query = {"restaurant_id": restaurant_id}

        if status:
            filter_query["status"] = status

        if priority:
            filter_query["priority"] = priority

        if category:
            filter_query["category"] = category

        if assigned_to:
            filter_query["assigned_to"] = assigned_to

        if created_by:
            filter_query["created_by"] = created_by

        # Calcular skip para paginação
        skip = (page - 1) * page_size

        # Obter tickets
        tickets = await self.db_service.find(
            "support_tickets",
            filter_query,
            sort=[("updated_at", -1)],
            skip=skip,
            limit=page_size,
        )

        # Contar total de tickets
        total = await self.db_service.count("support_tickets", filter_query)

        return {
            "items": tickets,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }

    async def get_recent_tickets(
        self, restaurant_id: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Obtém os tickets mais recentes."""
        tickets = await self.db_service.find(
            "support_tickets",
            {"restaurant_id": restaurant_id},
            sort=[("created_at", -1)],
            limit=limit,
        )

        return tickets

    async def search_tickets(
        self, restaurant_id: str, query: str
    ) -> List[Dict[str, Any]]:
        """Pesquisa tickets por texto."""
        # Implementar pesquisa de texto
        tickets = await self.db_service.text_search(
            "support_tickets", query, {"restaurant_id": restaurant_id}, limit=20
        )

        return tickets

    async def _analyze_and_adjust_priority(
        self, ticket: Dict[str, Any], message_content: Optional[str] = None
    ) -> None:
        """Analisa o sentimento do ticket e ajusta a prioridade se necessário."""
        # Texto para análise
        text_to_analyze = message_content or ticket.get("description", "")

        # Analisar sentimento usando serviço de IA
        try:
            sentiment_result = await self._analyze_sentiment(text_to_analyze)

            # Ajustar prioridade com base no sentimento
            if (
                sentiment_result.get("sentiment") == "negative"
                and sentiment_result.get("score", 0) < -0.5
            ):
                # Sentimento muito negativo, aumentar prioridade
                if ticket["priority"] == "low":
                    await self.update_ticket(ticket["id"], {"priority": "medium"})
                elif ticket["priority"] == "medium":
                    await self.update_ticket(ticket["id"], {"priority": "high"})

            # Registrar resultado da análise
            await self.db_service.update(
                "support_tickets",
                {"id": ticket["id"]},
                {"$push": {"sentiment_analysis": sentiment_result}},
            )

        except Exception as e:
            logger.error(f"Erro ao analisar sentimento: {str(e)}")

    async def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analisa o sentimento de um texto."""
        # Implementação simplificada, em produção usaria Amazon Comprehend ou similar
        negative_words = [
            "problema",
            "erro",
            "falha",
            "bug",
            "ruim",
            "péssimo",
            "terrível",
            "horrível",
            "insatisfeito",
        ]
        positive_words = [
            "bom",
            "ótimo",
            "excelente",
            "funciona",
            "satisfeito",
            "grato",
            "obrigado",
            "resolvido",
        ]

        text_lower = text.lower()

        # Contar palavras negativas e positivas
        negative_count = sum(1 for word in negative_words if word in text_lower)
        positive_count = sum(1 for word in positive_words if word in text_lower)

        # Calcular pontuação de sentimento (-1 a 1)
        total_words = len(text_lower.split())
        if total_words > 0:
            sentiment_score = (positive_count - negative_count) / min(
                total_words, 20
            )  # Normalizar
        else:
            sentiment_score = 0

        # Determinar sentimento
        if sentiment_score > 0.1:
            sentiment = "positive"
        elif sentiment_score < -0.1:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "sentiment": sentiment,
            "score": sentiment_score,
            "positive_count": positive_count,
            "negative_count": negative_count,
        }


class ChatbotService:
    """Serviço para gerenciamento do chatbot de suporte."""

    def __init__(self, db_service, config_service, event_bus):
        self.db_service = db_service
        self.config_service = config_service
        self.event_bus = event_bus
        self.twilio_service = TwilioService(config_service)
        self.bedrock_service = BedrockService(config_service)

    async def start_chat(self, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Inicia uma nova conversa de chatbot."""
        # Validar dados da conversa
        if not chat_data.get("user_id"):
            raise ValueError("O ID do usuário é obrigatório")

        # Gerar ID único para a conversa
        chat_id = str(uuid.uuid4())

        # Preparar dados da conversa
        now = datetime.utcnow()
        chat = {
            "id": chat_id,
            "restaurant_id": chat_data.get("restaurant_id"),
            "user_id": chat_data.get("user_id"),
            "user_name": chat_data.get("user_name", "Usuário"),
            "status": "active",
            "channel": chat_data.get("channel", "web"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "messages": [],
            "metadata": chat_data.get("metadata", {}),
            "context": {
                "last_intent": None,
                "identified_issues": [],
                "suggested_articles": [],
                "escalation_recommended": False,
            },
        }

        # Salvar conversa no banco de dados
        await self.db_service.insert("support_chats", chat)

        # Publicar evento de início de conversa
        await self.event_bus.publish(
            "chat.started",
            {
                "chat_id": chat_id,
                "restaurant_id": chat_data.get("restaurant_id"),
                "user_id": chat_data.get("user_id"),
                "channel": chat_data.get("channel"),
            },
        )

        # Adicionar mensagem de boas-vindas
        welcome_message = await self._generate_welcome_message(chat)
        await self.add_message(
            chat_id,
            {"content": welcome_message, "sender_id": "system", "sender_type": "bot"},
        )

        # Obter conversa atualizada
        updated_chat = await self.get_chat(chat_id)

        return updated_chat

    async def get_chat(self, chat_id: str) -> Dict[str, Any]:
        """Obtém uma conversa pelo ID."""
        chat = await self.db_service.find_one("support_chats", {"id": chat_id})

        if not chat:
            raise HTTPException(status_code=404, detail="Conversa não encontrada")

        return chat

    async def add_message(
        self, chat_id: str, message_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Adiciona uma mensagem a uma conversa existente."""
        # Obter conversa atual
        chat = await self.get_chat(chat_id)

        # Validar dados da mensagem
        if not message_data.get("content"):
            raise ValueError("O conteúdo da mensagem é obrigatório")

        # Gerar ID único para a mensagem
        message_id = str(uuid.uuid4())

        # Preparar dados da mensagem
        now = datetime.utcnow()
        message = {
            "id": message_id,
            "chat_id": chat_id,
            "content": message_data.get("content"),
            "sender_id": message_data.get("sender_id"),
            "sender_type": message_data.get("sender_type", "user"),
            "created_at": now.isoformat(),
            "attachments": message_data.get("attachments", []),
        }

        # Adicionar mensagem à conversa
        if "messages" not in chat:
            chat["messages"] = []

        chat["messages"].append(message)

        # Atualizar timestamp da conversa
        chat["updated_at"] = now.isoformat()

        # Atualizar conversa no banco de dados
        await self.db_service.update(
            "support_chats",
            {"id": chat_id},
            {"$set": {"updated_at": now.isoformat()}, "$push": {"messages": message}},
        )

        # Publicar evento de nova mensagem
        await self.event_bus.publish(
            "chat.message.created",
            {
                "chat_id": chat_id,
                "message_id": message_id,
                "sender_id": message_data.get("sender_id"),
                "sender_type": message_data.get("sender_type"),
            },
        )

        # Se a mensagem for do usuário, gerar resposta do bot
        if message_data.get("sender_type") == "user":
            await self._generate_bot_response(chat, message)

        return message

    async def end_chat(
        self, chat_id: str, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Encerra uma conversa de chatbot."""
        # Obter conversa atual
        chat = await self.get_chat(chat_id)

        # Atualizar status da conversa
        now = datetime.utcnow()
        update_data = {
            "status": "closed",
            "updated_at": now.isoformat(),
            "closed_at": now.isoformat(),
            "close_reason": reason or "completed",
        }

        # Atualizar conversa no banco de dados
        await self.db_service.update(
            "support_chats", {"id": chat_id}, {"$set": update_data}
        )

        # Publicar evento de encerramento de conversa
        await self.event_bus.publish(
            "chat.ended", {"chat_id": chat_id, "reason": reason or "completed"}
        )

        # Adicionar mensagem de encerramento
        await self.add_message(
            chat_id,
            {
                "content": "Esta conversa foi encerrada. Obrigado por utilizar nosso suporte!",
                "sender_id": "system",
                "sender_type": "bot",
            },
        )

        # Obter conversa atualizada
        updated_chat = await self.get_chat(chat_id)

        return updated_chat

    async def get_active_chats(
        self, restaurant_id: str, user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Obtém as conversas ativas."""
        # Construir filtro
        filter_query = {"restaurant_id": restaurant_id, "status": "active"}

        if user_id:
            filter_query["user_id"] = user_id

        # Obter conversas
        chats = await self.db_service.find(
            "support_chats", filter_query, sort=[("updated_at", -1)]
        )

        return chats

    async def search_chats(
        self, restaurant_id: str, query: str
    ) -> List[Dict[str, Any]]:
        """Pesquisa conversas por texto."""
        # Implementar pesquisa de texto
        chats = await self.db_service.text_search(
            "support_chats", query, {"restaurant_id": restaurant_id}, limit=20
        )

        return chats

    async def transfer_to_human(
        self, chat_id: str, agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transfere uma conversa de chatbot para um atendente humano."""
        # Obter conversa atual
        chat = await self.get_chat(chat_id)

        # Atualizar status da conversa
        now = datetime.utcnow()
        update_data = {
            "status": "transferred",
            "updated_at": now.isoformat(),
            "transferred_at": now.isoformat(),
            "transferred_to": agent_id,
        }

        # Atualizar conversa no banco de dados
        await self.db_service.update(
            "support_chats", {"id": chat_id}, {"$set": update_data}
        )

        # Publicar evento de transferência de conversa
        await self.event_bus.publish(
            "chat.transferred", {"chat_id": chat_id, "agent_id": agent_id}
        )

        # Adicionar mensagem de transferência
        await self.add_message(
            chat_id,
            {
                "content": "Sua conversa está sendo transferida para um atendente humano. Por favor, aguarde um momento.",
                "sender_id": "system",
                "sender_type": "bot",
            },
        )

        # Criar ticket a partir da conversa
        ticket_data = {
            "restaurant_id": chat["restaurant_id"],
            "subject": f"Atendimento transferido do chatbot - {chat['user_name']}",
            "description": self._format_chat_for_ticket(chat),
            "created_by": chat["user_id"],
            "priority": "medium",
            "category": "support",
            "source": "chatbot",
            "metadata": {"chat_id": chat_id, "channel": chat.get("channel", "web")},
        }

        # Criar ticket usando o serviço de tickets
        ticket_service = TicketService(self.db_service, self.event_bus)
        ticket = await ticket_service.create_ticket(ticket_data)

        # Atualizar conversa com referência ao ticket
        await self.db_service.update(
            "support_chats", {"id": chat_id}, {"$set": {"ticket_id": ticket["id"]}}
        )

        # Obter conversa atualizada
        updated_chat = await self.get_chat(chat_id)

        return updated_chat

    async def _generate_welcome_message(self, chat: Dict[str, Any]) -> str:
        """Gera uma mensagem de boas-vindas personalizada."""
        restaurant_id = chat.get("restaurant_id")
        user_name = chat.get("user_name", "Usuário")

        # Obter configurações do restaurante
        restaurant_config = await self.config_service.get_restaurant_config(
            restaurant_id
        )
        company_name = restaurant_config.get("name", "nossa empresa")

        # Gerar mensagem de boas-vindas
        welcome_message = f"Olá {user_name}! Bem-vindo ao suporte da {company_name}. Como posso ajudar você hoje?"

        return welcome_message

    async def _generate_bot_response(
        self, chat: Dict[str, Any], user_message: Dict[str, Any]
    ) -> None:
        """Gera uma resposta do bot para uma mensagem do usuário."""
        # Obter contexto da conversa
        context = chat.get("context", {})

        # Obter histórico de mensagens
        messages = chat.get("messages", [])

        # Preparar prompt para o modelo de IA
        prompt = self._prepare_prompt(chat, user_message)

        try:
            # Gerar resposta usando Amazon Bedrock (Claude)
            response = await self.bedrock_service.generate_response(prompt)

            # Analisar resposta para extrair intenção e ações
            parsed_response = self._parse_ai_response(response)

            # Atualizar contexto da conversa
            new_context = {
                "last_intent": parsed_response.get("intent"),
                "identified_issues": context.get("identified_issues", []),
                "suggested_articles": context.get("suggested_articles", []),
                "escalation_recommended": context.get("escalation_recommended", False),
            }

            # Adicionar problema identificado, se houver
            if parsed_response.get("identified_issue"):
                new_context["identified_issues"].append(
                    parsed_response.get("identified_issue")
                )

            # Adicionar artigos sugeridos, se houver
            if parsed_response.get("suggested_articles"):
                new_context["suggested_articles"].extend(
                    parsed_response.get("suggested_articles")
                )

            # Verificar se recomenda escalar para humano
            if parsed_response.get("escalation_recommended"):
                new_context["escalation_recommended"] = True

            # Atualizar contexto no banco de dados
            await self.db_service.update(
                "support_chats", {"id": chat["id"]}, {"$set": {"context": new_context}}
            )

            # Adicionar resposta do bot
            await self.add_message(
                chat["id"],
                {
                    "content": parsed_response.get("response_text"),
                    "sender_id": "system",
                    "sender_type": "bot",
                },
            )

            # Se recomendado escalar para humano, transferir conversa
            if parsed_response.get("escalation_recommended"):
                await self.transfer_to_human(chat["id"])

        except Exception as e:
            logger.error(f"Erro ao gerar resposta do bot: {str(e)}")

            # Adicionar mensagem de erro
            await self.add_message(
                chat["id"],
                {
                    "content": "Desculpe, estou enfrentando dificuldades técnicas. Vou transferir você para um atendente humano.",
                    "sender_id": "system",
                    "sender_type": "bot",
                },
            )

            # Transferir para humano em caso de erro
            await self.transfer_to_human(chat["id"])

    def _prepare_prompt(
        self, chat: Dict[str, Any], user_message: Dict[str, Any]
    ) -> str:
        """Prepara o prompt para o modelo de IA."""
        # Obter informações do chat
        restaurant_id = chat.get("restaurant_id")
        user_name = chat.get("user_name", "Usuário")

        # Obter histórico de mensagens (limitado às últimas 10)
        messages = chat.get("messages", [])[-10:]

        # Formatar histórico de mensagens
        chat_history = ""
        for msg in messages:
            sender = "Usuário" if msg.get("sender_type") == "user" else "Assistente"
            chat_history += f"{sender}: {msg.get('content')}\n"

        # Construir prompt
        prompt = f"""Você é um assistente de suporte para um sistema de PDV (Ponto de Venda) para restaurantes chamado POS Modern.
        
Informações do chat:
- Nome do usuário: {user_name}
- ID do restaurante: {restaurant_id}

Histórico da conversa:
{chat_history}

Sua tarefa é fornecer suporte técnico e ajuda sobre o sistema POS Modern. Seja educado, profissional e útil.

Se o usuário tiver um problema técnico complexo que você não consegue resolver, ou se estiver frustrado, recomende escalar para um atendente humano.

Responda à última mensagem do usuário de forma útil e concisa.

Forneça sua resposta no seguinte formato JSON:
{{
  "intent": "a intenção principal do usuário (ex: problema_técnico, dúvida_funcionalidade, reclamação)",
  "identified_issue": "descrição do problema identificado, se houver",
  "suggested_articles": ["id1", "id2"],
  "escalation_recommended": true/false,
  "response_text": "sua resposta para o usuário"
}}
"""

        return prompt

    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Analisa a resposta do modelo de IA para extrair intenção e ações."""
        try:
            # Tentar extrair JSON da resposta
            json_start = response.find("{")
            json_end = response.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                parsed = json.loads(json_str)

                # Garantir que todos os campos necessários estejam presentes
                if "response_text" not in parsed:
                    parsed["response_text"] = response

                return parsed
            else:
                # Se não encontrar JSON, retornar resposta como texto
                return {"intent": "unknown", "response_text": response}

        except Exception as e:
            logger.error(f"Erro ao analisar resposta do modelo: {str(e)}")
            return {"intent": "unknown", "response_text": response}

    def _format_chat_for_ticket(self, chat: Dict[str, Any]) -> str:
        """Formata o histórico de chat para inclusão em um ticket."""
        # Obter histórico de mensagens
        messages = chat.get("messages", [])

        # Formatar histórico de mensagens
        chat_history = (
            f"Histórico de conversa com {chat.get('user_name', 'Usuário')}:\n\n"
        )

        for msg in messages:
            sender_type = msg.get("sender_type", "user")
            sender = "Usuário" if sender_type == "user" else "Bot"
            timestamp = datetime.fromisoformat(
                msg.get("created_at").replace("Z", "+00:00")
            ).strftime("%d/%m/%Y %H:%M:%S")

            chat_history += f"[{timestamp}] {sender}: {msg.get('content')}\n\n"

        # Adicionar contexto
        context = chat.get("context", {})
        if context:
            chat_history += "\nContexto da conversa:\n"
            chat_history += f"- Última intenção: {context.get('last_intent', 'N/A')}\n"

            if context.get("identified_issues"):
                chat_history += "- Problemas identificados:\n"
                for issue in context.get("identified_issues"):
                    chat_history += f"  * {issue}\n"

            if context.get("escalation_recommended"):
                chat_history += "- Escalação recomendada pelo bot\n"

        return chat_history


class KnowledgeBaseService:
    """Serviço para gerenciamento da base de conhecimento."""

    def __init__(self, db_service):
        self.db_service = db_service

    async def create_article(self, article_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo artigo na base de conhecimento."""
        # Validar dados do artigo
        if not article_data.get("title"):
            raise ValueError("O título do artigo é obrigatório")

        if not article_data.get("content"):
            raise ValueError("O conteúdo do artigo é obrigatório")

        # Gerar ID único para o artigo
        article_id = str(uuid.uuid4())

        # Preparar dados do artigo
        now = datetime.utcnow()
        article = {
            "id": article_id,
            "restaurant_id": article_data.get("restaurant_id"),
            "title": article_data.get("title"),
            "content": article_data.get("content"),
            "summary": article_data.get("summary", ""),
            "category": article_data.get("category", "general"),
            "tags": article_data.get("tags", []),
            "status": article_data.get("status", "published"),
            "created_by": article_data.get("created_by"),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "view_count": 0,
            "helpful_count": 0,
            "not_helpful_count": 0,
        }

        # Salvar artigo no banco de dados
        await self.db_service.insert("knowledge_articles", article)

        return article

    async def get_article(self, article_id: str) -> Dict[str, Any]:
        """Obtém um artigo pelo ID."""
        article = await self.db_service.find_one(
            "knowledge_articles", {"id": article_id}
        )

        if not article:
            raise HTTPException(status_code=404, detail="Artigo não encontrado")

        # Incrementar contador de visualizações
        await self.db_service.update(
            "knowledge_articles", {"id": article_id}, {"$inc": {"view_count": 1}}
        )

        return article

    async def update_article(
        self, article_id: str, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Atualiza um artigo existente."""
        # Obter artigo atual
        article = await self.get_article(article_id)

        # Campos que não podem ser atualizados diretamente
        protected_fields = [
            "id",
            "restaurant_id",
            "created_by",
            "created_at",
            "view_count",
            "helpful_count",
            "not_helpful_count",
        ]

        # Remover campos protegidos
        for field in protected_fields:
            if field in update_data:
                del update_data[field]

        # Atualizar timestamp
        update_data["updated_at"] = datetime.utcnow().isoformat()

        # Atualizar artigo no banco de dados
        await self.db_service.update(
            "knowledge_articles", {"id": article_id}, {"$set": update_data}
        )

        # Obter artigo atualizado
        updated_article = await self.get_article(article_id)

        return updated_article

    async def delete_article(self, article_id: str) -> bool:
        """Exclui um artigo."""
        # Verificar se o artigo existe
        article = await self.get_article(article_id)

        # Excluir artigo do banco de dados
        result = await self.db_service.delete("knowledge_articles", {"id": article_id})

        return result

    async def get_articles(
        self,
        restaurant_id: str,
        category: Optional[str] = None,
        tag: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Lista artigos com filtros e paginação."""
        # Construir filtro
        filter_query = {"restaurant_id": restaurant_id}

        if category:
            filter_query["category"] = category

        if tag:
            filter_query["tags"] = tag

        if status:
            filter_query["status"] = status
        else:
            # Por padrão, mostrar apenas artigos publicados
            filter_query["status"] = "published"

        # Calcular skip para paginação
        skip = (page - 1) * page_size

        # Obter artigos
        articles = await self.db_service.find(
            "knowledge_articles",
            filter_query,
            sort=[("created_at", -1)],
            skip=skip,
            limit=page_size,
        )

        # Contar total de artigos
        total = await self.db_service.count("knowledge_articles", filter_query)

        return {
            "items": articles,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }

    async def get_popular_articles(
        self, restaurant_id: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Obtém os artigos mais populares."""
        articles = await self.db_service.find(
            "knowledge_articles",
            {"restaurant_id": restaurant_id, "status": "published"},
            sort=[("view_count", -1)],
            limit=limit,
        )

        return articles

    async def search_articles(
        self, restaurant_id: str, query: str
    ) -> List[Dict[str, Any]]:
        """Pesquisa artigos por texto."""
        # Implementar pesquisa de texto
        articles = await self.db_service.text_search(
            "knowledge_articles",
            query,
            {"restaurant_id": restaurant_id, "status": "published"},
            limit=20,
        )

        return articles

    async def rate_article(self, article_id: str, is_helpful: bool) -> Dict[str, Any]:
        """Avalia um artigo como útil ou não útil."""
        # Obter artigo atual
        article = await self.get_article(article_id)

        # Incrementar contador apropriado
        if is_helpful:
            await self.db_service.update(
                "knowledge_articles", {"id": article_id}, {"$inc": {"helpful_count": 1}}
            )
        else:
            await self.db_service.update(
                "knowledge_articles",
                {"id": article_id},
                {"$inc": {"not_helpful_count": 1}},
            )

        # Obter artigo atualizado
        updated_article = await self.get_article(article_id)

        return updated_article


class SupportAnalyticsService:
    """Serviço para análise de dados de suporte."""

    def __init__(self, db_service):
        self.db_service = db_service

    async def get_support_metrics(self, restaurant_id: str) -> Dict[str, Any]:
        """Obtém métricas de suporte para um restaurante."""
        # Obter data atual e data de 30 dias atrás
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # Converter para string ISO
        now_str = now.isoformat()
        thirty_days_ago_str = thirty_days_ago.isoformat()

        # Métricas de tickets
        tickets_total = await self.db_service.count(
            "support_tickets", {"restaurant_id": restaurant_id}
        )

        tickets_open = await self.db_service.count(
            "support_tickets", {"restaurant_id": restaurant_id, "status": "open"}
        )

        tickets_last_30_days = await self.db_service.count(
            "support_tickets",
            {
                "restaurant_id": restaurant_id,
                "created_at": {"$gte": thirty_days_ago_str},
            },
        )

        avg_resolution_time = await self._calculate_avg_resolution_time(restaurant_id)

        # Métricas de chatbot
        chats_total = await self.db_service.count(
            "support_chats", {"restaurant_id": restaurant_id}
        )

        chats_last_30_days = await self.db_service.count(
            "support_chats",
            {
                "restaurant_id": restaurant_id,
                "created_at": {"$gte": thirty_days_ago_str},
            },
        )

        chat_escalation_rate = await self._calculate_chat_escalation_rate(restaurant_id)

        # Métricas de base de conhecimento
        articles_total = await self.db_service.count(
            "knowledge_articles", {"restaurant_id": restaurant_id}
        )

        articles_views = await self._calculate_total_article_views(restaurant_id)

        article_helpfulness = await self._calculate_article_helpfulness(restaurant_id)

        return {
            "tickets": {
                "total": tickets_total,
                "open": tickets_open,
                "last_30_days": tickets_last_30_days,
                "avg_resolution_time_hours": avg_resolution_time,
            },
            "chats": {
                "total": chats_total,
                "last_30_days": chats_last_30_days,
                "escalation_rate": chat_escalation_rate,
            },
            "knowledge_base": {
                "total_articles": articles_total,
                "total_views": articles_views,
                "helpfulness_rate": article_helpfulness,
            },
        }

    async def _calculate_avg_resolution_time(self, restaurant_id: str) -> float:
        """Calcula o tempo médio de resolução de tickets."""
        # Obter tickets resolvidos
        resolved_tickets = await self.db_service.find(
            "support_tickets", {"restaurant_id": restaurant_id, "status": "closed"}
        )

        if not resolved_tickets:
            return 0

        # Calcular tempo de resolução para cada ticket
        total_hours = 0
        count = 0

        for ticket in resolved_tickets:
            created_at = datetime.fromisoformat(
                ticket["created_at"].replace("Z", "+00:00")
            )

            # Encontrar a última atualização de status para "closed"
            closed_at = None
            for message in ticket.get("messages", []):
                if message.get("update_status") == "closed":
                    closed_at = datetime.fromisoformat(
                        message["created_at"].replace("Z", "+00:00")
                    )

            # Se não encontrar, usar updated_at
            if not closed_at and "updated_at" in ticket:
                closed_at = datetime.fromisoformat(
                    ticket["updated_at"].replace("Z", "+00:00")
                )

            if closed_at:
                resolution_time = (
                    closed_at - created_at
                ).total_seconds() / 3600  # Converter para horas
                total_hours += resolution_time
                count += 1

        if count == 0:
            return 0

        return total_hours / count

    async def _calculate_chat_escalation_rate(self, restaurant_id: str) -> float:
        """Calcula a taxa de escalação de conversas de chatbot."""
        # Obter total de conversas
        total_chats = await self.db_service.count(
            "support_chats", {"restaurant_id": restaurant_id}
        )

        if total_chats == 0:
            return 0

        # Obter conversas escaladas
        escalated_chats = await self.db_service.count(
            "support_chats", {"restaurant_id": restaurant_id, "status": "transferred"}
        )

        return escalated_chats / total_chats

    async def _calculate_total_article_views(self, restaurant_id: str) -> int:
        """Calcula o total de visualizações de artigos."""
        # Obter artigos
        articles = await self.db_service.find(
            "knowledge_articles", {"restaurant_id": restaurant_id}
        )

        # Somar visualizações
        total_views = sum(article.get("view_count", 0) for article in articles)

        return total_views

    async def _calculate_article_helpfulness(self, restaurant_id: str) -> float:
        """Calcula a taxa de utilidade dos artigos."""
        # Obter artigos
        articles = await self.db_service.find(
            "knowledge_articles", {"restaurant_id": restaurant_id}
        )

        total_helpful = 0
        total_ratings = 0

        for article in articles:
            helpful = article.get("helpful_count", 0)
            not_helpful = article.get("not_helpful_count", 0)

            total_helpful += helpful
            total_ratings += helpful + not_helpful

        if total_ratings == 0:
            return 0

        return total_helpful / total_ratings


class TwilioService:
    """Serviço para integração com Twilio para WhatsApp."""

    def __init__(self, config_service):
        self.config_service = config_service

    async def send_message(self, to: str, message: str) -> Dict[str, Any]:
        """Envia uma mensagem via WhatsApp usando Twilio."""
        # Em um ambiente real, isso usaria a API do Twilio
        # Aqui, apenas simulamos o envio
        logger.info(f"Enviando mensagem para {to}: {message}")

        # Simular resposta do Twilio
        message_id = str(uuid.uuid4())

        return {
            "id": message_id,
            "to": to,
            "status": "sent",
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def receive_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Processa uma mensagem recebida via webhook do Twilio."""
        # Em um ambiente real, isso processaria dados do webhook
        # Aqui, apenas simulamos o processamento
        from_number = message_data.get("from")
        message_body = message_data.get("body")

        logger.info(f"Mensagem recebida de {from_number}: {message_body}")

        # Retornar dados processados
        return {
            "from": from_number,
            "body": message_body,
            "timestamp": datetime.utcnow().isoformat(),
        }


class BedrockService:
    """Serviço para integração com Amazon Bedrock (Claude)."""

    def __init__(self, config_service):
        self.config_service = config_service

    async def generate_response(self, prompt: str) -> str:
        """Gera uma resposta usando Amazon Bedrock (Claude)."""
        # Em um ambiente real, isso usaria a API do Amazon Bedrock
        # Aqui, apenas simulamos a geração de resposta

        # Simular análise do prompt
        if (
            "problema" in prompt.lower()
            or "erro" in prompt.lower()
            or "não funciona" in prompt.lower()
        ):
            # Simular resposta para problema técnico
            return """
            {
              "intent": "problema_técnico",
              "identified_issue": "Problema de funcionalidade do sistema",
              "suggested_articles": ["troubleshooting-101", "common-errors"],
              "escalation_recommended": false,
              "response_text": "Entendo que você está enfrentando um problema técnico. Vamos tentar resolver isso juntos. Primeiro, poderia me dizer qual versão do sistema você está usando? Isso me ajudará a fornecer instruções mais precisas."
            }
            """
        elif (
            "preço" in prompt.lower()
            or "custo" in prompt.lower()
            or "valor" in prompt.lower()
        ):
            # Simular resposta para dúvida sobre preços
            return """
            {
              "intent": "dúvida_preço",
              "identified_issue": null,
              "suggested_articles": ["pricing-guide", "subscription-plans"],
              "escalation_recommended": false,
              "response_text": "Sobre os preços do POS Modern, temos diferentes planos disponíveis dependendo do tamanho do seu estabelecimento e das funcionalidades necessárias. O plano básico começa em R$ 199/mês e inclui todas as funcionalidades essenciais. Posso enviar mais detalhes sobre os planos ou há alguma funcionalidade específica que você gostaria de saber se está incluída?"
            }
            """
        elif (
            "lento" in prompt.lower()
            or "travando" in prompt.lower()
            or "péssimo" in prompt.lower()
            or "horrível" in prompt.lower()
        ):
            # Simular resposta para reclamação
            return """
            {
              "intent": "reclamação",
              "identified_issue": "Insatisfação com desempenho do sistema",
              "suggested_articles": ["performance-tips", "system-requirements"],
              "escalation_recommended": true,
              "response_text": "Lamento muito que você esteja enfrentando problemas de desempenho com o sistema. Isso certamente pode ser frustrante. Para resolver isso da melhor forma, vou transferir você para um de nossos especialistas técnicos que poderá investigar mais a fundo e oferecer uma solução personalizada. Por favor, aguarde um momento enquanto faço a transferência."
            }
            """
        else:
            # Simular resposta genérica
            return """
            {
              "intent": "informação_geral",
              "identified_issue": null,
              "suggested_articles": ["getting-started", "features-overview"],
              "escalation_recommended": false,
              "response_text": "Obrigado por entrar em contato com o suporte do POS Modern. Estou aqui para ajudar com qualquer dúvida sobre nosso sistema. Posso fornecer informações sobre funcionalidades, ajudar com configurações ou resolver problemas técnicos. Como posso ajudar você hoje?"
            }
            """


# Criar router
router = APIRouter(
    prefix="/api/support",
    tags=["support"],
    responses={404: {"description": "Not found"}},
)


# Dependência para obter o serviço de suporte
def get_support_service():
    db_service = get_db_service()
    config_service = get_config_service()
    event_bus = get_event_bus()
    return SupportService(db_service, config_service, event_bus)


# Rotas para o dashboard de suporte
@router.get("/dashboard")
async def get_support_dashboard(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Obtém o dashboard de suporte com métricas e tickets recentes."""
    return await support_service.get_support_dashboard(restaurant_id, current_user.id)


# Rotas para tickets
@router.post("/tickets", response_model=Dict[str, Any])
async def create_ticket(
    ticket_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Cria um novo ticket de suporte."""
    # Adicionar usuário atual como criador
    ticket_data["created_by"] = current_user.id

    return await support_service.ticket_service.create_ticket(ticket_data)


@router.get("/tickets/{ticket_id}", response_model=Dict[str, Any])
async def get_ticket(
    ticket_id: str = Path(..., description="ID do ticket"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Obtém um ticket pelo ID."""
    return await support_service.ticket_service.get_ticket(ticket_id)


@router.put("/tickets/{ticket_id}", response_model=Dict[str, Any])
async def update_ticket(
    ticket_id: str = Path(..., description="ID do ticket"),
    update_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Atualiza um ticket existente."""
    # Adicionar usuário atual como atualizador
    update_data["updated_by"] = current_user.id

    return await support_service.ticket_service.update_ticket(ticket_id, update_data)


@router.post("/tickets/{ticket_id}/messages", response_model=Dict[str, Any])
async def add_ticket_message(
    ticket_id: str = Path(..., description="ID do ticket"),
    message_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Adiciona uma mensagem a um ticket existente."""
    # Adicionar usuário atual como remetente
    message_data["sender_id"] = current_user.id

    return await support_service.ticket_service.add_message(ticket_id, message_data)


@router.get("/tickets", response_model=Dict[str, Any])
async def list_tickets(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    priority: Optional[str] = Query(None, description="Filtrar por prioridade"),
    category: Optional[str] = Query(None, description="Filtrar por categoria"),
    assigned_to: Optional[str] = Query(None, description="Filtrar por responsável"),
    created_by: Optional[str] = Query(None, description="Filtrar por criador"),
    page: int = Query(1, description="Número da página"),
    page_size: int = Query(20, description="Tamanho da página"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Lista tickets com filtros e paginação."""
    return await support_service.ticket_service.get_tickets(
        restaurant_id,
        status,
        priority,
        category,
        assigned_to,
        created_by,
        page,
        page_size,
    )


# Rotas para chatbot
@router.post("/chats", response_model=Dict[str, Any])
async def start_chat(
    chat_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Inicia uma nova conversa de chatbot."""
    # Adicionar usuário atual como usuário da conversa
    chat_data["user_id"] = current_user.id
    chat_data["user_name"] = current_user.name

    return await support_service.chatbot_service.start_chat(chat_data)


@router.get("/chats/{chat_id}", response_model=Dict[str, Any])
async def get_chat(
    chat_id: str = Path(..., description="ID da conversa"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Obtém uma conversa pelo ID."""
    return await support_service.chatbot_service.get_chat(chat_id)


@router.post("/chats/{chat_id}/messages", response_model=Dict[str, Any])
async def add_chat_message(
    chat_id: str = Path(..., description="ID da conversa"),
    message_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Adiciona uma mensagem a uma conversa existente."""
    # Adicionar usuário atual como remetente
    message_data["sender_id"] = current_user.id
    message_data["sender_type"] = "user"

    return await support_service.chatbot_service.add_message(chat_id, message_data)


@router.post("/chats/{chat_id}/end", response_model=Dict[str, Any])
async def end_chat(
    chat_id: str = Path(..., description="ID da conversa"),
    reason: Optional[str] = Query(None, description="Motivo do encerramento"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Encerra uma conversa de chatbot."""
    return await support_service.chatbot_service.end_chat(chat_id, reason)


@router.post("/chats/{chat_id}/transfer", response_model=Dict[str, Any])
async def transfer_chat(
    chat_id: str = Path(..., description="ID da conversa"),
    agent_id: Optional[str] = Query(
        None, description="ID do agente para transferência"
    ),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Transfere uma conversa de chatbot para um atendente humano."""
    return await support_service.chatbot_service.transfer_to_human(chat_id, agent_id)


@router.get("/chats", response_model=List[Dict[str, Any]])
async def list_active_chats(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Lista as conversas ativas."""
    return await support_service.chatbot_service.get_active_chats(restaurant_id)


# Rotas para base de conhecimento
@router.post("/knowledge/articles", response_model=Dict[str, Any])
async def create_article(
    article_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Cria um novo artigo na base de conhecimento."""
    # Adicionar usuário atual como criador
    article_data["created_by"] = current_user.id

    return await support_service.knowledge_service.create_article(article_data)


@router.get("/knowledge/articles/{article_id}", response_model=Dict[str, Any])
async def get_article(
    article_id: str = Path(..., description="ID do artigo"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Obtém um artigo pelo ID."""
    return await support_service.knowledge_service.get_article(article_id)


@router.put("/knowledge/articles/{article_id}", response_model=Dict[str, Any])
async def update_article(
    article_id: str = Path(..., description="ID do artigo"),
    update_data: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Atualiza um artigo existente."""
    # Adicionar usuário atual como atualizador
    update_data["updated_by"] = current_user.id

    return await support_service.knowledge_service.update_article(
        article_id, update_data
    )


@router.delete("/knowledge/articles/{article_id}", response_model=bool)
async def delete_article(
    article_id: str = Path(..., description="ID do artigo"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Exclui um artigo."""
    return await support_service.knowledge_service.delete_article(article_id)


@router.get("/knowledge/articles", response_model=Dict[str, Any])
async def list_articles(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    category: Optional[str] = Query(None, description="Filtrar por categoria"),
    tag: Optional[str] = Query(None, description="Filtrar por tag"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    page: int = Query(1, description="Número da página"),
    page_size: int = Query(20, description="Tamanho da página"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Lista artigos com filtros e paginação."""
    return await support_service.knowledge_service.get_articles(
        restaurant_id, category, tag, status, page, page_size
    )


@router.post("/knowledge/articles/{article_id}/rate", response_model=Dict[str, Any])
async def rate_article(
    article_id: str = Path(..., description="ID do artigo"),
    is_helpful: bool = Query(..., description="Se o artigo foi útil ou não"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Avalia um artigo como útil ou não útil."""
    return await support_service.knowledge_service.rate_article(article_id, is_helpful)


# Rotas para pesquisa
@router.get("/search", response_model=Dict[str, Any])
async def search_support_resources(
    restaurant_id: str = Query(..., description="ID do restaurante"),
    query: str = Query(..., description="Termo de pesquisa"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Pesquisa em todos os recursos de suporte (tickets, artigos, etc)."""
    return await support_service.search_support_resources(restaurant_id, query)


# Rotas para integração com WhatsApp
@router.post("/whatsapp/webhook", response_model=Dict[str, Any])
async def whatsapp_webhook(
    message_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    support_service: SupportService = Depends(get_support_service),
):
    """Webhook para receber mensagens do WhatsApp via Twilio."""
    # Processar mensagem recebida
    processed_message = (
        await support_service.chatbot_service.twilio_service.receive_message(
            message_data
        )
    )

    # Processar mensagem em background
    background_tasks.add_task(
        process_whatsapp_message, processed_message, support_service
    )

    return {"status": "received"}


@router.post("/whatsapp/send", response_model=Dict[str, Any])
async def send_whatsapp_message(
    to: str = Query(..., description="Número de telefone do destinatário"),
    message: str = Query(..., description="Conteúdo da mensagem"),
    current_user: User = Depends(get_current_user),
    support_service: SupportService = Depends(get_support_service),
):
    """Envia uma mensagem via WhatsApp usando Twilio."""
    return await support_service.chatbot_service.twilio_service.send_message(
        to, message
    )


# Função para processar mensagem do WhatsApp em background
async def process_whatsapp_message(
    message: Dict[str, Any], support_service: SupportService
):
    """Processa uma mensagem recebida do WhatsApp."""
    try:
        # Extrair informações da mensagem
        from_number = message.get("from")
        message_body = message.get("body")

        # Verificar se já existe uma conversa ativa para este número
        # Implementação simplificada, em produção usaria uma consulta mais robusta
        active_chats = await support_service.db_service.find(
            "support_chats",
            {
                "metadata.phone_number": from_number,
                "status": "active",
                "channel": "whatsapp",
            },
        )

        if active_chats and len(active_chats) > 0:
            # Usar conversa existente
            chat = active_chats[0]

            # Adicionar mensagem à conversa
            await support_service.chatbot_service.add_message(
                chat["id"],
                {
                    "content": message_body,
                    "sender_id": from_number,
                    "sender_type": "user",
                },
            )
        else:
            # Criar nova conversa
            # Primeiro, tentar identificar o usuário pelo número de telefone
            user = await support_service.db_service.find_one(
                "users", {"phone": from_number}
            )

            # Criar dados da conversa
            chat_data = {
                "user_id": user["id"] if user else from_number,
                "user_name": user["name"] if user else "Cliente WhatsApp",
                "channel": "whatsapp",
                "metadata": {"phone_number": from_number},
            }

            # Iniciar nova conversa
            chat = await support_service.chatbot_service.start_chat(chat_data)

            # Adicionar primeira mensagem
            await support_service.chatbot_service.add_message(
                chat["id"],
                {
                    "content": message_body,
                    "sender_id": from_number,
                    "sender_type": "user",
                },
            )

    except Exception as e:
        logger.error(f"Erro ao processar mensagem do WhatsApp: {str(e)}")
