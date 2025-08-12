import asyncio
import logging
from typing import Dict, Any
import os

from src.peripherals.models.peripheral_models import (
    BarcodeReader,
    BarcodeReaderConfig,
    PeripheralStatus,
)


class GenericBarcodeReader(BarcodeReader):
    """Driver para leitores de código de barras genéricos (USB HID)."""

    def __init__(self, config: BarcodeReaderConfig):
        super().__init__(config)
        self.device_path = config.device_path
        self.initialized = False
        self.device = None
        self.read_thread = None
        self.running = False
        self.buffer = ""
        self.callback = None

    async def initialize(self) -> bool:
        """Inicializa o leitor de código de barras."""
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
            self.device = open(self.device_path, "rb")

            # Iniciar thread de leitura
            self.running = True
            self.read_thread = asyncio.create_task(self._read_loop())

            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar leitor de código de barras: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza o leitor de código de barras."""
        try:
            # Parar thread de leitura
            self.running = False
            if self.read_thread:
                try:
                    self.read_thread.cancel()
                    await asyncio.sleep(0.1)
                except:
                    pass
                self.read_thread = None

            # Fechar dispositivo
            if self.device:
                self.device.close()
                self.device = None

            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar leitor de código de barras: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do leitor de código de barras."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Leitor não inicializado",
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

            # Verificar se a thread de leitura está ativa
            if not self.read_thread or self.read_thread.done():
                await self.update_status(
                    PeripheralStatus.ERROR, "Thread de leitura não está ativa"
                )
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": "Thread de leitura não está ativa",
                    "details": {},
                }

            await self.update_status(PeripheralStatus.ONLINE)
            return {
                "status": PeripheralStatus.ONLINE,
                "message": "Leitor online",
                "details": {"device_path": self.device_path},
            }
        except Exception as e:
            logging.error(
                f"Erro ao obter status do leitor de código de barras: {str(e)}"
            )
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {"status": PeripheralStatus.ERROR, "message": str(e), "details": {}}

    async def _read_loop(self) -> None:
        """Loop de leitura do dispositivo."""
        try:
            while self.running:
                # Ler dados do dispositivo
                data = self.device.read(8)

                if data:
                    # Processar dados (específico para HID)
                    # Este é um exemplo simplificado para teclado HID
                    # Códigos de tecla para caracteres ASCII
                    key_map = {
                        0x04: "a",
                        0x05: "b",
                        0x06: "c",
                        0x07: "d",
                        0x08: "e",
                        0x09: "f",
                        0x0A: "g",
                        0x0B: "h",
                        0x0C: "i",
                        0x0D: "j",
                        0x0E: "k",
                        0x0F: "l",
                        0x10: "m",
                        0x11: "n",
                        0x12: "o",
                        0x13: "p",
                        0x14: "q",
                        0x15: "r",
                        0x16: "s",
                        0x17: "t",
                        0x18: "u",
                        0x19: "v",
                        0x1A: "w",
                        0x1B: "x",
                        0x1C: "y",
                        0x1D: "z",
                        0x1E: "1",
                        0x1F: "2",
                        0x20: "3",
                        0x21: "4",
                        0x22: "5",
                        0x23: "6",
                        0x24: "7",
                        0x25: "8",
                        0x26: "9",
                        0x27: "0",
                        0x28: "\n",  # Enter
                    }

                    # Verificar se há tecla pressionada (terceiro byte)
                    if data[2] in key_map:
                        char = key_map[data[2]]

                        if char == "\n":
                            # Fim do código de barras
                            if self.buffer and self.callback:
                                # Chamar callback com o código lido
                                await self.callback(self.buffer)

                            # Limpar buffer
                            self.buffer = ""
                        else:
                            # Adicionar caractere ao buffer
                            self.buffer += char

                # Pequena pausa para não sobrecarregar a CPU
                await asyncio.sleep(0.001)
        except Exception as e:
            logging.error(f"Erro na thread de leitura: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            self.running = False

    async def register_callback(self, callback) -> bool:
        """Registra um callback para ser chamado quando um código de barras for lido."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return False

        try:
            self.callback = callback
            return True
        except Exception as e:
            logging.error(f"Erro ao registrar callback: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def unregister_callback(self) -> bool:
        """Remove o callback registrado."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return False

        try:
            self.callback = None
            return True
        except Exception as e:
            logging.error(f"Erro ao remover callback: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False


class SimulatedBarcodeReader(BarcodeReader):
    """Driver para simulação de leitor de código de barras."""

    def __init__(self, config: BarcodeReaderConfig):
        super().__init__(config)
        self.initialized = False
        self.callback = None

    async def initialize(self) -> bool:
        """Inicializa o leitor simulado."""
        try:
            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao inicializar leitor simulado: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza o leitor simulado."""
        try:
            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar leitor simulado: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do leitor simulado."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Leitor não inicializado",
                "details": {},
            }

        await self.update_status(PeripheralStatus.ONLINE)
        return {
            "status": PeripheralStatus.ONLINE,
            "message": "Leitor simulado online",
            "details": {"type": "simulated"},
        }

    async def register_callback(self, callback) -> bool:
        """Registra um callback para ser chamado quando um código de barras for lido."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return False

        try:
            self.callback = callback
            return True
        except Exception as e:
            logging.error(f"Erro ao registrar callback: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def unregister_callback(self) -> bool:
        """Remove o callback registrado."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return False

        try:
            self.callback = None
            return True
        except Exception as e:
            logging.error(f"Erro ao remover callback: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def simulate_scan(self, barcode: str) -> bool:
        """Simula a leitura de um código de barras."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return False

        try:
            if self.callback:
                await self.callback(barcode)
                return True
            else:
                logging.warning(
                    "Nenhum callback registrado para receber o código de barras"
                )
                return False
        except Exception as e:
            logging.error(f"Erro ao simular leitura: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
