"""
Módulo de integração com Asaas para pagamentos via WhatsApp.

Este módulo implementa a integração com a API do Asaas para processamento
de pagamentos via WhatsApp, incluindo PIX, cartão de crédito e débito,
bem como reembolsos automáticos para pedidos não confirmados.
"""

import os
import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

# Configuração de logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class AsaasPaymentStatus(str):
    """Enum para status de pagamento do Asaas."""
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    RECEIVED = "RECEIVED"
    OVERDUE = "OVERDUE"
    REFUNDED = "REFUNDED"
    RECEIVED_IN_CASH = "RECEIVED_IN_CASH"
    REFUND_REQUESTED = "REFUND_REQUESTED"
    CHARGEBACK_REQUESTED = "CHARGEBACK_REQUESTED"
    CHARGEBACK_DISPUTE = "CHARGEBACK_DISPUTE"
    AWAITING_CHARGEBACK_REVERSAL = "AWAITING_CHARGEBACK_REVERSAL"
    DUNNING_REQUESTED = "DUNNING_REQUESTED"
    DUNNING_RECEIVED = "DUNNING_RECEIVED"
    AWAITING_RISK_ANALYSIS = "AWAITING_RISK_ANALYSIS"

class AsaasPaymentMethod(str):
    """Enum para métodos de pagamento do Asaas."""
    BOLETO = "BOLETO"
    CREDIT_CARD = "CREDIT_CARD"
    PIX = "PIX"
    UNDEFINED = "UNDEFINED"

class AsaasPaymentRequest(BaseModel):
    """Modelo para solicitação de pagamento ao Asaas."""
    customer: str
    billingType: str
    value: float
    dueDate: str
    description: str
    externalReference: Optional[str] = None
    installmentCount: Optional[int] = None
    installmentValue: Optional[float] = None
    creditCard: Optional[Dict[str, Any]] = None
    creditCardHolderInfo: Optional[Dict[str, Any]] = None
    remoteIp: Optional[str] = None
    postalCode: Optional[str] = None
    split: Optional[List[Dict[str, Any]]] = None

class AsaasPaymentResponse(BaseModel):
    """Modelo para resposta de pagamento do Asaas."""
    id: str
    dateCreated: str
    customer: str
    value: float
    netValue: float
    billingType: str
    status: str
    dueDate: str
    description: str
    externalReference: Optional[str] = None
    installment: Optional[str] = None
    originalValue: Optional[float] = None
    interestValue: Optional[float] = None
    fineValue: Optional[float] = None
    invoiceUrl: Optional[str] = None
    bankSlipUrl: Optional[str] = None
    invoiceNumber: Optional[str] = None
    deleted: bool
    postalService: bool
    anticipated: bool
    creditCard: Optional[Dict[str, Any]] = None
    pixQrCode: Optional[str] = None
    pixCopiaECola: Optional[str] = None

class AsaasCustomerRequest(BaseModel):
    """Modelo para solicitação de criação de cliente no Asaas."""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobilePhone: Optional[str] = None
    cpfCnpj: Optional[str] = None
    postalCode: Optional[str] = None
    address: Optional[str] = None
    addressNumber: Optional[str] = None
    complement: Optional[str] = None
    province: Optional[str] = None
    externalReference: Optional[str] = None
    notificationDisabled: bool = False
    additionalEmails: Optional[str] = None
    municipalInscription: Optional[str] = None
    stateInscription: Optional[str] = None
    observations: Optional[str] = None

class AsaasCustomerResponse(BaseModel):
    """Modelo para resposta de criação de cliente do Asaas."""
    id: str
    dateCreated: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobilePhone: Optional[str] = None
    cpfCnpj: Optional[str] = None
    postalCode: Optional[str] = None
    address: Optional[str] = None
    addressNumber: Optional[str] = None
    complement: Optional[str] = None
    province: Optional[str] = None
    externalReference: Optional[str] = None
    notificationDisabled: bool
    additionalEmails: Optional[str] = None
    municipalInscription: Optional[str] = None
    stateInscription: Optional[str] = None
    observations: Optional[str] = None
    deleted: bool

class AsaasRefundRequest(BaseModel):
    """Modelo para solicitação de reembolso ao Asaas."""
    value: Optional[float] = None
    description: str

class AsaasRefundResponse(BaseModel):
    """Modelo para resposta de reembolso do Asaas."""
    id: str
    dateCreated: str
    status: str
    value: float
    description: str
    paymentId: str
    type: str

class WhatsAppPaymentIntegration:
    """Classe para integração com Asaas para pagamentos via WhatsApp."""
    
    def __init__(self, api_key: str = None, environment: str = "sandbox"):
        """
        Inicializa a integração com Asaas.
        
        Args:
            api_key: Chave de API do Asaas (opcional, padrão do ambiente)
            environment: Ambiente do Asaas ("sandbox" ou "production")
        """
        # Configurações do Asaas
        self.api_key = api_key or os.environ.get('ASAAS_API_KEY')
        self.environment = environment or os.environ.get('ASAAS_ENVIRONMENT', 'sandbox')
        
        # Definir URL base da API
        if self.environment == "production":
            self.base_url = "https://www.asaas.com/api/v3"
        else:
            self.base_url = "https://sandbox.asaas.com/api/v3"
        
        # Validar configurações
        if not self.api_key:
            logger.warning("Chave de API do Asaas não configurada. A integração de pagamentos não funcionará corretamente.")
        
        # Headers padrão para requisições
        self.headers = {
            "Content-Type": "application/json",
            "access_token": self.api_key
        }
        
        logger.info(f"Integração com Asaas inicializada no ambiente: {self.environment}")
    
    async def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria um cliente no Asaas.
        
        Args:
            customer_data: Dados do cliente
            
        Returns:
            Dict[str, Any]: Resposta da API do Asaas
        """
        if not self.api_key:
            logger.error("Chave de API do Asaas não configurada")
            return {"success": False, "error": "Chave de API do Asaas não configurada"}
        
        try:
            # Criar cliente no Asaas
            response = requests.post(
                f"{self.base_url}/customers",
                headers=self.headers,
                json=customer_data
            )
            
            # Verificar resposta
            response.raise_for_status()
            customer = response.json()
            
            logger.info(f"Cliente criado com sucesso no Asaas: {customer.get('id')}")
            return {
                "success": True,
                "customer": customer
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao criar cliente no Asaas: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def find_customer_by_phone(self, phone: str) -> Dict[str, Any]:
        """
        Busca um cliente no Asaas pelo número de telefone.
        
        Args:
            phone: Número de telefone do cliente
            
        Returns:
            Dict[str, Any]: Resposta da API do Asaas
        """
        if not self.api_key:
            logger.error("Chave de API do Asaas não configurada")
            return {"success": False, "error": "Chave de API do Asaas não configurada"}
        
        try:
            # Buscar cliente no Asaas
            response = requests.get(
                f"{self.base_url}/customers?mobilePhone={phone}",
                headers=self.headers
            )
            
            # Verificar resposta
            response.raise_for_status()
            data = response.json()
            
            # Verificar se encontrou algum cliente
            if data.get('data') and len(data['data']) > 0:
                customer = data['data'][0]
                logger.info(f"Cliente encontrado no Asaas: {customer.get('id')}")
                return {
                    "success": True,
                    "customer": customer,
                    "found": True
                }
            else:
                logger.info(f"Cliente não encontrado no Asaas para o telefone: {phone}")
                return {
                    "success": True,
                    "found": False
                }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao buscar cliente no Asaas: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def create_pix_payment(self, 
                               customer_id: str, 
                               value: float, 
                               description: str,
                               external_reference: str = None,
                               due_date_days: int = 1) -> Dict[str, Any]:
        """
        Cria um pagamento PIX no Asaas.
        
        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            external_reference: Referência externa (opcional)
            due_date_days: Dias para vencimento (opcional, padrão 1 dia)
            
        Returns:
            Dict[str, Any]: Resposta da API do Asaas
        """
        if not self.api_key:
            logger.error("Chave de API do Asaas não configurada")
            return {"success": False, "error": "Chave de API do Asaas não configurada"}
        
        # Calcular data de vencimento
        due_date = (datetime.now() + timedelta(days=due_date_days)).strftime('%Y-%m-%d')
        
        # Preparar dados do pagamento
        payment_data = {
            "customer": customer_id,
            "billingType": AsaasPaymentMethod.PIX,
            "value": value,
            "dueDate": due_date,
            "description": description
        }
        
        # Adicionar referência externa se fornecida
        if external_reference:
            payment_data["externalReference"] = external_reference
        
        try:
            # Criar pagamento no Asaas
            response = requests.post(
                f"{self.base_url}/payments",
                headers=self.headers,
                json=payment_data
            )
            
            # Verificar resposta
            response.raise_for_status()
            payment = response.json()
            
            logger.info(f"Pagamento PIX criado com sucesso no Asaas: {payment.get('id')}")
            return {
                "success": True,
                "payment": payment,
                "pix_code": payment.get('pixQrCode'),
                "pix_copy_paste": payment.get('pixCopiaECola')
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao criar pagamento PIX no Asaas: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def create_credit_card_payment(self, 
                                       customer_id: str, 
                                       value: float, 
                                       description: str,
                                       credit_card: Dict[str, Any],
                                       credit_card_holder_info: Dict[str, Any],
                                       remote_ip: str,
                                       external_reference: str = None,
                                       installment_count: int = 1) -> Dict[str, Any]:
        """
        Cria um pagamento com cartão de crédito no Asaas.
        
        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            credit_card: Dados do cartão de crédito
            credit_card_holder_info: Dados do titular do cartão
            remote_ip: IP do cliente
            external_reference: Referência externa (opcional)
            installment_count: Número de parcelas (opcional, padrão 1)
            
        Returns:
            Dict[str, Any]: Resposta da API do Asaas
        """
        if not self.api_key:
            logger.error("Chave de API do Asaas não configurada")
            return {"success": False, "error": "Chave de API do Asaas não configurada"}
        
        # Calcular data de vencimento (hoje)
        due_date = datetime.now().strftime('%Y-%m-%d')
        
        # Preparar dados do pagamento
        payment_data = {
            "customer": customer_id,
            "billingType": AsaasPaymentMethod.CREDIT_CARD,
            "value": value,
            "dueDate": due_date,
            "description": description,
            "creditCard": credit_card,
            "creditCardHolderInfo": credit_card_holder_info,
            "remoteIp": remote_ip
        }
        
        # Adicionar referência externa se fornecida
        if external_reference:
            payment_data["externalReference"] = external_reference
        
        # Adicionar parcelamento se mais de 1 parcela
        if installment_count > 1:
            payment_data["installmentCount"] = installment_count
            payment_data["installmentValue"] = round(value / installment_count, 2)
        
        try:
            # Criar pagamento no Asaas
            response = requests.post(
                f"{self.base_url}/payments",
                headers=self.headers,
                json=payment_data
            )
            
            # Verificar resposta
            response.raise_for_status()
            payment = response.json()
            
            logger.info(f"Pagamento com cartão criado com sucesso no Asaas: {payment.get('id')}")
            return {
                "success": True,
                "payment": payment
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao criar pagamento com cartão no Asaas: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """
        Obtém o status de um pagamento no Asaas.
        
        Args:
            payment_id: ID do pagamento no Asaas
            
        Returns:
            Dict[str, Any]: Resposta da API do Asaas
        """
        if not self.api_key:
            logger.error("Chave de API do Asaas não configurada")
            return {"success": False, "error": "Chave de API do Asaas não configurada"}
        
        try:
            # Obter pagamento no Asaas
            response = requests.get(
                f"{self.base_url}/payments/{payment_id}",
                headers=self.headers
            )
            
            # Verificar resposta
            response.raise_for_status()
            payment = response.json()
            
            logger.info(f"Status do pagamento obtido com sucesso: {payment.get('status')}")
            return {
                "success": True,
                "payment": payment,
                "status": payment.get('status')
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao obter status do pagamento no Asaas: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def refund_payment(self, payment_id: str, value: float = None, description: str = "Reembolso automático") -> Dict[str, Any]:
        """
        Reembolsa um pagamento no Asaas.
        
        Args:
            payment_id: ID do pagamento no Asaas
            value: Valor do reembolso (opcional, se não informado reembolsa o valor total)
            description: Descrição do reembolso
            
        Returns:
            Dict[str, Any]: Resposta da API do Asaas
        """
        if not self.api_key:
            logger.error("Chave de API do Asaas não configurada")
            return {"success": False, "error": "Chave de API do Asaas não configurada"}
        
        # Preparar dados do reembolso
        refund_data = {
            "description": description
        }
        
        # Adicionar valor se fornecido
        if value is not None:
            refund_data["value"] = value
        
        try:
            # Reembolsar pagamento no Asaas
            response = requests.post(
                f"{self.base_url}/payments/{payment_id}/refund",
                headers=self.headers,
                json=refund_data
            )
            
            # Verificar resposta
            response.raise_for_status()
            refund = response.json()
            
            logger.info(f"Pagamento reembolsado com sucesso no Asaas: {refund.get('id')}")
            return {
                "success": True,
                "refund": refund
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao reembolsar pagamento no Asaas: {str(e)}")
            error_response = None
            try:
                error_response = e.response.json() if hasattr(e, 'response') else None
            except:
                pass
                
            return {
                "success": False,
                "error": str(e),
                "error_response": error_response
            }
    
    async def generate_payment_link(self, payment_id: str) -> str:
        """
        Gera um link de pagamento para um pagamento existente.
        
        Args:
            payment_id: ID do pagamento no Asaas
            
        Returns:
            str: Link de pagamento
        """
        # Obter status do pagamento
        payment_response = await self.get_payment_status(payment_id)
        
        if not payment_response.get("success"):
            logger.error(f"Erro ao gerar link de pagamento: {payment_response.get('error')}")
            return None
        
        payment = payment_response.get("payment")
        
        # Verificar tipo de pagamento
        if payment.get("billingType") == AsaasPaymentMethod.PIX:
            # Para PIX, retornar o QR code
            return payment.get("pixQrCode")
        else:
            # Para outros tipos, retornar o link da fatura
            return payment.get("invoiceUrl")
