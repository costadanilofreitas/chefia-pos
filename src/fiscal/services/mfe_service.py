"""
Serviço para gerenciamento de MFE (Módulo Fiscal Eletrônico)
"""

import os
import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from uuid import uuid4

from src.fiscal.models.mfe_models import (
    MFEEquipment, MFEStatus, MFEOperation, MFEOperationType,
    MFEConfiguration, MFEStateRule, MFEMaintenanceSchedule
)

# Configuração de logging
logger = logging.getLogger(__name__)


class MFEService:
    """
    Serviço para gerenciamento de MFE (Módulo Fiscal Eletrônico)
    """
    
    def __init__(self, db_service, config_service):
        """
        Inicializa o serviço de MFE
        
        Args:
            db_service: Serviço de banco de dados
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.config_service = config_service
        self.state_rules_cache = {}  # Cache de regras estaduais
        
        # Inicializa o cache de regras estaduais
        self._initialize_state_rules()
    
    def _initialize_state_rules(self):
        """Inicializa o cache de regras estaduais"""
        try:
            # Carrega todas as regras estaduais do banco de dados
            rules = self.db_service.find_all("fiscal_mfe_state_rules", {})
            
            # Popula o cache
            for rule in rules:
                self.state_rules_cache[rule["state_code"]] = rule
                
            logger.info(f"Regras estaduais de MFE carregadas: {len(rules)} estados")
        except Exception as e:
            logger.error(f"Erro ao carregar regras estaduais de MFE: {str(e)}")
            # Inicializa com um cache vazio, será preenchido sob demanda
            self.state_rules_cache = {}
    
    def get_state_rule(self, state_code: str) -> MFEStateRule:
        """
        Obtém as regras específicas para um estado
        
        Args:
            state_code: Código do estado (UF)
            
        Returns:
            Regras específicas do estado
        """
        # Verifica se a regra está no cache
        if state_code in self.state_rules_cache:
            return MFEStateRule(**self.state_rules_cache[state_code])
        
        # Se não estiver no cache, busca no banco de dados
        rule = self.db_service.find_one("fiscal_mfe_state_rules", {"state_code": state_code})
        
        if not rule:
            # Se não encontrar, cria uma regra padrão
            logger.warning(f"Regra estadual não encontrada para o estado {state_code}. Usando regra padrão.")
            rule = {
                "state_code": state_code,
                "state_name": self._get_state_name(state_code),
                "webservice_url": self._get_default_webservice_url(state_code),
                "certificate_required": True,
                "special_parameters": {},
                "active": True,
                "updated_at": datetime.now()
            }
            
            # Salva a regra padrão no banco de dados
            self.db_service.insert_one("fiscal_mfe_state_rules", rule)
        
        # Atualiza o cache
        self.state_rules_cache[state_code] = rule
        
        return MFEStateRule(**rule)
    
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
    
    def _get_default_webservice_url(self, state_code: str) -> str:
        """Obtém a URL padrão do webservice para o estado"""
        # URLs de homologação por padrão
        webservice_urls = {
            "CE": "https://mfe.sefaz.ce.gov.br/mfe/services",
            "RN": "https://mfe.set.rn.gov.br/mfe/services",
            "SE": "https://mfe.sefaz.se.gov.br/mfe/services",
            "AL": "https://mfe.sefaz.al.gov.br/mfe/services",
            "PE": "https://mfe.sefaz.pe.gov.br/mfe/services",
            # Adicionar outras URLs conforme necessário
        }
        
        # Retorna a URL específica do estado ou uma URL genérica
        return webservice_urls.get(state_code, f"https://mfe.sefaz.{state_code.lower()}.gov.br/mfe/services")
    
    def register_equipment(self, equipment_data: Dict[str, Any]) -> MFEEquipment:
        """
        Registra um novo equipamento MFE
        
        Args:
            equipment_data: Dados do equipamento
            
        Returns:
            Equipamento MFE registrado
        """
        # Gera um ID único para o equipamento
        equipment_id = str(uuid4())
        
        # Define valores padrão
        equipment_data["id"] = equipment_id
        equipment_data["status"] = MFEStatus.INACTIVE  # Começa inativo até ser ativado
        equipment_data["created_at"] = datetime.now()
        equipment_data["updated_at"] = datetime.now()
        
        # Valida os dados do equipamento
        self._validate_equipment_data(equipment_data)
        
        # Salva o equipamento no banco de dados
        self.db_service.insert_one("fiscal_mfe_equipment", equipment_data)
        
        # Retorna o equipamento registrado
        return MFEEquipment(**equipment_data)
    
    def _validate_equipment_data(self, equipment_data: Dict[str, Any]) -> None:
        """
        Valida os dados do equipamento MFE
        
        Args:
            equipment_data: Dados do equipamento
            
        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = ["serial_number", "model", "manufacturer", 
                          "firmware_version", "state_code", "store_id"]
        
        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in equipment_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")
        
        # Verifica se o número de série é único
        existing = self.db_service.find_one("fiscal_mfe_equipment", {
            "serial_number": equipment_data["serial_number"]
        })
        
        if existing:
            raise ValueError(f"Já existe um equipamento MFE com o número de série {equipment_data['serial_number']}")
        
        # Verifica se o estado suporta MFE
        state_rule = self.get_state_rule(equipment_data["state_code"])
        if not state_rule.active:
            raise ValueError(f"O estado {state_rule.state_name} não está configurado para MFE")
    
    def get_equipment(self, equipment_id: str) -> Optional[MFEEquipment]:
        """
        Obtém um equipamento MFE pelo ID
        
        Args:
            equipment_id: ID do equipamento
            
        Returns:
            Equipamento MFE ou None se não encontrado
        """
        equipment_data = self.db_service.find_one("fiscal_mfe_equipment", {"id": equipment_id})
        
        if not equipment_data:
            return None
        
        return MFEEquipment(**equipment_data)
    
    def update_equipment(self, equipment_id: str, update_data: Dict[str, Any]) -> Optional[MFEEquipment]:
        """
        Atualiza um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            update_data: Dados a serem atualizados
            
        Returns:
            Equipamento MFE atualizado ou None se não encontrado
        """
        # Obtém o equipamento atual
        equipment_data = self.db_service.find_one("fiscal_mfe_equipment", {"id": equipment_id})
        
        if not equipment_data:
            return None
        
        # Atualiza os dados
        update_data["updated_at"] = datetime.now()
        
        # Mescla os dados atuais com os novos dados
        equipment_data.update(update_data)
        
        # Atualiza no banco de dados
        self.db_service.update_one("fiscal_mfe_equipment", {"id": equipment_id}, {"$set": update_data})
        
        # Retorna o equipamento atualizado
        return MFEEquipment(**equipment_data)
    
    def activate_equipment(self, equipment_id: str, activation_code: str) -> Tuple[bool, str]:
        """
        Ativa um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            activation_code: Código de ativação
            
        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Obtém o equipamento
        equipment = self.get_equipment(equipment_id)
        
        if not equipment:
            return False, "Equipamento MFE não encontrado"
        
        # Verifica se o equipamento já está ativo
        if equipment.status == MFEStatus.ACTIVE:
            return False, "Equipamento MFE já está ativo"
        
        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(equipment.state_code)
            
            # Simula a ativação do equipamento
            # Em um ambiente real, isso seria uma chamada ao webservice da SEFAZ
            success, message = self._simulate_activation(equipment, activation_code, state_rule)
            
            if success:
                # Atualiza o status do equipamento
                self.update_equipment(equipment_id, {
                    "status": MFEStatus.ACTIVE,
                    "activation_date": datetime.now(),
                    "activation_code": activation_code,
                    "last_communication": datetime.now()
                })
                
                # Registra a operação
                self._register_operation(
                    equipment_id=equipment_id,
                    operation_type=MFEOperationType.CONFIGURATION,
                    request_data={
                        "action": "activation",
                        "activation_code": activation_code
                    },
                    response_data={
                        "success": True,
                        "message": message
                    }
                )
            
            return success, message
            
        except Exception as e:
            logger.error(f"Erro ao ativar equipamento MFE {equipment_id}: {str(e)}")
            
            # Registra a operação com erro
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "activation",
                    "activation_code": activation_code
                },
                response_data=None,
                error_details={
                    "exception": str(e)
                }
            )
            
            return False, f"Erro ao ativar equipamento MFE: {str(e)}"
    
    def _simulate_activation(self, equipment: MFEEquipment, activation_code: str, state_rule: MFEStateRule) -> Tuple[bool, str]:
        """
        Simula a ativação de um equipamento MFE
        
        Args:
            equipment: Equipamento MFE
            activation_code: Código de ativação
            state_rule: Regras do estado
            
        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Em um ambiente real, isso seria uma chamada ao webservice da SEFAZ
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Verifica se o código de ativação é válido (simulação)
        if len(activation_code) < 8:
            return False, "Código de ativação inválido. Deve ter pelo menos 8 caracteres."
        
        # Simula a ativação
        return True, "Equipamento MFE ativado com sucesso"
    
    def _register_operation(self, equipment_id: str, operation_type: MFEOperationType, 
                           request_data: Dict[str, Any], response_data: Optional[Dict[str, Any]] = None,
                           document_id: Optional[str] = None, error_details: Optional[Dict[str, Any]] = None) -> str:
        """
        Registra uma operação do MFE
        
        Args:
            equipment_id: ID do equipamento
            operation_type: Tipo de operação
            request_data: Dados da requisição
            response_data: Dados da resposta
            document_id: ID do documento fiscal relacionado
            error_details: Detalhes do erro, se houver
            
        Returns:
            ID da operação registrada
        """
        # Gera um ID único para a operação
        operation_id = str(uuid4())
        
        # Cria os dados da operação
        operation_data = {
            "id": operation_id,
            "equipment_id": equipment_id,
            "operation_type": operation_type,
            "operation_date": datetime.now(),
            "document_id": document_id,
            "status": "success" if response_data is not None else "error",
            "request_data": request_data,
            "response_data": response_data,
            "error_details": error_details,
            "created_at": datetime.now()
        }
        
        # Salva a operação no banco de dados
        self.db_service.insert_one("fiscal_mfe_operations", operation_data)
        
        return operation_id
    
    def deactivate_equipment(self, equipment_id: str, reason: str) -> Tuple[bool, str]:
        """
        Desativa um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            reason: Motivo da desativação
            
        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Obtém o equipamento
        equipment = self.get_equipment(equipment_id)
        
        if not equipment:
            return False, "Equipamento MFE não encontrado"
        
        # Verifica se o equipamento está ativo
        if equipment.status != MFEStatus.ACTIVE:
            return False, f"Equipamento MFE com status {equipment.status} não pode ser desativado"
        
        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(equipment.state_code)
            
            # Simula a desativação do equipamento
            # Em um ambiente real, isso seria uma chamada ao webservice da SEFAZ
            success, message = self._simulate_deactivation(equipment, reason, state_rule)
            
            if success:
                # Atualiza o status do equipamento
                self.update_equipment(equipment_id, {
                    "status": MFEStatus.INACTIVE,
                    "last_communication": datetime.now()
                })
                
                # Registra a operação
                self._register_operation(
                    equipment_id=equipment_id,
                    operation_type=MFEOperationType.CONFIGURATION,
                    request_data={
                        "action": "deactivation",
                        "reason": reason
                    },
                    response_data={
                        "success": True,
                        "message": message
                    }
                )
            
            return success, message
            
        except Exception as e:
            logger.error(f"Erro ao desativar equipamento MFE {equipment_id}: {str(e)}")
            
            # Registra a operação com erro
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "deactivation",
                    "reason": reason
                },
                response_data=None,
                error_details={
                    "exception": str(e)
                }
            )
            
            return False, f"Erro ao desativar equipamento MFE: {str(e)}"
    
    def _simulate_deactivation(self, equipment: MFEEquipment, reason: str, state_rule: MFEStateRule) -> Tuple[bool, str]:
        """
        Simula a desativação de um equipamento MFE
        
        Args:
            equipment: Equipamento MFE
            reason: Motivo da desativação
            state_rule: Regras do estado
            
        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Em um ambiente real, isso seria uma chamada ao webservice da SEFAZ
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Verifica se o motivo é válido (simulação)
        if len(reason) < 10:
            return False, "Motivo da desativação muito curto. Forneça uma descrição mais detalhada."
        
        # Simula a desativação
        return True, "Equipamento MFE desativado com sucesso"
    
    def check_equipment_status(self, equipment_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Verifica o status de um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            
        Returns:
            Tupla com (sucesso, mensagem, dados do status)
        """
        # Obtém o equipamento
        equipment = self.get_equipment(equipment_id)
        
        if not equipment:
            return False, "Equipamento MFE não encontrado", None
        
        try:
            # Obtém as regras do estado
            state_rule = self.get_state_rule(equipment.state_code)
            
            # Simula a consulta de status do equipamento
            # Em um ambiente real, isso seria uma chamada ao webservice da SEFAZ ou ao equipamento
            success, message, status_data = self._simulate_status_check(equipment, state_rule)
            
            # Atualiza o último contato do equipamento
            self.update_equipment(equipment_id, {
                "last_communication": datetime.now()
            })
            
            # Registra a operação
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONSULTATION,
                request_data={
                    "action": "status_check"
                },
                response_data={
                    "success": success,
                    "message": message,
                    "status_data": status_data
                }
            )
            
            return success, message, status_data
            
        except Exception as e:
            logger.error(f"Erro ao verificar status do equipamento MFE {equipment_id}: {str(e)}")
            
            # Registra a operação com erro
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONSULTATION,
                request_data={
                    "action": "status_check"
                },
                response_data=None,
                error_details={
                    "exception": str(e)
                }
            )
            
            return False, f"Erro ao verificar status do equipamento MFE: {str(e)}", None
    
    def _simulate_status_check(self, equipment: MFEEquipment, state_rule: MFEStateRule) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Simula a verificação de status de um equipamento MFE
        
        Args:
            equipment: Equipamento MFE
            state_rule: Regras do estado
            
        Returns:
            Tupla com (sucesso, mensagem, dados do status)
        """
        # Em um ambiente real, isso seria uma chamada ao webservice da SEFAZ ou ao equipamento
        # Aqui estamos apenas simulando uma resposta de sucesso
        
        # Simula os dados de status
        status_data = {
            "operational_status": "normal",
            "memory_usage": "25%",
            "battery_level": "100%",
            "pending_documents": 0,
            "last_document_number": "123456",
            "firmware_version": equipment.firmware_version,
            "timestamp": datetime.now().isoformat()
        }
        
        return True, "Status do equipamento MFE verificado com sucesso", status_data
    
    def set_configuration(self, equipment_id: str, parameter_name: str, parameter_value: str, 
                         description: Optional[str] = None, updated_by: str = "system") -> Tuple[bool, str]:
        """
        Define uma configuração para um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            parameter_name: Nome do parâmetro
            parameter_value: Valor do parâmetro
            description: Descrição do parâmetro
            updated_by: Identificador de quem atualizou
            
        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Obtém o equipamento
        equipment = self.get_equipment(equipment_id)
        
        if not equipment:
            return False, "Equipamento MFE não encontrado"
        
        try:
            # Gera um ID único para a configuração
            config_id = str(uuid4())
            
            # Cria os dados da configuração
            config_data = {
                "id": config_id,
                "equipment_id": equipment_id,
                "parameter_name": parameter_name,
                "parameter_value": parameter_value,
                "description": description,
                "updated_by": updated_by,
                "updated_at": datetime.now()
            }
            
            # Verifica se já existe uma configuração com o mesmo nome
            existing = self.db_service.find_one("fiscal_mfe_configurations", {
                "equipment_id": equipment_id,
                "parameter_name": parameter_name
            })
            
            if existing:
                # Atualiza a configuração existente
                self.db_service.update_one("fiscal_mfe_configurations", 
                                          {"id": existing["id"]}, 
                                          {"$set": {
                                              "parameter_value": parameter_value,
                                              "description": description,
                                              "updated_by": updated_by,
                                              "updated_at": datetime.now()
                                          }})
                
                config_id = existing["id"]
            else:
                # Salva a nova configuração no banco de dados
                self.db_service.insert_one("fiscal_mfe_configurations", config_data)
            
            # Registra a operação
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "set_configuration",
                    "parameter_name": parameter_name,
                    "parameter_value": parameter_value
                },
                response_data={
                    "success": True,
                    "message": "Configuração definida com sucesso",
                    "config_id": config_id
                }
            )
            
            return True, "Configuração definida com sucesso"
            
        except Exception as e:
            logger.error(f"Erro ao definir configuração para equipamento MFE {equipment_id}: {str(e)}")
            
            # Registra a operação com erro
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "set_configuration",
                    "parameter_name": parameter_name,
                    "parameter_value": parameter_value
                },
                response_data=None,
                error_details={
                    "exception": str(e)
                }
            )
            
            return False, f"Erro ao definir configuração: {str(e)}"
    
    def get_configuration(self, equipment_id: str, parameter_name: str) -> Optional[MFEConfiguration]:
        """
        Obtém uma configuração de um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            parameter_name: Nome do parâmetro
            
        Returns:
            Configuração ou None se não encontrada
        """
        config_data = self.db_service.find_one("fiscal_mfe_configurations", {
            "equipment_id": equipment_id,
            "parameter_name": parameter_name
        })
        
        if not config_data:
            return None
        
        return MFEConfiguration(**config_data)
    
    def get_all_configurations(self, equipment_id: str) -> List[MFEConfiguration]:
        """
        Obtém todas as configurações de um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            
        Returns:
            Lista de configurações
        """
        configs = self.db_service.find("fiscal_mfe_configurations", {
            "equipment_id": equipment_id
        })
        
        return [MFEConfiguration(**config) for config in configs]
    
    def schedule_maintenance(self, equipment_id: str, scheduled_date: datetime, 
                            maintenance_type: str, description: str,
                            technician_info: Optional[Dict[str, Any]] = None) -> Tuple[bool, str, Optional[str]]:
        """
        Agenda uma manutenção para um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            scheduled_date: Data agendada
            maintenance_type: Tipo de manutenção
            description: Descrição da manutenção
            technician_info: Informações do técnico
            
        Returns:
            Tupla com (sucesso, mensagem, ID do agendamento)
        """
        # Obtém o equipamento
        equipment = self.get_equipment(equipment_id)
        
        if not equipment:
            return False, "Equipamento MFE não encontrado", None
        
        try:
            # Gera um ID único para o agendamento
            schedule_id = str(uuid4())
            
            # Cria os dados do agendamento
            schedule_data = {
                "id": schedule_id,
                "equipment_id": equipment_id,
                "scheduled_date": scheduled_date,
                "maintenance_type": maintenance_type,
                "description": description,
                "technician_info": technician_info,
                "status": "scheduled",
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            # Salva o agendamento no banco de dados
            self.db_service.insert_one("fiscal_mfe_maintenance_schedules", schedule_data)
            
            # Registra a operação
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "schedule_maintenance",
                    "scheduled_date": scheduled_date.isoformat(),
                    "maintenance_type": maintenance_type,
                    "description": description
                },
                response_data={
                    "success": True,
                    "message": "Manutenção agendada com sucesso",
                    "schedule_id": schedule_id
                }
            )
            
            return True, "Manutenção agendada com sucesso", schedule_id
            
        except Exception as e:
            logger.error(f"Erro ao agendar manutenção para equipamento MFE {equipment_id}: {str(e)}")
            
            # Registra a operação com erro
            self._register_operation(
                equipment_id=equipment_id,
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "schedule_maintenance",
                    "scheduled_date": scheduled_date.isoformat(),
                    "maintenance_type": maintenance_type,
                    "description": description
                },
                response_data=None,
                error_details={
                    "exception": str(e)
                }
            )
            
            return False, f"Erro ao agendar manutenção: {str(e)}", None
    
    def complete_maintenance(self, schedule_id: str, completion_notes: str) -> Tuple[bool, str]:
        """
        Marca uma manutenção como concluída
        
        Args:
            schedule_id: ID do agendamento
            completion_notes: Notas de conclusão
            
        Returns:
            Tupla com (sucesso, mensagem)
        """
        # Obtém o agendamento
        schedule_data = self.db_service.find_one("fiscal_mfe_maintenance_schedules", {"id": schedule_id})
        
        if not schedule_data:
            return False, "Agendamento de manutenção não encontrado"
        
        # Verifica se o agendamento já foi concluído ou cancelado
        if schedule_data["status"] != "scheduled":
            return False, f"Agendamento com status {schedule_data['status']} não pode ser concluído"
        
        try:
            # Atualiza o agendamento
            self.db_service.update_one("fiscal_mfe_maintenance_schedules", 
                                      {"id": schedule_id}, 
                                      {"$set": {
                                          "status": "completed",
                                          "completion_date": datetime.now(),
                                          "completion_notes": completion_notes,
                                          "updated_at": datetime.now()
                                      }})
            
            # Registra a operação
            self._register_operation(
                equipment_id=schedule_data["equipment_id"],
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "complete_maintenance",
                    "schedule_id": schedule_id,
                    "completion_notes": completion_notes
                },
                response_data={
                    "success": True,
                    "message": "Manutenção concluída com sucesso"
                }
            )
            
            # Atualiza a data da última manutenção do equipamento
            self.update_equipment(schedule_data["equipment_id"], {
                "last_maintenance": datetime.now()
            })
            
            return True, "Manutenção concluída com sucesso"
            
        except Exception as e:
            logger.error(f"Erro ao concluir manutenção {schedule_id}: {str(e)}")
            
            # Registra a operação com erro
            self._register_operation(
                equipment_id=schedule_data["equipment_id"],
                operation_type=MFEOperationType.CONFIGURATION,
                request_data={
                    "action": "complete_maintenance",
                    "schedule_id": schedule_id,
                    "completion_notes": completion_notes
                },
                response_data=None,
                error_details={
                    "exception": str(e)
                }
            )
            
            return False, f"Erro ao concluir manutenção: {str(e)}"
    
    def list_equipment(self, filters: Dict[str, Any], page: int = 1, page_size: int = 20) -> Tuple[List[MFEEquipment], int]:
        """
        Lista equipamentos MFE com filtros e paginação
        
        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página
            
        Returns:
            Tupla com (lista de equipamentos, total de equipamentos)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size
        
        # Busca os equipamentos no banco de dados
        equipments = self.db_service.find(
            "fiscal_mfe_equipment", 
            filters, 
            skip=skip, 
            limit=page_size, 
            sort=[("updated_at", -1)]
        )
        
        # Conta o total de equipamentos
        total = self.db_service.count("fiscal_mfe_equipment", filters)
        
        # Converte para objetos MFEEquipment
        mfe_equipments = [MFEEquipment(**equipment) for equipment in equipments]
        
        return mfe_equipments, total
    
    def list_operations(self, equipment_id: str, operation_type: Optional[MFEOperationType] = None,
                       start_date: Optional[datetime] = None, end_date: Optional[datetime] = None,
                       page: int = 1, page_size: int = 20) -> Tuple[List[MFEOperation], int]:
        """
        Lista operações de um equipamento MFE
        
        Args:
            equipment_id: ID do equipamento
            operation_type: Tipo de operação (opcional)
            start_date: Data inicial (opcional)
            end_date: Data final (opcional)
            page: Número da página
            page_size: Tamanho da página
            
        Returns:
            Tupla com (lista de operações, total de operações)
        """
        # Constrói os filtros
        filters = {"equipment_id": equipment_id}
        
        if operation_type:
            filters["operation_type"] = operation_type
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            
            if date_filter:
                filters["operation_date"] = date_filter
        
        # Calcula o offset para paginação
        skip = (page - 1) * page_size
        
        # Busca as operações no banco de dados
        operations = self.db_service.find(
            "fiscal_mfe_operations", 
            filters, 
            skip=skip, 
            limit=page_size, 
            sort=[("operation_date", -1)]
        )
        
        # Conta o total de operações
        total = self.db_service.count("fiscal_mfe_operations", filters)
        
        # Converte para objetos MFEOperation
        mfe_operations = [MFEOperation(**operation) for operation in operations]
        
        return mfe_operations, total
