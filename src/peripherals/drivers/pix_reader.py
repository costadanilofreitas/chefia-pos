import asyncio
import logging
from typing import Dict, List, Any, Optional
import os
import re
import json
import time
import base64
from io import BytesIO

from src.peripherals.models.peripheral_models import (
    PixReader,
    PixReaderConfig,
    PeripheralStatus,
    PeripheralException
)

class CameraPixReader(PixReader):
    """Driver para leitura de PIX via câmera."""
    
    def __init__(self, config: PixReaderConfig):
        super().__init__(config)
        self.device_path = config.device_path
        self.initialized = False
        self.device = None
        self.read_thread = None
        self.running = False
        self.callback = None
        self.frame_width = config.options.get("frame_width", 640)
        self.frame_height = config.options.get("frame_height", 480)
        self.scan_interval = config.options.get("scan_interval", 0.5)  # segundos
    
    async def initialize(self) -> bool:
        """Inicializa o leitor de PIX."""
        try:
            import cv2
            from pyzbar import pyzbar
            
            # Verificar se o dispositivo existe
            if not os.path.exists(self.device_path) and self.device_path != "0":
                logging.error(f"Dispositivo de câmera não encontrado: {self.device_path}")
                await self.update_status(PeripheralStatus.ERROR, f"Dispositivo de câmera não encontrado: {self.device_path}")
                return False
            
            # Abrir câmera
            device_id = 0 if self.device_path == "0" else self.device_path
            self.device = cv2.VideoCapture(device_id)
            
            # Configurar resolução
            self.device.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_width)
            self.device.set(cv2.CAP_PROP_FRAME_HEIGHT, self.frame_height)
            
            # Verificar se a câmera foi aberta corretamente
            if not self.device.isOpened():
                logging.error(f"Não foi possível abrir a câmera: {self.device_path}")
                await self.update_status(PeripheralStatus.ERROR, f"Não foi possível abrir a câmera: {self.device_path}")
                return False
            
            # Iniciar thread de leitura
            self.running = True
            self.read_thread = asyncio.create_task(self._read_loop())
            
            self.initialized = True
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        except ImportError as e:
            logging.error(f"Biblioteca não disponível: {str(e)}. Instale 'opencv-python' e 'pyzbar'.")
            await self.update_status(PeripheralStatus.ERROR, f"Biblioteca não disponível: {str(e)}")
            return False
        except Exception as e:
            logging.error(f"Erro ao inicializar leitor de PIX: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def shutdown(self) -> bool:
        """Finaliza o leitor de PIX."""
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
            
            # Fechar câmera
            if self.device:
                self.device.release()
                self.device = None
            
            self.initialized = False
            await self.update_status(PeripheralStatus.OFFLINE)
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar leitor de PIX: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do leitor de PIX."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Leitor não inicializado",
                "details": {}
            }
        
        try:
            # Verificar se a câmera ainda está aberta
            if not self.device or not self.device.isOpened():
                await self.update_status(PeripheralStatus.ERROR, "Câmera não está aberta")
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": "Câmera não está aberta",
                    "details": {}
                }
            
            # Verificar se a thread de leitura está ativa
            if not self.read_thread or self.read_thread.done():
                await self.update_status(PeripheralStatus.ERROR, "Thread de leitura não está ativa")
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": "Thread de leitura não está ativa",
                    "details": {}
                }
            
            await self.update_status(PeripheralStatus.ONLINE)
            return {
                "status": PeripheralStatus.ONLINE,
                "message": "Leitor online",
                "details": {
                    "device_path": self.device_path,
                    "resolution": f"{self.frame_width}x{self.frame_height}"
                }
            }
        except Exception as e:
            logging.error(f"Erro ao obter status do leitor de PIX: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {
                "status": PeripheralStatus.ERROR,
                "message": str(e),
                "details": {}
            }
    
    async def _read_loop(self) -> None:
        """Loop de leitura da câmera."""
        try:
            import cv2
            from pyzbar import pyzbar
            
            last_scan_time = 0
            
            while self.running:
                current_time = time.time()
                
                # Verificar intervalo de leitura
                if current_time - last_scan_time >= self.scan_interval:
                    # Capturar frame
                    ret, frame = self.device.read()
                    
                    if ret:
                        # Decodificar QR codes no frame
                        decoded_objects = pyzbar.decode(frame)
                        
                        for obj in decoded_objects:
                            # Converter dados para string
                            data = obj.data.decode('utf-8')
                            
                            # Verificar se é um PIX
                            if self._is_pix_data(data):
                                # Extrair informações do PIX
                                pix_info = self._parse_pix_data(data)
                                
                                # Chamar callback se registrado
                                if self.callback:
                                    await self.callback(pix_info)
                        
                        last_scan_time = current_time
                
                # Pequena pausa para não sobrecarregar a CPU
                await asyncio.sleep(0.01)
        except Exception as e:
            logging.error(f"Erro na thread de leitura: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            self.running = False
    
    def _is_pix_data(self, data: str) -> bool:
        """Verifica se os dados são um PIX válido."""
        # Verificar se começa com o padrão de PIX
        return data.startswith("00020126") or "pix.bcb.gov.br" in data
    
    def _parse_pix_data(self, data: str) -> Dict[str, Any]:
        """Extrai informações de um QR code PIX."""
        result = {
            "raw_data": data,
            "type": "pix"
        }
        
        try:
            # Extrair informações básicas
            # Implementação simplificada - em um sistema real, seria necessário
            # um parser completo para EMV QR Code
            
            # Tentar extrair valor
            value_match = re.search(r"5303986(\d{1,2})(\d+)", data)
            if value_match:
                decimals = int(value_match.group(1))
                value = int(value_match.group(2))
                result["amount"] = value / (10 ** decimals)
            
            # Tentar extrair nome do beneficiário
            name_match = re.search(r"5913([0-9]{2})([^5]+)", data)
            if name_match:
                name_len = int(name_match.group(1))
                name = name_match.group(2)[:name_len]
                result["recipient_name"] = name
            
            # Tentar extrair chave PIX
            if "01" in data:
                key_match = re.search(r"01([0-9]{2})([^0-9]+)", data)
                if key_match:
                    key_len = int(key_match.group(1))
                    key = key_match.group(2)[:key_len]
                    result["pix_key"] = key
            
            # Tentar extrair descrição/mensagem
            desc_match = re.search(r"6207([0-9]{2})([^6]+)", data)
            if desc_match:
                desc_len = int(desc_match.group(1))
                desc = desc_match.group(2)[:desc_len]
                result["description"] = desc
            
        except Exception as e:
            logging.error(f"Erro ao analisar dados PIX: {str(e)}")
            result["parse_error"] = str(e)
        
        return result
    
    async def register_callback(self, callback) -> bool:
        """Registra um callback para ser chamado quando um PIX for lido."""
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
    
    async def capture_frame(self) -> Optional[str]:
        """Captura um frame da câmera e retorna como base64."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return None
        
        try:
            import cv2
            
            # Capturar frame
            ret, frame = self.device.read()
            
            if not ret:
                logging.error("Não foi possível capturar frame")
                return None
            
            # Converter para JPEG
            _, buffer = cv2.imencode('.jpg', frame)
            
            # Converter para base64
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            return jpg_as_text
        except Exception as e:
            logging.error(f"Erro ao capturar frame: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return None


class SimulatedPixReader(PixReader):
    """Driver para simulação de leitor de PIX."""
    
    def __init__(self, config: PixReaderConfig):
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
                "details": {}
            }
        
        await self.update_status(PeripheralStatus.ONLINE)
        return {
            "status": PeripheralStatus.ONLINE,
            "message": "Leitor simulado online",
            "details": {
                "type": "simulated"
            }
        }
    
    async def register_callback(self, callback) -> bool:
        """Registra um callback para ser chamado quando um PIX for lido."""
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
    
    async def simulate_pix(self, pix_data: Dict[str, Any]) -> bool:
        """Simula a leitura de um PIX."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return False
        
        try:
            # Adicionar campos obrigatórios se não existirem
            if "type" not in pix_data:
                pix_data["type"] = "pix"
            
            if "raw_data" not in pix_data:
                # Criar dados brutos simulados
                raw_data = "00020126"
                if "pix_key" in pix_data:
                    key = pix_data["pix_key"]
                    raw_data += f"01{len(key):02d}{key}"
                if "amount" in pix_data:
                    amount = pix_data["amount"]
                    raw_data += f"5303986{len(str(int(amount))):02d}{int(amount * 100)}"
                if "recipient_name" in pix_data:
                    name = pix_data["recipient_name"]
                    raw_data += f"5913{len(name):02d}{name}"
                if "description" in pix_data:
                    desc = pix_data["description"]
                    raw_data += f"6207{len(desc):02d}{desc}"
                
                pix_data["raw_data"] = raw_data
            
            # Chamar callback se registrado
            if self.callback:
                await self.callback(pix_data)
                return True
            else:
                logging.warning("Nenhum callback registrado para receber o PIX")
                return False
        except Exception as e:
            logging.error(f"Erro ao simular leitura de PIX: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def capture_frame(self) -> Optional[str]:
        """Retorna um frame simulado."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Leitor não inicializado")
            return None
        
        try:
            # Criar imagem simulada
            from PIL import Image, ImageDraw, ImageFont
            import numpy as np
            
            # Criar imagem em branco
            img = Image.new('RGB', (640, 480), color=(240, 240, 240))
            draw = ImageDraw.Draw(img)
            
            # Adicionar texto
            try:
                font = ImageFont.truetype("Arial", 20)
            except:
                font = ImageFont.load_default()
            
            draw.text((200, 200), "Simulador de PIX", fill=(0, 0, 0), font=font)
            draw.text((180, 240), "Aponte para um QR Code", fill=(0, 0, 0), font=font)
            
            # Desenhar moldura
            draw.rectangle([(150, 150), (490, 330)], outline=(0, 0, 0), width=2)
            
            # Converter para bytes
            img_byte_arr = BytesIO()
            img.save(img_byte_arr, format='JPEG')
            img_byte_arr.seek(0)
            
            # Converter para base64
            jpg_as_text = base64.b64encode(img_byte_arr.read()).decode('utf-8')
            
            return jpg_as_text
        except Exception as e:
            logging.error(f"Erro ao capturar frame simulado: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return None
