import asyncio
import logging
from typing import Dict, Any
import os
import re

from src.peripherals.models.peripheral_models import (
    ThermalPrinter,
    ThermalPrinterConfig,
    PeripheralStatus,
    PeripheralException
)

# Constantes para comandos ESC/POS da Elgin
ESC = b'\x1B'
GS = b'\x1D'
LF = b'\x0A'
CR = b'\x0D'

class ElginThermalPrinter(ThermalPrinter):
    """Driver para impressoras térmicas Elgin."""
    
    def __init__(self, config: ThermalPrinterConfig):
        super().__init__(config)
        self.connection = None
        self.encoding = config.options.get("encoding", "cp850")  # Codificação padrão Elgin
        self.model = config.model.upper()
        self.initialized = False
        
        # Mapeamento de modelos para comandos específicos
        self.model_commands = {
            "I9": {
                "cut_paper": GS + b'V' + b'\x42' + b'\x00',
                "open_drawer": ESC + b'p' + b'\x00' + b'\x19' + b'\x19',
                "init": ESC + b'@'
            },
            "I7": {
                "cut_paper": GS + b'V' + b'\x42' + b'\x00',
                "open_drawer": ESC + b'p' + b'\x00' + b'\x19' + b'\x19',
                "init": ESC + b'@'
            },
            "I5": {
                "cut_paper": GS + b'V' + b'\x42' + b'\x00',
                "open_drawer": ESC + b'p' + b'\x00' + b'\x19' + b'\x19',
                "init": ESC + b'@'
            },
            # Modelo padrão para outros modelos não listados
            "DEFAULT": {
                "cut_paper": GS + b'V' + b'\x42' + b'\x00',
                "open_drawer": ESC + b'p' + b'\x00' + b'\x19' + b'\x19',
                "init": ESC + b'@'
            }
        }
        
        # Obter comandos específicos para o modelo ou usar padrão
        self.commands = self.model_commands.get(self.model, self.model_commands["DEFAULT"])
    
    async def initialize(self) -> bool:
        """Inicializa a impressora."""
        try:
            # Verificar tipo de conexão
            if self.config.connection_type == "usb":
                await self._initialize_usb()
            elif self.config.connection_type == "serial":
                await self._initialize_serial()
            elif self.config.connection_type == "network":
                await self._initialize_network()
            else:
                raise PeripheralException(f"Tipo de conexão não suportado: {self.config.connection_type}")
            
            # Enviar comando de inicialização
            if self.connection:
                await self._send_command(self.commands["init"])
                self.initialized = True
                await self.update_status(PeripheralStatus.ONLINE)
                return True
            
            return False
        except Exception as e:
            logging.error(f"Erro ao inicializar impressora Elgin: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def _initialize_usb(self) -> None:
        """Inicializa conexão USB."""
        try:
            import usb.core
            import usb.util
            
            # Identificar porta automaticamente se não especificada
            if self.config.port == "auto" or not self.config.port:
                # Procurar dispositivos Elgin
                # VID/PID para Elgin (podem variar por modelo)
                dev = usb.core.find(idVendor=0x20d1)  # VID Elgin
                
                if dev is None:
                    raise PeripheralException("Impressora Elgin não encontrada")
                
                self.connection = dev
            else:
                # Usar porta específica
                port_match = re.match(r'(\d+):(\d+)', self.config.port)
                if port_match:
                    bus, address = port_match.groups()
                    dev = usb.core.find(bus=int(bus), address=int(address))
                    if dev is None:
                        raise PeripheralException(f"Impressora não encontrada na porta {self.config.port}")
                    self.connection = dev
                else:
                    raise PeripheralException(f"Formato de porta inválido: {self.config.port}")
            
            # Configurar dispositivo
            if self.connection.is_kernel_driver_active(0):
                self.connection.detach_kernel_driver(0)
            
            self.connection.set_configuration()
            
            # Obter endpoint para escrita
            cfg = self.connection.get_active_configuration()
            intf = cfg[(0,0)]
            
            self.ep_out = usb.util.find_descriptor(
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT
            )
            
            if self.ep_out is None:
                raise PeripheralException("Endpoint de saída não encontrado")
            
        except ImportError:
            raise PeripheralException("Biblioteca USB não disponível. Instale 'pyusb'.")
        except Exception as e:
            raise PeripheralException(f"Erro ao inicializar conexão USB: {str(e)}")
    
    async def _initialize_serial(self) -> None:
        """Inicializa conexão serial."""
        try:
            import serial
            
            port = self.config.port
            if port == "auto" or not port:
                # Tentar encontrar porta automaticamente
                import serial.tools.list_ports
                ports = list(serial.tools.list_ports.comports())
                for p in ports:
                    if "elgin" in p.description.lower():
                        port = p.device
                        break
                
                if port == "auto" or not port:
                    raise PeripheralException("Porta serial para Elgin não encontrada automaticamente")
            
            # Configurar porta serial
            self.connection = serial.Serial(
                port=port,
                baudrate=self.config.options.get("baudrate", 9600),
                bytesize=self.config.options.get("bytesize", serial.EIGHTBITS),
                parity=self.config.options.get("parity", serial.PARITY_NONE),
                stopbits=self.config.options.get("stopbits", serial.STOPBITS_ONE),
                timeout=self.config.options.get("timeout", 1)
            )
            
            if not self.connection.is_open:
                self.connection.open()
                
        except ImportError:
            raise PeripheralException("Biblioteca Serial não disponível. Instale 'pyserial'.")
        except Exception as e:
            raise PeripheralException(f"Erro ao inicializar conexão serial: {str(e)}")
    
    async def _initialize_network(self) -> None:
        """Inicializa conexão de rede."""
        try:
            import socket
            
            address = self.config.address
            port = self.config.options.get("port", 9100)  # Porta padrão para impressoras
            
            if not address:
                raise PeripheralException("Endereço de rede não especificado")
            
            # Criar socket
            self.connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.connection.settimeout(self.config.options.get("timeout", 5))
            self.connection.connect((address, port))
            
        except ImportError:
            raise PeripheralException("Biblioteca Socket não disponível")
        except Exception as e:
            raise PeripheralException(f"Erro ao inicializar conexão de rede: {str(e)}")
    
    async def _send_command(self, command: bytes) -> bool:
        """Envia comando para a impressora."""
        if not self.connection:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            if self.config.connection_type == "usb":
                self.ep_out.write(command)
            elif self.config.connection_type == "serial":
                self.connection.write(command)
            elif self.config.connection_type == "network":
                self.connection.send(command)
            
            return True
        except Exception as e:
            logging.error(f"Erro ao enviar comando para impressora Elgin: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def shutdown(self) -> bool:
        """Finaliza a impressora."""
        try:
            if self.connection:
                if self.config.connection_type == "usb":
                    import usb.util
                    usb.util.dispose_resources(self.connection)
                elif self.config.connection_type == "serial":
                    self.connection.close()
                elif self.config.connection_type == "network":
                    self.connection.close()
                
                self.connection = None
                self.initialized = False
                await self.update_status(PeripheralStatus.OFFLINE)
            
            return True
        except Exception as e:
            logging.error(f"Erro ao finalizar impressora Elgin: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da impressora."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Impressora não inicializada",
                "details": {}
            }
        
        try:
            # Enviar comando de status (específico para Elgin)
            status_command = GS + b'r' + b'\x01'
            
            if self.config.connection_type == "usb":
                # Para USB, não é possível ler resposta facilmente
                # Verificar apenas se o comando foi enviado
                success = await self._send_command(status_command)
                if success:
                    return {
                        "status": PeripheralStatus.ONLINE,
                        "message": "Impressora online",
                        "details": {
                            "model": self.model,
                            "connection": self.config.connection_type
                        }
                    }
                else:
                    return {
                        "status": PeripheralStatus.ERROR,
                        "message": "Erro ao verificar status",
                        "details": {}
                    }
            elif self.config.connection_type == "serial":
                # Enviar comando e ler resposta
                await self._send_command(status_command)
                # Aguardar resposta
                await asyncio.sleep(0.1)
                if self.connection.in_waiting > 0:
                    response = self.connection.read(self.connection.in_waiting)
                    # Interpretar resposta (específico para Elgin)
                    # Simplificado para este exemplo
                    if response:
                        return {
                            "status": PeripheralStatus.ONLINE,
                            "message": "Impressora online",
                            "details": {
                                "model": self.model,
                                "connection": self.config.connection_type,
                                "raw_status": response.hex()
                            }
                        }
                
                return {
                    "status": PeripheralStatus.UNKNOWN,
                    "message": "Status desconhecido",
                    "details": {}
                }
            elif self.config.connection_type == "network":
                # Para rede, verificar apenas se a conexão está ativa
                if self.connection:
                    return {
                        "status": PeripheralStatus.ONLINE,
                        "message": "Impressora online",
                        "details": {
                            "model": self.model,
                            "connection": self.config.connection_type,
                            "address": self.config.address
                        }
                    }
                else:
                    return {
                        "status": PeripheralStatus.OFFLINE,
                        "message": "Impressora offline",
                        "details": {}
                    }
            
            return {
                "status": PeripheralStatus.UNKNOWN,
                "message": "Status desconhecido",
                "details": {}
            }
        except Exception as e:
            logging.error(f"Erro ao obter status da impressora Elgin: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {
                "status": PeripheralStatus.ERROR,
                "message": str(e),
                "details": {}
            }
    
    async def print_text(self, text: str) -> bool:
        """Imprime texto simples."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            # Converter texto para bytes com a codificação correta
            text_bytes = text.encode(self.encoding, errors='replace')
            
            # Adicionar quebra de linha se necessário
            if not text.endswith('\n'):
                text_bytes += LF
            
            # Enviar para a impressora
            return await self._send_command(text_bytes)
        except Exception as e:
            logging.error(f"Erro ao imprimir texto: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_receipt(self, receipt: Dict[str, Any]) -> bool:
        """Imprime um recibo formatado."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            # Iniciar impressão
            commands = []
            
            # Centralizar
            commands.append(ESC + b'a' + b'\x01')  # Centralizado
            
            # Cabeçalho
            if "header" in receipt:
                header = receipt["header"]
                if "logo" in header and header["logo"]:
                    # Imprimir logo se disponível
                    logo_path = header["logo"]
                    if os.path.exists(logo_path):
                        await self.print_image(logo_path)
                
                # Nome da empresa
                if "company_name" in header:
                    commands.append(ESC + b'!' + b'\x30')  # Texto grande
                    commands.append(header["company_name"].encode(self.encoding, errors='replace') + CR + LF)
                    commands.append(ESC + b'!' + b'\x00')  # Texto normal
                
                # Endereço
                if "address" in header:
                    commands.append(header["address"].encode(self.encoding, errors='replace') + CR + LF)
                
                # CNPJ/IE
                if "document" in header:
                    commands.append(header["document"].encode(self.encoding, errors='replace') + CR + LF)
                
                # Data/Hora
                if "datetime" in header:
                    commands.append(header["datetime"].encode(self.encoding, errors='replace') + CR + LF)
                
                commands.append(b'-' * 48 + CR + LF)
            
            # Informações do pedido
            if "order_info" in receipt:
                order_info = receipt["order_info"]
                
                # Número do pedido
                if "order_number" in order_info:
                    commands.append(f"Pedido: {order_info['order_number']}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Cliente
                if "customer" in order_info and order_info["customer"]:
                    commands.append(f"Cliente: {order_info['customer']}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Atendente
                if "attendant" in order_info and order_info["attendant"]:
                    commands.append(f"Atendente: {order_info['attendant']}".encode(self.encoding, errors='replace') + CR + LF)
                
                commands.append(b'-' * 48 + CR + LF)
            
            # Alinhar à esquerda para itens
            commands.append(ESC + b'a' + b'\x00')  # Alinhado à esquerda
            
            # Itens
            if "items" in receipt and receipt["items"]:
                # Cabeçalho dos itens
                commands.append(b'ITEM  DESCRICAO                      QTD   VALOR    TOTAL' + CR + LF)
                commands.append(b'-' * 48 + CR + LF)
                
                # Itens
                for i, item in enumerate(receipt["items"], 1):
                    item_number = f"{i:02d}"
                    description = item.get("description", "")[:25].ljust(25)
                    quantity = f"{item.get('quantity', 1):3.0f}"
                    unit_price = f"R$ {item.get('unit_price', 0):6.2f}"
                    total = f"R$ {item.get('total', 0):6.2f}"
                    
                    line = f"{item_number} {description} {quantity} {unit_price} {total}"
                    commands.append(line.encode(self.encoding, errors='replace') + CR + LF)
                
                commands.append(b'-' * 48 + CR + LF)
            
            # Totais
            if "totals" in receipt:
                totals = receipt["totals"]
                
                # Alinhar à direita para totais
                commands.append(ESC + b'a' + b'\x02')  # Alinhado à direita
                
                # Subtotal
                if "subtotal" in totals:
                    commands.append(f"Subtotal: R$ {totals['subtotal']:.2f}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Descontos
                if "discount" in totals and totals["discount"] > 0:
                    commands.append(f"Desconto: R$ {totals['discount']:.2f}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Taxa de serviço
                if "service_fee" in totals and totals["service_fee"] > 0:
                    commands.append(f"Taxa de serviço: R$ {totals['service_fee']:.2f}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Total
                if "total" in totals:
                    commands.append(ESC + b'!' + b'\x30')  # Texto grande
                    commands.append(f"TOTAL: R$ {totals['total']:.2f}".encode(self.encoding, errors='replace') + CR + LF)
                    commands.append(ESC + b'!' + b'\x00')  # Texto normal
                
                commands.append(b'-' * 48 + CR + LF)
            
            # Pagamento
            if "payment" in receipt:
                payment = receipt["payment"]
                
                # Alinhar ao centro para pagamento
                commands.append(ESC + b'a' + b'\x01')  # Centralizado
                
                # Método de pagamento
                if "method" in payment:
                    commands.append(f"Forma de pagamento: {payment['method']}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Valor pago
                if "amount" in payment:
                    commands.append(f"Valor pago: R$ {payment['amount']:.2f}".encode(self.encoding, errors='replace') + CR + LF)
                
                # Troco
                if "change" in payment and payment["change"] > 0:
                    commands.append(f"Troco: R$ {payment['change']:.2f}".encode(self.encoding, errors='replace') + CR + LF)
                
                commands.append(b'-' * 48 + CR + LF)
            
            # Rodapé
            if "footer" in receipt:
                footer = receipt["footer"]
                
                # Alinhar ao centro para rodapé
                commands.append(ESC + b'a' + b'\x01')  # Centralizado
                
                # Mensagem
                if "message" in footer:
                    commands.append(footer["message"].encode(self.encoding, errors='replace') + CR + LF)
                
                # QR Code
                if "qrcode" in footer and footer["qrcode"]:
                    await self.print_qrcode(footer["qrcode"])
                
                # Código de barras
                if "barcode" in footer and footer["barcode"]:
                    await self.print_barcode(footer["barcode"])
            
            # Avançar papel
            commands.append(CR + LF + CR + LF + CR + LF)
            
            # Cortar papel
            if self.config.options.get("auto_cut", True):
                await self.cut_paper(self.config.cut_type == "partial")
            
            # Enviar comandos
            for cmd in commands:
                success = await self._send_command(cmd)
                if not success:
                    return False
            
            return True
        except Exception as e:
            logging.error(f"Erro ao imprimir recibo: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def cut_paper(self, partial: bool = True) -> bool:
        """Corta o papel."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            # Comando de corte (específico para Elgin)
            if partial:
                cut_command = GS + b'V' + b'\x42' + b'\x00'  # Corte parcial
            else:
                cut_command = GS + b'V' + b'\x41' + b'\x00'  # Corte total
            
            return await self._send_command(cut_command)
        except Exception as e:
            logging.error(f"Erro ao cortar papel: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def open_cash_drawer(self) -> bool:
        """Abre a gaveta de dinheiro conectada à impressora."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        if not self.config.cash_drawer_enabled:
            logging.warning("Gaveta de dinheiro não habilitada na configuração")
            return False
        
        try:
            # Comando para abrir gaveta
            drawer_command = self.commands["open_drawer"]
            
            return await self._send_command(drawer_command)
        except Exception as e:
            logging.error(f"Erro ao abrir gaveta: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_image(self, image_path: str) -> bool:
        """Imprime uma imagem."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            from PIL import Image
            import numpy as np
            
            # Verificar se o arquivo existe
            if not os.path.exists(image_path):
                raise PeripheralException(f"Arquivo de imagem não encontrado: {image_path}")
            
            # Abrir imagem
            img = Image.open(image_path)
            
            # Redimensionar para a largura da impressora
            paper_width_px = self.config.paper_width * self.config.dpi // 25.4  # mm para pixels
            width_ratio = paper_width_px / img.width
            new_height = int(img.height * width_ratio)
            img = img.resize((int(paper_width_px), new_height), Image.LANCZOS)
            
            # Converter para preto e branco
            img = img.convert('1')
            
            # Converter para array
            img_array = np.array(img)
            
            # Calcular bytes por linha
            bytes_per_line = (img.width + 7) // 8
            
            # Preparar comando de impressão de imagem
            # Comando para Elgin (pode variar por modelo)
            commands = []
            
            # Centralizar
            commands.append(ESC + b'a' + b'\x01')  # Centralizado
            
            # Comando de impressão de bitmap
            for y in range(0, img.height, 24):
                # Comando para impressão de bitmap
                command = ESC + b'*' + b'\x21'
                
                # Largura em bytes (LSB e MSB)
                command += bytes([bytes_per_line & 0xFF, (bytes_per_line >> 8) & 0xFF])
                
                # Processar 24 linhas ou menos se estiver no final da imagem
                for line in range(24):
                    if y + line < img.height:
                        for x in range(0, img.width, 8):
                            # Processar 8 pixels ou menos se estiver no final da linha
                            byte_val = 0
                            for bit in range(8):
                                if x + bit < img.width:
                                    # Inverter valor (0 = preto, 1 = branco na imagem)
                                    # Mas na impressora, 1 = ponto impresso (preto)
                                    if not img_array[y + line, x + bit]:
                                        byte_val |= (1 << (7 - bit))
                            
                            command += bytes([byte_val])
                    else:
                        # Preencher com zeros se estiver além da imagem
                        command += bytes([0] * bytes_per_line)
                
                commands.append(command)
                
                # Avançar papel
                commands.append(LF)
            
            # Enviar comandos
            for cmd in commands:
                success = await self._send_command(cmd)
                if not success:
                    return False
            
            return True
        except ImportError:
            logging.error("Biblioteca PIL não disponível. Instale 'pillow'.")
            await self.update_status(PeripheralStatus.ERROR, "Biblioteca PIL não disponível")
            return False
        except Exception as e:
            logging.error(f"Erro ao imprimir imagem: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_barcode(self, data: str, barcode_type: str = "CODE128") -> bool:
        """Imprime um código de barras."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            # Mapeamento de tipos de código de barras para códigos Elgin
            barcode_types = {
                "UPC-A": 65,
                "UPC-E": 66,
                "EAN13": 67,
                "EAN8": 68,
                "CODE39": 69,
                "ITF": 70,
                "CODABAR": 71,
                "CODE128": 73
            }
            
            # Verificar se o tipo é suportado
            if barcode_type not in barcode_types:
                logging.warning(f"Tipo de código de barras não suportado: {barcode_type}")
                barcode_type = "CODE128"  # Usar CODE128 como padrão
            
            # Centralizar
            await self._send_command(ESC + b'a' + b'\x01')  # Centralizado
            
            # Altura do código de barras
            height = min(255, self.config.options.get("barcode_height", 80))
            await self._send_command(GS + b'h' + bytes([height]))
            
            # Largura do código de barras
            width = min(6, self.config.options.get("barcode_width", 2))
            await self._send_command(GS + b'w' + bytes([width]))
            
            # Posição do texto (0=não imprimir, 1=acima, 2=abaixo, 3=acima e abaixo)
            text_position = min(3, self.config.options.get("barcode_text_position", 2))
            await self._send_command(GS + b'H' + bytes([text_position]))
            
            # Imprimir código de barras
            barcode_command = GS + b'k' + bytes([barcode_types[barcode_type]])
            
            # Adicionar dados e terminador
            barcode_data = data.encode(self.encoding, errors='replace')
            barcode_command += bytes([len(barcode_data)]) + barcode_data
            
            return await self._send_command(barcode_command)
        except Exception as e:
            logging.error(f"Erro ao imprimir código de barras: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
    
    async def print_qrcode(self, data: str, size: int = 6) -> bool:
        """Imprime um QR code."""
        if not self.initialized:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não inicializada")
            return False
        
        try:
            # Centralizar
            await self._send_command(ESC + b'a' + b'\x01')  # Centralizado
            
            # Tamanho do QR code (1-16)
            qr_size = max(1, min(16, size))
            
            # Comandos para QR code (específico para Elgin)
            # Modelo do QR Code (Modelo 2)
            await self._send_command(GS + b'(k' + b'\x04\x00' + b'1A' + b'\x02\x00')
            
            # Tamanho do QR Code
            await self._send_command(GS + b'(k' + b'\x03\x00' + b'1C' + bytes([qr_size]))
            
            # Nível de correção de erro (L=1, M=0, Q=3, H=2)
            error_level = min(3, self.config.options.get("qrcode_error_level", 1))
            await self._send_command(GS + b'(k' + b'\x03\x00' + b'1E' + bytes([error_level]))
            
            # Dados do QR Code
            qr_data = data.encode(self.encoding, errors='replace')
            data_length = len(qr_data) + 3
            await self._send_command(GS + b'(k' + bytes([data_length & 0xFF, (data_length >> 8) & 0xFF]) + b'1P0' + qr_data)
            
            # Imprimir QR Code
            await self._send_command(GS + b'(k' + b'\x03\x00' + b'1Q0')
            
            return True
        except Exception as e:
            logging.error(f"Erro ao imprimir QR code: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
