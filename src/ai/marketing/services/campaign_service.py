import os
import boto3
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class MarketingCampaignService:
    """
    Serviço para gerenciamento de campanhas de marketing automatizadas via WhatsApp/Telegram
    utilizando IA para personalização de mensagens.
    """
    
    def __init__(self):
        """
        Inicializa o serviço de campanhas de marketing.
        """
        # Inicializar clientes AWS
        self.bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        self.sqs = boto3.client('sqs', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        self.dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        
        # Configurar tabelas DynamoDB
        self.campaigns_table = self.dynamodb.Table(os.environ.get('CAMPAIGNS_TABLE', 'pos_marketing_campaigns'))
        self.templates_table = self.dynamodb.Table(os.environ.get('TEMPLATES_TABLE', 'pos_marketing_templates'))
        self.customers_table = self.dynamodb.Table(os.environ.get('CUSTOMERS_TABLE', 'pos_customers'))
        
        # Configurar filas SQS
        self.campaign_queue_url = os.environ.get('CAMPAIGN_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789012/pos_marketing_campaigns.fifo')
        self.message_queue_url = os.environ.get('MESSAGE_QUEUE_URL', 'https://sqs.us-east-1.amazonaws.com/123456789012/pos_marketing_messages.fifo')
        
        # Configurar modelo de IA
        self.model_id = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
    
    async def create_campaign(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria uma nova campanha de marketing.
        
        Args:
            campaign_data: Dados da campanha a ser criada
            
        Returns:
            Dados da campanha criada
        """
        try:
            # Validar dados da campanha
            self._validate_campaign_data(campaign_data)
            
            # Gerar ID único para a campanha
            campaign_id = f"camp_{datetime.now().strftime('%Y%m%d%H%M%S')}_{campaign_data['restaurant_id']}"
            
            # Preparar item para DynamoDB
            campaign_item = {
                'campaign_id': campaign_id,
                'restaurant_id': campaign_data['restaurant_id'],
                'name': campaign_data['name'],
                'description': campaign_data.get('description', ''),
                'type': campaign_data['type'],
                'status': 'scheduled',
                'target_audience': campaign_data['target_audience'],
                'message_template': campaign_data['message_template'],
                'scheduled_date': campaign_data.get('scheduled_date', datetime.now().isoformat()),
                'end_date': campaign_data.get('end_date'),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': campaign_data.get('metadata', {}),
                'ai_parameters': campaign_data.get('ai_parameters', {})
            }
            
            # Salvar campanha no DynamoDB
            self.campaigns_table.put_item(Item=campaign_item)
            
            # Enviar mensagem para fila SQS para processamento assíncrono
            self._send_to_campaign_queue(campaign_id)
            
            logger.info(f"Campaign created successfully: {campaign_id}")
            return campaign_item
            
        except Exception as e:
            logger.error(f"Error creating campaign: {str(e)}", exc_info=True)
            raise
    
    async def get_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """
        Recupera uma campanha pelo ID.
        
        Args:
            campaign_id: ID da campanha
            
        Returns:
            Dados da campanha
        """
        try:
            response = self.campaigns_table.get_item(Key={'campaign_id': campaign_id})
            
            if 'Item' not in response:
                logger.warning(f"Campaign not found: {campaign_id}")
                raise ValueError(f"Campaign not found: {campaign_id}")
                
            return response['Item']
            
        except ClientError as e:
            logger.error(f"Error retrieving campaign: {str(e)}", exc_info=True)
            raise
    
    async def update_campaign_status(self, campaign_id: str, status: str) -> Dict[str, Any]:
        """
        Atualiza o status de uma campanha.
        
        Args:
            campaign_id: ID da campanha
            status: Novo status (scheduled, running, completed, cancelled, failed)
            
        Returns:
            Dados atualizados da campanha
        """
        try:
            valid_statuses = ['scheduled', 'running', 'completed', 'cancelled', 'failed']
            if status not in valid_statuses:
                raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
            
            response = self.campaigns_table.update_item(
                Key={'campaign_id': campaign_id},
                UpdateExpression='SET #status = :status, updated_at = :updated_at',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': status,
                    ':updated_at': datetime.now().isoformat()
                },
                ReturnValues='ALL_NEW'
            )
            
            logger.info(f"Campaign status updated: {campaign_id} -> {status}")
            return response['Attributes']
            
        except ClientError as e:
            logger.error(f"Error updating campaign status: {str(e)}", exc_info=True)
            raise
    
    async def list_campaigns(self, restaurant_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lista campanhas para um restaurante específico, opcionalmente filtradas por status.
        
        Args:
            restaurant_id: ID do restaurante
            status: Status opcional para filtrar
            
        Returns:
            Lista de campanhas
        """
        try:
            if status:
                # Filtrar por restaurant_id e status
                response = self.campaigns_table.query(
                    IndexName='restaurant_status_index',
                    KeyConditionExpression='restaurant_id = :rid AND #status = :status',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={':rid': restaurant_id, ':status': status}
                )
            else:
                # Filtrar apenas por restaurant_id
                response = self.campaigns_table.query(
                    IndexName='restaurant_id_index',
                    KeyConditionExpression='restaurant_id = :rid',
                    ExpressionAttributeValues={':rid': restaurant_id}
                )
            
            return response.get('Items', [])
            
        except ClientError as e:
            logger.error(f"Error listing campaigns: {str(e)}", exc_info=True)
            raise
    
    async def generate_personalized_message(self, template_id: str, customer_data: Dict[str, Any], 
                                           campaign_data: Dict[str, Any]) -> str:
        """
        Gera uma mensagem personalizada usando IA com base em um template, dados do cliente e da campanha.
        
        Args:
            template_id: ID do template de mensagem
            customer_data: Dados do cliente para personalização
            campaign_data: Dados da campanha
            
        Returns:
            Mensagem personalizada gerada
        """
        try:
            # Obter template
            template_response = self.templates_table.get_item(Key={'template_id': template_id})
            if 'Item' not in template_response:
                raise ValueError(f"Template not found: {template_id}")
            
            template = template_response['Item']
            template_content = template['content']
            
            # Preparar prompt para o modelo de IA
            prompt = self._prepare_ai_prompt(template_content, customer_data, campaign_data)
            
            # Chamar Amazon Bedrock para gerar mensagem personalizada
            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1000,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )
            
            # Processar resposta
            response_body = json.loads(response['body'].read().decode('utf-8'))
            generated_message = response_body['content'][0]['text']
            
            logger.info(f"Generated personalized message for customer {customer_data.get('customer_id')}")
            return generated_message
            
        except Exception as e:
            logger.error(f"Error generating personalized message: {str(e)}", exc_info=True)
            raise
    
    async def send_message(self, customer_id: str, message: str, channel: str, 
                          metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Envia uma mensagem para um cliente através do canal especificado (WhatsApp/Telegram).
        
        Args:
            customer_id: ID do cliente
            message: Mensagem a ser enviada
            channel: Canal de envio ('whatsapp' ou 'telegram')
            metadata: Metadados adicionais
            
        Returns:
            Resultado do envio
        """
        try:
            # Validar canal
            if channel not in ['whatsapp', 'telegram']:
                raise ValueError(f"Invalid channel: {channel}. Must be 'whatsapp' or 'telegram'")
            
            # Obter dados do cliente
            customer_response = self.customers_table.get_item(Key={'customer_id': customer_id})
            if 'Item' not in customer_response:
                raise ValueError(f"Customer not found: {customer_id}")
            
            customer = customer_response['Item']
            
            # Verificar se o cliente tem o canal configurado
            if channel == 'whatsapp' and not customer.get('phone_number'):
                raise ValueError(f"Customer {customer_id} does not have a phone number configured")
            
            if channel == 'telegram' and not customer.get('telegram_id'):
                raise ValueError(f"Customer {customer_id} does not have a Telegram ID configured")
            
            # Preparar mensagem para a fila SQS
            message_id = f"msg_{datetime.now().strftime('%Y%m%d%H%M%S')}_{customer_id}"
            message_data = {
                'message_id': message_id,
                'customer_id': customer_id,
                'channel': channel,
                'message': message,
                'recipient': customer.get('phone_number') if channel == 'whatsapp' else customer.get('telegram_id'),
                'status': 'pending',
                'created_at': datetime.now().isoformat(),
                'metadata': metadata
            }
            
            # Enviar para fila SQS
            self.sqs.send_message(
                QueueUrl=self.message_queue_url,
                MessageBody=json.dumps(message_data),
                MessageGroupId=customer_id,
                MessageDeduplicationId=message_id
            )
            
            logger.info(f"Message queued for sending: {message_id} to {customer_id} via {channel}")
            return {
                'message_id': message_id,
                'status': 'queued',
                'customer_id': customer_id,
                'channel': channel
            }
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}", exc_info=True)
            raise
    
    async def process_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """
        Processa uma campanha, gerando e enviando mensagens para o público-alvo.
        
        Args:
            campaign_id: ID da campanha
            
        Returns:
            Resultado do processamento
        """
        try:
            # Obter dados da campanha
            campaign = await self.get_campaign(campaign_id)
            
            # Atualizar status para 'running'
            await self.update_campaign_status(campaign_id, 'running')
            
            # Obter público-alvo
            target_audience = campaign['target_audience']
            customers = await self._get_target_customers(target_audience, campaign['restaurant_id'])
            
            logger.info(f"Processing campaign {campaign_id} for {len(customers)} customers")
            
            # Processar cada cliente
            results = {
                'total': len(customers),
                'processed': 0,
                'success': 0,
                'failed': 0,
                'messages': []
            }
            
            for customer in customers:
                try:
                    # Gerar mensagem personalizada
                    message = await self.generate_personalized_message(
                        campaign['message_template'],
                        customer,
                        campaign
                    )
                    
                    # Determinar canal preferido
                    channel = 'whatsapp'  # Default
                    if customer.get('preferred_channel'):
                        channel = customer['preferred_channel']
                    elif not customer.get('phone_number') and customer.get('telegram_id'):
                        channel = 'telegram'
                    
                    # Enviar mensagem
                    send_result = await self.send_message(
                        customer['customer_id'],
                        message,
                        channel,
                        {'campaign_id': campaign_id}
                    )
                    
                    results['processed'] += 1
                    results['success'] += 1
                    results['messages'].append(send_result)
                    
                except Exception as e:
                    logger.error(f"Error processing customer {customer.get('customer_id')}: {str(e)}")
                    results['processed'] += 1
                    results['failed'] += 1
            
            # Atualizar status da campanha
            final_status = 'completed' if results['failed'] == 0 else 'completed_with_errors'
            await self.update_campaign_status(campaign_id, final_status)
            
            # Atualizar métricas da campanha
            self.campaigns_table.update_item(
                Key={'campaign_id': campaign_id},
                UpdateExpression='SET metrics = :metrics, updated_at = :updated_at',
                ExpressionAttributeValues={
                    ':metrics': results,
                    ':updated_at': datetime.now().isoformat()
                }
            )
            
            logger.info(f"Campaign {campaign_id} processed: {results['success']} successful, {results['failed']} failed")
            return results
            
        except Exception as e:
            logger.error(f"Error processing campaign: {str(e)}", exc_info=True)
            # Atualizar status para 'failed'
            await self.update_campaign_status(campaign_id, 'failed')
            raise
    
    async def create_message_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria um novo template de mensagem.
        
        Args:
            template_data: Dados do template
            
        Returns:
            Template criado
        """
        try:
            # Validar dados do template
            required_fields = ['name', 'content', 'restaurant_id', 'type']
            for field in required_fields:
                if field not in template_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Gerar ID único para o template
            template_id = f"tmpl_{datetime.now().strftime('%Y%m%d%H%M%S')}_{template_data['restaurant_id']}"
            
            # Preparar item para DynamoDB
            template_item = {
                'template_id': template_id,
                'restaurant_id': template_data['restaurant_id'],
                'name': template_data['name'],
                'content': template_data['content'],
                'type': template_data['type'],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': template_data.get('metadata', {})
            }
            
            # Salvar template no DynamoDB
            self.templates_table.put_item(Item=template_item)
            
            logger.info(f"Template created successfully: {template_id}")
            return template_item
            
        except Exception as e:
            logger.error(f"Error creating template: {str(e)}", exc_info=True)
            raise
    
    async def list_templates(self, restaurant_id: str, template_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lista templates para um restaurante específico, opcionalmente filtrados por tipo.
        
        Args:
            restaurant_id: ID do restaurante
            template_type: Tipo opcional para filtrar
            
        Returns:
            Lista de templates
        """
        try:
            if template_type:
                # Filtrar por restaurant_id e tipo
                response = self.templates_table.query(
                    IndexName='restaurant_type_index',
                    KeyConditionExpression='restaurant_id = :rid AND #type = :type',
                    ExpressionAttributeNames={'#type': 'type'},
                    ExpressionAttributeValues={':rid': restaurant_id, ':type': template_type}
                )
            else:
                # Filtrar apenas por restaurant_id
                response = self.templates_table.query(
                    IndexName='restaurant_id_index',
                    KeyConditionExpression='restaurant_id = :rid',
                    ExpressionAttributeValues={':rid': restaurant_id}
                )
            
            return response.get('Items', [])
            
        except ClientError as e:
            logger.error(f"Error listing templates: {str(e)}", exc_info=True)
            raise
    
    # Métodos privados auxiliares
    
    def _validate_campaign_data(self, campaign_data: Dict[str, Any]) -> None:
        """Valida os dados da campanha."""
        required_fields = ['restaurant_id', 'name', 'type', 'target_audience', 'message_template']
        for field in required_fields:
            if field not in campaign_data:
                raise ValueError(f"Missing required field: {field}")
        
        valid_types = ['reengagement', 'promotion', 'feedback', 'loyalty', 'announcement']
        if campaign_data['type'] not in valid_types:
            raise ValueError(f"Invalid campaign type: {campaign_data['type']}. Must be one of {valid_types}")
    
    def _send_to_campaign_queue(self, campaign_id: str) -> None:
        """Envia uma campanha para a fila SQS para processamento."""
        self.sqs.send_message(
            QueueUrl=self.campaign_queue_url,
            MessageBody=json.dumps({'campaign_id': campaign_id}),
            MessageGroupId=campaign_id,
            MessageDeduplicationId=f"{campaign_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
    
    def _prepare_ai_prompt(self, template_content: str, customer_data: Dict[str, Any], 
                          campaign_data: Dict[str, Any]) -> str:
        """Prepara o prompt para o modelo de IA."""
        # Extrair parâmetros de IA da campanha
        ai_params = campaign_data.get('ai_parameters', {})
        tone = ai_params.get('tone', 'friendly')
        style = ai_params.get('style', 'casual')
        max_length = ai_params.get('max_length', 500)
        
        # Construir prompt
        prompt = f"""
        Você é um assistente especializado em marketing para restaurantes. Sua tarefa é personalizar a mensagem abaixo 
        para o cliente específico, com base nos dados fornecidos.
        
        TEMPLATE DE MENSAGEM:
        {template_content}
        
        DADOS DO CLIENTE:
        Nome: {customer_data.get('name', 'Cliente')}
        Último pedido: {customer_data.get('last_order_date', 'Desconhecido')}
        Itens favoritos: {', '.join(customer_data.get('favorite_items', ['Desconhecido']))}
        Frequência de visitas: {customer_data.get('visit_frequency', 'Desconhecida')}
        Valor médio de pedido: R$ {customer_data.get('average_order_value', 'Desconhecido')}
        Dias desde último pedido: {customer_data.get('days_since_last_order', 'Desconhecido')}
        
        DADOS DA CAMPANHA:
        Tipo: {campaign_data.get('type', 'promocional')}
        Nome: {campaign_data.get('name', '')}
        Descrição: {campaign_data.get('description', '')}
        
        INSTRUÇÕES:
        1. Personalize a mensagem substituindo os marcadores de posição pelos dados do cliente.
        2. Use um tom {tone} e estilo {style}.
        3. Mantenha a mensagem concisa, com no máximo {max_length} caracteres.
        4. Inclua o nome do cliente de forma natural.
        5. Se a campanha for de reengajamento, enfatize quanto tempo faz desde a última visita.
        6. Se a campanha for promocional, destaque os itens favoritos do cliente.
        7. Se a campanha for de feedback, agradeça pela fidelidade.
        8. Não adicione informações que não estejam nos dados fornecidos.
        9. Mantenha a mensagem adequada para WhatsApp/Telegram.
        
        Forneça apenas a mensagem personalizada, sem comentários adicionais.
        """
        
        return prompt
    
    async def _get_target_customers(self, target_criteria: Dict[str, Any], restaurant_id: str) -> List[Dict[str, Any]]:
        """
        Obtém a lista de clientes que atendem aos critérios de segmentação.
        
        Args:
            target_criteria: Critérios de segmentação
            restaurant_id: ID do restaurante
            
        Returns:
            Lista de clientes que atendem aos critérios
        """
        try:
            # Implementação simplificada - em produção, isso seria uma consulta mais complexa
            # ao DynamoDB ou a um serviço de segmentação dedicado
            
            # Exemplo de critérios:
            # - inactive_days: clientes inativos por X dias
            # - min_orders: clientes com pelo menos X pedidos
            # - specific_items: clientes que pediram itens específicos
            # - order_value: clientes com valor médio de pedido acima de X
            
            # Consulta básica por restaurant_id
            scan_params = {
                'FilterExpression': 'restaurant_id = :rid',
                'ExpressionAttributeValues': {':rid': restaurant_id}
            }
            
            # Adicionar filtros com base nos critérios
            if 'inactive_days' in target_criteria:
                cutoff_date = (datetime.now() - timedelta(days=target_criteria['inactive_days'])).isoformat()
                scan_params['FilterExpression'] += ' AND last_order_date < :cutoff'
                scan_params['ExpressionAttributeValues'][':cutoff'] = cutoff_date
            
            if 'min_orders' in target_criteria:
                scan_params['FilterExpression'] += ' AND order_count >= :min_orders'
                scan_params['ExpressionAttributeValues'][':min_orders'] = target_criteria['min_orders']
            
            if 'order_value' in target_criteria:
                scan_params['FilterExpression'] += ' AND average_order_value >= :min_value'
                scan_params['ExpressionAttributeValues'][':min_value'] = target_criteria['order_value']
            
            # Executar scan no DynamoDB
            response = self.customers_table.scan(**scan_params)
            customers = response.get('Items', [])
            
            # Processar paginação se necessário
            while 'LastEvaluatedKey' in response:
                scan_params['ExclusiveStartKey'] = response['LastEvaluatedKey']
                response = self.customers_table.scan(**scan_params)
                customers.extend(response.get('Items', []))
            
            # Filtro adicional para specific_items (não pode ser feito diretamente no scan)
            if 'specific_items' in target_criteria:
                items = set(target_criteria['specific_items'])
                customers = [
                    c for c in customers 
                    if any(item in items for item in c.get('ordered_items', []))
                ]
            
            logger.info(f"Found {len(customers)} customers matching target criteria for restaurant {restaurant_id}")
            return customers
            
        except Exception as e:
            logger.error(f"Error getting target customers: {str(e)}", exc_info=True)
            raise
