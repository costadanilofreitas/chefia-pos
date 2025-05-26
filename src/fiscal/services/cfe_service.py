"""
Serviço para gerenciamento de CF-e (Cupom Fiscal Eletrônico)
"""

import os
import logging
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from uuid import uuid4

from src.fiscal.models.cfe_models import (
    CFeDocument, CFeStatus, CFeItem, CFeResponse, 
    CFeEvent, CFeStateRule
)

# Configuração de logging
logger = logging.getLogger(__name__)


class CFeService:
    """
    Serviço para gerenciamento de CF-e (Cupom Fiscal Eletrônico)
    """
    
    def __init__(self, db_service, sat_service, config_service):
        """
        Inicializa o serviço de CF-e
        
        Args:
            db_service: Serviço de banco de dados
            sat_service: Serviço de comunicação com equipamento SAT
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.sat_service = sat_service
        self.config_service = config_service
        self.state_rules_cache = {}  # Cache de regras estaduais
        
        # Inicializa o cache de regras estaduais
        self._initialize_state_rules()
    
    def _initialize_state_rules(self):
        """Inicializa o cache de regras estaduais"""
        try:
            # Carrega todas as regras estaduais do banco de dados
            rules = self.db_service.find_all("fiscal_cfe_state_rules", {})
            
            # Popula o cache
            for rule in rules:
                self.state_rules_cache[rule["state_code"]] = rule
                
            logger.info(f"Regras estaduais de CF-e carregadas: {len(rules)} estados")
        except Exception as e:
            logger.error(f"Erro ao carregar regras estaduais de CF-e: {str(e)}")
            # Inicializa com um cache vazio, será preenchido sob demanda
            self.state_rules_cache = {}
    
    def get_state_rule(self, state_code: str) -> CFeStateRule:
        """
        Obtém as regras específicas para um estado
        
        Args:
            state_code: Código do estado (UF)
            
        Returns:
            Regras específicas do estado
        """
        # Verifica se a regra está no cache
        if state_code in self.state_rules_cache:
            return CFeStateRule(**self.state_rules_cache[state_code])
        
        # Se não estiver no cache, busca no banco de dados
        rule = self.db_service.find_one("fiscal_cfe_state_rules", {"state_code": state_code})
        
        if not rule:
            # Se não encontrar, cria uma regra padrão
            logger.warning(f"Regra estadual não encontrada para o estado {state_code}. Usando regra padrão.")
            rule = {
                "state_code": state_code,
                "state_name": self._get_state_name(state_code),
                "requires_mfe": self._check_if_requires_mfe(state_code),
                "special_rules": {},
                "active": True,
                "updated_at": datetime.now()
            }
            
            # Salva a regra padrão no banco de dados
            self.db_service.insert_one("fiscal_cfe_state_rules", rule)
        
        # Atualiza o cache
        self.state_rules_cache[state_code] = rule
        
        return CFeStateRule(**rule)
    
    def _get_state_name(self, state_code: str) -> str:
        """Obtém o nome do estado a partir do código"""
        state_names = {
            "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
            "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
            "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
            "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
            "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
            "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
            "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
        }
        return state_names.get(state_code, "Estado Desconhecido")
    
    def _check_if_requires_mfe(self, state_code: str) -> bool:
        """Verifica se o estado requer MFE em vez de SAT"""
        # Estados que utilizam MFE em vez de SAT
        mfe_states = ["CE", "RN", "SE", "AL", "PE"]
        return state_code in mfe_states
    
    def create_cfe(self, cfe_data: Dict[str, Any]) -> CFeDocument:
        """
        Cria um novo CF-e
        
        Args:
            cfe_data: Dados do CF-e
            
        Returns:
            Documento CF-e criado
        """
        # Gera um ID único para o CF-e
        cfe_id = str(uuid4())
        
        # Define valores padrão
        cfe_data["id"] = cfe_id
        cfe_data["status"] = CFeStatus.DRAFT
        cfe_data["created_at"] = datetime.now()
        cfe_data["updated_at"] = datetime.now()
        cfe_data["accounting_exported"] = False
        
        # Verifica se o estado requer MFE
        state_rule = self.get_state_rule(cfe_data["state_code"])
        if state_rule.requires_mfe:
            # Obtém o equipamento MFE disponível
            mfe_equipment = self._get_available_mfe_equipment(cfe_data["state_code"])
            if mfe_equipment:
                cfe_data["sat_equipment_id"] = mfe_equipment["id"]
            else:
                raise ValueError(f"Nenhum equipamento MFE disponível para o estado {cfe_data['state_code']}")
        else:
            # Obtém o equipamento SAT disponível
            sat_equipment = self._get_available_sat_equipment()
            if sat_equipment:
                cfe_data["sat_equipment_id"] = sat_equipment["id"]
            else:
                raise ValueError("Nenhum equipamento SAT disponível")
        
        # Valida os dados do CF-e
        self._validate_cfe_data(cfe_data)
        
        # Salva o CF-e no banco de dados
        self.db_service.insert_one("fiscal_cfe_documents", cfe_data)
        
        # Retorna o documento criado
        return CFeDocument(**cfe_data)
    
    def _get_available_sat_equipment(self) -> Optional[Dict[str, Any]]:
        """
        Obtém um equipamento SAT disponível
        
        Returns:
            Dados do equipamento SAT ou None se não encontrado
        """
        # Em um ambiente real, isso buscaria um equipamento SAT ativo no banco de dados
        # Aqui estamos apenas simulando um equipamento
        return {
            "id": "sat-001",
            "serial_number": "900004819",
            "model": "SAT v2.0",
            "manufacturer": "SWEDA",
            "status": "active"
        }
    
    def _get_available_mfe_equipment(self, state_code: str) -> Optional[Dict[str, Any]]:
        """
        Obtém um equipamento MFE disponível para o estado
        
        Args:
            state_code: Código do estado (UF)
            
        Returns:
            Dados do equipamento MFE ou None se não encontrado
        """
        # Em um ambiente real, isso buscaria um equipamento MFE ativo para o estado no banco de dados
        # Aqui estamos apenas simulando um equipamento
        return {
            "id": f"mfe-{state_code.lower()}-001",
            "serial_number": f"MFE{state_code}123456",
            "model": "MFE v1.0",
            "manufacturer": "DIMEP",
            "status": "active",
            "state_code": state_code
        }
    
    def _validate_cfe_data(self, cfe_data: Dict[str, Any]) -> None:
        """
        Valida os dados do CF-e
        
        Args:
            cfe_data: Dados do CF-e
            
        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = ["number", "issue_date", "items", "payments", 
                          "issuer", "total_value", "total_taxes", "state_code"]
        
        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in cfe_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")
        
        # Verifica se há itens
        if not cfe_data["items"]:
            raise ValueError("O CF-e deve ter pelo menos um item")
        
        # Verifica se há pagamentos
        if not cfe_data["payments"]:
            raise ValueError("O CF-e deve ter pelo menos um pagamento")
        
        # Verifica se o total dos pagamentos é igual ao valor total
        total_payments = sum(payment["value"] for payment in cfe_data["payments"])
        if abs(total_payments - cfe_data["total_value"]) > 0.01:  # Tolerância de 1 centavo
            raise ValueError(f"O total dos pagamentos ({total_payments}) não corresponde ao valor total ({cfe_data['total_value']})")
        
        # Verifica regras específicas do estado
        state_rule = self.get_state_rule(cfe_data["state_code"])
        
        # Aplica regras específicas do estado
        for rule_name, rule_value in state_rule.special_rules.items():
            if rule_name == "max_items" and len(cfe_data["items"]) > rule_value:
                raise ValueError(f"Número máximo de itens excedido para o estado {state_rule.state_code}: {rule_value}")
    
    def get_cfe(self, cfe_id: str) -> Optional[CFeDocument]:
        """
        Obtém um CF-e pelo ID
        
        Args:
            cfe_id: ID do CF-e
            
        Returns:
            Documento CF-e ou None se não encontrado
        """
        cfe_data = self.db_service.find_one("fiscal_cfe_documents", {"id": cfe_id})
        
        if not cfe_data:
            return None
        
        return CFeDocument(**cfe_data)
    
    def update_cfe(self, cfe_id: str, update_data: Dict[str, Any]) -> Optional[CFeDocument]:
        """
        Atualiza um CF-e
        
        Args:
            cfe_id: ID do CF-e
            update_data: Dados a serem atualizados
            
        Returns:
            Documento CF-e atualizado ou None se não encontrado
        """
        # Obtém o CF-e atual
        cfe_data = self.db_service.find_one("fiscal_cfe_documents", {"id": cfe_id})
        
        if not cfe_data:
            return None
        
        # Verifica se o CF-e pode ser atualizado
        if cfe_data["status"] not in [CFeStatus.DRAFT, CFeStatus.ERROR]:
            raise ValueError(f"CF-e com status {cfe_data['status']} não pode ser atualizado")
        
        # Atualiza os dados
        update_data["updated_at"] = datetime.now()
        
        # Mescla os dados atuais com os novos dados
        cfe_data.update(update_data)
        
        # Valida os dados atualizados
        self._validate_cfe_data(cfe_data)
        
        # Atualiza no banco de dados
        self.db_service.update_one("fiscal_cfe_documents", {"id": cfe_id}, {"$set": update_data})
        
        # Retorna o documento atualizado
        return CFeDocument(**cfe_data)
    
    def send_cfe(self, cfe_id: str) -> Tuple[bool, str, Optional[CFeResponse]]:
        """
        Envia um CF-e para o SAT/MFE
        
        Args:
            cfe_id: ID do CF-e
            
        Returns:
            Tupla com (sucesso, mensagem, resposta)
        """
        # Obtém o CF-e
        cfe = self.get_cfe(cfe_id)
        
        if not cfe:
            return False, "CF-e não encontrado", None
        
        # Verifica se o CF-e pode ser enviado
        if cfe.status not in [CFeStatus.DRAFT, CFeStatus.ERROR]:
            return False, f"CF-e com status {cfe.status} não pode ser enviado", None
        
        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(cfe.state_code)
            
            # Gera o XML do CF-e
            xml_content = self._generate_cfe_xml(cfe)
            
            # Atualiza o status para PENDING
            self.update_cfe(cfe_id, {"status": CFeStatus.PENDING, "xml_content": xml_content})
            
            # Verifica se o estado usa MFE ou SAT
            if state_rule.requires_mfe:
                # Simula o envio para o MFE
                response_data = self._simulate_mfe_response(cfe, state_rule)
            else:
                # Simula o envio para o SAT
                response_data = self._simulate_sat_response(cfe)
            
            # Cria o objeto de resposta
            response = CFeResponse(
                authorization_date=datetime.now(),
                authorization_protocol=response_data["protocol"],
                status_code=response_data["status_code"],
                status_message=response_data["status_message"],
                access_key=response_data["access_key"],
                xml_response=response_data["xml_response"],
                qr_code_data=response_data["qr_code_data"],
                sat_serial_number=response_data.get("sat_serial_number")
            )
            
            # Atualiza o CF-e com a resposta
            new_status = CFeStatus.AUTHORIZED if response_data["success"] else CFeStatus.REJECTED
            self.update_cfe(cfe_id, {
                "status": new_status,
                "response": response.dict()
            })
            
            return response_data["success"], response_data["status_message"], response
            
        except Exception as e:
            logger.error(f"Erro ao enviar CF-e {cfe_id}: {str(e)}")
            
            # Atualiza o status para ERROR
            self.update_cfe(cfe_id, {
                "status": CFeStatus.ERROR,
                "response": {
                    "status_code": "500",
                    "status_message": f"Erro ao enviar CF-e: {str(e)}",
                    "error_details": {"exception": str(e)}
                }
            })
            
            return False, f"Erro ao enviar CF-e: {str(e)}", None
    
    def _generate_cfe_xml(self, cfe: CFeDocument) -> str:
        """
        Gera o XML do CF-e
        
        Args:
            cfe: Documento CF-e
            
        Returns:
            XML do CF-e
        """
        # Em um ambiente real, isso seria uma implementação completa de geração de XML
        # Aqui estamos apenas gerando um XML simples para demonstração
        
        root = ET.Element("CFe")
        
        # Informações básicas
        identification = ET.SubElement(root, "identification")
        ET.SubElement(identification, "number").text = cfe.number
        ET.SubElement(identification, "issue_date").text = cfe.issue_date.isoformat()
        
        # Emissor
        issuer = ET.SubElement(root, "issuer")
        ET.SubElement(issuer, "name").text = cfe.issuer.name
        ET.SubElement(issuer, "cnpj").text = cfe.issuer.cnpj
        
        # Itens
        items = ET.SubElement(root, "items")
        for item in cfe.items:
            item_elem = ET.SubElement(items, "item")
            ET.SubElement(item_elem, "product_code").text = item.product_code
            ET.SubElement(item_elem, "description").text = item.product_description
            ET.SubElement(item_elem, "quantity").text = str(item.quantity)
            ET.SubElement(item_elem, "unit_price").text = str(item.unit_price)
            ET.SubElement(item_elem, "total_price").text = str(item.total_price)
        
        # Totais
        totals = ET.SubElement(root, "totals")
        ET.SubElement(totals, "total_value").text = str(cfe.total_value)
        ET.SubElement(totals, "total_taxes").text = str(cfe.total_taxes)
        
        # Converte para string
        return ET.tostring(root, encoding="unicode")
    
    def _simulate_sat_response(self, cfe: CFeDocument) -> Dict[str, Any]:
        """
        Simula uma resposta do SAT
        
        Args:
            cfe: Documento CF-e
            
        Returns:
            Dados da resposta simulada
        """
        # Em um ambiente real, isso seria uma resposta do equipamento SAT
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Gera uma chave de acesso simulada
        access_key = f"CFe{cfe.state_code}{''.join([str(i) for i in range(10)])}{cfe.number.zfill(6)}"
        
        # Gera um protocolo simulado
        protocol = f"SAT{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Gera dados de QR Code simulados
        qr_code_data = f"https://satsp.fazenda.sp.gov.br/NFCE/qrcode?chNFe={access_key}"
        
        # Gera XML de resposta simulado
        xml_response = f"""
        <CFe>
            <infCFe versao="0.07">
                <ide>
                    <cUF>{self._get_state_code_number(cfe.state_code)}</cUF>
                    <cNF>{cfe.number}</cNF>
                    <mod>59</mod>
                </ide>
                <emit>
                    <CNPJ>{cfe.issuer.cnpj}</CNPJ>
                    <xNome>{cfe.issuer.name}</xNome>
                </emit>
                <dest></dest>
                <total>
                    <vCFe>{cfe.total_value}</vCFe>
                </total>
            </infCFe>
        </CFe>
        """
        
        return {
            "success": True,
            "status_code": "6000",
            "status_message": "Emissão de CF-e-SAT realizada com sucesso",
            "access_key": access_key,
            "protocol": protocol,
            "qr_code_data": qr_code_data,
            "xml_response": xml_response,
            "sat_serial_number": "900004819"
        }
    
    def _simulate_mfe_response(self, cfe: CFeDocument, state_rule: CFeStateRule) -> Dict[str, Any]:
        """
        Simula uma resposta do MFE
        
        Args:
            cfe: Documento CF-e
            state_rule: Regras do estado
            
        Returns:
            Dados da resposta simulada
        """
        # Em um ambiente real, isso seria uma resposta do equipamento MFE
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Gera uma chave de acesso simulada
        access_key = f"MFe{cfe.state_code}{''.join([str(i) for i in range(10)])}{cfe.number.zfill(6)}"
        
        # Gera um protocolo simulado
        protocol = f"MFE{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Gera dados de QR Code simulados
        qr_code_data = f"https://mfe.sefaz.{cfe.state_code.lower()}.gov.br/qrcode?chMFe={access_key}"
        
        # Gera XML de resposta simulado
        xml_response = f"""
        <MFe>
            <infMFe versao="1.0">
                <ide>
                    <cUF>{self._get_state_code_number(cfe.state_code)}</cUF>
                    <cNF>{cfe.number}</cNF>
                    <mod>65</mod>
                </ide>
                <emit>
                    <CNPJ>{cfe.issuer.cnpj}</CNPJ>
                    <xNome>{cfe.issuer.name}</xNome>
                </emit>
                <dest></dest>
                <total>
                    <vMFe>{cfe.total_value}</vMFe>
                </total>
            </infMFe>
        </MFe>
        """
        
        return {
            "success": True,
            "status_code": "7000",
            "status_message": "Emissão de CF-e-MFE realizada com sucesso",
            "access_key": access_key,
            "protocol": protocol,
            "qr_code_data": qr_code_data,
            "xml_response": xml_response,
            "sat_serial_number": f"MFE{cfe.state_code}123456"
        }
    
    def _get_state_code_number(self, state_code: str) -> str:
        """
        Obtém o código numérico do estado
        
        Args:
            state_code: Código do estado (UF)
            
        Returns:
            Código numérico do estado
        """
        state_codes = {
            "AC": "12", "AL": "27", "AP": "16", "AM": "13", "BA": "29", "CE": "23",
            "DF": "53", "ES": "32", "GO": "52", "MA": "21", "MT": "51", "MS": "50",
            "MG": "31", "PA": "15", "PB": "25", "PR": "41", "PE": "26", "PI": "22",
            "RJ": "33", "RN": "24", "RS": "43", "RO": "11", "RR": "14", "SC": "42",
            "SP": "35", "SE": "28", "TO": "17"
        }
        return state_codes.get(state_code, "00")
    
    def cancel_cfe(self, cfe_id: str, reason: str) -> Tuple[bool, str, Optional[CFeEvent]]:
        """
        Cancela um CF-e
        
        Args:
            cfe_id: ID do CF-e
            reason: Motivo do cancelamento
            
        Returns:
            Tupla com (sucesso, mensagem, evento)
        """
        # Obtém o CF-e
        cfe = self.get_cfe(cfe_id)
        
        if not cfe:
            return False, "CF-e não encontrado", None
        
        # Verifica se o CF-e pode ser cancelado
        if cfe.status != CFeStatus.AUTHORIZED:
            return False, f"CF-e com status {cfe.status} não pode ser cancelado", None
        
        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(cfe.state_code)
            
            # Gera um ID único para o evento
            event_id = str(uuid4())
            
            # Cria o evento de cancelamento
            event_data = {
                "id": event_id,
                "cfe_id": cfe_id,
                "event_type": "cancellation",
                "event_date": datetime.now(),
                "reason": reason,
                "status": "processing",
                "created_at": datetime.now()
            }
            
            # Salva o evento no banco de dados
            self.db_service.insert_one("fiscal_cfe_events", event_data)
            
            # Simula o envio do evento para o SAT/MFE
            if state_rule.requires_mfe:
                response_data = self._simulate_mfe_event_response(cfe, "cancellation")
            else:
                response_data = self._simulate_sat_event_response(cfe, "cancellation")
            
            # Atualiza o evento com a resposta
            event_data.update({
                "status": "completed" if response_data["success"] else "failed",
                "protocol": response_data.get("protocol"),
                "xml_content": response_data.get("xml_content"),
                "response": response_data
            })
            
            self.db_service.update_one("fiscal_cfe_events", {"id": event_id}, {"$set": event_data})
            
            # Se o cancelamento foi bem-sucedido, atualiza o status do CF-e
            if response_data["success"]:
                self.update_cfe(cfe_id, {"status": CFeStatus.CANCELLED})
            
            return response_data["success"], response_data["status_message"], CFeEvent(**event_data)
            
        except Exception as e:
            logger.error(f"Erro ao cancelar CF-e {cfe_id}: {str(e)}")
            return False, f"Erro ao cancelar CF-e: {str(e)}", None
    
    def _simulate_sat_event_response(self, cfe: CFeDocument, event_type: str) -> Dict[str, Any]:
        """
        Simula uma resposta do SAT para um evento
        
        Args:
            cfe: Documento CF-e
            event_type: Tipo de evento
            
        Returns:
            Dados da resposta simulada
        """
        # Em um ambiente real, isso seria uma resposta do equipamento SAT
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Gera um protocolo simulado
        protocol = f"SAT{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Gera XML de resposta simulado
        xml_content = f"""
        <CFeCanc>
            <infCFe>
                <ide>
                    <cUF>{self._get_state_code_number(cfe.state_code)}</cUF>
                    <cNF>{cfe.number}</cNF>
                    <mod>59</mod>
                </ide>
                <emit>
                    <CNPJ>{cfe.issuer.cnpj}</CNPJ>
                    <xNome>{cfe.issuer.name}</xNome>
                </emit>
                <dest></dest>
                <total>
                    <vCFe>{cfe.total_value}</vCFe>
                </total>
            </infCFe>
        </CFeCanc>
        """
        
        return {
            "success": True,
            "status_code": "7000",
            "status_message": "Cancelamento de CF-e-SAT realizado com sucesso",
            "protocol": protocol,
            "xml_content": xml_content
        }
    
    def _simulate_mfe_event_response(self, cfe: CFeDocument, event_type: str) -> Dict[str, Any]:
        """
        Simula uma resposta do MFE para um evento
        
        Args:
            cfe: Documento CF-e
            event_type: Tipo de evento
            
        Returns:
            Dados da resposta simulada
        """
        # Em um ambiente real, isso seria uma resposta do equipamento MFE
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Gera um protocolo simulado
        protocol = f"MFE{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Gera XML de resposta simulado
        xml_content = f"""
        <MFeCanc>
            <infMFe>
                <ide>
                    <cUF>{self._get_state_code_number(cfe.state_code)}</cUF>
                    <cNF>{cfe.number}</cNF>
                    <mod>65</mod>
                </ide>
                <emit>
                    <CNPJ>{cfe.issuer.cnpj}</CNPJ>
                    <xNome>{cfe.issuer.name}</xNome>
                </emit>
                <dest></dest>
                <total>
                    <vMFe>{cfe.total_value}</vMFe>
                </total>
            </infMFe>
        </MFeCanc>
        """
        
        return {
            "success": True,
            "status_code": "8000",
            "status_message": "Cancelamento de CF-e-MFE realizado com sucesso",
            "protocol": protocol,
            "xml_content": xml_content
        }
    
    def list_cfe(self, filters: Dict[str, Any], page: int = 1, page_size: int = 20) -> Tuple[List[CFeDocument], int]:
        """
        Lista CF-e com filtros e paginação
        
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
            "fiscal_cfe_documents", 
            filters, 
            skip=skip, 
            limit=page_size, 
            sort=[("issue_date", -1)]
        )
        
        # Conta o total de documentos
        total = self.db_service.count("fiscal_cfe_documents", filters)
        
        # Converte para objetos CFeDocument
        cfe_documents = [CFeDocument(**doc) for doc in documents]
        
        return cfe_documents, total
    
    def mark_as_exported(self, cfe_id: str) -> bool:
        """
        Marca um CF-e como exportado para contabilidade
        
        Args:
            cfe_id: ID do CF-e
            
        Returns:
            True se a operação foi bem-sucedida, False caso contrário
        """
        # Obtém o CF-e
        cfe = self.get_cfe(cfe_id)
        
        if not cfe:
            return False
        
        # Verifica se o CF-e pode ser marcado como exportado
        if cfe.status not in [CFeStatus.AUTHORIZED, CFeStatus.CANCELLED]:
            return False
        
        # Atualiza o campo accounting_exported
        self.update_cfe(cfe_id, {"accounting_exported": True})
        
        return True
    
    def get_cfe_for_accounting(self, start_date: datetime, end_date: datetime) -> List[CFeDocument]:
        """
        Obtém CF-e para exportação contábil em um período
        
        Args:
            start_date: Data inicial
            end_date: Data final
            
        Returns:
            Lista de documentos CF-e
        """
        # Busca CF-e autorizados ou cancelados que não foram exportados
        filters = {
            "issue_date": {"$gte": start_date, "$lte": end_date},
            "status": {"$in": [CFeStatus.AUTHORIZED, CFeStatus.CANCELLED]},
            "accounting_exported": False
        }
        
        # Busca os documentos no banco de dados
        documents = self.db_service.find(
            "fiscal_cfe_documents", 
            filters, 
            sort=[("issue_date", 1)]
        )
        
        # Converte para objetos CFeDocument
        cfe_documents = [CFeDocument(**doc) for doc in documents]
        
        return cfe_documents
