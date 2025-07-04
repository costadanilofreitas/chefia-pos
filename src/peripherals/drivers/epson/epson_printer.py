from typing import Dict, List, Any, Optional, Union
import os
import json
import asyncio
from datetime import datetime
import traceback

try:
    from escpos.printer import Usb, Network, Serial, File
    from escpos.exceptions import Error as ESCPOSError
    ESCPOS_AVAILABLE = True
except ImportError:
    ESCPOS_AVAILABLE = False

from src.peripherals.models.peripheral_models import (
    Printer,
    PrinterConfig,
    PeripheralStatus,
    PeripheralConnectionType,
    PrinterException,
    ConnectionException
)


class EpsonPrinter(Printer):
    """Implementação para impressoras Epson usando o protocolo ESC/POS."""
    
    def __init__(self, config: PrinterConfig):
        super().__init__(config)
        self.printer = None
        self.model = config.model
        self.connection_type = config.connection_type
        self.port = config.port
        self.address = config.address
        self.paper_width = config.paper_width
        self.encoding = config.encoding
        
        # Verificar se a biblioteca escpos está disponível
        if not ESCPOS_AVAILABLE:
            raise ImportError("Biblioteca python-escpos não está instalada. Execute 'pip install python-escpos'.")
    
    async def initialize(self) -> bool:
        """Inicializa a impressora Epson."""
        try:
            # Criar conexão com a impressora
            if self.connection_type == PeripheralConnectionType.USB:
                # Para USB, precisamos de vendor_id e product_id
                # Se port for "auto", tentar descobrir automaticamente
                if self.port == "auto":
                    # Em uma implementação real, implementaríamos descoberta automática
                    # Para este exemplo, usamos valores padrão para Epson
                    vendor_id = 0x04b8  # Epson
                    product_id = 0x0202  # Valor genérico, deve ser específico para o modelo
                else:
                    # Formato esperado: "vendor_id:product_id"
                    try:
                        vendor_id, product_id = map(lambda x: int(x, 16), self.port.split(':'))
                    except (ValueError, AttributeError):
                        raise ConfigurationException(f"Formato de porta USB inválido: {self.port}. Use 'vendor_id:product_id' em hexadecimal.")
                
                self.printer = Usb(vendor_id, product_id)
            
            elif self.connection_type == PeripheralConnectionType.NETWORK:
                if not self.address:
                    raise ConfigurationException("Endereço IP não especificado para conexão de rede.")
                
                port = 9100  # Porta padrão para impressoras ESC/POS
                if self.port and self.port != "auto":
                    try:
                        port = int(self.port)
                    except ValueError:
                        raise ConfigurationException(f"Porta de rede inválida: {self.port}")
                
                self.printer = Network(self.address, port)
            
            elif self.connection_type == PeripheralConnectionType.SERIAL:
                if not self.port or self.port == "auto":
                    # Em uma implementação real, implementaríamos descoberta automática
                    # Para este exemplo, usamos um valor padrão
                    port = "/dev/ttyS0"
                else:
                    port = self.port
                
                # Parâmetros padrão para impressoras Epson
                baudrate = 9600
                if "baudrate" in self.config.options:
                    baudrate = self.config.options["baudrate"]
                
                self.printer = Serial(devfile=port, baudrate=baudrate)
            
            else:
                raise ConfigurationException(f"Tipo de conexão não suportado: {self.connection_type}")
            
            # Testar a conexão
            self.printer.text("\n")  # Enviar um caractere de nova linha para testar
            
            # Atualizar status
            await self.update_status(PeripheralStatus.ONLINE)
            self.connected = True
            
            return True
        
        except ESCPOSError as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            self.connected = False
            raise ConnectionException(f"Erro ao conectar à impressora Epson: {str(e)}")
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            self.connected = False
            traceback.print_exc()
            raise ConnectionException(f"Erro ao inicializar impressora Epson: {str(e)}")
    
    async def shutdown(self) -> bool:
        """Finaliza a impressora Epson."""
        try:
            if self.printer:
                self.printer.close()
                self.printer = None
            
            await self.update_status(PeripheralStatus.OFFLINE)
            self.connected = False
            
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da impressora Epson."""
        status_info = {
            "status": self.status,
            "connected": self.connected,
            "last_error": self.last_error,
            "last_status_check": self.last_status_check.isoformat() if self.last_status_check else None,
            "model": self.model,
            "connection_type": self.connection_type,
            "paper_width": self.paper_width
        }
        
        # Em uma implementação real, consultaríamos o status real da impressora
        # usando comandos ESC/POS específicos
        
        return status_info
    
    async def print_text(self, text: str) -> bool:
        """Imprime texto simples na impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        try:
            await self.update_status(PeripheralStatus.BUSY)
            
            # Imprimir o texto
            self.printer.text(text)
            
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_receipt(self, receipt: Dict[str, Any]) -> bool:
        """Imprime um recibo formatado na impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        try:
            await self.update_status(PeripheralStatus.BUSY)
            
            # Processar o recibo
            content = receipt.get("content", [])
            
            for section in content:
                section_type = section.get("type", "")
                section_content = section.get("content", [])
                
                # Processar cada item de conteúdo da seção
                for item in section_content:
                    item_type = item.get("type", "")
                    
                    if item_type == "text":
                        text_value = item.get("value", "")
                        align = item.get("align", "left")
                        style = item.get("style", "normal")
                        
                        # Aplicar estilo
                        if style == "bold":
                            self.printer.set(text_type="B")
                        elif style == "underline":
                            self.printer.set(underline=1)
                        elif style == "emphasized":
                            self.printer.set(text_type="U")
                        else:
                            self.printer.set()
                        
                        # Aplicar alinhamento
                        if align == "center":
                            self.printer.set(align="center")
                        elif align == "right":
                            self.printer.set(align="right")
                        else:
                            self.printer.set(align="left")
                        
                        # Imprimir o texto
                        self.printer.text(text_value + "\n")
                        
                        # Resetar estilo
                        self.printer.set()
                    
                    elif item_type == "line":
                        line_style = item.get("style", "single")
                        
                        if line_style == "double":
                            self.printer.text("=" * self.paper_width + "\n")
                        elif line_style == "dashed":
                            self.printer.text("-" * self.paper_width + "\n")
                        else:
                            self.printer.text("-" * self.paper_width + "\n")
                    
                    elif item_type == "barcode":
                        barcode_value = item.get("value", "")
                        barcode_type = item.get("barcode_type", "CODE128")
                        align = item.get("align", "center")
                        
                        # Aplicar alinhamento
                        if align == "center":
                            self.printer.set(align="center")
                        elif align == "right":
                            self.printer.set(align="right")
                        else:
                            self.printer.set(align="left")
                        
                        # Imprimir o código de barras
                        self.printer.barcode(barcode_value, barcode_type)
                        self.printer.text("\n")
                    
                    elif item_type == "qrcode":
                        qrcode_value = item.get("value", "")
                        size = item.get("size", 6)
                        align = item.get("align", "center")
                        
                        # Aplicar alinhamento
                        if align == "center":
                            self.printer.set(align="center")
                        elif align == "right":
                            self.printer.set(align="right")
                        else:
                            self.printer.set(align="left")
                        
                        # Imprimir o QR code
                        self.printer.qr(qrcode_value, size=size)
                        self.printer.text("\n")
            
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def cut_paper(self, partial: bool = True) -> bool:
        """Corta o papel na impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        try:
            # Cortar o papel
            self.printer.cut(mode='PART' if partial else 'FULL')
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def open_cash_drawer(self) -> bool:
        """Abre a gaveta de dinheiro conectada à impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        if not self.config.cash_drawer_enabled:
            await self.update_status(PeripheralStatus.ERROR, "Gaveta de dinheiro não habilitada")
            return False
        
        try:
            # Abrir a gaveta
            self.printer.cashdraw(2)
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_image(self, image_path: str) -> bool:
        """Imprime uma imagem na impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        try:
            await self.update_status(PeripheralStatus.BUSY)
            
            # Imprimir a imagem
            self.printer.image(image_path)
            self.printer.text("\n")
            
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_barcode(self, data: str, barcode_type: str = "CODE128") -> bool:
        """Imprime um código de barras na impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        try:
            await self.update_status(PeripheralStatus.BUSY)
            
            # Imprimir o código de barras
            self.printer.barcode(data, barcode_type)
            self.printer.text("\n")
            
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_qrcode(self, data: str, size: int = 6) -> bool:
        """Imprime um QR code na impressora Epson."""
        if not self.connected or not self.printer:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False
        
        try:
            await self.update_status(PeripheralStatus.BUSY)
            
            # Imprimir o QR code
            self.printer.qr(data, size=size)
            self.printer.text("\n")
            
            await self.update_status(PeripheralStatus.ONLINE)
            return True
        
        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
