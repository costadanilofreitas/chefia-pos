"""
Módulo de integração com Amazon SQS para WhatsApp.

Este módulo implementa a integração com Amazon SQS FIFO para comunicação
event-based entre o chatbot WhatsApp e o sistema POS, garantindo
processamento ordenado e exatamente uma vez.
"""

import os
import json
import uuid
import logging
import boto3
from typing import Dict, Any, List
from datetime import datetime
from botocore.exceptions import ClientError

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class WhatsAppSQSIntegration:
    """Classe para integração com Amazon SQS FIFO para WhatsApp."""
    
    def __init__(self, 
                 region_name: str = None, 
                 aws_access_key_id: str = None, 
                 aws_secret_access_key: str = None,
                 incoming_queue_url: str = None,
                 outgoing_queue_url: str = None):
        """
        Inicializa a integração com Amazon SQS.
        
        Args:
            region_name: Região AWS (opcional, padrão do ambiente)
            aws_access_key_id: Chave de acesso AWS (opcional, padrão do ambiente)
            aws_secret_access_key: Chave secreta AWS (opcional, padrão do ambiente)
            incoming_queue_url: URL da fila de entrada (opcional, padrão do ambiente)
            outgoing_queue_url: URL da fila de saída (opcional, padrão do ambiente)
        """
        # Configurações da AWS
        self.region_name = region_name or os.environ.get('AWS_REGION', 'us-east-1')
        self.aws_access_key_id = aws_access_key_id or os.environ.get('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = aws_secret_access_key or os.environ.get('AWS_SECRET_ACCESS_KEY')
        
        # URLs das filas SQS FIFO
        self.incoming_queue_url = incoming_queue_url or os.environ.get('WHATSAPP_INCOMING_QUEUE_URL')
        self.outgoing_queue_url = outgoing_queue_url or os.environ.get('WHATSAPP_OUTGOING_QUEUE_URL')
        
        # Validar configurações
        if not self.incoming_queue_url or not self.outgoing_queue_url:
            logger.warning("URLs das filas SQS não configuradas. A integração SQS não funcionará corretamente.")
        
        # Inicializar cliente SQS
        try:
            self.sqs_client = boto3.client(
                'sqs',
                region_name=self.region_name,
                aws_access_key_id=self.aws_access_key_id,
                aws_secret_access_key=self.aws_secret_access_key
            )
            logger.info("Cliente SQS inicializado com sucesso")
        except Exception as e:
            logger.error(f"Falha ao inicializar cliente SQS: {str(e)}")
            raise
    
    async def send_message_to_pos(self, message_data: Dict[str, Any], message_group_id: str = None) -> Dict[str, Any]:
        """
        Envia mensagem para o sistema POS via SQS FIFO.
        
        Args:
            message_data: Dados da mensagem a ser enviada
            message_group_id: ID do grupo de mensagens (opcional, padrão é o número do cliente)
            
        Returns:
            Dict[str, Any]: Resposta da API do SQS
        """
        if not self.outgoing_queue_url:
            logger.error("URL da fila de saída não configurada")
            return {"success": False, "error": "URL da fila de saída não configurada"}
        
        # Garantir que temos um message_group_id (obrigatório para filas FIFO)
        if not message_group_id:
            # Usar número do cliente como message_group_id se disponível
            message_group_id = message_data.get('from_number', f'default-group-{uuid.uuid4()}')
        
        # Gerar um ID de deduplicação único
        deduplication_id = str(uuid.uuid4())
        
        # Adicionar metadados à mensagem
        enriched_message = {
            **message_data,
            "timestamp": datetime.now().isoformat(),
            "message_id": str(uuid.uuid4())
        }
        
        try:
            # Enviar mensagem para a fila SQS FIFO
            response = self.sqs_client.send_message(
                QueueUrl=self.outgoing_queue_url,
                MessageBody=json.dumps(enriched_message),
                MessageGroupId=message_group_id,
                MessageDeduplicationId=deduplication_id
            )
            
            logger.info(f"Mensagem enviada com sucesso para SQS: {response.get('MessageId')}")
            return {
                "success": True,
                "message_id": response.get('MessageId'),
                "deduplication_id": deduplication_id,
                "group_id": message_group_id
            }
            
        except ClientError as e:
            logger.error(f"Erro ao enviar mensagem para SQS: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "error_code": e.response['Error']['Code'] if hasattr(e, 'response') else "Unknown"
            }
    
    async def receive_messages_from_pos(self, max_messages: int = 10, wait_time_seconds: int = 20) -> List[Dict[str, Any]]:
        """
        Recebe mensagens do sistema POS via SQS FIFO.
        
        Args:
            max_messages: Número máximo de mensagens a receber (1-10)
            wait_time_seconds: Tempo máximo de espera em segundos (0-20)
            
        Returns:
            List[Dict[str, Any]]: Lista de mensagens recebidas
        """
        if not self.incoming_queue_url:
            logger.error("URL da fila de entrada não configurada")
            return []
        
        try:
            # Receber mensagens da fila SQS FIFO
            response = self.sqs_client.receive_message(
                QueueUrl=self.incoming_queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=wait_time_seconds,
                AttributeNames=['All'],
                MessageAttributeNames=['All']
            )
            
            messages = response.get('Messages', [])
            logger.info(f"Recebidas {len(messages)} mensagens de SQS")
            
            # Processar mensagens recebidas
            processed_messages = []
            for message in messages:
                try:
                    # Extrair corpo da mensagem
                    message_body = json.loads(message.get('Body', '{}'))
                    
                    # Adicionar metadados da mensagem SQS
                    processed_message = {
                        **message_body,
                        "receipt_handle": message.get('ReceiptHandle'),
                        "sqs_message_id": message.get('MessageId'),
                        "attributes": message.get('Attributes', {}),
                        "message_attributes": message.get('MessageAttributes', {})
                    }
                    
                    processed_messages.append(processed_message)
                    
                except json.JSONDecodeError:
                    logger.error(f"Erro ao decodificar mensagem SQS: {message.get('Body')}")
            
            return processed_messages
            
        except ClientError as e:
            logger.error(f"Erro ao receber mensagens de SQS: {str(e)}")
            return []
    
    async def delete_message(self, receipt_handle: str) -> bool:
        """
        Exclui uma mensagem processada da fila SQS.
        
        Args:
            receipt_handle: Identificador de recebimento da mensagem
            
        Returns:
            bool: True se a exclusão foi bem-sucedida, False caso contrário
        """
        if not self.incoming_queue_url:
            logger.error("URL da fila de entrada não configurada")
            return False
        
        try:
            # Excluir mensagem da fila SQS
            self.sqs_client.delete_message(
                QueueUrl=self.incoming_queue_url,
                ReceiptHandle=receipt_handle
            )
            
            logger.info(f"Mensagem excluída com sucesso de SQS: {receipt_handle[:10]}...")
            return True
            
        except ClientError as e:
            logger.error(f"Erro ao excluir mensagem de SQS: {str(e)}")
            return False
    
    async def create_queues_if_not_exist(self, 
                                        incoming_queue_name: str = "whatsapp-incoming.fifo", 
                                        outgoing_queue_name: str = "whatsapp-outgoing.fifo") -> Dict[str, str]:
        """
        Cria filas SQS FIFO se não existirem.
        
        Args:
            incoming_queue_name: Nome da fila de entrada
            outgoing_queue_name: Nome da fila de saída
            
        Returns:
            Dict[str, str]: URLs das filas criadas ou existentes
        """
        queue_urls = {}
        
        # Garantir que os nomes das filas terminam com .fifo
        if not incoming_queue_name.endswith('.fifo'):
            incoming_queue_name += '.fifo'
        if not outgoing_queue_name.endswith('.fifo'):
            outgoing_queue_name += '.fifo'
        
        # Criar fila de entrada se não existir
        try:
            # Verificar se a fila já existe
            try:
                response = self.sqs_client.get_queue_url(QueueName=incoming_queue_name)
                self.incoming_queue_url = response['QueueUrl']
                queue_urls['incoming'] = self.incoming_queue_url
                logger.info(f"Fila de entrada já existe: {self.incoming_queue_url}")
            except ClientError:
                # Criar nova fila FIFO
                response = self.sqs_client.create_queue(
                    QueueName=incoming_queue_name,
                    Attributes={
                        'FifoQueue': 'true',
                        'ContentBasedDeduplication': 'false',
                        'VisibilityTimeout': '300',  # 5 minutos
                        'MessageRetentionPeriod': '86400'  # 1 dia
                    }
                )
                self.incoming_queue_url = response['QueueUrl']
                queue_urls['incoming'] = self.incoming_queue_url
                logger.info(f"Fila de entrada criada: {self.incoming_queue_url}")
        except ClientError as e:
            logger.error(f"Erro ao criar fila de entrada: {str(e)}")
        
        # Criar fila de saída se não existir
        try:
            # Verificar se a fila já existe
            try:
                response = self.sqs_client.get_queue_url(QueueName=outgoing_queue_name)
                self.outgoing_queue_url = response['QueueUrl']
                queue_urls['outgoing'] = self.outgoing_queue_url
                logger.info(f"Fila de saída já existe: {self.outgoing_queue_url}")
            except ClientError:
                # Criar nova fila FIFO
                response = self.sqs_client.create_queue(
                    QueueName=outgoing_queue_name,
                    Attributes={
                        'FifoQueue': 'true',
                        'ContentBasedDeduplication': 'false',
                        'VisibilityTimeout': '300',  # 5 minutos
                        'MessageRetentionPeriod': '86400'  # 1 dia
                    }
                )
                self.outgoing_queue_url = response['QueueUrl']
                queue_urls['outgoing'] = self.outgoing_queue_url
                logger.info(f"Fila de saída criada: {self.outgoing_queue_url}")
        except ClientError as e:
            logger.error(f"Erro ao criar fila de saída: {str(e)}")
        
        return queue_urls
