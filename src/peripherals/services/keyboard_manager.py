from typing import Dict, Any, Optional, List
import logging
import json
import os
from datetime import datetime
import threading
import time

from src.peripherals.models.peripheral_models import (
    CommandType
)
from src.peripherals.events.peripheral_events import (
    PeripheralEventType, KeyboardEventData
)
from src.core.events.event_bus import EventBus, Event

logger = logging.getLogger(__name__)

class KeyboardManager:
    """Gerenciador de teclados físicos para o sistema POS."""
    
    def __init__(self, event_bus: EventBus, config_path: str):
        """
        Inicializa o gerenciador de teclados.
        
        Args:
            event_bus: Barramento de eventos do sistema
            config_path: Caminho para o arquivo de configuração
        """
        self.event_bus = event_bus
        self.config_path = config_path
        self.devices = {}  # Será preenchido com dispositivos detectados
        self.configs = {}  # Configurações carregadas do arquivo
        self.running = False
        self.threads = []
        
        # Carregar configurações
        self._load_configs()
        
        # Registrar handlers de eventos
        self.event_bus.subscribe("kds.order_status_changed", self._handle_order_status_changed)
    
    def _load_configs(self):
        """Carrega as configurações de teclado do arquivo."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    self.configs = json.load(f)
                logger.info(f"Configurações de teclado carregadas: {len(self.configs)} dispositivos")
            else:
                logger.warning(f"Arquivo de configuração não encontrado: {self.config_path}")
                self.configs = {}
        except Exception as e:
            logger.error(f"Erro ao carregar configurações de teclado: {e}")
            self.configs = {}
    
    def _save_configs(self):
        """Salva as configurações de teclado no arquivo."""
        try:
            # Garantir que o diretório existe
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            with open(self.config_path, 'w') as f:
                json.dump(self.configs, f, indent=2)
            logger.info(f"Configurações de teclado salvas: {len(self.configs)} dispositivos")
        except Exception as e:
            logger.error(f"Erro ao salvar configurações de teclado: {e}")
    
    def start(self):
        """Inicia o monitoramento de teclados."""
        if self.running:
            logger.info("Gerenciador de teclados já está em execução")
            return
        
        self.running = True
        
        # Descobrir dispositivos disponíveis
        self._discover_devices()
        
        # Iniciar threads de monitoramento
        for device_id, device in self.devices.items():
            thread = threading.Thread(
                target=self._monitor_device,
                args=(device_id, device),
                daemon=True
            )
            thread.start()
            self.threads.append(thread)
        
        logger.info(f"Monitoramento de teclados iniciado. {len(self.devices)} dispositivos encontrados.")
    
    def stop(self):
        """Para o monitoramento de teclados."""
        if not self.running:
            logger.info("Gerenciador de teclados já está parado")
            return
            
        self.running = False
        
        # Aguardar threads terminarem
        for thread in self.threads:
            thread.join(timeout=1.0)
        
        # Fechar dispositivos
        for device_id in list(self.devices.keys()):
            self._close_device(device_id)
        
        self.threads = []
        
        logger.info("Monitoramento de teclados parado.")
    
    def _discover_devices(self):
        """Descobre dispositivos de teclado disponíveis."""
        try:
            # Em um ambiente real, usaríamos evdev ou outra biblioteca
            # para detectar dispositivos de entrada
            # 
            # Exemplo com evdev:
            # import evdev
            # devices = [evdev.InputDevice(path) for path in evdev.list_devices()]
            #
            # Para este exemplo, simularemos a detecção de dispositivos
            
            # Simular detecção de um teclado padrão
            device_id = "keyboard_standard_1"
            self.devices[device_id] = {
                "name": "Standard Keyboard",
                "path": "/dev/input/event0",
                "capabilities": ["KEY"]
            }
            
            # Verificar se já existe configuração para este dispositivo
            if device_id not in self.configs:
                # Criar configuração padrão
                self.configs[device_id] = {
                    "id": device_id,
                    "name": "Standard Keyboard",
                    "description": "Teclado padrão para operações do KDS",
                    "device_type": "standard_keyboard",
                    "key_mappings": self._get_default_key_mappings(),
                    "active": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Salvar configurações
                self._save_configs()
            
            # Simular detecção de um teclado numérico
            device_id = "keyboard_numeric_1"
            self.devices[device_id] = {
                "name": "Numeric Keypad",
                "path": "/dev/input/event1",
                "capabilities": ["KEY"]
            }
            
            # Verificar se já existe configuração para este dispositivo
            if device_id not in self.configs:
                # Criar configuração padrão
                self.configs[device_id] = {
                    "id": device_id,
                    "name": "Numeric Keypad",
                    "description": "Teclado numérico para operações rápidas do KDS",
                    "device_type": "numeric_keypad",
                    "key_mappings": self._get_numeric_key_mappings(),
                    "active": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Salvar configurações
                self._save_configs()
                
            logger.info(f"Dispositivos detectados: {len(self.devices)}")
            
        except Exception as e:
            logger.error(f"Erro ao descobrir dispositivos de teclado: {e}")
    
    def _get_default_key_mappings(self) -> Dict[str, str]:
        """Retorna o mapeamento padrão de teclas para comandos."""
        return {
            "KEY_F1": CommandType.NEXT_ORDER,
            "KEY_F2": CommandType.PREVIOUS_ORDER,
            "KEY_F3": CommandType.NEXT_ITEM,
            "KEY_F4": CommandType.PREVIOUS_ITEM,
            "KEY_F5": CommandType.ADVANCE_STATUS,
            "KEY_F6": CommandType.MARK_READY,
            "KEY_F7": CommandType.MARK_ALL_READY,
            "KEY_F8": CommandType.CANCEL_ITEM,
            "KEY_F9": CommandType.PRINT_ORDER,
            "KEY_SPACE": CommandType.ADVANCE_STATUS
        }
    
    def _get_numeric_key_mappings(self) -> Dict[str, str]:
        """Retorna o mapeamento de teclas para teclado numérico."""
        return {
            "KEY_1": CommandType.NEXT_ORDER,
            "KEY_2": CommandType.PREVIOUS_ORDER,
            "KEY_3": CommandType.NEXT_ITEM,
            "KEY_4": CommandType.PREVIOUS_ITEM,
            "KEY_5": CommandType.ADVANCE_STATUS,
            "KEY_6": CommandType.MARK_READY,
            "KEY_7": CommandType.MARK_ALL_READY,
            "KEY_8": CommandType.CANCEL_ITEM,
            "KEY_9": CommandType.PRINT_ORDER,
            "KEY_0": CommandType.ADVANCE_STATUS,
            "KEY_ENTER": CommandType.MARK_READY
        }
    
    def _close_device(self, device_id: str):
        """
        Fecha um dispositivo.
        
        Args:
            device_id: ID do dispositivo
        """
        try:
            # Em um ambiente real, fecharíamos o dispositivo
            # Exemplo com evdev:
            # if device_id in self.devices:
            #     self.devices[device_id].close()
            
            # Remover dispositivo da lista
            if device_id in self.devices:
                del self.devices[device_id]
                
            logger.info(f"Dispositivo {device_id} fechado")
        except Exception as e:
            logger.error(f"Erro ao fechar dispositivo {device_id}: {e}")
    
    def _monitor_device(self, device_id: str, device: Dict[str, Any]):
        """
        Monitora eventos de um dispositivo de teclado.
        
        Args:
            device_id: ID do dispositivo
            device: Informações do dispositivo
        """
        logger.info(f"Iniciando monitoramento do dispositivo: {device['name']} ({device_id})")
        
        try:
            # Verificar se o dispositivo está ativo na configuração
            if not self.configs.get(device_id, {}).get("active", False):
                logger.info(f"Dispositivo {device_id} está inativo. Ignorando.")
                return
            
            # Obter mapeamento de teclas
            key_mappings = self.configs.get(device_id, {}).get("key_mappings", {})
            
            # Em um ambiente real, monitoraríamos eventos do dispositivo
            # Exemplo com evdev:
            # for event in device.read_loop():
            #     if not self.running:
            #         break
            #     
            #     if event.type == evdev.ecodes.EV_KEY:
            #         key_event = categorize(event)
            #         
            #         if key_event.keystate == key_event.key_down:
            #             key_code = evdev.ecodes.KEY[key_event.keycode]
            #             
            #             if key_code in key_mappings:
            #                 command = key_mappings[key_code]
            #                 self._process_command(command, device_id)
            
            # Para este exemplo, simularemos eventos periódicos
            # para demonstrar o funcionamento
            while self.running:
                # Simular evento a cada 10 segundos
                time.sleep(10)
                
                # Escolher um comando aleatório para simular
                import random
                key_codes = list(key_mappings.keys())
                if key_codes:
                    key_code = random.choice(key_codes)
                    command = key_mappings[key_code]
                    
                    logger.debug(f"Simulando evento de tecla: {key_code} -> {command}")
                    self._process_command(command, device_id)
                
        except Exception as e:
            logger.error(f"Erro ao monitorar dispositivo {device_id}: {e}")
            
            # Tentar reconectar
            self._reconnect_device(device_id)
    
    def _reconnect_device(self, device_id: str):
        """
        Tenta reconectar um dispositivo.
        
        Args:
            device_id: ID do dispositivo
        """
        try:
            # Fechar dispositivo
            self._close_device(device_id)
            
            # Redescobrir dispositivos
            self._discover_devices()
            
            # Reiniciar monitoramento se o dispositivo foi encontrado
            if device_id in self.devices:
                thread = threading.Thread(
                    target=self._monitor_device,
                    args=(device_id, self.devices[device_id]),
                    daemon=True
                )
                thread.start()
                self.threads.append(thread)
                
                logger.info(f"Dispositivo {device_id} reconectado com sucesso.")
            else:
                logger.warning(f"Não foi possível reconectar o dispositivo {device_id}.")
        except Exception as e:
            logger.error(f"Erro ao reconectar dispositivo {device_id}: {e}")
    
    def _process_command(self, command: str, device_id: str):
        """
        Processa um comando de teclado.
        
        Args:
            command: Comando a ser processado
            device_id: ID do dispositivo que gerou o comando
        """
        logger.info(f"Processando comando: {command} do dispositivo {device_id}")
        
        try:
            # Criar dados do evento
            event_data = KeyboardEventData(
                command=command,
                device_id=device_id,
                timestamp=datetime.now().isoformat()
            )
            
            # Publicar evento no barramento
            self.event_bus.publish(
                PeripheralEventType.KEYBOARD_COMMAND,
                Event(data=event_data.to_dict())
            )
            
            logger.info(f"Comando {command} publicado com sucesso.")
        except Exception as e:
            logger.error(f"Erro ao processar comando {command}: {e}")
    
    def _handle_order_status_changed(self, event: Event):
        """
        Manipula eventos de mudança de status de pedidos.
        
        Args:
            event: Evento de mudança de status
        """
        try:
            data = event.data
            order_id = data.get("order_id")
            status = data.get("status")
            
            logger.debug(f"Evento de mudança de status recebido: Pedido {order_id} -> {status}")
            
            # Aqui poderíamos implementar lógica específica para feedback
            # visual ou sonoro quando o status de um pedido muda
            
        except Exception as e:
            logger.error(f"Erro ao manipular evento de mudança de status: {e}")
    
    def get_devices(self) -> List[Dict[str, Any]]:
        """
        Retorna a lista de dispositivos disponíveis.
        
        Returns:
            List: Lista de dispositivos
        """
        devices = []
        
        for device_id, config in self.configs.items():
            device_info = {
                "id": device_id,
                "name": config.get("name", ""),
                "description": config.get("description", ""),
                "device_type": config.get("device_type", ""),
                "active": config.get("active", False),
                "connected": device_id in self.devices
            }
            
            devices.append(device_info)
        
        return devices
    
    def get_device_config(self, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Retorna a configuração de um dispositivo.
        
        Args:
            device_id: ID do dispositivo
            
        Returns:
            Dict: Configuração do dispositivo ou None se não encontrado
        """
        return self.configs.get(device_id)
    
    def update_device_config(self, device_id: str, config: Dict[str, Any]) -> bool:
        """
        Atualiza a configuração de um dispositivo.
        
        Args:
            device_id: ID do dispositivo
            config: Nova configuração
            
        Returns:
            bool: True se a atualização foi bem-sucedida
        """
        try:
            # Verificar se o dispositivo existe
            if device_id not in self.configs:
                logger.warning(f"Dispositivo {device_id} não encontrado.")
                return False
            
            # Atualizar configuração
            self.configs[device_id].update(config)
            self.configs[device_id]["updated_at"] = datetime.now().isoformat()
            
            # Salvar configurações
            self._save_configs()
            
            return True
        except Exception as e:
            logger.error(f"Erro ao atualizar configuração do dispositivo {device_id}: {e}")
            return False

# Singleton para o gerenciador de teclados
_keyboard_manager = None

def get_keyboard_manager(event_bus=None, config_path=None) -> KeyboardManager:
    """
    Obtém a instância do gerenciador de teclados.
    
    Args:
        event_bus: Barramento de eventos (opcional)
        config_path: Caminho para o arquivo de configuração (opcional)
        
    Returns:
        KeyboardManager: Instância do gerenciador de teclados
    """
    global _keyboard_manager
    
    if _keyboard_manager is None:
        from src.core.events.event_bus import get_event_bus
        
        _event_bus = event_bus or get_event_bus()
        _config_path = config_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "config",
            "keyboards.json"
        )
        
        _keyboard_manager = KeyboardManager(_event_bus, _config_path)
    
    return _keyboard_manager
