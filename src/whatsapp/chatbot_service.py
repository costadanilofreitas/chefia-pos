"""
Módulo de chatbot WhatsApp com integração Twilio.

Este módulo implementa um chatbot bidirecional via WhatsApp/Twilio com:
1. Atendimento automatizado
2. Pedidos via WhatsApp
3. Exibição de cardápio com combobox
4. Identificação e cadastro de clientes
5. Processamento de pagamentos
6. Abertura de tickets de suporte
"""

import os
import json
import logging
import uuid
from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import Request
from pydantic import BaseModel, Field

# Configurar logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Enums para estados de conversação
class ConversationState(str, Enum):
    GREETING = "greeting"
    MENU_BROWSING = "menu_browsing"
    CATEGORY_SELECTION = "category_selection"
    ITEM_SELECTION = "item_selection"
    CUSTOMIZATION = "customization"
    CART_REVIEW = "cart_review"
    CHECKOUT = "checkout"
    PAYMENT = "payment"
    SUPPORT = "support"
    FEEDBACK = "feedback"
    REGISTRATION = "registration"
    ORDER_STATUS = "order_status"

# Enums para tipos de mensagem
class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    LOCATION = "location"
    INTERACTIVE = "interactive"
    BUTTON = "button"
    LIST = "list"
    TEMPLATE = "template"

# Modelos de dados
class WhatsAppCustomer(BaseModel):
    """Cliente identificado via WhatsApp."""
    id: Optional[str] = None
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    is_registered: bool = False
    last_interaction: Optional[datetime] = None
    
class WhatsAppCartItem(BaseModel):
    """Item no carrinho do cliente."""
    id: str
    name: str
    quantity: int = 1
    unit_price: float
    total_price: float
    notes: Optional[str] = None
    customizations: List[Dict[str, Any]] = []

class WhatsAppCart(BaseModel):
    """Carrinho de compras do cliente."""
    id: str
    customer_id: str
    items: List[WhatsAppCartItem] = []
    subtotal: float = 0
    delivery_fee: Optional[float] = None
    discount: float = 0
    total: float = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class WhatsAppOrder(BaseModel):
    """Pedido realizado via WhatsApp."""
    id: str
    cart_id: str
    customer_id: str
    status: str = "pending"
    payment_status: str = "pending"
    payment_method: Optional[str] = None
    payment_details: Optional[Dict[str, Any]] = None
    delivery_address: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class WhatsAppMessage(BaseModel):
    """Mensagem enviada ou recebida via WhatsApp."""
    id: str
    from_number: str
    to_number: str
    message_type: MessageType
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.now)
    
class WhatsAppConversation(BaseModel):
    """Conversação com cliente via WhatsApp."""
    id: str
    customer_id: str
    state: ConversationState = ConversationState.GREETING
    context: Dict[str, Any] = {}
    last_message_id: Optional[str] = None
    last_bot_message_id: Optional[str] = None
    last_interaction: datetime = Field(default_factory=datetime.now)
    is_active: bool = True

class WhatsAppSupportTicket(BaseModel):
    """Ticket de suporte aberto via WhatsApp."""
    id: str
    customer_id: str
    conversation_id: str
    subject: str
    description: str
    status: str = "open"
    priority: str = "medium"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    assigned_to: Optional[str] = None
    
# Serviço principal do chatbot WhatsApp
class WhatsAppChatbotService:
    """Serviço de chatbot WhatsApp com integração Twilio."""
    
    def __init__(self):
        """Inicializa o serviço de chatbot WhatsApp."""
        # Configurações para Twilio
        self.twilio_config = {
            "account_sid": os.environ.get("TWILIO_ACCOUNT_SID", ""),
            "auth_token": os.environ.get("TWILIO_AUTH_TOKEN", ""),
            "whatsapp_number": os.environ.get("TWILIO_WHATSAPP_NUMBER", "")
        }
        
        # Configurações para Amazon Bedrock (Claude)
        # self.bedrock_client = boto3.client('bedrock-runtime')
        
        # Armazenamento em memória (em produção seria um banco de dados)
        self.customers: Dict[str, WhatsAppCustomer] = {}
        self.conversations: Dict[str, WhatsAppConversation] = {}
        self.carts: Dict[str, WhatsAppCart] = {}
        self.orders: Dict[str, WhatsAppOrder] = {}
        self.messages: Dict[str, WhatsAppMessage] = {}
        self.support_tickets: Dict[str, WhatsAppSupportTicket] = {}
        
        # Carregar dados de menu (em produção seria do banco de dados)
        self.menu_data = self._load_menu_data()
        
        # Templates de mensagem
        self.message_templates = self._load_message_templates()
        
    def _load_menu_data(self) -> Dict[str, Any]:
        """Carrega dados do menu (simulado)."""
        return {
            "categories": [
                {
                    "id": "cat1",
                    "name": "Hambúrgueres",
                    "items": [
                        {
                            "id": "item1",
                            "name": "X-Burger",
                            "description": "Hambúrguer com queijo",
                            "price": 15.90,
                            "image_url": "https://example.com/xburger.jpg",
                            "customizations": [
                                {
                                    "id": "cust1",
                                    "name": "Ponto da carne",
                                    "required": True,
                                    "options": [
                                        {"id": "opt1", "name": "Ao ponto", "price": 0},
                                        {"id": "opt2", "name": "Bem passado", "price": 0}
                                    ]
                                },
                                {
                                    "id": "cust2",
                                    "name": "Extras",
                                    "required": False,
                                    "options": [
                                        {"id": "opt3", "name": "Bacon", "price": 3.00},
                                        {"id": "opt4", "name": "Cheddar", "price": 2.50}
                                    ]
                                }
                            ]
                        },
                        {
                            "id": "item2",
                            "name": "X-Salada",
                            "description": "Hambúrguer com queijo e salada",
                            "price": 17.90,
                            "image_url": "https://example.com/xsalada.jpg",
                            "customizations": []
                        }
                    ]
                },
                {
                    "id": "cat2",
                    "name": "Bebidas",
                    "items": [
                        {
                            "id": "item3",
                            "name": "Refrigerante",
                            "description": "Lata 350ml",
                            "price": 5.90,
                            "image_url": "https://example.com/refrigerante.jpg",
                            "customizations": [
                                {
                                    "id": "cust3",
                                    "name": "Sabor",
                                    "required": True,
                                    "options": [
                                        {"id": "opt5", "name": "Cola", "price": 0},
                                        {"id": "opt6", "name": "Guaraná", "price": 0},
                                        {"id": "opt7", "name": "Limão", "price": 0}
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    
    def _load_message_templates(self) -> Dict[str, str]:
        """Carrega templates de mensagem."""
        return {
            "greeting": "Olá! Bem-vindo ao *{restaurant_name}*. Como posso ajudar hoje?\n\n1️⃣ Ver cardápio\n2️⃣ Fazer pedido\n3️⃣ Verificar status do pedido\n4️⃣ Falar com atendente",
            
            "menu_intro": "Aqui está nosso cardápio. Escolha uma categoria:",
            
            "category_items": "Itens em *{category_name}*:",
            
            "item_details": "*{item_name}*\n{item_description}\nPreço: R$ {item_price:.2f}",
            
            "customization_prompt": "Escolha as opções para *{item_name}*:",
            
            "cart_review": "Seu carrinho:\n{cart_items}\n\nSubtotal: R$ {subtotal:.2f}\nTaxa de entrega: R$ {delivery_fee:.2f}\nTotal: R$ {total:.2f}\n\n1️⃣ Finalizar pedido\n2️⃣ Continuar comprando\n3️⃣ Esvaziar carrinho",
            
            "checkout_prompt": "Quase lá! Escolha como deseja receber seu pedido:\n\n1️⃣ Delivery\n2️⃣ Retirada no local",
            
            "address_prompt": "Por favor, envie seu endereço de entrega ou compartilhe sua localização.",
            
            "payment_prompt": "Escolha a forma de pagamento:\n\n1️⃣ PIX\n2️⃣ Cartão de crédito\n3️⃣ Cartão de débito\n4️⃣ Pagar na entrega",
            
            "payment_confirmation": "Pagamento de R$ {amount:.2f} confirmado! Seu pedido #{order_id} foi recebido e está sendo preparado.",
            
            "order_confirmation": "Pedido #{order_id} confirmado!\nStatus: {status}\nEstimativa de entrega: {delivery_time}\n\nAgradecemos sua preferência!",
            
            "registration_prompt": "Parece que é sua primeira vez aqui. Para continuar, precisamos de algumas informações:\n\nQual é o seu nome completo?",
            
            "registration_email": "Obrigado, {name}! Agora, qual é o seu e-mail?",
            
            "registration_complete": "Cadastro concluído com sucesso! Agora você pode fazer pedidos facilmente.",
            
            "support_prompt": "Em que posso ajudar?\n\n1️⃣ Problema com pedido\n2️⃣ Dúvidas sobre cardápio\n3️⃣ Horários de funcionamento\n4️⃣ Outros assuntos",
            
            "ticket_created": "Ticket #{ticket_id} criado! Um atendente entrará em contato em breve.",
            
            "feedback_prompt": "Como você avalia sua experiência?\n\n⭐⭐⭐⭐⭐ - Excelente\n⭐⭐⭐⭐ - Muito bom\n⭐⭐⭐ - Bom\n⭐⭐ - Regular\n⭐ - Ruim",
            
            "feedback_comment": "Obrigado pela avaliação! Gostaria de deixar algum comentário adicional?",
            
            "feedback_thanks": "Agradecemos seu feedback! Ele é muito importante para melhorarmos nosso atendimento."
        }
    
    async def process_incoming_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem recebida via webhook do Twilio.
        
        Args:
            message_data: Dados da mensagem recebida
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        try:
            # Extrair dados básicos da mensagem
            from_number = message_data.get("From", "").replace("whatsapp:", "")
            to_number = message_data.get("To", "").replace("whatsapp:", "")
            message_body = message_data.get("Body", "")
            message_type = MessageType.TEXT  # Padrão
            
            # Verificar se há mídia
            if message_data.get("NumMedia", "0") != "0":
                message_type = MessageType.IMAGE
            
            # Verificar se é mensagem interativa
            if message_data.get("ButtonPayload") or message_data.get("ListPayload"):
                message_type = MessageType.INTERACTIVE
            
            # Criar objeto de mensagem
            message_id = str(uuid.uuid4())
            message = WhatsAppMessage(
                id=message_id,
                from_number=from_number,
                to_number=to_number,
                message_type=message_type,
                content={"text": message_body} if message_type == MessageType.TEXT else message_data,
                timestamp=datetime.now()
            )
            
            # Armazenar mensagem
            self.messages[message_id] = message
            
            # Identificar ou criar cliente
            customer = await self._get_or_create_customer(from_number)
            
            # Identificar ou criar conversação
            conversation = await self._get_or_create_conversation(customer.id)
            
            # Atualizar estado da conversação
            conversation.last_message_id = message_id
            conversation.last_interaction = datetime.now()
            
            # Processar mensagem com base no estado da conversação
            response = await self._process_message_by_state(message, customer, conversation)
            
            # Armazenar resposta do bot
            bot_message_id = str(uuid.uuid4())
            bot_message = WhatsAppMessage(
                id=bot_message_id,
                from_number=to_number,
                to_number=from_number,
                message_type=response.get("type", MessageType.TEXT),
                content=response,
                timestamp=datetime.now()
            )
            
            self.messages[bot_message_id] = bot_message
            conversation.last_bot_message_id = bot_message_id
            
            # Atualizar conversação
            self.conversations[conversation.id] = conversation
            
            return response
            
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {str(e)}", exc_info=True)
            # Resposta de fallback em caso de erro
            return {
                "type": "text",
                "text": "Desculpe, tivemos um problema ao processar sua mensagem. Por favor, tente novamente mais tarde."
            }
    
    async def _get_or_create_customer(self, phone_number: str) -> WhatsAppCustomer:
        """
        Obtém cliente existente ou cria um novo.
        
        Args:
            phone_number: Número de telefone do cliente
            
        Returns:
            WhatsAppCustomer: Cliente
        """
        # Verificar se cliente já existe
        for customer_id, customer in self.customers.items():
            if customer.phone == phone_number:
                # Atualizar última interação
                customer.last_interaction = datetime.now()
                self.customers[customer_id] = customer
                return customer
        
        # Criar novo cliente
        customer_id = str(uuid.uuid4())
        customer = WhatsAppCustomer(
            id=customer_id,
            phone=phone_number,
            last_interaction=datetime.now()
        )
        
        self.customers[customer_id] = customer
        return customer
    
    async def _get_or_create_conversation(self, customer_id: str) -> WhatsAppConversation:
        """
        Obtém conversação ativa ou cria uma nova.
        
        Args:
            customer_id: ID do cliente
            
        Returns:
            WhatsAppConversation: Conversação
        """
        # Verificar se há conversação ativa
        for conv_id, conv in self.conversations.items():
            if conv.customer_id == customer_id and conv.is_active:
                return conv
        
        # Criar nova conversação
        conversation_id = str(uuid.uuid4())
        conversation = WhatsAppConversation(
            id=conversation_id,
            customer_id=customer_id,
            state=ConversationState.GREETING,
            context={},
            last_interaction=datetime.now(),
            is_active=True
        )
        
        self.conversations[conversation_id] = conversation
        return conversation
    
    async def _process_message_by_state(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem com base no estado da conversação.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Verificar se cliente precisa se registrar
        if not customer.is_registered and conversation.state != ConversationState.REGISTRATION:
            conversation.state = ConversationState.REGISTRATION
            conversation.context["registration_step"] = "name"
            return {
                "type": "text",
                "text": self.message_templates["registration_prompt"]
            }
        
        # Processar com base no estado
        if conversation.state == ConversationState.GREETING:
            return await self._process_greeting(message, customer, conversation)
        elif conversation.state == ConversationState.MENU_BROWSING:
            return await self._process_menu_browsing(message, customer, conversation)
        elif conversation.state == ConversationState.CATEGORY_SELECTION:
            return await self._process_category_selection(message, customer, conversation)
        elif conversation.state == ConversationState.ITEM_SELECTION:
            return await self._process_item_selection(message, customer, conversation)
        elif conversation.state == ConversationState.CUSTOMIZATION:
            return await self._process_customization(message, customer, conversation)
        elif conversation.state == ConversationState.CART_REVIEW:
            return await self._process_cart_review(message, customer, conversation)
        elif conversation.state == ConversationState.CHECKOUT:
            return await self._process_checkout(message, customer, conversation)
        elif conversation.state == ConversationState.PAYMENT:
            return await self._process_payment(message, customer, conversation)
        elif conversation.state == ConversationState.SUPPORT:
            return await self._process_support(message, customer, conversation)
        elif conversation.state == ConversationState.FEEDBACK:
            return await self._process_feedback(message, customer, conversation)
        elif conversation.state == ConversationState.REGISTRATION:
            return await self._process_registration(message, customer, conversation)
        elif conversation.state == ConversationState.ORDER_STATUS:
            return await self._process_order_status(message, customer, conversation)
        else:
            # Estado desconhecido, voltar para saudação
            conversation.state = ConversationState.GREETING
            return {
                "type": "text",
                "text": self.message_templates["greeting"].format(restaurant_name="Restaurante Demo")
            }
    
    async def _process_greeting(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de saudação.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip().lower()
        
        # Processar opções
        if message_text == "1" or "cardápio" in message_text or "cardapio" in message_text:
            # Ver cardápio
            conversation.state = ConversationState.MENU_BROWSING
            return await self._create_categories_list()
        elif message_text == "2" or "pedido" in message_text or "pedir" in message_text:
            # Fazer pedido
            conversation.state = ConversationState.MENU_BROWSING
            return await self._create_categories_list()
        elif message_text == "3" or "status" in message_text:
            # Verificar status do pedido
            conversation.state = ConversationState.ORDER_STATUS
            return {
                "type": "text",
                "text": "Por favor, informe o número do seu pedido:"
            }
        elif message_text == "4" or "atendente" in message_text or "suporte" in message_text:
            # Falar com atendente
            conversation.state = ConversationState.SUPPORT
            return {
                "type": "text",
                "text": self.message_templates["support_prompt"]
            }
        else:
            # Resposta padrão
            return {
                "type": "text",
                "text": self.message_templates["greeting"].format(restaurant_name="Restaurante Demo")
            }
    
    async def _create_categories_list(self) -> Dict[str, Any]:
        """
        Cria lista interativa de categorias do cardápio.
        
        Returns:
            Dict[str, Any]: Mensagem interativa com lista de categorias
        """
        # Criar lista de categorias
        sections = []
        rows = []
        
        for i, category in enumerate(self.menu_data["categories"]):
            rows.append({
                "id": category["id"],
                "title": category["name"],
                "description": f"{len(category['items'])} itens"
            })
            
            # Agrupar em seções de 10 itens (limite do WhatsApp)
            if (i + 1) % 10 == 0 or i == len(self.menu_data["categories"]) - 1:
                sections.append({
                    "title": "Categorias",
                    "rows": rows
                })
                rows = []
        
        return {
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {
                    "type": "text",
                    "text": "Cardápio"
                },
                "body": {
                    "text": self.message_templates["menu_intro"]
                },
                "action": {
                    "button": "Ver categorias",
                    "sections": sections
                }
            }
        }
    
    async def _process_menu_browsing(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de navegação do cardápio.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Verificar se é uma seleção de lista
        if message.message_type == MessageType.INTERACTIVE:
            list_reply = message.content.get("ListReply", {})
            selected_id = list_reply.get("id")
            
            # Encontrar categoria selecionada
            selected_category = None
            for category in self.menu_data["categories"]:
                if category["id"] == selected_id:
                    selected_category = category
                    break
            
            if selected_category:
                # Armazenar categoria selecionada no contexto
                conversation.context["selected_category"] = selected_category
                conversation.state = ConversationState.CATEGORY_SELECTION
                
                # Criar lista de itens da categoria
                return await self._create_category_items_list(selected_category)
        
        # Se não for seleção válida, mostrar categorias novamente
        return await self._create_categories_list()
    
    async def _create_category_items_list(self, category: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria lista interativa de itens de uma categoria.
        
        Args:
            category: Categoria selecionada
            
        Returns:
            Dict[str, Any]: Mensagem interativa com lista de itens
        """
        # Criar lista de itens
        sections = []
        rows = []
        
        for i, item in enumerate(category["items"]):
            rows.append({
                "id": item["id"],
                "title": item["name"],
                "description": f"R$ {item['price']:.2f}"
            })
            
            # Agrupar em seções de 10 itens (limite do WhatsApp)
            if (i + 1) % 10 == 0 or i == len(category["items"]) - 1:
                sections.append({
                    "title": category["name"],
                    "rows": rows
                })
                rows = []
        
        return {
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {
                    "type": "text",
                    "text": category["name"]
                },
                "body": {
                    "text": self.message_templates["category_items"].format(category_name=category["name"])
                },
                "action": {
                    "button": "Ver itens",
                    "sections": sections
                }
            }
        }
    
    async def _process_category_selection(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de seleção de categoria.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Verificar se é uma seleção de lista
        if message.message_type == MessageType.INTERACTIVE:
            list_reply = message.content.get("ListReply", {})
            selected_id = list_reply.get("id")
            
            # Obter categoria do contexto
            selected_category = conversation.context.get("selected_category")
            if not selected_category:
                # Se não houver categoria no contexto, voltar para navegação
                conversation.state = ConversationState.MENU_BROWSING
                return await self._create_categories_list()
            
            # Encontrar item selecionado
            selected_item = None
            for item in selected_category["items"]:
                if item["id"] == selected_id:
                    selected_item = item
                    break
            
            if selected_item:
                # Armazenar item selecionado no contexto
                conversation.context["selected_item"] = selected_item
                conversation.state = ConversationState.ITEM_SELECTION
                
                # Mostrar detalhes do item
                return await self._create_item_details(selected_item)
        
        # Se não for seleção válida, mostrar itens da categoria novamente
        selected_category = conversation.context.get("selected_category")
        if selected_category:
            return await self._create_category_items_list(selected_category)
        else:
            # Se não houver categoria no contexto, voltar para navegação
            conversation.state = ConversationState.MENU_BROWSING
            return await self._create_categories_list()
    
    async def _create_item_details(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria mensagem com detalhes do item e botões de ação.
        
        Args:
            item: Item selecionado
            
        Returns:
            Dict[str, Any]: Mensagem interativa com detalhes do item
        """
        # Verificar se o item tem customizações
        has_customizations = len(item.get("customizations", [])) > 0
        
        # Criar botões de ação
        buttons = [
            {
                "type": "reply",
                "reply": {
                    "id": "add_to_cart",
                    "title": "Adicionar ao carrinho"
                }
            }
        ]
        
        # Se tiver customizações, adicionar botão para personalizar
        if has_customizations:
            buttons.insert(0, {
                "type": "reply",
                "reply": {
                    "id": "customize",
                    "title": "Personalizar"
                }
            })
        
        # Adicionar botão para voltar
        buttons.append({
            "type": "reply",
            "reply": {
                "id": "back_to_category",
                "title": "Voltar"
            }
        })
        
        return {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "header": {
                    "type": "text",
                    "text": item["name"]
                },
                "body": {
                    "text": self.message_templates["item_details"].format(
                        item_name=item["name"],
                        item_description=item["description"],
                        item_price=item["price"]
                    )
                },
                "action": {
                    "buttons": buttons
                }
            }
        }
    
    async def _process_item_selection(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de seleção de item.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Obter item do contexto
        selected_item = conversation.context.get("selected_item")
        if not selected_item:
            # Se não houver item no contexto, voltar para navegação
            conversation.state = ConversationState.MENU_BROWSING
            return await self._create_categories_list()
        
        # Verificar se é uma seleção de botão
        if message.message_type == MessageType.INTERACTIVE:
            button_reply = message.content.get("ButtonReply", {})
            selected_id = button_reply.get("id")
            
            if selected_id == "customize":
                # Personalizar item
                conversation.state = ConversationState.CUSTOMIZATION
                conversation.context["customization_step"] = 0
                conversation.context["customizations"] = []
                
                # Mostrar primeira customização
                return await self._show_next_customization(selected_item, conversation)
                
            elif selected_id == "add_to_cart":
                # Adicionar ao carrinho sem customizações
                await self._add_to_cart(customer.id, selected_item, [])
                conversation.state = ConversationState.CART_REVIEW
                
                # Mostrar carrinho
                return await self._create_cart_review(customer.id)
                
            elif selected_id == "back_to_category":
                # Voltar para categoria
                conversation.state = ConversationState.CATEGORY_SELECTION
                selected_category = conversation.context.get("selected_category")
                
                if selected_category:
                    return await self._create_category_items_list(selected_category)
        
        # Se não for seleção válida, mostrar detalhes do item novamente
        return await self._create_item_details(selected_item)
    
    async def _show_next_customization(self, item: Dict[str, Any], conversation: WhatsAppConversation) -> Dict[str, Any]:
        """
        Mostra próxima customização do item.
        
        Args:
            item: Item selecionado
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Mensagem interativa com opções de customização
        """
        customizations = item.get("customizations", [])
        current_step = conversation.context.get("customization_step", 0)
        
        # Verificar se há mais customizações
        if current_step >= len(customizations):
            # Finalizar customização e adicionar ao carrinho
            selected_item = conversation.context.get("selected_item")
            selected_customizations = conversation.context.get("customizations", [])
            
            await self._add_to_cart(conversation.customer_id, selected_item, selected_customizations)
            conversation.state = ConversationState.CART_REVIEW
            
            # Mostrar carrinho
            return await self._create_cart_review(conversation.customer_id)
        
        # Obter customização atual
        customization = customizations[current_step]
        
        # Criar lista de opções
        rows = []
        for option in customization.get("options", []):
            price_text = f" (+R$ {option['price']:.2f})" if option["price"] > 0 else ""
            rows.append({
                "id": option["id"],
                "title": option["name"] + price_text
            })
        
        return {
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {
                    "type": "text",
                    "text": customization["name"]
                },
                "body": {
                    "text": self.message_templates["customization_prompt"].format(
                        item_name=item["name"]
                    )
                },
                "footer": {
                    "text": "Obrigatório" if customization.get("required", False) else "Opcional"
                },
                "action": {
                    "button": "Ver opções",
                    "sections": [
                        {
                            "title": customization["name"],
                            "rows": rows
                        }
                    ]
                }
            }
        }
    
    async def _process_customization(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de customização.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Obter item e customizações do contexto
        selected_item = conversation.context.get("selected_item")
        if not selected_item:
            # Se não houver item no contexto, voltar para navegação
            conversation.state = ConversationState.MENU_BROWSING
            return await self._create_categories_list()
        
        customizations = selected_item.get("customizations", [])
        current_step = conversation.context.get("customization_step", 0)
        
        # Verificar se é uma seleção de lista
        if message.message_type == MessageType.INTERACTIVE:
            list_reply = message.content.get("ListReply", {})
            selected_id = list_reply.get("id")
            
            # Verificar se há customização atual
            if current_step < len(customizations):
                current_customization = customizations[current_step]
                
                # Encontrar opção selecionada
                selected_option = None
                for option in current_customization.get("options", []):
                    if option["id"] == selected_id:
                        selected_option = option
                        break
                
                if selected_option:
                    # Adicionar customização selecionada
                    selected_customizations = conversation.context.get("customizations", [])
                    selected_customizations.append({
                        "customization_id": current_customization["id"],
                        "customization_name": current_customization["name"],
                        "option_id": selected_option["id"],
                        "option_name": selected_option["name"],
                        "price": selected_option["price"]
                    })
                    
                    conversation.context["customizations"] = selected_customizations
                    
                    # Avançar para próxima customização
                    conversation.context["customization_step"] = current_step + 1
                    
                    # Mostrar próxima customização
                    return await self._show_next_customization(selected_item, conversation)
        
        # Se não for seleção válida, mostrar customização atual novamente
        return await self._show_next_customization(selected_item, conversation)
    
    async def _add_to_cart(
        self, 
        customer_id: str, 
        item: Dict[str, Any], 
        customizations: List[Dict[str, Any]]
    ) -> WhatsAppCart:
        """
        Adiciona item ao carrinho do cliente.
        
        Args:
            customer_id: ID do cliente
            item: Item a ser adicionado
            customizations: Customizações selecionadas
            
        Returns:
            WhatsAppCart: Carrinho atualizado
        """
        # Calcular preço total com customizações
        unit_price = item["price"]
        for customization in customizations:
            unit_price += customization.get("price", 0)
        
        # Criar item do carrinho
        cart_item = WhatsAppCartItem(
            id=str(uuid.uuid4()),
            name=item["name"],
            quantity=1,
            unit_price=unit_price,
            total_price=unit_price,
            customizations=customizations
        )
        
        # Verificar se cliente já tem carrinho
        cart = None
        for cart_id, existing_cart in self.carts.items():
            if existing_cart.customer_id == customer_id:
                cart = existing_cart
                break
        
        # Se não tiver carrinho, criar um novo
        if not cart:
            cart_id = str(uuid.uuid4())
            cart = WhatsAppCart(
                id=cart_id,
                customer_id=customer_id,
                items=[],
                subtotal=0,
                total=0
            )
        
        # Adicionar item ao carrinho
        cart.items.append(cart_item)
        
        # Recalcular totais
        cart.subtotal = sum(item.total_price for item in cart.items)
        cart.total = cart.subtotal
        if cart.delivery_fee:
            cart.total += cart.delivery_fee
        cart.total -= cart.discount
        
        # Atualizar data
        cart.updated_at = datetime.now()
        
        # Salvar carrinho
        self.carts[cart.id] = cart
        
        return cart
    
    async def _create_cart_review(self, customer_id: str) -> Dict[str, Any]:
        """
        Cria mensagem de revisão do carrinho.
        
        Args:
            customer_id: ID do cliente
            
        Returns:
            Dict[str, Any]: Mensagem interativa com revisão do carrinho
        """
        # Encontrar carrinho do cliente
        cart = None
        for cart_id, existing_cart in self.carts.items():
            if existing_cart.customer_id == customer_id:
                cart = existing_cart
                break
        
        if not cart or not cart.items:
            # Se não tiver carrinho ou estiver vazio
            return {
                "type": "text",
                "text": "Seu carrinho está vazio. Que tal adicionar alguns itens?"
            }
        
        # Formatar itens do carrinho
        cart_items_text = ""
        for item in cart.items:
            cart_items_text += f"• {item.quantity}x {item.name} - R$ {item.total_price:.2f}\n"
            
            # Adicionar customizações
            for customization in item.customizations:
                cart_items_text += f"  ↳ {customization['customization_name']}: {customization['option_name']}\n"
        
        # Criar botões de ação
        buttons = [
            {
                "type": "reply",
                "reply": {
                    "id": "checkout",
                    "title": "Finalizar pedido"
                }
            },
            {
                "type": "reply",
                "reply": {
                    "id": "continue_shopping",
                    "title": "Continuar comprando"
                }
            },
            {
                "type": "reply",
                "reply": {
                    "id": "clear_cart",
                    "title": "Esvaziar carrinho"
                }
            }
        ]
        
        return {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "header": {
                    "type": "text",
                    "text": "Seu Carrinho"
                },
                "body": {
                    "text": self.message_templates["cart_review"].format(
                        cart_items=cart_items_text,
                        subtotal=cart.subtotal,
                        delivery_fee=cart.delivery_fee or 0,
                        total=cart.total
                    )
                },
                "action": {
                    "buttons": buttons
                }
            }
        }
    
    async def _process_cart_review(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de revisão do carrinho.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Verificar se é uma seleção de botão
        if message.message_type == MessageType.INTERACTIVE:
            button_reply = message.content.get("ButtonReply", {})
            selected_id = button_reply.get("id")
            
            if selected_id == "checkout":
                # Finalizar pedido
                conversation.state = ConversationState.CHECKOUT
                return {
                    "type": "text",
                    "text": self.message_templates["checkout_prompt"]
                }
                
            elif selected_id == "continue_shopping":
                # Continuar comprando
                conversation.state = ConversationState.MENU_BROWSING
                return await self._create_categories_list()
                
            elif selected_id == "clear_cart":
                # Esvaziar carrinho
                await self._clear_cart(customer.id)
                conversation.state = ConversationState.MENU_BROWSING
                return {
                    "type": "text",
                    "text": "Seu carrinho foi esvaziado. Vamos começar de novo?"
                }
        
        # Se não for seleção válida, mostrar carrinho novamente
        return await self._create_cart_review(customer.id)
    
    async def _clear_cart(self, customer_id: str) -> None:
        """
        Esvazia o carrinho do cliente.
        
        Args:
            customer_id: ID do cliente
        """
        # Encontrar carrinho do cliente
        cart_to_remove = None
        for cart_id, cart in self.carts.items():
            if cart.customer_id == customer_id:
                cart_to_remove = cart_id
                break
        
        # Remover carrinho
        if cart_to_remove:
            del self.carts[cart_to_remove]
    
    async def _process_checkout(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de checkout.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip().lower()
        
        # Processar opções
        if message_text == "1" or "delivery" in message_text or "entrega" in message_text:
            # Delivery
            conversation.context["delivery_method"] = "delivery"
            
            # Verificar se já temos endereço
            if customer.address:
                # Confirmar endereço
                conversation.state = ConversationState.PAYMENT
                return {
                    "type": "text",
                    "text": f"Entregaremos no endereço: {customer.address}\n\n{self.message_templates['payment_prompt']}"
                }
            else:
                # Solicitar endereço
                return {
                    "type": "text",
                    "text": self.message_templates["address_prompt"]
                }
                
        elif message_text == "2" or "retirada" in message_text or "local" in message_text:
            # Retirada no local
            conversation.context["delivery_method"] = "pickup"
            conversation.state = ConversationState.PAYMENT
            return {
                "type": "text",
                "text": self.message_templates["payment_prompt"]
            }
        elif "endereço" in message_text or "rua" in message_text:
            # Cliente enviou endereço
            # Em uma implementação real, validaríamos e geocodificaríamos o endereço
            customer.address = message_text
            self.customers[customer.id] = customer
            
            # Atualizar taxa de entrega no carrinho
            for cart_id, cart in self.carts.items():
                if cart.customer_id == customer.id:
                    cart.delivery_fee = 5.00  # Taxa fixa para exemplo
                    cart.total = cart.subtotal + cart.delivery_fee - cart.discount
                    self.carts[cart_id] = cart
                    break
            
            # Avançar para pagamento
            conversation.state = ConversationState.PAYMENT
            return {
                "type": "text",
                "text": self.message_templates["payment_prompt"]
            }
        else:
            # Opção inválida
            return {
                "type": "text",
                "text": self.message_templates["checkout_prompt"]
            }
    
    async def _process_payment(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de pagamento.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip().lower()
        
        # Encontrar carrinho do cliente
        cart = None
        for cart_id, existing_cart in self.carts.items():
            if existing_cart.customer_id == customer.id:
                cart = existing_cart
                break
        
        if not cart:
            # Se não tiver carrinho, voltar para menu
            conversation.state = ConversationState.MENU_BROWSING
            return {
                "type": "text",
                "text": "Seu carrinho está vazio. Vamos começar de novo?"
            }
        
        # Processar opções de pagamento
        payment_method = None
        payment_details = {}
        
        if message_text == "1" or "pix" in message_text:
            # Pagamento via PIX
            payment_method = "pix"
            payment_details = {
                "qr_code": "00020126580014BR.GOV.BCB.PIX0136example.com/pix/v2/cobv/9d36b84fc4c648b884fad7376d97d9",
                "key": "example@email.com"
            }
            
        elif message_text == "2" or "crédito" in message_text or "credito" in message_text:
            # Pagamento com cartão de crédito
            payment_method = "credit_card"
            payment_details = {
                "payment_link": "https://example.com/pay/123456"
            }
            
        elif message_text == "3" or "débito" in message_text or "debito" in message_text:
            # Pagamento com cartão de débito
            payment_method = "debit_card"
            payment_details = {
                "payment_link": "https://example.com/pay/123456"
            }
            
        elif message_text == "4" or "entrega" in message_text:
            # Pagamento na entrega
            payment_method = "cash_on_delivery"
            
        if payment_method:
            # Criar pedido
            order_id = str(uuid.uuid4())
            order = WhatsAppOrder(
                id=order_id,
                cart_id=cart.id,
                customer_id=customer.id,
                status="pending",
                payment_status="pending" if payment_method != "cash_on_delivery" else "pending_delivery",
                payment_method=payment_method,
                payment_details=payment_details,
                delivery_address=customer.address if conversation.context.get("delivery_method") == "delivery" else None
            )
            
            # Salvar pedido
            self.orders[order_id] = order
            
            # Limpar carrinho
            await self._clear_cart(customer.id)
            
            # Enviar confirmação
            conversation.state = ConversationState.FEEDBACK
            
            # Resposta com base no método de pagamento
            if payment_method == "pix":
                # Em uma implementação real, geraria QR code do PIX
                return {
                    "type": "text",
                    "text": f"Pedido #{order_id[:8]} criado!\n\nPara pagar com PIX, use a chave: {payment_details['key']}\n\nAssim que confirmarmos o pagamento, seu pedido será preparado."
                }
                
            elif payment_method in ["credit_card", "debit_card"]:
                # Em uma implementação real, enviaria link de pagamento
                return {
                    "type": "text",
                    "text": f"Pedido #{order_id[:8]} criado!\n\nPara pagar com cartão, acesse o link: {payment_details['payment_link']}\n\nAssim que confirmarmos o pagamento, seu pedido será preparado."
                }
                
            else:  # cash_on_delivery
                # Simulação de confirmação imediata para pagamento na entrega
                order.status = "confirmed"
                self.orders[order_id] = order
                
                return {
                    "type": "text",
                    "text": self.message_templates["order_confirmation"].format(
                        order_id=order_id[:8],
                        status="Confirmado",
                        delivery_time="30-45 minutos"
                    )
                }
        else:
            # Opção inválida
            return {
                "type": "text",
                "text": self.message_templates["payment_prompt"]
            }
    
    async def _process_registration(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de registro.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip()
        
        # Verificar etapa de registro
        registration_step = conversation.context.get("registration_step", "name")
        
        if registration_step == "name":
            # Registrar nome
            customer.name = message_text
            self.customers[customer.id] = customer
            
            # Avançar para próxima etapa
            conversation.context["registration_step"] = "email"
            
            return {
                "type": "text",
                "text": self.message_templates["registration_email"].format(name=customer.name)
            }
            
        elif registration_step == "email":
            # Registrar email
            customer.email = message_text
            customer.is_registered = True
            self.customers[customer.id] = customer
            
            # Concluir registro
            conversation.state = ConversationState.GREETING
            
            return {
                "type": "text",
                "text": self.message_templates["registration_complete"] + "\n\n" + 
                        self.message_templates["greeting"].format(restaurant_name="Restaurante Demo")
            }
        
        # Se chegou aqui, algo deu errado
        conversation.context["registration_step"] = "name"
        return {
            "type": "text",
            "text": self.message_templates["registration_prompt"]
        }
    
    async def _process_order_status(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de status do pedido.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip()
        
        # Verificar se é um ID de pedido
        order_found = False
        for order_id, order in self.orders.items():
            if order.customer_id == customer.id and order_id.startswith(message_text):
                # Encontrou pedido
                order_found = True
                
                # Formatar status
                status_mapping = {
                    "pending": "Pendente",
                    "confirmed": "Confirmado",
                    "preparing": "Em preparação",
                    "ready": "Pronto para entrega",
                    "delivering": "Em entrega",
                    "delivered": "Entregue",
                    "cancelled": "Cancelado"
                }
                
                status_text = status_mapping.get(order.status, order.status)
                
                # Formatar status de pagamento
                payment_status_mapping = {
                    "pending": "Aguardando pagamento",
                    "paid": "Pago",
                    "pending_delivery": "Pagamento na entrega",
                    "refunded": "Reembolsado",
                    "failed": "Falha no pagamento"
                }
                
                payment_status_text = payment_status_mapping.get(order.payment_status, order.payment_status)
                
                # Voltar para saudação
                conversation.state = ConversationState.GREETING
                
                return {
                    "type": "text",
                    "text": f"Pedido #{order_id[:8]}\nStatus: {status_text}\nPagamento: {payment_status_text}\n\nPrecisa de mais alguma coisa?"
                }
        
        if not order_found:
            # Pedido não encontrado
            return {
                "type": "text",
                "text": f"Desculpe, não encontramos nenhum pedido com o número {message_text}. Por favor, verifique o número e tente novamente."
            }
    
    async def _process_support(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de suporte.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip().lower()
        
        # Verificar se já temos assunto do ticket
        if "ticket_subject" in conversation.context:
            # Criar ticket com a descrição
            ticket_id = str(uuid.uuid4())
            ticket = WhatsAppSupportTicket(
                id=ticket_id,
                customer_id=customer.id,
                conversation_id=conversation.id,
                subject=conversation.context["ticket_subject"],
                description=message_text
            )
            
            # Salvar ticket
            self.support_tickets[ticket_id] = ticket
            
            # Voltar para saudação
            conversation.state = ConversationState.GREETING
            
            return {
                "type": "text",
                "text": self.message_templates["ticket_created"].format(ticket_id=ticket_id[:8])
            }
        
        # Processar opções
        if message_text == "1" or "problema" in message_text or "pedido" in message_text:
            # Problema com pedido
            conversation.context["ticket_subject"] = "Problema com pedido"
            return {
                "type": "text",
                "text": "Por favor, descreva o problema com seu pedido:"
            }
            
        elif message_text == "2" or "dúvida" in message_text or "duvida" in message_text or "cardápio" in message_text or "cardapio" in message_text:
            # Dúvidas sobre cardápio
            conversation.context["ticket_subject"] = "Dúvidas sobre cardápio"
            return {
                "type": "text",
                "text": "Por favor, descreva sua dúvida sobre o cardápio:"
            }
            
        elif message_text == "3" or "horário" in message_text or "horario" in message_text or "funcionamento" in message_text:
            # Horários de funcionamento
            conversation.state = ConversationState.GREETING
            return {
                "type": "text",
                "text": "Nosso horário de funcionamento é:\nSegunda a Sexta: 11h às 23h\nSábado e Domingo: 11h às 00h\n\nPrecisa de mais alguma coisa?"
            }
            
        elif message_text == "4" or "outro" in message_text:
            # Outros assuntos
            conversation.context["ticket_subject"] = "Outros assuntos"
            return {
                "type": "text",
                "text": "Por favor, descreva como podemos ajudar:"
            }
            
        else:
            # Opção inválida
            return {
                "type": "text",
                "text": self.message_templates["support_prompt"]
            }
    
    async def _process_feedback(
        self, 
        message: WhatsAppMessage, 
        customer: WhatsAppCustomer, 
        conversation: WhatsAppConversation
    ) -> Dict[str, Any]:
        """
        Processa mensagem no estado de feedback.
        
        Args:
            message: Mensagem recebida
            customer: Cliente
            conversation: Conversação
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Extrair texto da mensagem
        message_text = message.content.get("text", "").strip()
        
        # Verificar etapa de feedback
        feedback_step = conversation.context.get("feedback_step", "rating")
        
        if feedback_step == "rating":
            # Registrar avaliação
            rating = 0
            if "⭐⭐⭐⭐⭐" in message_text:
                rating = 5
            elif "⭐⭐⭐⭐" in message_text:
                rating = 4
            elif "⭐⭐⭐" in message_text:
                rating = 3
            elif "⭐⭐" in message_text:
                rating = 2
            elif "⭐" in message_text:
                rating = 1
            
            # Armazenar avaliação no contexto
            conversation.context["feedback_rating"] = rating
            conversation.context["feedback_step"] = "comment"
            
            return {
                "type": "text",
                "text": self.message_templates["feedback_comment"]
            }
            
        elif feedback_step == "comment":
            # Registrar comentário
            conversation.context["feedback_comment"] = message_text
            
            # Em uma implementação real, salvaríamos o feedback no banco de dados
            
            # Voltar para saudação
            conversation.state = ConversationState.GREETING
            
            return {
                "type": "text",
                "text": self.message_templates["feedback_thanks"] + "\n\n" + 
                        self.message_templates["greeting"].format(restaurant_name="Restaurante Demo")
            }
        
        # Se chegou aqui, algo deu errado
        conversation.state = ConversationState.GREETING
        return {
            "type": "text",
            "text": self.message_templates["greeting"].format(restaurant_name="Restaurante Demo")
        }
    
    async def handle_webhook(self, request: Request) -> Dict[str, Any]:
        """
        Manipula webhook do Twilio.
        
        Args:
            request: Requisição HTTP
            
        Returns:
            Dict[str, Any]: Resposta para o webhook
        """
        try:
            # Extrair dados do formulário
            form_data = await request.form()
            message_data = dict(form_data)
            
            # Processar mensagem
            response = await self.process_incoming_message(message_data)
            
            # Em uma implementação real, enviaríamos a resposta via API do Twilio
            # Exemplo:
            # from twilio.rest import Client
            # client = Client(self.twilio_config["account_sid"], self.twilio_config["auth_token"])
            # message = client.messages.create(
            #     from_=f"whatsapp:{self.twilio_config['whatsapp_number']}",
            #     body=response.get("text", ""),
            #     to=f"whatsapp:{message_data.get('From', '').replace('whatsapp:', '')}"
            # )
            
            # Para fins de simulação, apenas logamos a resposta
            logger.info(f"Resposta para {message_data.get('From', '')}: {json.dumps(response)}")
            
            return {"status": "success", "message": "Webhook processed successfully"}
            
        except Exception as e:
            logger.error(f"Erro ao processar webhook: {str(e)}", exc_info=True)
            return {"status": "error", "message": str(e)}
