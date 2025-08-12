from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import aiohttp

from src.payment.models.payment_models import AsaasConfig
from src.payment.models.split_models import (
    SplitConfig,
    SplitType,
    SplitTransaction,
    RetentionTransaction,
    SplitPaymentRecord,
)

logger = logging.getLogger(__name__)


class AsaasAdapter:
    """Adaptador para integração com a API do Asaas para processamento de pagamentos."""

    def __init__(self, config: AsaasConfig = None):
        """
        Inicializa o adaptador Asaas.

        Args:
            config: Configuração do Asaas
        """
        if config:
            self.api_key = config.api_key
            self.environment = config.environment
            self.webhook_token = config.webhook_token
            self.base_url = (
                "https://sandbox.asaas.com/api/v3"
                if config.environment == "sandbox"
                else "https://www.asaas.com/api/v3"
            )
            self.headers = {
                "access_token": self.api_key,
                "Content-Type": "application/json",
            }
        else:
            self.api_key = None
            self.environment = "sandbox"
            self.webhook_token = None
            self.base_url = "https://sandbox.asaas.com/api/v3"
            self.headers = {"Content-Type": "application/json"}

    def configure(self, config: AsaasConfig):
        """
        Configura o adaptador com as credenciais do Asaas.

        Args:
            config: Configuração do Asaas
        """
        self.api_key = config.api_key
        self.environment = config.environment
        self.webhook_token = config.webhook_token
        self.base_url = (
            "https://sandbox.asaas.com/api/v3"
            if config.environment == "sandbox"
            else "https://www.asaas.com/api/v3"
        )
        self.headers = {
            "access_token": self.api_key,
            "Content-Type": "application/json",
        }

    async def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria um novo cliente no Asaas.

        Args:
            customer_data: Dados do cliente

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/customers"

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=customer_data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao criar cliente no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao criar cliente no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def get_customer(self, customer_id: str) -> Dict[str, Any]:
        """
        Obtém um cliente pelo ID.

        Args:
            customer_id: ID do cliente no Asaas

        Returns:
            Dict: Dados do cliente
        """
        endpoint = f"{self.base_url}/customers/{customer_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao obter cliente no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao obter cliente no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def find_customer_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Busca um cliente pelo e-mail.

        Args:
            email: E-mail do cliente

        Returns:
            Dict: Dados do cliente ou None
        """
        endpoint = f"{self.base_url}/customers?email={email}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao buscar cliente no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao buscar cliente no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                if response_data.get("data") and len(response_data["data"]) > 0:
                    return response_data["data"][0]

                return None

    def _format_split_config(self, split_config: SplitConfig) -> List[Dict[str, Any]]:
        """
        Formata a configuração de split para o formato esperado pela API do Asaas.

        Args:
            split_config: Configuração de split

        Returns:
            List[Dict]: Lista de destinatários formatada para a API
        """
        split_data = []

        # Adicionar destinatários
        for recipient in split_config.recipients:
            split_item = {"walletId": recipient.wallet_id}

            if recipient.type == SplitType.PERCENTAGE:
                split_item["percentualValue"] = recipient.value
            else:
                split_item["fixedValue"] = recipient.value

            split_data.append(split_item)

        # Adicionar retenção se configurada
        if split_config.retention_config:
            retention = split_config.retention_config
            split_item = {"walletId": retention.wallet_id}

            if retention.type == SplitType.PERCENTAGE:
                split_item["percentualValue"] = retention.value
            else:
                split_item["fixedValue"] = retention.value

            split_data.append(split_item)

        return split_data

    async def create_payment(
        self, payment_data: Dict[str, Any], split_config: Optional[SplitConfig] = None
    ) -> Dict[str, Any]:
        """
        Cria um novo pagamento no Asaas.

        Args:
            payment_data: Dados do pagamento
            split_config: Configuração de divisão (opcional)

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/payments"

        # Adicionar configuração de split se fornecida
        if split_config and split_config.recipients:
            payment_data["split"] = self._format_split_config(split_config)

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=payment_data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao criar pagamento no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao criar pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Obtém um pagamento pelo ID.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            Dict: Dados do pagamento
        """
        endpoint = f"{self.base_url}/payments/{payment_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao obter pagamento no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao obter pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def cancel_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Cancela um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/payments/{payment_id}"

        async with aiohttp.ClientSession() as session:
            async with session.delete(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao cancelar pagamento no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao cancelar pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def refund_payment(
        self, payment_id: str, value: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Reembolsa um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas
            value: Valor a ser reembolsado (opcional, se não fornecido, reembolsa o valor total)

        Returns:
            Dict: Resposta da API
        """
        endpoint = f"{self.base_url}/payments/{payment_id}/refund"

        data = {}
        if value is not None:
            data["value"] = value

        async with aiohttp.ClientSession() as session:
            async with session.post(
                endpoint, headers=self.headers, json=data
            ) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao reembolsar pagamento no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao reembolsar pagamento no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def create_pix_payment(
        self,
        customer_id: str,
        value: float,
        description: str,
        due_date: str,
        split_config: Optional[SplitConfig] = None,
        external_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pagamento via PIX.

        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            due_date: Data de vencimento (formato: YYYY-MM-DD)
            split_config: Configuração de divisão (opcional)
            external_reference: Referência externa (opcional)

        Returns:
            Dict: Resposta da API com dados do PIX
        """
        payment_data = {
            "customer": customer_id,
            "billingType": "PIX",
            "value": value,
            "description": description,
            "dueDate": due_date,
        }

        if external_reference:
            payment_data["externalReference"] = external_reference

        # Criar pagamento
        payment = await self.create_payment(payment_data, split_config)

        # Obter QR Code PIX
        pix_data = await self.get_pix_qrcode(payment["id"])

        # Combinar dados
        payment["pix"] = pix_data

        return payment

    async def get_pix_qrcode(self, payment_id: str) -> Dict[str, Any]:
        """
        Obtém o QR Code PIX de um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            Dict: Dados do QR Code PIX
        """
        endpoint = f"{self.base_url}/payments/{payment_id}/pixQrCode"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(f"Erro ao obter QR Code PIX no Asaas: {response_data}")
                    raise Exception(
                        f"Erro ao obter QR Code PIX no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data

    async def create_credit_card_payment(
        self,
        customer_id: str,
        value: float,
        description: str,
        credit_card_data: Dict[str, Any],
        split_config: Optional[SplitConfig] = None,
        external_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pagamento via cartão de crédito.

        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            credit_card_data: Dados do cartão de crédito
            split_config: Configuração de divisão (opcional)
            external_reference: Referência externa (opcional)

        Returns:
            Dict: Resposta da API
        """
        payment_data = {
            "customer": customer_id,
            "billingType": "CREDIT_CARD",
            "value": value,
            "description": description,
            "creditCard": credit_card_data,
        }

        if external_reference:
            payment_data["externalReference"] = external_reference

        return await self.create_payment(payment_data, split_config)

    async def create_debit_card_payment(
        self,
        customer_id: str,
        value: float,
        description: str,
        debit_card_data: Dict[str, Any],
        split_config: Optional[SplitConfig] = None,
        external_reference: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cria um pagamento via cartão de débito.

        Args:
            customer_id: ID do cliente no Asaas
            value: Valor do pagamento
            description: Descrição do pagamento
            debit_card_data: Dados do cartão de débito
            split_config: Configuração de divisão (opcional)
            external_reference: Referência externa (opcional)

        Returns:
            Dict: Resposta da API
        """
        payment_data = {
            "customer": customer_id,
            "billingType": "DEBIT_CARD",
            "value": value,
            "description": description,
            "debitCard": debit_card_data,
        }

        if external_reference:
            payment_data["externalReference"] = external_reference

        return await self.create_payment(payment_data, split_config)

    async def validate_wallet(self, wallet_id: str) -> bool:
        """
        Valida se uma carteira existe no Asaas.

        Args:
            wallet_id: ID da carteira no Asaas

        Returns:
            bool: True se a carteira existe, False caso contrário
        """
        endpoint = f"{self.base_url}/wallets/{wallet_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                return response.status == 200

    async def get_wallet(self, wallet_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém detalhes de uma carteira no Asaas.

        Args:
            wallet_id: ID da carteira no Asaas

        Returns:
            Dict: Dados da carteira ou None se não existir
        """
        endpoint = f"{self.base_url}/wallets/{wallet_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                if response.status != 200:
                    return None

                return await response.json()

    async def get_transfers(self, payment_id: str) -> List[Dict[str, Any]]:
        """
        Obtém as transferências relacionadas a um pagamento.

        Args:
            payment_id: ID do pagamento no Asaas

        Returns:
            List[Dict]: Lista de transferências
        """
        endpoint = f"{self.base_url}/transfers?payment={payment_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, headers=self.headers) as response:
                response_data = await response.json()

                if response.status >= 400:
                    logger.error(
                        f"Erro ao obter transferências no Asaas: {response_data}"
                    )
                    raise Exception(
                        f"Erro ao obter transferências no Asaas: {response_data.get('errors', [{'description': 'Erro desconhecido'}])[0].get('description')}"
                    )

                return response_data.get("data", [])

    async def calculate_split_values(
        self, total_value: float, split_config: SplitConfig
    ) -> Dict[str, Any]:
        """
        Calcula os valores de divisão com base na configuração.

        Args:
            total_value: Valor total do pagamento
            split_config: Configuração de divisão

        Returns:
            Dict: Valores calculados para cada destinatário e retenção
        """
        result = {
            "total_value": total_value,
            "recipients": [],
            "retention": None,
            "remaining_value": total_value,
        }

        # Calcular valores fixos primeiro
        for recipient in split_config.recipients:
            if recipient.type == SplitType.FIXED:
                calculated_value = recipient.value
                result["recipients"].append(
                    {
                        "recipient_id": recipient.id,
                        "wallet_id": recipient.wallet_id,
                        "type": recipient.type,
                        "value": recipient.value,
                        "calculated_value": calculated_value,
                    }
                )
                result["remaining_value"] -= calculated_value

        # Calcular retenção fixa
        if (
            split_config.retention_config
            and split_config.retention_config.type == SplitType.FIXED
        ):
            retention = split_config.retention_config
            calculated_value = retention.value
            result["retention"] = {
                "type": retention.type,
                "value": retention.value,
                "calculated_value": calculated_value,
                "wallet_id": retention.wallet_id,
            }
            result["remaining_value"] -= calculated_value

        # Calcular valores percentuais
        for recipient in split_config.recipients:
            if recipient.type == SplitType.PERCENTAGE:
                calculated_value = (recipient.value / 100) * total_value
                result["recipients"].append(
                    {
                        "recipient_id": recipient.id,
                        "wallet_id": recipient.wallet_id,
                        "type": recipient.type,
                        "value": recipient.value,
                        "calculated_value": calculated_value,
                    }
                )
                result["remaining_value"] -= calculated_value

        # Calcular retenção percentual
        if (
            split_config.retention_config
            and split_config.retention_config.type == SplitType.PERCENTAGE
        ):
            retention = split_config.retention_config
            calculated_value = (retention.value / 100) * total_value
            result["retention"] = {
                "type": retention.type,
                "value": retention.value,
                "calculated_value": calculated_value,
                "wallet_id": retention.wallet_id,
            }
            result["remaining_value"] -= calculated_value

        # Arredondar valores para 2 casas decimais
        result["remaining_value"] = round(result["remaining_value"], 2)
        for recipient in result["recipients"]:
            recipient["calculated_value"] = round(recipient["calculated_value"], 2)

        if result["retention"]:
            result["retention"]["calculated_value"] = round(
                result["retention"]["calculated_value"], 2
            )

        return result

    async def create_split_payment_record(
        self,
        payment_id: str,
        provider_payment_id: str,
        split_config: SplitConfig,
        total_value: float,
    ) -> SplitPaymentRecord:
        """
        Cria um registro de pagamento com split.

        Args:
            payment_id: ID do pagamento no sistema
            provider_payment_id: ID do pagamento no Asaas
            split_config: Configuração de divisão
            total_value: Valor total do pagamento

        Returns:
            SplitPaymentRecord: Registro de pagamento com split
        """
        # Calcular valores
        split_values = await self.calculate_split_values(total_value, split_config)

        # Criar transações de split
        split_transactions = []
        for recipient_data in split_values["recipients"]:
            split_transactions.append(
                SplitTransaction(
                    payment_id=payment_id,
                    recipient_id=recipient_data["recipient_id"],
                    wallet_id=recipient_data["wallet_id"],
                    type=recipient_data["type"],
                    value=recipient_data["value"],
                    calculated_value=recipient_data["calculated_value"],
                )
            )

        # Criar transação de retenção se houver
        retention_transaction = None
        if split_values["retention"]:
            retention_data = split_values["retention"]
            retention_transaction = RetentionTransaction(
                payment_id=payment_id,
                type=retention_data["type"],
                value=retention_data["value"],
                calculated_value=retention_data["calculated_value"],
                wallet_id=retention_data["wallet_id"],
            )

        # Criar registro de pagamento com split
        return SplitPaymentRecord(
            payment_id=payment_id,
            provider_payment_id=provider_payment_id,
            split_config_id=split_config.id,
            total_value=total_value,
            net_value=split_values["remaining_value"],
            splits=split_transactions,
            retention=retention_transaction,
        )

    async def update_split_transactions_status(
        self, split_payment_record: SplitPaymentRecord
    ) -> SplitPaymentRecord:
        """
        Atualiza o status das transações de split com base nas transferências do Asaas.

        Args:
            split_payment_record: Registro de pagamento com split

        Returns:
            SplitPaymentRecord: Registro atualizado
        """
        # Obter transferências do Asaas
        transfers = await self.get_transfers(split_payment_record.provider_payment_id)

        # Mapear transferências por carteira
        transfers_by_wallet = {}
        for transfer in transfers:
            wallet_id = transfer.get("wallet", {}).get("id")
            if wallet_id:
                transfers_by_wallet[wallet_id] = transfer

        # Atualizar status das transações de split
        for split in split_payment_record.splits:
            if split.wallet_id in transfers_by_wallet:
                transfer = transfers_by_wallet[split.wallet_id]
                split.status = (
                    "transferred"
                    if transfer.get("status") == "CONFIRMED"
                    else "pending"
                )
                split.transfer_id = transfer.get("id")
                split.transferred_at = (
                    datetime.fromisoformat(
                        transfer.get("transferDate").replace("Z", "+00:00")
                    )
                    if transfer.get("transferDate")
                    else None
                )
                split.updated_at = datetime.utcnow()

        # Atualizar status da transação de retenção
        if (
            split_payment_record.retention
            and split_payment_record.retention.wallet_id in transfers_by_wallet
        ):
            transfer = transfers_by_wallet[split_payment_record.retention.wallet_id]
            split_payment_record.retention.updated_at = datetime.utcnow()

        split_payment_record.updated_at = datetime.utcnow()

        return split_payment_record
