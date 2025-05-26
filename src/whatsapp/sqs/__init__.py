"""
Pacote de integração SQS para o módulo WhatsApp.

Este pacote contém os componentes necessários para integração
event-based entre o chatbot WhatsApp e o sistema POS via SQS FIFO.
"""

from .sqs_integration import WhatsAppSQSIntegration

__all__ = ['WhatsAppSQSIntegration']
