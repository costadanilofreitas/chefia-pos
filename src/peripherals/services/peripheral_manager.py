from typing import Dict, List, Any, Optional, Type
import logging
import os
import json
import importlib
import inspect
import asyncio

from src.peripherals.models.peripheral_models import (
    Peripheral,
    PeripheralConfig,
    PeripheralStatus,
    PeripheralException,
    ThermalPrinter,
    ConventionalPrinter,
    BarcodeReader,
    PixReader,
    CashDrawer,
    PaymentTerminal
)

class PeripheralFactory:
    """Fábrica para criar instâncias de periféricos."""
    
    # Mapeamento de tipos de periféricos para classes de drivers
    _driver_map = {
        "thermal_printer": {
            "epson": "src.peripherals.drivers.epson.epson_printer.EpsonPrinter",
            "bematech": "src.peripherals.drivers.bematech.bematech_printer.BematechPrinter",
            "daruma": "src.peripherals.drivers.daruma.daruma_printer.DarumaPrinter",
            "elgin": "src.peripherals.drivers.elgin.elgin_printer.ElginPrinter",
            "simulated": "src.peripherals.drivers.simulated_printer.SimulatedThermalPrinter"
        },
        "conventional_printer": {
            "cups": "src.peripherals.drivers.cups_printer.CupsPrinter",
            "simulated": "src.peripherals.drivers.simulated_printer.SimulatedConventionalPrinter"
        },
        "barcode_reader": {
            "generic": "src.peripherals.drivers.barcode_reader.GenericBarcodeReader",
            "simulated": "src.peripherals.drivers.barcode_reader.SimulatedBarcodeReader"
        },
        "pix_reader": {
            "camera": "src.peripherals.drivers.pix_reader.CameraPixReader",
            "simulated": "src.peripherals.drivers.pix_reader.SimulatedPixReader"
        },
        "cash_drawer": {
            "standalone": "src.peripherals.drivers.cash_drawer.StandaloneCashDrawer",
            "network": "src.peripherals.drivers.cash_drawer.NetworkCashDrawer",
            "simulated": "src.peripherals.drivers.cash_drawer.SimulatedCashDrawer"
        },
        "payment_terminal": {
            "sitef": "src.peripherals.drivers.payment_terminal.SiTefTerminal",
            "simulated": "src.peripherals.drivers.payment_terminal.SimulatedPaymentTerminal"
        }
    }
    
    @classmethod
    def create_peripheral(cls, config: PeripheralConfig) -> Optional[Peripheral]:
        """
        Cria uma instância de periférico com base na configuração.
        
        Args:
            config: Configuração do periférico
            
        Returns:
            Instância do periférico ou None se não for possível criar
        """
        try:
            # Verificar se o tipo de periférico é suportado
            if config.type not in cls._driver_map:
                logging.error(f"Tipo de periférico não suportado: {config.type}")
                return None
            
            # Verificar se o driver é suportado
            driver_map = cls._driver_map[config.type]
            if config.driver not in driver_map:
                logging.error(f"Driver não suportado para {config.type}: {config.driver}")
                return None
            
            # Obter classe do driver
            driver_class_path = driver_map[config.driver]
            
            # Importar módulo e classe
            module_path, class_name = driver_class_path.rsplit('.', 1)
            module = importlib.import_module(module_path)
            driver_class = getattr(module, class_name)
            
            # Criar instância
            instance = driver_class(config)
            
            return instance
        except ImportError as e:
            logging.error(f"Erro ao importar driver {config.driver} para {config.type}: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"Erro ao criar periférico {config.type}/{config.driver}: {str(e)}")
            return None
    
    @classmethod
    def get_available_drivers(cls, peripheral_type: str = None) -> Dict[str, List[str]]:
        """
        Retorna os drivers disponíveis para cada tipo de periférico.
        
        Args:
            peripheral_type: Tipo específico de periférico ou None para todos
            
        Returns:
            Dicionário com tipos de periféricos e seus drivers disponíveis
        """
        if peripheral_type:
            if peripheral_type in cls._driver_map:
                return {peripheral_type: list(cls._driver_map[peripheral_type].keys())}
            return {}
        
        return {
            ptype: list(drivers.keys())
            for ptype, drivers in cls._driver_map.items()
        }


class PeripheralManager:
    """Gerenciador central de periféricos."""
    
    def __init__(self):
        self.peripherals: Dict[str, Peripheral] = {}
        self.config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "peripherals.json")
        self.event_callbacks = []
        self._load_config()
    
    def _load_config(self) -> None:
        """Carrega a configuração de periféricos do arquivo."""
        try:
            if not os.path.exists(self.config_path):
                logging.warning(f"Arquivo de configuração não encontrado: {self.config_path}")
                return
            
            with open(self.config_path, 'r') as f:
                config_data = json.load(f)
            
            # Verificar se há configurações de periféricos
            if "peripherals" not in config_data:
                logging.warning("Nenhuma configuração de periférico encontrada")
                return
            
            # Processar cada periférico
            for peripheral_id, peripheral_config in config_data["peripherals"].items():
                # Verificar se o periférico deve ser carregado automaticamente
                if peripheral_config.get("auto_load", True):
                    # Criar configuração
                    config = PeripheralConfig(
                        id=peripheral_id,
                        type=peripheral_config["type"],
                        driver=peripheral_config["driver"],
                        name=peripheral_config.get("name", f"{peripheral_config['type']}_{peripheral_id}"),
                        device_path=peripheral_config.get("device_path"),
                        address=peripheral_config.get("address"),
                        options=peripheral_config.get("options", {})
                    )
                    
                    # Criar periférico
                    peripheral = PeripheralFactory.create_peripheral(config)
                    
                    if peripheral:
                        self.peripherals[peripheral_id] = peripheral
                        logging.info(f"Periférico carregado: {peripheral_id} ({config.type}/{config.driver})")
                    else:
                        logging.error(f"Falha ao carregar periférico: {peripheral_id}")
        except Exception as e:
            logging.error(f"Erro ao carregar configuração de periféricos: {str(e)}")
    
    def save_config(self) -> bool:
        """Salva a configuração atual de periféricos no arquivo."""
        try:
            # Criar diretório se não existir
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            # Preparar dados de configuração
            config_data = {"peripherals": {}}
            
            for peripheral_id, peripheral in self.peripherals.items():
                config = peripheral.config
                config_data["peripherals"][peripheral_id] = {
                    "type": config.type,
                    "driver": config.driver,
                    "name": config.name,
                    "auto_load": True
                }
                
                if config.device_path:
                    config_data["peripherals"][peripheral_id]["device_path"] = config.device_path
                
                if config.address:
                    config_data["peripherals"][peripheral_id]["address"] = config.address
                
                if config.options:
                    config_data["peripherals"][peripheral_id]["options"] = config.options
            
            # Salvar arquivo
            with open(self.config_path, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            return True
        except Exception as e:
            logging.error(f"Erro ao salvar configuração de periféricos: {str(e)}")
            return False
    
    async def initialize_all(self) -> Dict[str, bool]:
        """Inicializa todos os periféricos carregados."""
        results = {}
        
        for peripheral_id, peripheral in self.peripherals.items():
            try:
                success = await peripheral.initialize()
                results[peripheral_id] = success
                
                if not success:
                    logging.error(f"Falha ao inicializar periférico: {peripheral_id}")
            except Exception as e:
                logging.error(f"Erro ao inicializar periférico {peripheral_id}: {str(e)}")
                results[peripheral_id] = False
        
        return results
    
    async def shutdown_all(self) -> Dict[str, bool]:
        """Finaliza todos os periféricos carregados."""
        results = {}
        
        for peripheral_id, peripheral in self.peripherals.items():
            try:
                success = await peripheral.shutdown()
                results[peripheral_id] = success
                
                if not success:
                    logging.error(f"Falha ao finalizar periférico: {peripheral_id}")
            except Exception as e:
                logging.error(f"Erro ao finalizar periférico {peripheral_id}: {str(e)}")
                results[peripheral_id] = False
        
        return results
    
    def add_peripheral(self, config: PeripheralConfig) -> bool:
        """Adiciona um novo periférico ao gerenciador."""
        try:
            # Verificar se já existe um periférico com o mesmo ID
            if config.id in self.peripherals:
                logging.error(f"Já existe um periférico com ID: {config.id}")
                return False
            
            # Criar periférico
            peripheral = PeripheralFactory.create_peripheral(config)
            
            if not peripheral:
                logging.error(f"Falha ao criar periférico: {config.id}")
                return False
            
            # Adicionar ao gerenciador
            self.peripherals[config.id] = peripheral
            
            # Registrar callback para eventos
            peripheral.register_status_callback(self._handle_peripheral_event)
            
            # Salvar configuração
            self.save_config()
            
            return True
        except Exception as e:
            logging.error(f"Erro ao adicionar periférico: {str(e)}")
            return False
    
    def remove_peripheral(self, peripheral_id: str) -> bool:
        """Remove um periférico do gerenciador."""
        try:
            # Verificar se o periférico existe
            if peripheral_id not in self.peripherals:
                logging.error(f"Periférico não encontrado: {peripheral_id}")
                return False
            
            # Remover do gerenciador
            del self.peripherals[peripheral_id]
            
            # Salvar configuração
            self.save_config()
            
            return True
        except Exception as e:
            logging.error(f"Erro ao remover periférico: {str(e)}")
            return False
    
    def get_peripheral(self, peripheral_id: str) -> Optional[Peripheral]:
        """Retorna um periférico pelo ID."""
        return self.peripherals.get(peripheral_id)
    
    def get_peripherals_by_type(self, peripheral_type: str) -> Dict[str, Peripheral]:
        """Retorna todos os periféricos de um determinado tipo."""
        return {
            peripheral_id: peripheral
            for peripheral_id, peripheral in self.peripherals.items()
            if peripheral.config.type == peripheral_type
        }
    
    def get_all_peripherals(self) -> Dict[str, Peripheral]:
        """Retorna todos os periféricos gerenciados."""
        return self.peripherals.copy()
    
    def register_event_callback(self, callback) -> None:
        """Registra um callback para eventos de periféricos."""
        if callback not in self.event_callbacks:
            self.event_callbacks.append(callback)
    
    def unregister_event_callback(self, callback) -> None:
        """Remove um callback registrado."""
        if callback in self.event_callbacks:
            self.event_callbacks.remove(callback)
    
    async def _handle_peripheral_event(self, peripheral_id: str, event_type: str, data: Dict[str, Any]) -> None:
        """Manipula eventos de periféricos e notifica callbacks registrados."""
        # Criar evento
        event = {
            "peripheral_id": peripheral_id,
            "type": event_type,
            "data": data
        }
        
        # Notificar callbacks
        for callback in self.event_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logging.error(f"Erro ao processar callback de evento: {str(e)}")


# Instância global do gerenciador de periféricos
peripheral_manager = PeripheralManager()
