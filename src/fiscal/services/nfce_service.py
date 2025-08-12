"""
Serviço para gerenciamento de NFC-e (Nota Fiscal de Consumidor Eletrônica)
"""

import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from uuid import uuid4

from src.fiscal.models.nfce_models import (
    NFCeDocument,
    NFCeStatus,
    NFCeResponse,
    NFCeEvent,
    NFCeStateRule,
)

# Configuração de logging
logger = logging.getLogger(__name__)


class NFCeService:
    """
    Serviço para gerenciamento de NFC-e (Nota Fiscal de Consumidor Eletrônica)
    """

    def __init__(self, db_service, certificate_service, config_service):
        """
        Inicializa o serviço de NFC-e

        Args:
            db_service: Serviço de banco de dados
            certificate_service: Serviço de gerenciamento de certificados digitais
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.certificate_service = certificate_service
        self.config_service = config_service
        self.state_rules_cache = {}  # Cache de regras estaduais

        # Inicializa o cache de regras estaduais
        self._initialize_state_rules()

    def _initialize_state_rules(self):
        """Inicializa o cache de regras estaduais"""
        try:
            # Carrega todas as regras estaduais do banco de dados
            rules = self.db_service.find_all("fiscal_nfce_state_rules", {})

            # Popula o cache
            for rule in rules:
                self.state_rules_cache[rule["state_code"]] = rule

            logger.info(f"Regras estaduais de NFC-e carregadas: {len(rules)} estados")
        except Exception as e:
            logger.error(f"Erro ao carregar regras estaduais de NFC-e: {str(e)}")
            # Inicializa com um cache vazio, será preenchido sob demanda
            self.state_rules_cache = {}

    def get_state_rule(self, state_code: str) -> NFCeStateRule:
        """
        Obtém as regras específicas para um estado

        Args:
            state_code: Código do estado (UF)

        Returns:
            Regras específicas do estado
        """
        # Verifica se a regra está no cache
        if state_code in self.state_rules_cache:
            return NFCeStateRule(**self.state_rules_cache[state_code])

        # Se não estiver no cache, busca no banco de dados
        rule = self.db_service.find_one(
            "fiscal_nfce_state_rules", {"state_code": state_code}
        )

        if not rule:
            # Se não encontrar, cria uma regra padrão
            logger.warning(
                f"Regra estadual não encontrada para o estado {state_code}. Usando regra padrão."
            )
            rule = {
                "state_code": state_code,
                "state_name": self._get_state_name(state_code),
                "webservice_url": self._get_default_webservice_url(state_code),
                "certificate_required": True,
                "special_rules": {},
                "active": True,
                "updated_at": datetime.now(),
            }

            # Salva a regra padrão no banco de dados
            self.db_service.insert_one("fiscal_nfce_state_rules", rule)

        # Atualiza o cache
        self.state_rules_cache[state_code] = rule

        return NFCeStateRule(**rule)

    def _get_state_name(self, state_code: str) -> str:
        """Obtém o nome do estado a partir do código"""
        state_names = {
            "AC": "Acre",
            "AL": "Alagoas",
            "AP": "Amapá",
            "AM": "Amazonas",
            "BA": "Bahia",
            "CE": "Ceará",
            "DF": "Distrito Federal",
            "ES": "Espírito Santo",
            "GO": "Goiás",
            "MA": "Maranhão",
            "MT": "Mato Grosso",
            "MS": "Mato Grosso do Sul",
            "MG": "Minas Gerais",
            "PA": "Pará",
            "PB": "Paraíba",
            "PR": "Paraná",
            "PE": "Pernambuco",
            "PI": "Piauí",
            "RJ": "Rio de Janeiro",
            "RN": "Rio Grande do Norte",
            "RS": "Rio Grande do Sul",
            "RO": "Rondônia",
            "RR": "Roraima",
            "SC": "Santa Catarina",
            "SP": "São Paulo",
            "SE": "Sergipe",
            "TO": "Tocantins",
        }
        return state_names.get(state_code, "Estado Desconhecido")

    def _get_default_webservice_url(self, state_code: str) -> str:
        """Obtém a URL padrão do webservice para o estado"""
        # URLs de homologação por padrão
        webservice_urls = {
            "SP": "https://homologacao.nfce.fazenda.sp.gov.br/ws",
            "RJ": "https://homologacao.nfce.fazenda.rj.gov.br/ws",
            "MG": "https://hnfce.fazenda.mg.gov.br/nfce/services",
            # Adicionar outras URLs conforme necessário
        }

        # Retorna a URL específica do estado ou uma URL genérica
        return webservice_urls.get(state_code, "https://homologacao.sefaz.gov.br/ws")

    def create_nfce(self, nfce_data: Dict[str, Any]) -> NFCeDocument:
        """
        Cria uma nova NFC-e

        Args:
            nfce_data: Dados da NFC-e

        Returns:
            Documento NFC-e criado
        """
        # Gera um ID único para a NFC-e
        nfce_id = str(uuid4())

        # Define valores padrão
        nfce_data["id"] = nfce_id
        nfce_data["status"] = NFCeStatus.DRAFT
        nfce_data["created_at"] = datetime.now()
        nfce_data["updated_at"] = datetime.now()
        nfce_data["accounting_exported"] = False

        # Valida os dados da NFC-e
        self._validate_nfce_data(nfce_data)

        # Salva a NFC-e no banco de dados
        self.db_service.insert_one("fiscal_nfce_documents", nfce_data)

        # Retorna o documento criado
        return NFCeDocument(**nfce_data)

    def _validate_nfce_data(self, nfce_data: Dict[str, Any]) -> None:
        """
        Valida os dados da NFC-e

        Args:
            nfce_data: Dados da NFC-e

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = [
            "number",
            "series",
            "issue_date",
            "items",
            "payments",
            "issuer",
            "total_value",
            "total_taxes",
            "state_code",
        ]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in nfce_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se há itens
        if not nfce_data["items"]:
            raise ValueError("A NFC-e deve ter pelo menos um item")

        # Verifica se há pagamentos
        if not nfce_data["payments"]:
            raise ValueError("A NFC-e deve ter pelo menos um pagamento")

        # Verifica se o total dos pagamentos é igual ao valor total
        total_payments = sum(payment["value"] for payment in nfce_data["payments"])
        if (
            abs(total_payments - nfce_data["total_value"]) > 0.01
        ):  # Tolerância de 1 centavo
            raise ValueError(
                f"O total dos pagamentos ({total_payments}) não corresponde ao valor total ({nfce_data['total_value']})"
            )

        # Verifica regras específicas do estado
        state_rule = self.get_state_rule(nfce_data["state_code"])

        # Aplica regras específicas do estado
        for rule_name, rule_value in state_rule.special_rules.items():
            if rule_name == "max_items" and len(nfce_data["items"]) > rule_value:
                raise ValueError(
                    f"Número máximo de itens excedido para o estado {state_rule.state_code}: {rule_value}"
                )

    def get_nfce(self, nfce_id: str) -> Optional[NFCeDocument]:
        """
        Obtém uma NFC-e pelo ID

        Args:
            nfce_id: ID da NFC-e

        Returns:
            Documento NFC-e ou None se não encontrado
        """
        nfce_data = self.db_service.find_one("fiscal_nfce_documents", {"id": nfce_id})

        if not nfce_data:
            return None

        return NFCeDocument(**nfce_data)

    def update_nfce(
        self, nfce_id: str, update_data: Dict[str, Any]
    ) -> Optional[NFCeDocument]:
        """
        Atualiza uma NFC-e

        Args:
            nfce_id: ID da NFC-e
            update_data: Dados a serem atualizados

        Returns:
            Documento NFC-e atualizado ou None se não encontrado
        """
        # Obtém a NFC-e atual
        nfce_data = self.db_service.find_one("fiscal_nfce_documents", {"id": nfce_id})

        if not nfce_data:
            return None

        # Verifica se a NFC-e pode ser atualizada
        if nfce_data["status"] not in [NFCeStatus.DRAFT, NFCeStatus.ERROR]:
            raise ValueError(
                f"NFC-e com status {nfce_data['status']} não pode ser atualizada"
            )

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        nfce_data.update(update_data)

        # Valida os dados atualizados
        self._validate_nfce_data(nfce_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "fiscal_nfce_documents", {"id": nfce_id}, {"$set": update_data}
        )

        # Retorna o documento atualizado
        return NFCeDocument(**nfce_data)

    def send_nfce(self, nfce_id: str) -> Tuple[bool, str, Optional[NFCeResponse]]:
        """
        Envia uma NFC-e para a SEFAZ

        Args:
            nfce_id: ID da NFC-e

        Returns:
            Tupla com (sucesso, mensagem, resposta)
        """
        # Obtém a NFC-e
        nfce = self.get_nfce(nfce_id)

        if not nfce:
            return False, "NFC-e não encontrada", None

        # Verifica se a NFC-e pode ser enviada
        if nfce.status not in [NFCeStatus.DRAFT, NFCeStatus.ERROR]:
            return False, f"NFC-e com status {nfce.status} não pode ser enviada", None

        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(nfce.state_code)

            # Gera o XML da NFC-e
            xml_content = self._generate_nfce_xml(nfce)

            # Atualiza o status para PENDING
            self.update_nfce(
                nfce_id, {"status": NFCeStatus.PENDING, "xml_content": xml_content}
            )

            # Obtém o certificado digital
            if state_rule.certificate_required:
                certificate = self.certificate_service.get_certificate(nfce.issuer.id)
                if not certificate:
                    return False, "Certificado digital não encontrado", None
            else:
                certificate = None

            # Simula o envio para a SEFAZ (em um ambiente real, isso seria uma chamada ao webservice)
            # Aqui estamos apenas simulando uma resposta de sucesso
            response_data = self._simulate_sefaz_response(nfce, state_rule)

            # Cria o objeto de resposta
            response = NFCeResponse(
                authorization_date=datetime.now(),
                authorization_protocol=response_data["protocol"],
                status_code=response_data["status_code"],
                status_message=response_data["status_message"],
                access_key=response_data["access_key"],
                xml_response=response_data["xml_response"],
                qr_code_data=response_data["qr_code_data"],
            )

            # Atualiza a NFC-e com a resposta
            new_status = (
                NFCeStatus.AUTHORIZED
                if response_data["success"]
                else NFCeStatus.REJECTED
            )
            self.update_nfce(
                nfce_id, {"status": new_status, "response": response.dict()}
            )

            return response_data["success"], response_data["status_message"], response

        except Exception as e:
            logger.error(f"Erro ao enviar NFC-e {nfce_id}: {str(e)}")

            # Atualiza o status para ERROR
            self.update_nfce(
                nfce_id,
                {
                    "status": NFCeStatus.ERROR,
                    "response": {
                        "status_code": "500",
                        "status_message": f"Erro ao enviar NFC-e: {str(e)}",
                        "error_details": {"exception": str(e)},
                    },
                },
            )

            return False, f"Erro ao enviar NFC-e: {str(e)}", None

    def _generate_nfce_xml(self, nfce: NFCeDocument) -> str:
        """
        Gera o XML da NFC-e

        Args:
            nfce: Documento NFC-e

        Returns:
            XML da NFC-e
        """
        # Em um ambiente real, isso seria uma implementação completa de geração de XML
        # Aqui estamos apenas gerando um XML simples para demonstração

        root = ET.Element("NFCe")

        # Informações básicas
        identification = ET.SubElement(root, "identification")
        ET.SubElement(identification, "number").text = nfce.number
        ET.SubElement(identification, "series").text = nfce.series
        ET.SubElement(identification, "issue_date").text = nfce.issue_date.isoformat()

        # Emissor
        issuer = ET.SubElement(root, "issuer")
        ET.SubElement(issuer, "name").text = nfce.issuer.name
        ET.SubElement(issuer, "cnpj").text = nfce.issuer.cnpj

        # Itens
        items = ET.SubElement(root, "items")
        for item in nfce.items:
            item_elem = ET.SubElement(items, "item")
            ET.SubElement(item_elem, "product_code").text = item.product_code
            ET.SubElement(item_elem, "description").text = item.product_description
            ET.SubElement(item_elem, "quantity").text = str(item.quantity)
            ET.SubElement(item_elem, "unit_price").text = str(item.unit_price)
            ET.SubElement(item_elem, "total_price").text = str(item.total_price)

        # Totais
        totals = ET.SubElement(root, "totals")
        ET.SubElement(totals, "total_value").text = str(nfce.total_value)
        ET.SubElement(totals, "total_taxes").text = str(nfce.total_taxes)

        # Converte para string
        return ET.tostring(root, encoding="unicode")

    def _simulate_sefaz_response(
        self, nfce: NFCeDocument, state_rule: NFCeStateRule
    ) -> Dict[str, Any]:
        """
        Simula uma resposta da SEFAZ

        Args:
            nfce: Documento NFC-e
            state_rule: Regras do estado

        Returns:
            Dados da resposta simulada
        """
        # Em um ambiente real, isso seria uma resposta do webservice da SEFAZ
        # Aqui estamos apenas simulando uma resposta de sucesso

        # Gera uma chave de acesso simulada
        access_key = f"{nfce.state_code}{''.join([str(i) for i in range(10)])}{nfce.number.zfill(9)}"

        # Gera um protocolo simulado
        protocol = f"{datetime.now().strftime('%Y%m%d%H%M%S')}{nfce.number[-4:]}"

        # Gera dados de QR Code simulados
        qr_code_data = f"https://nfce.sefaz.{nfce.state_code.lower()}.gov.br/qrcode?chNFe={access_key}"

        # Gera XML de resposta simulado
        xml_response = f"""
        <nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
            <protNFe versao="4.00">
                <infProt>
                    <tpAmb>2</tpAmb>
                    <verAplic>SVRS202305241030</verAplic>
                    <chNFe>{access_key}</chNFe>
                    <dhRecbto>{datetime.now().isoformat()}</dhRecbto>
                    <nProt>{protocol}</nProt>
                    <digVal>abc123</digVal>
                    <cStat>100</cStat>
                    <xMotivo>Autorizado o uso da NFC-e</xMotivo>
                </infProt>
            </protNFe>
        </nfeProc>
        """

        return {
            "success": True,
            "status_code": "100",
            "status_message": "Autorizado o uso da NFC-e",
            "access_key": access_key,
            "protocol": protocol,
            "qr_code_data": qr_code_data,
            "xml_response": xml_response,
        }

    def cancel_nfce(
        self, nfce_id: str, reason: str
    ) -> Tuple[bool, str, Optional[NFCeEvent]]:
        """
        Cancela uma NFC-e

        Args:
            nfce_id: ID da NFC-e
            reason: Motivo do cancelamento

        Returns:
            Tupla com (sucesso, mensagem, evento)
        """
        # Obtém a NFC-e
        nfce = self.get_nfce(nfce_id)

        if not nfce:
            return False, "NFC-e não encontrada", None

        # Verifica se a NFC-e pode ser cancelada
        if nfce.status != NFCeStatus.AUTHORIZED:
            return False, f"NFC-e com status {nfce.status} não pode ser cancelada", None

        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(nfce.state_code)

            # Gera um ID único para o evento
            event_id = str(uuid4())

            # Cria o evento de cancelamento
            event_data = {
                "id": event_id,
                "nfce_id": nfce_id,
                "event_type": "cancellation",
                "event_date": datetime.now(),
                "reason": reason,
                "status": "processing",
                "created_at": datetime.now(),
            }

            # Salva o evento no banco de dados
            self.db_service.insert_one("fiscal_nfce_events", event_data)

            # Simula o envio do evento para a SEFAZ
            # Em um ambiente real, isso seria uma chamada ao webservice
            response_data = self._simulate_sefaz_event_response(
                nfce, "cancellation", state_rule
            )

            # Atualiza o evento com a resposta
            event_data.update(
                {
                    "status": "completed" if response_data["success"] else "failed",
                    "protocol": response_data.get("protocol"),
                    "xml_content": response_data.get("xml_content"),
                    "response": response_data,
                }
            )

            self.db_service.update_one(
                "fiscal_nfce_events", {"id": event_id}, {"$set": event_data}
            )

            # Se o cancelamento foi bem-sucedido, atualiza o status da NFC-e
            if response_data["success"]:
                self.update_nfce(nfce_id, {"status": NFCeStatus.CANCELLED})

            return (
                response_data["success"],
                response_data["status_message"],
                NFCeEvent(**event_data),
            )

        except Exception as e:
            logger.error(f"Erro ao cancelar NFC-e {nfce_id}: {str(e)}")
            return False, f"Erro ao cancelar NFC-e: {str(e)}", None

    def _simulate_sefaz_event_response(
        self, nfce: NFCeDocument, event_type: str, state_rule: NFCeStateRule
    ) -> Dict[str, Any]:
        """
        Simula uma resposta da SEFAZ para um evento

        Args:
            nfce: Documento NFC-e
            event_type: Tipo de evento
            state_rule: Regras do estado

        Returns:
            Dados da resposta simulada
        """
        # Em um ambiente real, isso seria uma resposta do webservice da SEFAZ
        # Aqui estamos apenas simulando uma resposta de sucesso

        # Gera um protocolo simulado
        protocol = f"{datetime.now().strftime('%Y%m%d%H%M%S')}{nfce.number[-4:]}"

        # Gera XML de resposta simulado
        xml_content = f"""
        <procEventoNFe versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
            <retEvento versao="1.00">
                <infEvento>
                    <tpAmb>2</tpAmb>
                    <verAplic>SVRS202305241030</verAplic>
                    <cStat>135</cStat>
                    <xMotivo>Evento registrado e vinculado a NFC-e</xMotivo>
                    <chNFe>{nfce.response.access_key if nfce.response else 'chave_simulada'}</chNFe>
                    <tpEvento>110111</tpEvento>
                    <nSeqEvento>1</nSeqEvento>
                    <dhRegEvento>{datetime.now().isoformat()}</dhRegEvento>
                    <nProt>{protocol}</nProt>
                </infEvento>
            </retEvento>
        </procEventoNFe>
        """

        return {
            "success": True,
            "status_code": "135",
            "status_message": "Evento registrado e vinculado a NFC-e",
            "protocol": protocol,
            "xml_content": xml_content,
        }

    def list_nfce(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[NFCeDocument], int]:
        """
        Lista NFC-e com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de documentos, total de documentos)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os documentos no banco de dados
        documents = self.db_service.find(
            "fiscal_nfce_documents",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("issue_date", -1)],
        )

        # Conta o total de documentos
        total = self.db_service.count("fiscal_nfce_documents", filters)

        # Converte para objetos NFCeDocument
        nfce_documents = [NFCeDocument(**doc) for doc in documents]

        return nfce_documents, total

    def mark_as_exported(self, nfce_id: str) -> bool:
        """
        Marca uma NFC-e como exportada para contabilidade

        Args:
            nfce_id: ID da NFC-e

        Returns:
            True se a operação foi bem-sucedida, False caso contrário
        """
        # Obtém a NFC-e
        nfce = self.get_nfce(nfce_id)

        if not nfce:
            return False

        # Verifica se a NFC-e pode ser marcada como exportada
        if nfce.status not in [NFCeStatus.AUTHORIZED, NFCeStatus.CANCELLED]:
            return False

        # Atualiza o campo accounting_exported
        self.update_nfce(nfce_id, {"accounting_exported": True})

        return True

    def get_nfce_for_accounting(
        self, start_date: datetime, end_date: datetime
    ) -> List[NFCeDocument]:
        """
        Obtém NFC-e para exportação contábil em um período

        Args:
            start_date: Data inicial
            end_date: Data final

        Returns:
            Lista de documentos NFC-e
        """
        # Busca NFC-e autorizadas ou canceladas que não foram exportadas
        filters = {
            "issue_date": {"$gte": start_date, "$lte": end_date},
            "status": {"$in": [NFCeStatus.AUTHORIZED, NFCeStatus.CANCELLED]},
            "accounting_exported": False,
        }

        # Busca os documentos no banco de dados
        documents = self.db_service.find(
            "fiscal_nfce_documents", filters, sort=[("issue_date", 1)]
        )

        # Converte para objetos NFCeDocument
        nfce_documents = [NFCeDocument(**doc) for doc in documents]

        return nfce_documents
