import logging
from typing import Dict, Any
import os
import time

from src.peripherals.models.peripheral_models import (
    CashDrawer,
    CashDrawerConfig,
    PeripheralStatus,
)


class StandaloneCashDrawer(CashDrawer):
    """Driver para gavetas de dinheiro standalone (conectadas diretamente)."""

    def __init__(self, config: CashDrawerConfig):
        super().__init__(config)
        self.device_path = config.device_path
        self.initialized = False
        self.device = None
        self.open_command = bytes.fromhex(
            config.options.get("open_command", "1B70001919")
        )
        self.status_command = bytes.fromhex(
            config.options.get("status_command", "1B7601")
        )

    async def initialize(self) -> bool:
        """Inicializa a gaveta de dinheiro."""
        try:
            # Verificar se o dispositivo existe
            if not os.path.exists(self.device_path):
                logging.error(f"Dispositivo não encontrado: {self.device_path}")
                await self.update_status(
                    PeripheralStatus.ERROR,
                    f"Dispositivo não encontrado: {self.device_path}",
                )
                return False

            # Abrir dispositivo
            self.device = open(self.device_path, "wb+")

            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar gaveta de dinheiro: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza a gaveta de dinheiro."""
        try:
            # Fechar dispositivo
            if self.device:
                self.device.close()
                self.device = None

            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar gaveta de dinheiro: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da gaveta de dinheiro."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Gaveta não inicializada",
                "details": {},
            }

        try:
            # Verificar se o dispositivo ainda existe
            if not os.path.exists(self.device_path):
                await self.update_status(
                    PeripheralStatus.ERROR,
                    f"Dispositivo não encontrado: {self.device_path}",
                )
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": f"Dispositivo não encontrado: {self.device_path}",
                    "details": {},
                }

            # Enviar comando de status (se suportado)
            try:
                self.device.write(self.status_command)
                self.device.flush()

                # Tentar ler resposta
                response = self.device.read(1)

                if response:
                    # Interpretar resposta (específico para cada modelo)
                    # Simplificado para este exemplo
                    is_open = (response[0] & 0x01) == 0x01

                    if is_open:
                        status = PeripheralStatus.WARNING
                        message = "Gaveta aberta"
                    else:
                        status = PeripheralStatus.ONLINE
                        message = "Gaveta fechada"

                    await self.update_status(status, message)
                    return {
                        "status": status,
                        "message": message,
                        "details": {
                            "is_open": is_open,
                            "device_path": self.device_path,
                        },
                    }

            except:
                # Muitas gavetas não suportam verificação de status
                pass

            # Se não conseguir verificar o status, assumir que está online
            await self.update_status(PeripheralStatus.ONLINE)
            return {
                "status": PeripheralStatus.ONLINE,
                "message": "Gaveta online (status desconhecido)",
                "details": {"device_path": self.device_path},
            }
        except Exception as e:
            logging.error(f"Erro ao obter status da gaveta de dinheiro: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {"status": PeripheralStatus.ERROR, "message": str(e), "details": {}}

    async def open_drawer(self) -> bool:
        """Abre a gaveta de dinheiro."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Gaveta não inicializada")
            return False

        try:
            # Enviar comando para abrir gaveta
            self.device.write(self.open_command)
            self.device.flush()

            # Registrar evento
            logging.info("Comando para abrir gaveta enviado")

            # Atualizar status
            await self.update_status(PeripheralStatus.WARNING, "Gaveta aberta")

            return True
        except Exception as e:
            logging.error(f"Erro ao abrir gaveta: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False


class NetworkCashDrawer(CashDrawer):
    """Driver para gavetas de dinheiro conectadas via rede."""

    def __init__(self, config: CashDrawerConfig):
        super().__init__(config)
        self.address = config.address
        self.port = config.options.get("port", 9100)
        self.initialized = False
        self.connection = None
        self.open_command = bytes.fromhex(
            config.options.get("open_command", "1B70001919")
        )

    async def initialize(self) -> bool:
        """Inicializa a gaveta de dinheiro."""
        try:
            import socket

            # Criar socket
            self.connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.connection.settimeout(5)

            # Conectar
            self.connection.connect((self.address, self.port))

            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except ImportError:
            logging.error("Biblioteca Socket não disponível")
            await self.update_status(
                PeripheralStatus.ERROR, "Biblioteca Socket não disponível"
            )
            return False
        except Exception as e:
            logging.error(f"Erro ao inicializar gaveta de dinheiro: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza a gaveta de dinheiro."""
        try:
            # Fechar conexão
            if self.connection:
                self.connection.close()
                self.connection = None

            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar gaveta de dinheiro: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da gaveta de dinheiro."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Gaveta não inicializada",
                "details": {},
            }

        try:
            # Verificar se a conexão está ativa
            if not self.connection:
                await self.update_status(PeripheralStatus.ERROR, "Conexão perdida")
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": "Conexão perdida",
                    "details": {},
                }

            # Para gavetas em rede, geralmente não é possível verificar o status
            # Assumir que está online se a conexão estiver ativa
            await self.update_status(PeripheralStatus.ONLINE)
            return {
                "status": PeripheralStatus.ONLINE,
                "message": "Gaveta online",
                "details": {"address": self.address, "port": self.port},
            }
        except Exception as e:
            logging.error(f"Erro ao obter status da gaveta de dinheiro: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {"status": PeripheralStatus.ERROR, "message": str(e), "details": {}}

    async def open_drawer(self) -> bool:
        """Abre a gaveta de dinheiro."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Gaveta não inicializada")
            return False

        try:
            # Enviar comando para abrir gaveta
            self.connection.send(self.open_command)

            # Registrar evento
            logging.info("Comando para abrir gaveta enviado")

            # Atualizar status
            await self.update_status(PeripheralStatus.WARNING, "Gaveta aberta")

            return True
        except Exception as e:
            logging.error(f"Erro ao abrir gaveta: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False


class SimulatedCashDrawer(CashDrawer):
    """Driver para simulação de gaveta de dinheiro."""

    def __init__(self, config: CashDrawerConfig):
        super().__init__(config)
        self.initialized = False
        self.is_open = False
        self.last_opened = 0

    async def initialize(self) -> bool:
        """Inicializa a gaveta simulada."""
        try:
            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar gaveta simulada: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza a gaveta simulada."""
        try:
            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar gaveta simulada: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da gaveta simulada."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Gaveta não inicializada",
                "details": {},
            }

        # Verificar se a gaveta está aberta
        current_time = time.time()
        if self.is_open and (current_time - self.last_opened) > 30:
            # Fechar automaticamente após 30 segundos
            self.is_open = False

        if self.is_open:
            status = PeripheralStatus.WARNING
            message = "Gaveta aberta"
        else:
            status = PeripheralStatus.ONLINE
            message = "Gaveta fechada"

        await self.update_status(status, message)
        return {
            "status": status,
            "message": message,
            "details": {"is_open": self.is_open, "type": "simulated"},
        }

    async def open_drawer(self) -> bool:
        """Abre a gaveta simulada."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Gaveta não inicializada")
            return False

        try:
            # Simular abertura
            self.is_open = True
            self.last_opened = time.time()

            # Registrar evento
            logging.info("Gaveta simulada aberta")

            # Atualizar status
            await self.update_status(PeripheralStatus.WARNING, "Gaveta aberta")

            # Criar arquivo de log para simular a abertura
            log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
            os.makedirs(log_dir, exist_ok=True)

            log_file = os.path.join(log_dir, "cash_drawer_events.log")
            with open(log_file, "a") as f:
                f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - Gaveta aberta\n")

            return True
        except Exception as e:
            logging.error(f"Erro ao abrir gaveta simulada: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
