from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
import os
import json
import asyncio
from datetime import datetime
import uuid
import logging

from src.sat.models.sat_models import (
    SATConfig,
    SATStatus,
    SATDriverType,
    ContingencyMode,
    CFe,
    CFeItem,
    CFePagamento,
    SATResponse,
    SATStatusResponse,
    SATLog
)


class SATDriver(ABC):
    """Interface base para drivers SAT."""
    
    def __init__(self, config: SATConfig):
        self.config = config
        self.status = SATStatus.UNKNOWN
        self.last_error = None
        self.last_communication = None
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Inicializa o driver e estabelece conexão com o SAT."""
        pass
    
    @abstractmethod
    async def get_status(self) -> SATStatusResponse:
        """Obtém o status atual do SAT."""
        pass
    
    @abstractmethod
    async def emit_cfe(self, cfe: CFe) -> SATResponse:
        """Emite um CF-e no SAT."""
        pass
    
    @abstractmethod
    async def cancel_cfe(self, cfe: CFe, reason: str) -> SATResponse:
        """Cancela um CF-e no SAT."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> bool:
        """Testa a conexão com o SAT."""
        pass
    
    @abstractmethod
    async def shutdown(self) -> bool:
        """Finaliza a conexão com o SAT."""
        pass


class SATService:
    """Serviço para gerenciamento do SAT e emissão de CF-e."""
    
    def __init__(self):
        self.drivers = {}
        self.config = None
        self.initialized = False
        self.logs = []
        self.pending_cfes = []
        self._load_config()
    
    def _load_config(self):
        """Carrega a configuração global do SAT."""
        config_path = os.path.join(os.path.dirname(__file__), '../config/config.json')
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config_data = json.load(f)
                    self.config = SATConfig(**config_data)
            else:
                # Configuração padrão se o arquivo não existir
                self.config = SATConfig(
                    enabled=False,
                    driver_type=SATDriverType.SIMULATED
                )
                # Salvar configuração padrão
                self._save_config()
        except Exception as e:
            logging.error(f"Erro ao carregar configuração do SAT: {str(e)}")
            self.config = SATConfig(enabled=False, driver_type=SATDriverType.SIMULATED)
    
    def _save_config(self):
        """Salva a configuração global do SAT."""
        config_path = os.path.join(os.path.dirname(__file__), '../config/config.json')
        try:
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, 'w') as f:
                json.dump(self.config.dict(), f, indent=2)
        except Exception as e:
            logging.error(f"Erro ao salvar configuração do SAT: {str(e)}")
    
    async def initialize(self) -> bool:
        """Inicializa o serviço SAT."""
        if self.initialized:
            return True
        
        try:
            # Carregar configurações de terminais
            await self._load_terminal_configs()
            
            # Inicializar drivers para terminais configurados
            for terminal_id, config in self.drivers.items():
                driver = self._create_driver(config)
                if driver:
                    self.drivers[terminal_id] = driver
                    await driver.initialize()
            
            self.initialized = True
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar serviço SAT: {str(e)}")
            return False
    
    async def _load_terminal_configs(self):
        """Carrega as configurações de SAT para cada terminal."""
        pos_config_dir = os.path.join(os.path.dirname(__file__), '../../pos/config')
        try:
            if os.path.exists(pos_config_dir):
                for filename in os.listdir(pos_config_dir):
                    if filename.endswith('.json'):
                        terminal_id = os.path.splitext(filename)[0]
                        config_path = os.path.join(pos_config_dir, filename)
                        
                        with open(config_path, 'r') as f:
                            pos_config = json.load(f)
                            
                            # Verificar se há configuração SAT para este terminal
                            if 'sat' in pos_config and isinstance(pos_config['sat'], dict):
                                sat_config = pos_config['sat']
                                
                                # Mesclar com configuração global
                                merged_config = self.config.dict()
                                merged_config.update(sat_config)
                                
                                # Criar configuração específica para este terminal
                                terminal_config = SATConfig(**merged_config)
                                
                                # Armazenar configuração
                                self.drivers[terminal_id] = terminal_config
        except Exception as e:
            logging.error(f"Erro ao carregar configurações de terminais: {str(e)}")
    
    def _create_driver(self, config: SATConfig):
        """Cria um driver SAT com base na configuração."""
        if not config.enabled:
            return None
        
        try:
            if config.driver_type == SATDriverType.SIMULATED:
                from src.sat.drivers.simulated_driver import SimulatedSATDriver
                return SimulatedSATDriver(config)
            elif config.driver_type == SATDriverType.DIMEP:
                from src.sat.drivers.dimep_driver import DimepSATDriver
                return DimepSATDriver(config)
            elif config.driver_type == SATDriverType.BEMATECH:
                from src.sat.drivers.bematech_driver import BematechSATDriver
                return BematechSATDriver(config)
            elif config.driver_type == SATDriverType.ELGIN:
                from src.sat.drivers.elgin_driver import ElginSATDriver
                return ElginSATDriver(config)
            elif config.driver_type == SATDriverType.GENERIC:
                from src.sat.drivers.generic_driver import GenericSATDriver
                return GenericSATDriver(config)
            else:
                logging.error(f"Tipo de driver SAT não suportado: {config.driver_type}")
                return None
        except ImportError as e:
            logging.error(f"Erro ao importar driver SAT: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"Erro ao criar driver SAT: {str(e)}")
            return None
    
    async def is_enabled(self, terminal_id: str) -> bool:
        """Verifica se o SAT está habilitado para um terminal específico."""
        # Verificar configuração global
        if not self.config.enabled:
            return False
        
        # Verificar configuração do terminal
        if terminal_id in self.drivers:
            driver = self.drivers[terminal_id]
            if isinstance(driver, SATConfig):
                return driver.enabled
            return True
        
        return False
    
    async def get_status(self, terminal_id: str) -> SATStatusResponse:
        """Obtém o status do SAT para um terminal específico."""
        if not await self.is_enabled(terminal_id):
            return SATStatusResponse(
                status=SATStatus.OFFLINE,
                message="SAT não habilitado para este terminal"
            )
        
        driver = self.drivers.get(terminal_id)
        if not driver or isinstance(driver, SATConfig):
            return SATStatusResponse(
                status=SATStatus.UNKNOWN,
                message="Driver SAT não inicializado"
            )
        
        try:
            return await driver.get_status()
        except Exception as e:
            logging.error(f"Erro ao obter status do SAT: {str(e)}")
            return SATStatusResponse(
                status=SATStatus.ERROR,
                message=f"Erro ao obter status: {str(e)}"
            )
    
    async def convert_order_to_cfe(self, order_data: Dict[str, Any], terminal_id: str) -> CFe:
        """Converte um pedido para o formato CF-e."""
        # Obter configuração do terminal
        terminal_config = None
        if terminal_id in self.drivers:
            driver = self.drivers[terminal_id]
            if isinstance(driver, SATConfig):
                terminal_config = driver
            else:
                terminal_config = driver.config
        
        if not terminal_config:
            raise ValueError(f"Configuração SAT não encontrada para o terminal {terminal_id}")
        
        # Criar CF-e básico
        cfe = CFe(
            id=str(uuid.uuid4()),
            cnpj_emitente=terminal_config.cnpj,
            ie_emitente=terminal_config.ie,
            razao_social_emitente=terminal_config.business_name,
            valor_total=order_data.get("total", 0),
            desconto=order_data.get("discount", 0),
            acrescimo=order_data.get("service_fee", 0),
            order_id=order_data.get("id", ""),
            terminal_id=terminal_id
        )
        
        # Adicionar informações do cliente, se disponíveis
        customer = order_data.get("customer", {})
        if customer:
            document = customer.get("document", "")
            if document:
                if len(document) == 11:
                    cfe.cpf_destinatario = document
                elif len(document) == 14:
                    cfe.cnpj_destinatario = document
            cfe.nome_destinatario = customer.get("name", "")
        
        # Adicionar itens
        items = order_data.get("items", [])
        for i, item in enumerate(items, 1):
            cfe_item = CFeItem(
                numero=i,
                codigo=item.get("product_id", ""),
                descricao=item.get("name", ""),
                quantidade=item.get("quantity", 1),
                unidade=item.get("unit", "UN"),
                valor_unitario=item.get("price", 0),
                valor_total=item.get("total", 0),
                icms_grupo=terminal_config.taxation.default_icms_group,
                pis_grupo=terminal_config.taxation.default_pis_group,
                cofins_grupo=terminal_config.taxation.default_cofins_group
            )
            cfe.itens.append(cfe_item)
        
        # Adicionar pagamentos
        payment = order_data.get("payment", {})
        if payment:
            method = payment.get("method", "")
            # Mapear método de pagamento para código SAT
            sat_payment_code = self._map_payment_method(method)
            
            cfe_payment = CFePagamento(
                tipo=sat_payment_code,
                valor=payment.get("amount", 0)
            )
            
            # Adicionar informações de cartão, se aplicável
            if sat_payment_code in ["03", "04"]:  # Cartão de crédito ou débito
                cfe_payment.credenciadora = payment.get("card_acquirer", "")
                cfe_payment.nsu = payment.get("card_authorization", "")
            
            cfe.pagamentos.append(cfe_payment)
        
        return cfe
    
    def _map_payment_method(self, method: str) -> str:
        """Mapeia o método de pagamento do sistema para o código SAT."""
        mapping = {
            "CASH": "01",           # Dinheiro
            "CREDIT_CARD": "03",    # Cartão de Crédito
            "DEBIT_CARD": "04",     # Cartão de Débito
            "PIX": "17",            # Transferência (PIX)
            "VOUCHER": "05",        # Vale Alimentação/Refeição
            "BANK_SLIP": "15",      # Boleto Bancário
            "STORE_CREDIT": "99",   # Outros
        }
        return mapping.get(method, "99")  # Padrão: Outros
    
    async def emit_cfe(self, order_data: Dict[str, Any], terminal_id: str) -> SATResponse:
        """Emite um CF-e para um pedido."""
        if not await self.is_enabled(terminal_id):
            return SATResponse(
                success=False,
                message="SAT não habilitado para este terminal"
            )
        
        driver = self.drivers.get(terminal_id)
        if not driver or isinstance(driver, SATConfig):
            return SATResponse(
                success=False,
                message="Driver SAT não inicializado"
            )
        
        try:
            # Converter pedido para CF-e
            cfe = await self.convert_order_to_cfe(order_data, terminal_id)
            
            # Emitir CF-e
            response = await driver.emit_cfe(cfe)
            
            # Registrar log
            log = SATLog(
                id=str(uuid.uuid4()),
                terminal_id=terminal_id,
                operation="emit",
                status="success" if response.success else "error",
                message=response.message,
                cfe_id=cfe.id if cfe else None,
                created_at=datetime.now()
            )
            self.logs.append(log)
            
            # Se estiver em modo de contingência e falhar, armazenar para reenvio
            if not response.success and self.config.contingency_mode != ContingencyMode.NONE:
                cfe.status = "pendente"
                cfe.contingency = True
                cfe.error_message = response.message
                self.pending_cfes.append(cfe)
            
            return response
        except Exception as e:
            logging.error(f"Erro ao emitir CF-e: {str(e)}")
            
            # Registrar log
            log = SATLog(
                id=str(uuid.uuid4()),
                terminal_id=terminal_id,
                operation="emit",
                status="error",
                message=str(e),
                created_at=datetime.now()
            )
            self.logs.append(log)
            
            return SATResponse(
                success=False,
                message=f"Erro ao emitir CF-e: {str(e)}"
            )
    
    async def cancel_cfe(self, cfe_id: str, reason: str, terminal_id: str) -> SATResponse:
        """Cancela um CF-e."""
        if not await self.is_enabled(terminal_id):
            return SATResponse(
                success=False,
                message="SAT não habilitado para este terminal"
            )
        
        driver = self.drivers.get(terminal_id)
        if not driver or isinstance(driver, SATConfig):
            return SATResponse(
                success=False,
                message="Driver SAT não inicializado"
            )
        
        try:
            # Buscar CF-e (em uma implementação real, seria do banco de dados)
            cfe = None
            for pending_cfe in self.pending_cfes:
                if pending_cfe.id == cfe_id:
                    cfe = pending_cfe
                    break
            
            if not cfe:
                return SATResponse(
                    success=False,
                    message=f"CF-e {cfe_id} não encontrado"
                )
            
            # Cancelar CF-e
            response = await driver.cancel_cfe(cfe, reason)
            
            # Registrar log
            log = SATLog(
                id=str(uuid.uuid4()),
                terminal_id=terminal_id,
                operation="cancel",
                status="success" if response.success else "error",
                message=response.message,
                cfe_id=cfe_id,
                created_at=datetime.now()
            )
            self.logs.append(log)
            
            return response
        except Exception as e:
            logging.error(f"Erro ao cancelar CF-e: {str(e)}")
            
            # Registrar log
            log = SATLog(
                id=str(uuid.uuid4()),
                terminal_id=terminal_id,
                operation="cancel",
                status="error",
                message=str(e),
                cfe_id=cfe_id,
                created_at=datetime.now()
            )
            self.logs.append(log)
            
            return SATResponse(
                success=False,
                message=f"Erro ao cancelar CF-e: {str(e)}"
            )
    
    async def process_pending_cfes(self) -> Dict[str, Any]:
        """Processa CF-e pendentes em modo de contingência."""
        results = {
            "total": len(self.pending_cfes),
            "success": 0,
            "error": 0,
            "details": []
        }
        
        if not self.pending_cfes:
            return results
        
        for cfe in list(self.pending_cfes):
            terminal_id = cfe.terminal_id
            
            if not await self.is_enabled(terminal_id):
                continue
            
            driver = self.drivers.get(terminal_id)
            if not driver or isinstance(driver, SATConfig):
                continue
            
            try:
                # Tentar emitir CF-e pendente
                response = await driver.emit_cfe(cfe)
                
                result = {
                    "cfe_id": cfe.id,
                    "order_id": cfe.order_id,
                    "terminal_id": terminal_id,
                    "success": response.success,
                    "message": response.message
                }
                
                if response.success:
                    # Remover da lista de pendentes
                    self.pending_cfes.remove(cfe)
                    results["success"] += 1
                else:
                    results["error"] += 1
                
                results["details"].append(result)
                
                # Registrar log
                log = SATLog(
                    id=str(uuid.uuid4()),
                    terminal_id=terminal_id,
                    operation="retry",
                    status="success" if response.success else "error",
                    message=response.message,
                    cfe_id=cfe.id,
                    created_at=datetime.now()
                )
                self.logs.append(log)
            except Exception as e:
                logging.error(f"Erro ao processar CF-e pendente: {str(e)}")
                results["error"] += 1
                results["details"].append({
                    "cfe_id": cfe.id,
                    "order_id": cfe.order_id,
                    "terminal_id": terminal_id,
                    "success": False,
                    "message": str(e)
                })
        
        return results
    
    async def get_logs(self, limit: int = 100, offset: int = 0) -> List[SATLog]:
        """Obtém logs de operações do SAT."""
        # Em uma implementação real, seria do banco de dados
        return self.logs[offset:offset+limit]
    
    async def update_config(self, config_data: Dict[str, Any]) -> bool:
        """Atualiza a configuração global do SAT."""
        try:
            # Atualizar configuração
            updated_config = self.config.copy()
            for key, value in config_data.items():
                if hasattr(updated_config, key):
                    setattr(updated_config, key, value)
            
            # Validar configuração
            updated_config = SATConfig(**updated_config.dict())
            
            # Aplicar configuração
            self.config = updated_config
            self._save_config()
            
            # Reinicializar drivers se necessário
            if self.initialized:
                await self.shutdown()
                await self.initialize()
            
            return True
        except Exception as e:
            logging.error(f"Erro ao atualizar configuração do SAT: {str(e)}")
            return False
    
    async def update_terminal_config(self, terminal_id: str, config_data: Dict[str, Any]) -> bool:
        """Atualiza a configuração do SAT para um terminal específico."""
        try:
            # Verificar se o terminal existe
            pos_config_path = os.path.join(os.path.dirname(__file__), f'../../pos/config/{terminal_id}.json')
            if not os.path.exists(pos_config_path):
                return False
            
            # Carregar configuração do terminal
            with open(pos_config_path, 'r') as f:
                pos_config = json.load(f)
            
            # Atualizar configuração SAT
            if 'sat' not in pos_config:
                pos_config['sat'] = {}
            
            for key, value in config_data.items():
                pos_config['sat'][key] = value
            
            # Salvar configuração
            with open(pos_config_path, 'w') as f:
                json.dump(pos_config, f, indent=2)
            
            # Atualizar driver
            if terminal_id in self.drivers:
                current_driver = self.drivers[terminal_id]
                if isinstance(current_driver, SATConfig):
                    # Mesclar com configuração global
                    merged_config = self.config.dict()
                    merged_config.update(pos_config['sat'])
                    
                    # Criar configuração específica para este terminal
                    terminal_config = SATConfig(**merged_config)
                    
                    # Atualizar ou criar driver
                    driver = self._create_driver(terminal_config)
                    if driver:
                        self.drivers[terminal_id] = driver
                        await driver.initialize()
                else:
                    # Atualizar configuração do driver existente
                    for key, value in config_data.items():
                        if hasattr(current_driver.config, key):
                            setattr(current_driver.config, key, value)
            
            return True
        except Exception as e:
            logging.error(f"Erro ao atualizar configuração do terminal: {str(e)}")
            return False
    
    async def shutdown(self) -> bool:
        """Finaliza o serviço SAT."""
        if not self.initialized:
            return True
        
        try:
            # Finalizar drivers
            for terminal_id, driver in self.drivers.items():
                if not isinstance(driver, SATConfig):
                    await driver.shutdown()
            
            self.initialized = False
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar serviço SAT: {str(e)}")
            return False


# Singleton para o serviço SAT
_sat_service_instance = None

def get_sat_service() -> SATService:
    """Retorna a instância singleton do serviço SAT."""
    global _sat_service_instance
    if _sat_service_instance is None:
        _sat_service_instance = SATService()
    return _sat_service_instance
