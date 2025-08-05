"""
Módulo de serviço de chatbot para Facebook Messenger.

Este módulo implementa o serviço de chatbot para Facebook Messenger,
processando mensagens recebidas e gerando respostas apropriadas.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime

from ...core.messaging import BaseChatbotService, MessageType, ConversationState, PlatformType

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class MessengerChatbotService(BaseChatbotService):
    """Classe para serviço de chatbot do Facebook Messenger."""
    
    def __init__(self):
        """Inicializa o serviço de chatbot do Messenger."""
        super().__init__(platform_type=PlatformType.MESSENGER)
        logger.info("Serviço de chatbot do Messenger inicializado")
    
    async def process_incoming_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem recebida.
        
        Args:
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        try:
            # Extrair dados da mensagem
            message_type = message_data.get("type", "unknown")
            from_id = message_data.get("from_id", "")
            text = message_data.get("text", "")
            
            # Adicionar mensagem ao histórico da conversa
            await self.add_message_to_conversation(from_id, {
                "role": "user",
                "content": text,
                "type": message_type
            })
            
            # Obter estado atual da conversa
            conversation = await self.get_or_create_conversation(from_id)
            current_state = conversation.get("state", ConversationState.INITIAL)
            
            # Processar mensagem com base no estado atual
            if current_state == ConversationState.INITIAL:
                return await self._handle_initial_state(from_id, message_data)
            
            elif current_state == ConversationState.MENU_BROWSING:
                return await self._handle_menu_browsing(from_id, message_data)
            
            elif current_state == ConversationState.ITEM_SELECTION:
                return await self._handle_item_selection(from_id, message_data)
            
            elif current_state == ConversationState.CART_REVIEW:
                return await self._handle_cart_review(from_id, message_data)
            
            elif current_state == ConversationState.CHECKOUT:
                return await self._handle_checkout(from_id, message_data)
            
            elif current_state == ConversationState.PAYMENT:
                return await self._handle_payment(from_id, message_data)
            
            elif current_state == ConversationState.ORDER_TRACKING:
                return await self._handle_order_tracking(from_id, message_data)
            
            elif current_state == ConversationState.FEEDBACK:
                return await self._handle_feedback(from_id, message_data)
            
            elif current_state == ConversationState.SUPPORT:
                return await self._handle_support(from_id, message_data)
            
            else:
                # Estado desconhecido, voltar para o inicial
                await self.update_conversation_state(from_id, ConversationState.INITIAL)
                return {
                    "type": MessageType.TEXT,
                    "text": "Desculpe, ocorreu um erro. Vamos começar novamente. Como posso ajudar?",
                    "action": "reset_conversation"
                }
                
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {str(e)}", exc_info=True)
            return {
                "type": MessageType.TEXT,
                "text": "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde."
            }
    
    async def _handle_initial_state(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem no estado inicial.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        message_type = message_data.get("type", "unknown")
        text = message_data.get("text", "").lower()
        
        # Verificar se é uma saudação ou pedido de menu
        if any(greeting in text for greeting in ["olá", "ola", "oi", "bom dia", "boa tarde", "boa noite", "hello", "hi"]):
            # Responder com saudação e opções iniciais
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Olá! Bem-vindo ao nosso restaurante. Como posso ajudar?"
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Olá! Bem-vindo ao nosso restaurante. Como posso ajudar?",
                "options": [
                    {"id": "menu", "title": "Ver Cardápio"},
                    {"id": "order", "title": "Fazer Pedido"},
                    {"id": "status", "title": "Status do Pedido"}
                ]
            }
        
        elif any(menu_word in text for menu_word in ["cardápio", "cardapio", "menu", "opções", "opcoes", "comida"]):
            # Atualizar estado para navegação do cardápio
            await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
            
            # Responder com categorias do cardápio
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Aqui está nosso cardápio. Escolha uma categoria:"
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Aqui está nosso cardápio. Escolha uma categoria:",
                "options": [
                    {"id": "category_entradas", "title": "Entradas"},
                    {"id": "category_principais", "title": "Pratos Principais"},
                    {"id": "category_sobremesas", "title": "Sobremesas"},
                    {"id": "category_bebidas", "title": "Bebidas"}
                ]
            }
        
        elif any(order_word in text for order_word in ["pedido", "pedir", "comprar", "quero", "gostaria"]):
            # Atualizar estado para navegação do cardápio
            await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
            
            # Responder com categorias do cardápio
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Claro! Vamos fazer seu pedido. Escolha uma categoria do cardápio:"
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Claro! Vamos fazer seu pedido. Escolha uma categoria do cardápio:",
                "options": [
                    {"id": "category_entradas", "title": "Entradas"},
                    {"id": "category_principais", "title": "Pratos Principais"},
                    {"id": "category_sobremesas", "title": "Sobremesas"},
                    {"id": "category_bebidas", "title": "Bebidas"}
                ]
            }
        
        elif any(status_word in text for status_word in ["status", "acompanhar", "onde", "pedido"]):
            # Atualizar estado para acompanhamento de pedido
            await self.update_conversation_state(user_id, ConversationState.ORDER_TRACKING)
            
            # Responder solicitando número do pedido
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Para verificar o status do seu pedido, preciso do número do pedido."
            })
            
            return {
                "type": MessageType.TEXT,
                "text": "Para verificar o status do seu pedido, por favor, informe o número do pedido."
            }
        
        else:
            # Mensagem não reconhecida, oferecer opções
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Como posso ajudar hoje?"
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Como posso ajudar hoje?",
                "options": [
                    {"id": "menu", "title": "Ver Cardápio"},
                    {"id": "order", "title": "Fazer Pedido"},
                    {"id": "status", "title": "Status do Pedido"}
                ]
            }
    
    async def _handle_menu_browsing(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante navegação do cardápio.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        message_type = message_data.get("type", "unknown")
        
        # Verificar se é um postback ou quick reply
        if message_type in ["postback", "quick_reply"]:
            payload = message_data.get("payload", "")
            
            # Verificar se é seleção de categoria
            if payload.startswith("category_"):
                category = payload.replace("category_", "")
                
                # Atualizar contexto com categoria selecionada
                await self.update_conversation_context(user_id, {"selected_category": category})
                
                # Simular itens do cardápio para a categoria selecionada
                items = self._get_menu_items_for_category(category)
                
                # Preparar elementos para template genérico (carrossel)
                elements = []
                for item in items:
                    elements.append({
                        "title": item["name"],
                        "subtitle": f"{item['description']}\nPreço: R$ {item['price']:.2f}",
                        "image_url": item["image_url"],
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Adicionar ao Pedido",
                                "payload": f"add_item_{item['id']}"
                            },
                            {
                                "type": "postback",
                                "title": "Ver Detalhes",
                                "payload": f"view_item_{item['id']}"
                            }
                        ]
                    })
                
                # Responder com itens da categoria
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": f"Aqui estão os itens da categoria {category}:"
                })
                
                return {
                    "type": "generic_template",
                    "elements": elements
                }
            
            # Verificar se é adição de item ao carrinho
            elif payload.startswith("add_item_"):
                item_id = payload.replace("add_item_", "")
                
                # Obter detalhes do item
                item = self._get_item_by_id(item_id)
                
                if item:
                    # Adicionar item ao carrinho
                    await self.add_to_cart(user_id, {
                        "id": item["id"],
                        "name": item["name"],
                        "price": item["price"],
                        "quantity": 1
                    })
                    
                    # Obter carrinho atualizado
                    cart = await self.get_cart(user_id)
                    
                    # Responder confirmando adição
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": f"{item['name']} adicionado ao seu pedido!"
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": f"{item['name']} adicionado ao seu pedido! Seu carrinho tem {len(cart)} item(s). O que deseja fazer agora?",
                        "options": [
                            {"id": "continue_shopping", "title": "Continuar Comprando"},
                            {"id": "view_cart", "title": "Ver Carrinho"},
                            {"id": "checkout", "title": "Finalizar Pedido"}
                        ]
                    }
                else:
                    # Item não encontrado
                    return {
                        "type": MessageType.TEXT,
                        "text": "Desculpe, não consegui encontrar este item. Por favor, tente novamente."
                    }
            
            # Verificar se é visualização de detalhes do item
            elif payload.startswith("view_item_"):
                item_id = payload.replace("view_item_", "")
                
                # Obter detalhes do item
                item = self._get_item_by_id(item_id)
                
                if item:
                    # Atualizar estado para seleção de item
                    await self.update_conversation_state(user_id, ConversationState.ITEM_SELECTION)
                    
                    # Atualizar contexto com item selecionado
                    await self.update_conversation_context(user_id, {"selected_item": item})
                    
                    # Responder com detalhes do item
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": f"Detalhes do item: {item['name']}\n{item['description']}\nPreço: R$ {item['price']:.2f}"
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": f"**{item['name']}**\n\n{item['description']}\n\nPreço: R$ {item['price']:.2f}",
                        "options": [
                            {"id": f"add_item_{item['id']}", "title": "Adicionar ao Pedido"},
                            {"id": "back_to_menu", "title": "Voltar ao Cardápio"}
                        ]
                    }
                else:
                    # Item não encontrado
                    return {
                        "type": MessageType.TEXT,
                        "text": "Desculpe, não consegui encontrar este item. Por favor, tente novamente."
                    }
            
            # Verificar se é continuar comprando
            elif payload == "continue_shopping":
                # Responder com categorias do cardápio
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Escolha uma categoria do cardápio:",
                    "options": [
                        {"id": "category_entradas", "title": "Entradas"},
                        {"id": "category_principais", "title": "Pratos Principais"},
                        {"id": "category_sobremesas", "title": "Sobremesas"},
                        {"id": "category_bebidas", "title": "Bebidas"}
                    ]
                }
            
            # Verificar se é visualização do carrinho
            elif payload == "view_cart":
                # Atualizar estado para revisão do carrinho
                await self.update_conversation_state(user_id, ConversationState.CART_REVIEW)
                
                # Obter carrinho
                cart = await self.get_cart(user_id)
                
                if cart:
                    # Calcular total
                    total = sum(item["price"] * item["quantity"] for item in cart)
                    
                    # Preparar mensagem do carrinho
                    cart_text = "Seu Carrinho:\n\n"
                    for i, item in enumerate(cart, 1):
                        cart_text += f"{i}. {item['name']} x{item['quantity']} - R$ {item['price'] * item['quantity']:.2f}\n"
                    
                    cart_text += f"\nTotal: R$ {total:.2f}"
                    
                    # Responder com detalhes do carrinho
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": cart_text
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": cart_text,
                        "options": [
                            {"id": "checkout", "title": "Finalizar Pedido"},
                            {"id": "continue_shopping", "title": "Continuar Comprando"},
                            {"id": "clear_cart", "title": "Limpar Carrinho"}
                        ]
                    }
                else:
                    # Carrinho vazio
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": "Seu carrinho está vazio."
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "Seu carrinho está vazio. Deseja ver o cardápio?",
                        "options": [
                            {"id": "continue_shopping", "title": "Ver Cardápio"}
                        ]
                    }
            
            # Verificar se é finalização de pedido
            elif payload == "checkout":
                # Atualizar estado para checkout
                await self.update_conversation_state(user_id, ConversationState.CHECKOUT)
                
                # Obter carrinho
                cart = await self.get_cart(user_id)
                
                if cart:
                    # Responder solicitando informações de entrega
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": "Para finalizar seu pedido, preciso de algumas informações."
                    })
                    
                    return {
                        "type": MessageType.TEXT,
                        "text": "Para finalizar seu pedido, por favor, informe seu nome completo."
                    }
                else:
                    # Carrinho vazio
                    await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                    
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": "Seu carrinho está vazio. Não é possível finalizar o pedido."
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "Seu carrinho está vazio. Não é possível finalizar o pedido. Deseja ver o cardápio?",
                        "options": [
                            {"id": "continue_shopping", "title": "Ver Cardápio"}
                        ]
                    }
        
        # Mensagem de texto durante navegação do cardápio
        else:
            text = message_data.get("text", "").lower()
            
            # Verificar se é pedido para ver o carrinho
            if any(cart_word in text for cart_word in ["carrinho", "pedido", "itens", "compras"]):
                # Simular clique no botão de ver carrinho
                return await self._handle_menu_browsing(user_id, {
                    "type": "postback",
                    "payload": "view_cart"
                })
            
            # Verificar se é pedido para finalizar compra
            elif any(checkout_word in text for checkout_word in ["finalizar", "checkout", "pagar", "concluir"]):
                # Simular clique no botão de finalizar pedido
                return await self._handle_menu_browsing(user_id, {
                    "type": "postback",
                    "payload": "checkout"
                })
            
            # Verificar se é pedido para voltar ao cardápio
            elif any(menu_word in text for menu_word in ["cardápio", "cardapio", "menu", "voltar"]):
                # Simular clique no botão de continuar comprando
                return await self._handle_menu_browsing(user_id, {
                    "type": "postback",
                    "payload": "continue_shopping"
                })
            
            # Mensagem não reconhecida
            else:
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Desculpe, não entendi. O que você gostaria de fazer?",
                    "options": [
                        {"id": "continue_shopping", "title": "Ver Cardápio"},
                        {"id": "view_cart", "title": "Ver Carrinho"},
                        {"id": "checkout", "title": "Finalizar Pedido"}
                    ]
                }
    
    async def _handle_item_selection(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante seleção de item.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        message_type = message_data.get("type", "unknown")
        
        # Verificar se é um postback ou quick reply
        if message_type in ["postback", "quick_reply"]:
            payload = message_data.get("payload", "")
            
            # Verificar se é adição de item ao carrinho
            if payload.startswith("add_item_"):
                # Simular clique no botão de adicionar item no estado de navegação do cardápio
                await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                return await self._handle_menu_browsing(user_id, message_data)
            
            # Verificar se é voltar ao cardápio
            elif payload == "back_to_menu":
                # Atualizar estado para navegação do cardápio
                await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                
                # Responder com categorias do cardápio
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Escolha uma categoria do cardápio:"
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Escolha uma categoria do cardápio:",
                    "options": [
                        {"id": "category_entradas", "title": "Entradas"},
                        {"id": "category_principais", "title": "Pratos Principais"},
                        {"id": "category_sobremesas", "title": "Sobremesas"},
                        {"id": "category_bebidas", "title": "Bebidas"}
                    ]
                }
        
        # Mensagem de texto durante seleção de item
        else:
            # Voltar para navegação do cardápio
            await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
            
            # Responder com categorias do cardápio
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Escolha uma categoria do cardápio:"
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Escolha uma categoria do cardápio:",
                "options": [
                    {"id": "category_entradas", "title": "Entradas"},
                    {"id": "category_principais", "title": "Pratos Principais"},
                    {"id": "category_sobremesas", "title": "Sobremesas"},
                    {"id": "category_bebidas", "title": "Bebidas"}
                ]
            }
    
    async def _handle_cart_review(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante revisão do carrinho.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        message_type = message_data.get("type", "unknown")
        
        # Verificar se é um postback ou quick reply
        if message_type in ["postback", "quick_reply"]:
            payload = message_data.get("payload", "")
            
            # Verificar se é finalização de pedido
            if payload == "checkout":
                # Atualizar estado para checkout
                await self.update_conversation_state(user_id, ConversationState.CHECKOUT)
                
                # Responder solicitando informações de entrega
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Para finalizar seu pedido, preciso de algumas informações."
                })
                
                return {
                    "type": MessageType.TEXT,
                    "text": "Para finalizar seu pedido, por favor, informe seu nome completo."
                }
            
            # Verificar se é continuar comprando
            elif payload == "continue_shopping":
                # Atualizar estado para navegação do cardápio
                await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                
                # Responder com categorias do cardápio
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Escolha uma categoria do cardápio:"
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Escolha uma categoria do cardápio:",
                    "options": [
                        {"id": "category_entradas", "title": "Entradas"},
                        {"id": "category_principais", "title": "Pratos Principais"},
                        {"id": "category_sobremesas", "title": "Sobremesas"},
                        {"id": "category_bebidas", "title": "Bebidas"}
                    ]
                }
            
            # Verificar se é limpar carrinho
            elif payload == "clear_cart":
                # Limpar carrinho
                await self.clear_cart(user_id)
                
                # Atualizar estado para navegação do cardápio
                await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                
                # Responder confirmando limpeza
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Seu carrinho foi limpo."
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Seu carrinho foi limpo. Deseja ver o cardápio?",
                    "options": [
                        {"id": "continue_shopping", "title": "Ver Cardápio"}
                    ]
                }
        
        # Mensagem de texto durante revisão do carrinho
        else:
            text = message_data.get("text", "").lower()
            
            # Verificar se é pedido para finalizar compra
            if any(checkout_word in text for checkout_word in ["finalizar", "checkout", "pagar", "concluir"]):
                # Simular clique no botão de finalizar pedido
                return await self._handle_cart_review(user_id, {
                    "type": "postback",
                    "payload": "checkout"
                })
            
            # Verificar se é pedido para voltar ao cardápio
            elif any(menu_word in text for menu_word in ["cardápio", "cardapio", "menu", "voltar", "continuar"]):
                # Simular clique no botão de continuar comprando
                return await self._handle_cart_review(user_id, {
                    "type": "postback",
                    "payload": "continue_shopping"
                })
            
            # Verificar se é pedido para limpar carrinho
            elif any(clear_word in text for clear_word in ["limpar", "esvaziar", "remover", "cancelar"]):
                # Simular clique no botão de limpar carrinho
                return await self._handle_cart_review(user_id, {
                    "type": "postback",
                    "payload": "clear_cart"
                })
            
            # Mensagem não reconhecida
            else:
                # Obter carrinho
                cart = await self.get_cart(user_id)
                
                if cart:
                    # Calcular total
                    total = sum(item["price"] * item["quantity"] for item in cart)
                    
                    # Preparar mensagem do carrinho
                    cart_text = "Seu Carrinho:\n\n"
                    for i, item in enumerate(cart, 1):
                        cart_text += f"{i}. {item['name']} x{item['quantity']} - R$ {item['price'] * item['quantity']:.2f}\n"
                    
                    cart_text += f"\nTotal: R$ {total:.2f}"
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": f"{cart_text}\n\nO que deseja fazer?",
                        "options": [
                            {"id": "checkout", "title": "Finalizar Pedido"},
                            {"id": "continue_shopping", "title": "Continuar Comprando"},
                            {"id": "clear_cart", "title": "Limpar Carrinho"}
                        ]
                    }
                else:
                    # Carrinho vazio
                    await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "Seu carrinho está vazio. Deseja ver o cardápio?",
                        "options": [
                            {"id": "continue_shopping", "title": "Ver Cardápio"}
                        ]
                    }
    
    async def _handle_checkout(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante checkout.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Obter contexto atual
        context = await self.get_conversation_context(user_id)
        
        # Verificar em qual etapa do checkout estamos
        checkout_step = context.get("checkout_step", "name")
        
        # Processar mensagem com base na etapa atual
        if checkout_step == "name":
            # Salvar nome
            name = message_data.get("text", "")
            await self.update_conversation_context(user_id, {
                "customer_name": name,
                "checkout_step": "phone"
            })
            
            # Solicitar telefone
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": f"Obrigado, {name}. Agora, por favor, informe seu telefone com DDD."
            })
            
            return {
                "type": MessageType.TEXT,
                "text": f"Obrigado, {name}. Agora, por favor, informe seu telefone com DDD."
            }
        
        elif checkout_step == "phone":
            # Salvar telefone
            phone = message_data.get("text", "")
            await self.update_conversation_context(user_id, {
                "customer_phone": phone,
                "checkout_step": "address"
            })
            
            # Solicitar endereço
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Ótimo! Agora, por favor, informe seu endereço completo para entrega."
            })
            
            return {
                "type": MessageType.TEXT,
                "text": "Ótimo! Agora, por favor, informe seu endereço completo para entrega."
            }
        
        elif checkout_step == "address":
            # Salvar endereço
            address = message_data.get("text", "")
            await self.update_conversation_context(user_id, {
                "customer_address": address,
                "checkout_step": "payment_method"
            })
            
            # Solicitar método de pagamento
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Perfeito! Como você deseja pagar?"
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Perfeito! Como você deseja pagar?",
                "options": [
                    {"id": "payment_pix", "title": "PIX"},
                    {"id": "payment_credit", "title": "Cartão de Crédito"},
                    {"id": "payment_cash", "title": "Dinheiro na Entrega"}
                ]
            }
        
        elif checkout_step == "payment_method":
            # Verificar se é um postback ou quick reply
            if message_data.get("type") in ["postback", "quick_reply"]:
                payload = message_data.get("payload", "")
                
                if payload.startswith("payment_"):
                    # Salvar método de pagamento
                    payment_method = payload.replace("payment_", "")
                    await self.update_conversation_context(user_id, {
                        "payment_method": payment_method,
                        "checkout_step": "confirmation"
                    })
                    
                    # Obter dados do cliente e carrinho
                    context = await self.get_conversation_context(user_id)
                    cart = await self.get_cart(user_id)
                    total = sum(item["price"] * item["quantity"] for item in cart)
                    
                    # Preparar resumo do pedido
                    order_summary = "Resumo do Pedido:\n\n"
                    for i, item in enumerate(cart, 1):
                        order_summary += f"{i}. {item['name']} x{item['quantity']} - R$ {item['price'] * item['quantity']:.2f}\n"
                    
                    order_summary += f"\nTotal: R$ {total:.2f}\n\n"
                    order_summary += f"Nome: {context.get('customer_name')}\n"
                    order_summary += f"Telefone: {context.get('customer_phone')}\n"
                    order_summary += f"Endereço: {context.get('customer_address')}\n"
                    order_summary += f"Pagamento: {self._get_payment_method_name(payment_method)}"
                    
                    # Responder com resumo do pedido
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": order_summary
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": f"{order_summary}\n\nConfirma o pedido?",
                        "options": [
                            {"id": "confirm_order", "title": "Confirmar Pedido"},
                            {"id": "cancel_order", "title": "Cancelar"}
                        ]
                    }
            
            # Mensagem de texto durante seleção de método de pagamento
            else:
                text = message_data.get("text", "").lower()
                
                # Tentar identificar método de pagamento
                if "pix" in text:
                    payment_method = "pix"
                elif any(credit_word in text for credit_word in ["crédito", "credito", "cartão", "cartao"]):
                    payment_method = "credit"
                elif any(cash_word in text for cash_word in ["dinheiro", "espécie", "especie"]):
                    payment_method = "cash"
                else:
                    # Método não reconhecido
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "Por favor, escolha uma das opções de pagamento:",
                        "options": [
                            {"id": "payment_pix", "title": "PIX"},
                            {"id": "payment_credit", "title": "Cartão de Crédito"},
                            {"id": "payment_cash", "title": "Dinheiro na Entrega"}
                        ]
                    }
                
                # Simular clique no botão de método de pagamento
                return await self._handle_checkout(user_id, {
                    "type": "postback",
                    "payload": f"payment_{payment_method}"
                })
        
        elif checkout_step == "confirmation":
            # Verificar se é um postback ou quick reply
            if message_data.get("type") in ["postback", "quick_reply"]:
                payload = message_data.get("payload", "")
                
                if payload == "confirm_order":
                    # Gerar número do pedido
                    order_id = f"FB{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    
                    # Salvar número do pedido
                    await self.update_conversation_context(user_id, {
                        "order_id": order_id
                    })
                    
                    # Atualizar estado para pagamento
                    await self.update_conversation_state(user_id, ConversationState.PAYMENT)
                    
                    # Obter método de pagamento
                    context = await self.get_conversation_context(user_id)
                    payment_method = context.get("payment_method")
                    
                    # Processar pagamento com base no método
                    if payment_method == "pix":
                        # Simular geração de código PIX
                        pix_code = "00020126580014BR.GOV.BCB.PIX0136a629532e-7693-4846-b028-f142a1dd04b5520400005303986540510.005802BR5913Restaurante XYZ6008Sao Paulo62070503***63041D14"
                        
                        # Salvar código PIX
                        await self.update_conversation_context(user_id, {
                            "pix_code": pix_code
                        })
                        
                        # Responder com código PIX
                        await self.add_message_to_conversation(user_id, {
                            "role": "assistant",
                            "content": f"Pedido #{order_id} confirmado! Utilize o código PIX abaixo para pagamento:"
                        })
                        
                        return {
                            "type": MessageType.TEXT,
                            "text": f"Pedido #{order_id} confirmado! Utilize o código PIX abaixo para pagamento:\n\n{pix_code}\n\nAssim que recebermos a confirmação do pagamento, seu pedido será preparado. Você receberá atualizações sobre o status do pedido.",
                            "action": "create_order",
                            "order_id": order_id
                        }
                    
                    elif payment_method == "credit":
                        # Responder com link de pagamento
                        payment_link = f"https://restaurante.com.br/pagamento/{order_id}"
                        
                        # Salvar link de pagamento
                        await self.update_conversation_context(user_id, {
                            "payment_link": payment_link
                        })
                        
                        # Responder com link de pagamento
                        await self.add_message_to_conversation(user_id, {
                            "role": "assistant",
                            "content": f"Pedido #{order_id} confirmado! Utilize o link abaixo para pagamento com cartão de crédito:"
                        })
                        
                        return {
                            "type": MessageType.TEXT,
                            "text": f"Pedido #{order_id} confirmado! Utilize o link abaixo para pagamento com cartão de crédito:\n\n{payment_link}\n\nAssim que recebermos a confirmação do pagamento, seu pedido será preparado. Você receberá atualizações sobre o status do pedido.",
                            "action": "create_order",
                            "order_id": order_id
                        }
                    
                    else:  # cash
                        # Responder confirmando pedido
                        await self.add_message_to_conversation(user_id, {
                            "role": "assistant",
                            "content": f"Pedido #{order_id} confirmado! Você optou por pagar em dinheiro na entrega."
                        })
                        
                        return {
                            "type": MessageType.TEXT,
                            "text": f"Pedido #{order_id} confirmado! Você optou por pagar em dinheiro na entrega.\n\nSeu pedido será preparado e você receberá atualizações sobre o status.",
                            "action": "create_order",
                            "order_id": order_id
                        }
                
                elif payload == "cancel_order":
                    # Limpar carrinho
                    await self.clear_cart(user_id)
                    
                    # Atualizar estado para inicial
                    await self.update_conversation_state(user_id, ConversationState.INITIAL)
                    
                    # Responder confirmando cancelamento
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": "Pedido cancelado. Como posso ajudar?"
                    })
                    
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "Pedido cancelado. Como posso ajudar?",
                        "options": [
                            {"id": "menu", "title": "Ver Cardápio"},
                            {"id": "order", "title": "Fazer Pedido"},
                            {"id": "status", "title": "Status do Pedido"}
                        ]
                    }
            
            # Mensagem de texto durante confirmação
            else:
                text = message_data.get("text", "").lower()
                
                # Verificar se é confirmação
                if any(confirm_word in text for confirm_word in ["confirmar", "sim", "ok", "confirmo"]):
                    # Simular clique no botão de confirmar pedido
                    return await self._handle_checkout(user_id, {
                        "type": "postback",
                        "payload": "confirm_order"
                    })
                
                # Verificar se é cancelamento
                elif any(cancel_word in text for cancel_word in ["cancelar", "não", "nao", "cancela"]):
                    # Simular clique no botão de cancelar pedido
                    return await self._handle_checkout(user_id, {
                        "type": "postback",
                        "payload": "cancel_order"
                    })
                
                # Mensagem não reconhecida
                else:
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "Por favor, confirme ou cancele o pedido:",
                        "options": [
                            {"id": "confirm_order", "title": "Confirmar Pedido"},
                            {"id": "cancel_order", "title": "Cancelar"}
                        ]
                    }
    
    async def _handle_payment(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante pagamento.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Obter contexto atual
        context = await self.get_conversation_context(user_id)
        order_id = context.get("order_id")
        
        # Atualizar estado para acompanhamento de pedido
        await self.update_conversation_state(user_id, ConversationState.ORDER_TRACKING)
        
        # Responder com status do pedido
        await self.add_message_to_conversation(user_id, {
            "role": "assistant",
            "content": f"Seu pedido #{order_id} foi recebido e está sendo processado."
        })
        
        return {
            "type": MessageType.INTERACTIVE_BUTTONS,
            "body": f"Seu pedido #{order_id} foi recebido e está sendo processado. Você receberá atualizações sobre o status do pedido.",
            "options": [
                {"id": f"track_order_{order_id}", "title": "Acompanhar Pedido"},
                {"id": "new_order", "title": "Fazer Novo Pedido"}
            ]
        }
    
    async def _handle_order_tracking(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante acompanhamento de pedido.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Verificar se é um postback ou quick reply
        if message_data.get("type") in ["postback", "quick_reply"]:
            payload = message_data.get("payload", "")
            
            # Verificar se é acompanhamento de pedido
            if payload.startswith("track_order_"):
                order_id = payload.replace("track_order_", "")
                
                # Simular status do pedido
                status = "em preparo"
                estimated_time = "30 minutos"
                
                # Responder com status do pedido
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": f"Seu pedido #{order_id} está {status}. Tempo estimado de entrega: {estimated_time}."
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": f"Seu pedido #{order_id} está {status}. Tempo estimado de entrega: {estimated_time}.",
                    "options": [
                        {"id": "new_order", "title": "Fazer Novo Pedido"},
                        {"id": "support", "title": "Falar com Atendente"}
                    ]
                }
            
            # Verificar se é novo pedido
            elif payload == "new_order":
                # Limpar carrinho
                await self.clear_cart(user_id)
                
                # Atualizar estado para navegação do cardápio
                await self.update_conversation_state(user_id, ConversationState.MENU_BROWSING)
                
                # Responder com categorias do cardápio
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Vamos fazer um novo pedido! Escolha uma categoria do cardápio:"
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Vamos fazer um novo pedido! Escolha uma categoria do cardápio:",
                    "options": [
                        {"id": "category_entradas", "title": "Entradas"},
                        {"id": "category_principais", "title": "Pratos Principais"},
                        {"id": "category_sobremesas", "title": "Sobremesas"},
                        {"id": "category_bebidas", "title": "Bebidas"}
                    ]
                }
            
            # Verificar se é suporte
            elif payload == "support":
                # Atualizar estado para suporte
                await self.update_conversation_state(user_id, ConversationState.SUPPORT)
                
                # Responder informando sobre atendente
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Você será atendido por um de nossos atendentes em instantes."
                })
                
                return {
                    "type": MessageType.TEXT,
                    "text": "Você será atendido por um de nossos atendentes em instantes. Por favor, descreva sua dúvida ou problema.",
                    "action": "request_human_agent"
                }
        
        # Mensagem de texto durante acompanhamento de pedido
        else:
            text = message_data.get("text", "").lower()
            
            # Verificar se é pedido de status
            if any(status_word in text for status_word in ["status", "acompanhar", "onde", "pedido"]):
                # Obter contexto atual
                context = await self.get_conversation_context(user_id)
                order_id = context.get("order_id")
                
                if order_id:
                    # Simular clique no botão de acompanhar pedido
                    return await self._handle_order_tracking(user_id, {
                        "type": "postback",
                        "payload": f"track_order_{order_id}"
                    })
                else:
                    # Solicitar número do pedido
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": "Para verificar o status do seu pedido, preciso do número do pedido."
                    })
                    
                    return {
                        "type": MessageType.TEXT,
                        "text": "Para verificar o status do seu pedido, por favor, informe o número do pedido."
                    }
            
            # Verificar se é número de pedido
            elif text.startswith("FB") or text.startswith("#"):
                # Extrair número do pedido
                order_id = text.replace("#", "")
                
                # Salvar número do pedido
                await self.update_conversation_context(user_id, {
                    "order_id": order_id
                })
                
                # Simular clique no botão de acompanhar pedido
                return await self._handle_order_tracking(user_id, {
                    "type": "postback",
                    "payload": f"track_order_{order_id}"
                })
            
            # Verificar se é pedido de novo pedido
            elif any(new_order_word in text for new_order_word in ["novo", "outro", "mais", "adicional"]):
                # Simular clique no botão de novo pedido
                return await self._handle_order_tracking(user_id, {
                    "type": "postback",
                    "payload": "new_order"
                })
            
            # Verificar se é pedido de suporte
            elif any(support_word in text for support_word in ["suporte", "ajuda", "atendente", "humano"]):
                # Simular clique no botão de suporte
                return await self._handle_order_tracking(user_id, {
                    "type": "postback",
                    "payload": "support"
                })
            
            # Mensagem não reconhecida
            else:
                # Obter contexto atual
                context = await self.get_conversation_context(user_id)
                order_id = context.get("order_id")
                
                if order_id:
                    return {
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "O que você gostaria de fazer?",
                        "options": [
                            {"id": f"track_order_{order_id}", "title": "Acompanhar Pedido"},
                            {"id": "new_order", "title": "Fazer Novo Pedido"},
                            {"id": "support", "title": "Falar com Atendente"}
                        ]
                    }
                else:
                    return {
                        "type": MessageType.TEXT,
                        "text": "Para verificar o status do seu pedido, por favor, informe o número do pedido."
                    }
    
    async def _handle_feedback(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante feedback.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Obter contexto atual
        context = await self.get_conversation_context(user_id)
        
        # Verificar em qual etapa do feedback estamos
        feedback_step = context.get("feedback_step", "rating")
        
        # Processar mensagem com base na etapa atual
        if feedback_step == "rating":
            # Verificar se é um postback ou quick reply
            if message_data.get("type") in ["postback", "quick_reply"]:
                payload = message_data.get("payload", "")
                
                if payload.startswith("rating_"):
                    # Extrair avaliação
                    rating = int(payload.replace("rating_", ""))
                    
                    # Salvar avaliação
                    await self.update_conversation_context(user_id, {
                        "feedback_rating": rating,
                        "feedback_step": "comment"
                    })
                    
                    # Solicitar comentário
                    await self.add_message_to_conversation(user_id, {
                        "role": "assistant",
                        "content": f"Obrigado pela avaliação de {rating} estrelas! Você gostaria de deixar um comentário adicional?"
                    })
                    
                    return {
                        "type": MessageType.TEXT,
                        "text": f"Obrigado pela avaliação de {rating} estrelas! Você gostaria de deixar um comentário adicional?"
                    }
            
            # Mensagem de texto durante avaliação
            else:
                # Solicitar avaliação
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Por favor, avalie sua experiência de 1 a 5 estrelas."
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Por favor, avalie sua experiência de 1 a 5 estrelas:",
                    "options": [
                        {"id": "rating_1", "title": "⭐"},
                        {"id": "rating_2", "title": "⭐⭐"},
                        {"id": "rating_3", "title": "⭐⭐⭐"},
                        {"id": "rating_4", "title": "⭐⭐⭐⭐"},
                        {"id": "rating_5", "title": "⭐⭐⭐⭐⭐"}
                    ]
                }
        
        elif feedback_step == "comment":
            # Salvar comentário
            comment = message_data.get("text", "")
            
            # Obter avaliação
            rating = context.get("feedback_rating", 0)
            
            # Salvar feedback completo
            await self.update_conversation_context(user_id, {
                "feedback_comment": comment,
                "feedback_step": "completed"
            })
            
            # Atualizar estado para inicial
            await self.update_conversation_state(user_id, ConversationState.INITIAL)
            
            # Responder agradecendo
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Obrigado pelo seu feedback! Ele é muito importante para nós."
            })
            
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "Obrigado pelo seu feedback! Ele é muito importante para nós. Como posso ajudar?",
                "options": [
                    {"id": "menu", "title": "Ver Cardápio"},
                    {"id": "order", "title": "Fazer Pedido"},
                    {"id": "status", "title": "Status do Pedido"}
                ],
                "action": "save_feedback",
                "feedback": {
                    "rating": rating,
                    "comment": comment,
                    "user_id": user_id,
                    "timestamp": datetime.now().isoformat()
                }
            }
    
    async def _handle_support(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante suporte.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Verificar se é um postback ou quick reply
        if message_data.get("type") in ["postback", "quick_reply"]:
            payload = message_data.get("payload", "")
            
            # Verificar se é retorno ao menu
            if payload == "back_to_menu":
                # Atualizar estado para inicial
                await self.update_conversation_state(user_id, ConversationState.INITIAL)
                
                # Responder com opções iniciais
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": "Como posso ajudar?"
                })
                
                return {
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Como posso ajudar?",
                    "options": [
                        {"id": "menu", "title": "Ver Cardápio"},
                        {"id": "order", "title": "Fazer Pedido"},
                        {"id": "status", "title": "Status do Pedido"}
                    ]
                }
        
        # Mensagem de texto durante suporte
        else:
            # Encaminhar mensagem para atendente humano
            await self.add_message_to_conversation(user_id, {
                "role": "assistant",
                "content": "Sua mensagem foi encaminhada para um atendente. Em breve você receberá uma resposta."
            })
            
            return {
                "type": MessageType.TEXT,
                "text": "Sua mensagem foi encaminhada para um atendente. Em breve você receberá uma resposta. Enquanto isso, você pode continuar enviando suas dúvidas.",
                "action": "forward_to_human_agent",
                "message": message_data.get("text", ""),
                "user_id": user_id
            }
    
    def _get_menu_items_for_category(self, category: str) -> List[Dict[str, Any]]:
        """
        Obtém itens do cardápio para uma categoria.
        
        Args:
            category: Categoria do cardápio
            
        Returns:
            List[Dict[str, Any]]: Lista de itens
        """
        # Simular itens do cardápio
        if category == "entradas":
            return [
                {
                    "id": "entrada_1",
                    "name": "Bruschetta",
                    "description": "Pão italiano com tomate, manjericão e azeite",
                    "price": 15.90,
                    "image_url": "https://example.com/bruschetta.jpg"
                },
                {
                    "id": "entrada_2",
                    "name": "Carpaccio",
                    "description": "Finas fatias de carne crua com molho especial",
                    "price": 29.90,
                    "image_url": "https://example.com/carpaccio.jpg"
                },
                {
                    "id": "entrada_3",
                    "name": "Camarão Empanado",
                    "description": "Camarões empanados com molho tártaro",
                    "price": 39.90,
                    "image_url": "https://example.com/camarao.jpg"
                }
            ]
        elif category == "principais":
            return [
                {
                    "id": "principal_1",
                    "name": "Filé Mignon",
                    "description": "Filé mignon grelhado com molho de vinho tinto",
                    "price": 59.90,
                    "image_url": "https://example.com/file.jpg"
                },
                {
                    "id": "principal_2",
                    "name": "Salmão Grelhado",
                    "description": "Salmão grelhado com legumes",
                    "price": 49.90,
                    "image_url": "https://example.com/salmao.jpg"
                },
                {
                    "id": "principal_3",
                    "name": "Risoto de Funghi",
                    "description": "Risoto cremoso com funghi e parmesão",
                    "price": 45.90,
                    "image_url": "https://example.com/risoto.jpg"
                }
            ]
        elif category == "sobremesas":
            return [
                {
                    "id": "sobremesa_1",
                    "name": "Tiramisu",
                    "description": "Clássica sobremesa italiana",
                    "price": 19.90,
                    "image_url": "https://example.com/tiramisu.jpg"
                },
                {
                    "id": "sobremesa_2",
                    "name": "Pudim",
                    "description": "Pudim de leite condensado",
                    "price": 15.90,
                    "image_url": "https://example.com/pudim.jpg"
                },
                {
                    "id": "sobremesa_3",
                    "name": "Sorvete",
                    "description": "Sorvete de creme com calda de chocolate",
                    "price": 12.90,
                    "image_url": "https://example.com/sorvete.jpg"
                }
            ]
        elif category == "bebidas":
            return [
                {
                    "id": "bebida_1",
                    "name": "Água",
                    "description": "Água mineral sem gás",
                    "price": 5.90,
                    "image_url": "https://example.com/agua.jpg"
                },
                {
                    "id": "bebida_2",
                    "name": "Refrigerante",
                    "description": "Refrigerante de cola",
                    "price": 7.90,
                    "image_url": "https://example.com/refrigerante.jpg"
                },
                {
                    "id": "bebida_3",
                    "name": "Suco",
                    "description": "Suco de laranja natural",
                    "price": 9.90,
                    "image_url": "https://example.com/suco.jpg"
                }
            ]
        else:
            return []
    
    def _get_item_by_id(self, item_id: str) -> Dict[str, Any]:
        """
        Obtém detalhes de um item pelo ID.
        
        Args:
            item_id: ID do item
            
        Returns:
            Dict[str, Any]: Detalhes do item
        """
        # Simular busca de item
        all_items = []
        all_items.extend(self._get_menu_items_for_category("entradas"))
        all_items.extend(self._get_menu_items_for_category("principais"))
        all_items.extend(self._get_menu_items_for_category("sobremesas"))
        all_items.extend(self._get_menu_items_for_category("bebidas"))
        
        for item in all_items:
            if item["id"] == item_id:
                return item
        
        return None
    
    def _get_payment_method_name(self, payment_method: str) -> str:
        """
        Obtém nome amigável do método de pagamento.
        
        Args:
            payment_method: Código do método de pagamento
            
        Returns:
            str: Nome amigável
        """
        if payment_method == "pix":
            return "PIX"
        elif payment_method == "credit":
            return "Cartão de Crédito"
        elif payment_method == "cash":
            return "Dinheiro na Entrega"
        else:
            return payment_method
