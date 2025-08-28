"""
Notification Service
Serviço para envio de notificações SMS e WhatsApp
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Dict
from uuid import UUID, uuid4

import aiohttp
from src.queue.models.queue_models import (
    NotificationMethod,
    NotificationStatus,
    QueueNotification,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Serviço de notificações multi-canal"""

    def __init__(self):
        # Configurações (usar variáveis de ambiente em produção)
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        self.twilio_from_number = os.getenv('TWILIO_FROM_NUMBER', '')

        self.whatsapp_api_url = os.getenv('WHATSAPP_API_URL', '')
        self.whatsapp_token = os.getenv('WHATSAPP_TOKEN', '')

        # Retry configuration
        self.max_retries = 3
        self.retry_delay = 5  # seconds

    async def send_notification(
        self,
        queue_entry_id: str,
        method: NotificationMethod,
        phone: str,
        message: str
    ) -> QueueNotification:
        """Envia notificação pelo método especificado"""

        notification = QueueNotification(
            id=uuid4(),
            queue_entry_id=UUID(queue_entry_id),
            notification_type=method,
            status=NotificationStatus.PENDING,
            message=message,
            created_at=datetime.utcnow(),
            retry_count=0
        )

        try:
            if method == NotificationMethod.SMS:
                success = await self._send_sms(phone, message)
            elif method == NotificationMethod.WHATSAPP:
                success = await self._send_whatsapp(phone, message)
            elif method == NotificationMethod.ANNOUNCEMENT:
                success = await self._send_announcement(message)
            else:
                success = True  # NONE method

            if success:
                notification.status = NotificationStatus.SENT
                notification.sent_at = datetime.utcnow()
                notification.delivered_at = datetime.utcnow()
                logger.info(f"Notification sent successfully via {method}")
            else:
                notification.status = NotificationStatus.FAILED
                notification.error_message = "Failed to send notification"
                logger.error(f"Failed to send notification via {method}")

        except Exception as e:
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            logger.error(f"Error sending notification: {e}")

            # Retry logic
            if notification.retry_count < self.max_retries:
                asyncio.create_task(self._retry_notification(notification, phone))

        return notification

    async def _send_sms(self, phone: str, message: str) -> bool:
        """Envia SMS via Twilio"""
        if not all([self.twilio_account_sid, self.twilio_auth_token, self.twilio_from_number]):
            logger.warning("Twilio credentials not configured - simulating SMS")
            # Simular envio em desenvolvimento
            logger.info(f"[SIMULATED SMS] To: {phone}, Message: {message}")
            return True

        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Messages.json"

            auth = aiohttp.BasicAuth(self.twilio_account_sid, self.twilio_auth_token)

            data = {
                'From': self.twilio_from_number,
                'To': self._format_phone_number(phone),
                'Body': message
            }

            async with aiohttp.ClientSession(auth=auth) as session:
                async with session.post(url, data=data) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        logger.info(f"SMS sent successfully: {result.get('sid')}")
                        return True
                    else:
                        error = await response.text()
                        logger.error(f"Twilio SMS error: {error}")
                        return False

        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return False

    async def _send_whatsapp(self, phone: str, message: str) -> bool:
        """Envia mensagem via WhatsApp Business API"""
        if not all([self.whatsapp_api_url, self.whatsapp_token]):
            logger.warning("WhatsApp API not configured - simulating message")
            # Simular envio em desenvolvimento
            logger.info(f"[SIMULATED WHATSAPP] To: {phone}, Message: {message}")
            return True

        try:
            headers = {
                'Authorization': f'Bearer {self.whatsapp_token}',
                'Content-Type': 'application/json'
            }

            data = {
                'messaging_product': 'whatsapp',
                'to': self._format_phone_number(phone),
                'type': 'text',
                'text': {
                    'body': message
                }
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.whatsapp_api_url,
                    headers=headers,
                    json=data
                ) as response:
                    if response.status in [200, 201]:
                        result = await response.json()
                        logger.info(f"WhatsApp message sent: {result}")
                        return True
                    else:
                        error = await response.text()
                        logger.error(f"WhatsApp API error: {error}")
                        return False

        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {e}")
            return False

    async def _send_announcement(self, message: str) -> bool:
        """Envia anúncio no sistema de som do restaurante"""
        # Integração com sistema de anúncios (implementar conforme hardware)
        logger.info(f"[ANNOUNCEMENT] {message}")

        # Aqui você poderia integrar com:
        # - Sistema de som via API
        # - Text-to-speech
        # - Display de senhas

        return True

    async def _retry_notification(
        self,
        notification: QueueNotification,
        phone: str
    ):
        """Retry de notificação falhada"""
        await asyncio.sleep(self.retry_delay)

        notification.retry_count += 1
        logger.info(f"Retrying notification (attempt {notification.retry_count})")

        # Tentar novamente
        if notification.notification_type == NotificationMethod.SMS:
            success = await self._send_sms(phone, notification.message)
        elif notification.notification_type == NotificationMethod.WHATSAPP:
            success = await self._send_whatsapp(phone, notification.message)
        else:
            success = False

        if success:
            notification.status = NotificationStatus.DELIVERED
            notification.delivered_at = datetime.utcnow()
            logger.info(f"Notification delivered on retry {notification.retry_count}")
        elif notification.retry_count >= self.max_retries:
            notification.status = NotificationStatus.FAILED
            logger.error(f"Notification failed after {self.max_retries} retries")

    def _format_phone_number(self, phone: str) -> str:
        """Formata número de telefone para formato internacional"""
        # Remove caracteres não numéricos
        cleaned = ''.join(filter(str.isdigit, phone))

        # Adicionar código do país se não presente
        if not cleaned.startswith('55'):  # Brasil
            cleaned = '55' + cleaned

        # Adicionar + no início
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned

        return cleaned

    async def send_bulk_notifications(
        self,
        entries: list,
        message_template: str
    ) -> Dict[str, QueueNotification]:
        """Envia notificações em lote"""
        results = {}

        for entry in entries:
            message = message_template.format(
                name=entry.get('customer_name', 'Cliente'),
                position=entry.get('position', ''),
                wait_time=entry.get('estimated_wait_minutes', '')
            )

            notification = await self.send_notification(
                queue_entry_id=entry['id'],
                method=entry.get('notification_method', NotificationMethod.SMS),
                phone=entry['customer_phone'],
                message=message
            )

            results[entry['id']] = notification

        return results

    async def test_notification(
        self,
        method: NotificationMethod,
        phone: str
    ) -> bool:
        """Testa envio de notificação"""
        test_message = "Teste de notificação do sistema Chefia POS. Se você recebeu esta mensagem, o sistema está funcionando corretamente."

        try:
            notification = await self.send_notification(
                queue_entry_id="test",
                method=method,
                phone=phone,
                message=test_message
            )

            return notification.status in [NotificationStatus.SENT, NotificationStatus.DELIVERED]

        except Exception as e:
            logger.error(f"Test notification failed: {e}")
            return False


# Singleton instance
notification_service = NotificationService()
