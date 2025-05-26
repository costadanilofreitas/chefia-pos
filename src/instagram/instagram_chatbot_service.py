"""
Módulo de serviço de chatbot para Instagram Direct.

Este módulo implementa o serviço de chatbot para Instagram Direct,
processando mensagens recebidas e gerando respostas apropriadas.
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from ...core.messaging import BaseChatbotService, MessageType, ConversationState, PlatformType

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class InstagramChatbotService(BaseChatbotService):
    """Classe para serviço de chatbot do Instagram Direct."""
    
    def __init__(self):
        """Inicializa o serviço de chatbot do Instagram."""
        super().__init__(platform_type=PlatformType.INSTAGRAM)
        logger.info("Serviço de chatbot do Instagram inicializado")
    
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
            
            # No Instagram, usamos quick replies em vez de botões interativos
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
                
                # No Instagram, enviar itens como imagens individuais em sequência
                # já que o carrossel tem limitações
                responses = []
                
                # Primeiro, enviar mensagem introdutória
                responses.append({
                    "type": MessageType.TEXT,
                    "text": f"Aqui estão os itens da categoria {category}:"
                })
                
                # Enviar cada item como uma imagem com descrição
                for item in items:
                    # Adicionar item como imagem
                    responses.append({
                        "type": MessageType.IMAGE,
                        "image_url": item["image_url"],
                        "caption": f"{item['name']} - R$ {item['price']:.2f}\n{item['description']}"
                    })
                
                # Adicionar opções após os itens
                responses.append({
                    "type": MessageType.INTERACTIVE_BUTTONS,
                    "body": "Selecione um item pelo número ou continue navegando:",
                    "options": [
                        {"id": f"view_item_{items[0]['id']}", "title": f"1. {items[0]['name']}"},
                        {"id": f"view_item_{items[1]['id']}", "title": f"2. {items[1]['name']}"},
                        {"id": f"view_item_{items[2]['id']}", "title": f"3. {items[2]['name']}"}
                    ]
                })
                
                # Registrar na conversa
                await self.add_message_to_conversation(user_id, {
                    "role": "assistant",
                    "content": f"Aqui estão os itens da categoria {category}."
                })
                
                # Retornar o primeiro item, os demais serão enviados em sequência
                return responses[0]
            
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
                    
                    # No Instagram, enviar imagem e depois opções
                    responses = []
                    
                    # Adicionar imagem do item
                    responses.append({
                        "type": MessageType.IMAGE,
                        "image_url": item["image_url"],
                        "caption": f"{item['name']} - R$ {item['price']:.2f}\n{item['description']}"
                    })
                    
                    # Adicionar opções
                    responses.append({
                        "type": MessageType.INTERACTIVE_BUTTONS,
                        "body": "O que deseja fazer?",
                        "options": [
                            {"id": f"add_item_{item['id']}", "title": "Adicionar ao Pedido"},
                            {"id": "back_to_menu", "title": "Voltar ao Cardápio"}
                        ]
                    })
                    
                    # Retornar o primeiro item, os demais serão enviados em sequência
                    return responses[0]
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
    
    # Os métodos restantes são muito similares aos do MessengerChatbotService
    # com pequenas adaptações para as limitações do Instagram
    
    async def _handle_item_selection(self, user_id: str, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa mensagem durante seleção de item.
        
        Args:
            user_id: ID do usuário
            message_data: Dados da mensagem
            
        Returns:
            Dict[str, Any]: Resposta a ser enviada
        """
        # Implementação similar ao Messenger, adaptada para Instagram
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
        # Implementação similar ao Messenger, adaptada para Instagram
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
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
            # Código omitido por brevidade, segue o mesmo padrão do Messenger
            return {
                "type": MessageType.INTERACTIVE_BUTTONS,
                "body": "O que você gostaria de fazer com seu carrinho?",
                "options": [
                    {"id": "checkout", "title": "Finalizar Pedido"},
                    {"id": "continue_shopping", "title": "Continuar Comprando"},
                    {"id": "clear_cart", "title": "Limpar Carrinho"}
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
        # Implementação similar ao Messenger, adaptada para Instagram
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
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
        
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
        # Implementação completa seguiria o mesmo fluxo do Messenger
        
        # Retorno padrão para outras etapas
        return {
            "type": MessageType.TEXT,
            "text": "Continuando com seu pedido..."
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
        # Implementação similar ao Messenger, adaptada para Instagram
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
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
        # Implementação similar ao Messenger, adaptada para Instagram
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
        return {
            "type": MessageType.INTERACTIVE_BUTTONS,
            "body": "Seu pedido está em processamento. O que você gostaria de fazer?",
            "options": [
                {"id": "new_order", "title": "Fazer Novo Pedido"},
                {"id": "support", "title": "Falar com Atendente"}
            ]
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
        # Implementação similar ao Messenger, adaptada para Instagram
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
        return {
            "type": MessageType.INTERACTIVE_BUTTONS,
            "body": "Obrigado pelo seu feedback! Como posso ajudar?",
            "options": [
                {"id": "menu", "title": "Ver Cardápio"},
                {"id": "order", "title": "Fazer Pedido"},
                {"id": "status", "title": "Status do Pedido"}
            ]
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
        # Implementação similar ao Messenger, adaptada para Instagram
        # Código omitido por brevidade, segue o mesmo padrão do Messenger
        return {
            "type": MessageType.TEXT,
            "text": "Sua mensagem foi encaminhada para um atendente. Em breve você receberá uma resposta.",
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
