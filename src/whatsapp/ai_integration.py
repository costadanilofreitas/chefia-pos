"""
Módulo de integração com Amazon Bedrock para IA generativa no chatbot WhatsApp.

Este módulo implementa a integração com Amazon Bedrock (Claude) para
geração de respostas inteligentes e personalizadas no chatbot WhatsApp.
"""

import os
import json
import logging
import boto3
from typing import Dict, Any, List

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class WhatsAppAIIntegration:
    """Classe para integração com Amazon Bedrock (Claude) para chatbot WhatsApp."""
    
    def __init__(self, 
                 region_name: str = None, 
                 aws_access_key_id: str = None, 
                 aws_secret_access_key: str = None,
                 model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"):
        """
        Inicializa a integração com Amazon Bedrock.
        
        Args:
            region_name: Região AWS (opcional, padrão do ambiente)
            aws_access_key_id: Chave de acesso AWS (opcional, padrão do ambiente)
            aws_secret_access_key: Chave secreta AWS (opcional, padrão do ambiente)
            model_id: ID do modelo Claude no Bedrock (opcional, padrão Claude 3 Sonnet)
        """
        # Configurações da AWS
        self.region_name = region_name or os.environ.get('AWS_REGION', 'us-east-1')
        self.aws_access_key_id = aws_access_key_id or os.environ.get('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = aws_secret_access_key or os.environ.get('AWS_SECRET_ACCESS_KEY')
        self.model_id = model_id
        
        # Inicializar cliente Bedrock
        try:
            self.bedrock_client = boto3.client(
                'bedrock-runtime',
                region_name=self.region_name,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            )
            logger.info("Cliente Bedrock inicializado com sucesso")
        except Exception as e:
            logger.error(f"Falha ao inicializar cliente Bedrock: {str(e)}")
            raise
    
    async def generate_response(self, 
                              prompt: str, 
                              conversation_history: List[Dict[str, str]] = None,
                              system_prompt: str = None,
                              max_tokens: int = 1024,
                              temperature: float = 0.7) -> str:
        """
        Gera uma resposta usando o modelo Claude no Bedrock.
        
        Args:
            prompt: Prompt para o modelo
            conversation_history: Histórico da conversa (opcional)
            system_prompt: Prompt de sistema (opcional)
            max_tokens: Número máximo de tokens na resposta (opcional)
            temperature: Temperatura para geração (opcional)
            
        Returns:
            str: Resposta gerada pelo modelo
        """
        try:
            # Construir mensagens para o modelo
            messages = []
            
            # Adicionar prompt de sistema se fornecido
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            # Adicionar histórico da conversa se fornecido
            if conversation_history:
                messages.extend(conversation_history)
            
            # Adicionar prompt atual
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            # Preparar payload para o modelo
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages
            }
            
            # Invocar modelo
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(payload)
            )
            
            # Processar resposta
            response_body = json.loads(response['body'].read().decode('utf-8'))
            generated_text = response_body['content'][0]['text']
            
            logger.info(f"Resposta gerada com sucesso: {generated_text[:50]}...")
            return generated_text
            
        except Exception as e:
            logger.error(f"Erro ao gerar resposta com Bedrock: {str(e)}")
            return "Desculpe, tive um problema ao processar sua solicitação. Por favor, tente novamente mais tarde."
    
    async def generate_campaign_message(self, 
                                      customer_data: Dict[str, Any],
                                      campaign_type: str,
                                      restaurant_data: Dict[str, Any] = None) -> str:
        """
        Gera uma mensagem personalizada para campanha de marketing.
        
        Args:
            customer_data: Dados do cliente
            campaign_type: Tipo de campanha (reativação, fidelização, etc.)
            restaurant_data: Dados do restaurante (opcional)
            
        Returns:
            str: Mensagem personalizada para a campanha
        """
        # Construir prompt baseado no tipo de campanha
        if campaign_type == "reactivation":
            system_prompt = """
            Você é um assistente de marketing especializado em restaurantes. 
            Sua tarefa é criar mensagens personalizadas para clientes que não compram há algum tempo.
            Seja amigável, pessoal e convincente. Mencione pratos específicos que o cliente gostou no passado.
            Inclua uma oferta especial ou cupom para incentivar o retorno.
            Limite a mensagem a 3-4 frases curtas, adequadas para WhatsApp.
            """
            
            # Extrair dados relevantes do cliente
            name = customer_data.get("name", "Cliente")
            last_order_date = customer_data.get("last_order_date", "algum tempo atrás")
            favorite_items = customer_data.get("favorite_items", [])
            days_inactive = customer_data.get("days_inactive", 30)
            
            # Construir prompt específico
            prompt = f"""
            Crie uma mensagem para um cliente chamado {name} que não compra há {days_inactive} dias (desde {last_order_date}).
            Seus pratos favoritos são: {', '.join(favorite_items) if favorite_items else 'variados'}.
            O restaurante está oferecendo 15% de desconto para este cliente retornar.
            O código do cupom é VOLTA15.
            """
        
        elif campaign_type == "loyalty":
            system_prompt = """
            Você é um assistente de marketing especializado em restaurantes. 
            Sua tarefa é criar mensagens personalizadas para clientes fiéis, agradecendo sua preferência.
            Seja caloroso, grato e pessoal. Mencione a frequência de visitas ou valor gasto quando relevante.
            Ofereça uma recompensa especial como agradecimento.
            Limite a mensagem a 3-4 frases curtas, adequadas para WhatsApp.
            """
            
            # Extrair dados relevantes do cliente
            name = customer_data.get("name", "Cliente")
            visit_count = customer_data.get("visit_count", 10)
            total_spent = customer_data.get("total_spent", 500)
            
            # Construir prompt específico
            prompt = f"""
            Crie uma mensagem para um cliente fiel chamado {name} que já fez {visit_count} pedidos e gastou R$ {total_spent} no restaurante.
            O restaurante quer oferecer uma sobremesa grátis no próximo pedido como agradecimento.
            O código do cupom é FIEL10.
            """
        
        else:
            system_prompt = """
            Você é um assistente de marketing especializado em restaurantes. 
            Sua tarefa é criar mensagens promocionais personalizadas para clientes.
            Seja direto, atraente e persuasivo. Destaque os benefícios da oferta.
            Limite a mensagem a 3-4 frases curtas, adequadas para WhatsApp.
            """
            
            # Extrair dados relevantes do cliente
            name = customer_data.get("name", "Cliente")
            
            # Construir prompt específico
            prompt = f"""
            Crie uma mensagem promocional para {name} sobre as novidades do cardápio.
            O restaurante está lançando novos pratos e oferecendo 10% de desconto para quem experimentar.
            O código do cupom é NOVO10.
            """
        
        # Adicionar dados do restaurante se fornecidos
        if restaurant_data:
            restaurant_name = restaurant_data.get("name", "nosso restaurante")
            prompt += f"\nO nome do restaurante é {restaurant_name}."
        
        # Gerar resposta personalizada
        return await self.generate_response(prompt, system_prompt=system_prompt, max_tokens=256, temperature=0.7)
    
    async def analyze_customer_feedback(self, feedback_text: str) -> Dict[str, Any]:
        """
        Analisa feedback do cliente para extrair sentimento e tópicos.
        
        Args:
            feedback_text: Texto do feedback
            
        Returns:
            Dict[str, Any]: Análise do feedback
        """
        system_prompt = """
        Você é um analista de feedback de clientes para restaurantes.
        Sua tarefa é analisar o feedback do cliente e extrair:
        1. Sentimento geral (positivo, negativo ou neutro)
        2. Pontuação de sentimento (0-10, onde 0 é muito negativo e 10 é muito positivo)
        3. Principais tópicos mencionados (comida, atendimento, entrega, preço, etc.)
        4. Sugestões de melhoria
        5. Se requer resposta urgente
        
        Forneça sua análise em formato JSON.
        """
        
        prompt = f"""
        Analise o seguinte feedback de um cliente:
        
        "{feedback_text}"
        
        Forneça sua análise em formato JSON com os seguintes campos:
        - sentiment: "positive", "negative" ou "neutral"
        - sentiment_score: número de 0 a 10
        - topics: lista de tópicos mencionados
        - suggestions: sugestões de melhoria (ou null se não houver)
        - requires_urgent_response: true ou false
        """
        
        try:
            # Gerar análise
            response = await self.generate_response(prompt, system_prompt=system_prompt, max_tokens=512, temperature=0.2)
            
            # Extrair JSON da resposta
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                analysis = json.loads(json_str)
                logger.info(f"Análise de feedback gerada com sucesso: {analysis}")
                return analysis
            else:
                logger.error(f"Não foi possível extrair JSON da resposta: {response}")
                return {
                    "sentiment": "neutral",
                    "sentiment_score": 5,
                    "topics": ["geral"],
                    "suggestions": None,
                    "requires_urgent_response": False
                }
                
        except Exception as e:
            logger.error(f"Erro ao analisar feedback: {str(e)}")
            return {
                "sentiment": "neutral",
                "sentiment_score": 5,
                "topics": ["geral"],
                "suggestions": None,
                "requires_urgent_response": False,
                "error": str(e)
            }
    
    async def generate_menu_recommendations(self, 
                                          customer_data: Dict[str, Any],
                                          menu_items: List[Dict[str, Any]],
                                          max_recommendations: int = 3) -> List[Dict[str, Any]]:
        """
        Gera recomendações personalizadas de itens do cardápio.
        
        Args:
            customer_data: Dados do cliente
            menu_items: Lista de itens do cardápio
            max_recommendations: Número máximo de recomendações
            
        Returns:
            List[Dict[str, Any]]: Lista de itens recomendados
        """
        system_prompt = """
        Você é um especialista em recomendação de itens de cardápio para restaurantes.
        Sua tarefa é analisar o histórico de pedidos e preferências do cliente para recomendar novos itens.
        Considere preferências alimentares, restrições, histórico de pedidos e tendências sazonais.
        Forneça suas recomendações em formato JSON.
        """
        
        # Extrair dados relevantes do cliente
        name = customer_data.get("name", "Cliente")
        order_history = customer_data.get("order_history", [])
        favorite_items = customer_data.get("favorite_items", [])
        dietary_restrictions = customer_data.get("dietary_restrictions", [])
        
        # Construir prompt específico
        prompt = f"""
        Recomende até {max_recommendations} itens do cardápio para o cliente {name}.
        
        Histórico de pedidos:
        {json.dumps(order_history, indent=2)}
        
        Itens favoritos:
        {json.dumps(favorite_items, indent=2)}
        
        Restrições alimentares:
        {json.dumps(dietary_restrictions, indent=2)}
        
        Itens disponíveis no cardápio:
        {json.dumps(menu_items, indent=2)}
        
        Forneça suas recomendações em formato JSON com os seguintes campos:
        - recommendations: lista de objetos com os campos "id" e "reason"
        """
        
        try:
            # Gerar recomendações
            response = await self.generate_response(prompt, system_prompt=system_prompt, max_tokens=1024, temperature=0.3)
            
            # Extrair JSON da resposta
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                recommendations_data = json.loads(json_str)
                
                # Extrair recomendações
                recommendations = recommendations_data.get("recommendations", [])
                
                # Limitar número de recomendações
                recommendations = recommendations[:max_recommendations]
                
                # Adicionar detalhes dos itens recomendados
                detailed_recommendations = []
                for rec in recommendations:
                    item_id = rec.get("id")
                    reason = rec.get("reason")
                    
                    # Buscar item completo no cardápio
                    item_details = next((item for item in menu_items if item.get("id") == item_id), None)
                    
                    if item_details:
                        detailed_recommendations.append({
                            **item_details,
                            "recommendation_reason": reason
                        })
                
                logger.info(f"Recomendações geradas com sucesso: {detailed_recommendations}")
                return detailed_recommendations
            else:
                logger.error(f"Não foi possível extrair JSON da resposta: {response}")
                return []
                
        except Exception as e:
            logger.error(f"Erro ao gerar recomendações: {str(e)}")
            return []
