import json
import os
import tempfile
from datetime import datetime
from typing import Any, Dict, Optional

from src.peripherals.models.peripheral_models import (
    BasePeripheralDriver,
    PeripheralConfig,
    PeripheralStatus,
)


class SimulatedPrinter(BasePeripheralDriver):
    """Implementação simulada de impressora para testes sem hardware real."""

    def __init__(self, config: PeripheralConfig):
        super().__init__(config)
        self.model = config.options.get("model", "Simulated Printer")
        self.output_dir = config.options.get("output_dir", tempfile.gettempdir())
        self.print_count = 0
        self.last_output: Optional[str] = None
        self.last_status_check = datetime.now()

    async def initialize(self) -> bool:
        """Inicializa a impressora simulada."""
        try:
            # Verificar se o diretório de saída existe
            if not os.path.exists(self.output_dir):
                os.makedirs(self.output_dir)

            await self.update_status(PeripheralStatus.ONLINE)
            self.connected = True

            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            self.connected = False
            return False

    async def shutdown(self) -> bool:
        """Finaliza a impressora simulada."""
        await self.update_status(PeripheralStatus.OFFLINE)
        self.connected = False
        return True

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da impressora simulada."""
        return {
            "status": self.status,
            "connected": self.connected,
            "last_error": self.last_error,
            "last_status_check": (
                self.last_status_check.isoformat() if self.last_status_check else None
            ),
            "model": self.model,
            "output_dir": self.output_dir,
            "print_count": self.print_count,
        }

    async def print(
        self, content: str, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Método print genérico - delega para print_text."""
        success = await self.print_text(content)
        return {"success": success, "content": content}

    async def print_text(self, text: str) -> bool:
        """Simula a impressão de texto simples."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        try:
            await self.update_status(PeripheralStatus.BUSY)

            # Gerar um nome de arquivo único
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"print_{timestamp}_{self.print_count}.txt"
            filepath = os.path.join(self.output_dir, filename)

            # Escrever o texto no arquivo
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(text)

            self.print_count += 1
            self.last_output = filepath

            await self.update_status(PeripheralStatus.ONLINE)
            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_receipt(self, receipt: Dict[str, Any]) -> bool:
        """Simula a impressão de um recibo formatado."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        try:
            await self.update_status(PeripheralStatus.BUSY)

            # Gerar um nome de arquivo único
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"receipt_{timestamp}_{self.print_count}.json"
            filepath = os.path.join(self.output_dir, filename)

            # Escrever o recibo no arquivo JSON
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(receipt, f, indent=2)

            # Também criar uma versão de texto para visualização fácil
            text_filename = f"receipt_{timestamp}_{self.print_count}.txt"
            text_filepath = os.path.join(self.output_dir, text_filename)

            with open(text_filepath, "w", encoding="utf-8") as f:
                f.write("=== RECIBO SIMULADO ===\n")
                f.write(f"Modelo: {self.model}\n")
                f.write(f"Data/Hora: {datetime.now().isoformat()}\n")
                f.write(f"Template: {receipt.get('template_name', 'N/A')}\n")
                f.write(f"Versão: {receipt.get('template_version', 'N/A')}\n\n")

                # Processar o conteúdo do recibo
                for section in receipt.get("content", []):
                    section_type = section.get("type", "")
                    f.write(f"--- {section_type.upper()} ---\n")

                    for item in section.get("content", []):
                        item_type = item.get("type", "")

                        if item_type == "text":
                            text_value = item.get("value", "")
                            align = item.get("align", "left")
                            style = item.get("style", "normal")

                            # Simular alinhamento
                            if align == "center":
                                text_value = text_value.center(40)
                            elif align == "right":
                                text_value = text_value.rjust(40)

                            # Simular estilo
                            if style == "bold":
                                text_value = f"**{text_value}**"
                            elif style == "underline":
                                text_value = f"_{text_value}_"

                            f.write(f"{text_value}\n")

                        elif item_type == "line":
                            line_style = item.get("style", "single")

                            if line_style == "double":
                                f.write("=" * 40 + "\n")
                            elif line_style == "dashed":
                                f.write("-" * 40 + "\n")
                            else:
                                f.write("-" * 40 + "\n")

                        elif item_type == "barcode":
                            barcode_value = item.get("value", "")
                            barcode_type = item.get("barcode_type", "CODE128")
                            f.write(
                                f"[CÓDIGO DE BARRAS: {barcode_type}] {barcode_value}\n"
                            )

                        elif item_type == "qrcode":
                            qrcode_value = item.get("value", "")
                            f.write(f"[QR CODE] {qrcode_value}\n")

                    f.write("\n")

            self.print_count += 1
            self.last_output = filepath

            await self.update_status(PeripheralStatus.ONLINE)
            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def cut_paper(self, partial: bool = True) -> bool:
        """Simula o corte de papel."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        # Nada a fazer na simulação, apenas retornar sucesso
        return True

    async def open_cash_drawer(self) -> bool:
        """Simula a abertura da gaveta de dinheiro."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        if not self.config.options.get("cash_drawer_enabled", False):
            await self.update_status(
                PeripheralStatus.ERROR, "Gaveta de dinheiro não habilitada"
            )
            return False

        try:
            # Gerar um arquivo de log para a abertura da gaveta
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cash_drawer_{timestamp}.txt"
            filepath = os.path.join(self.output_dir, filename)

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"Gaveta de dinheiro aberta em {datetime.now().isoformat()}\n")
                f.write(f"Impressora: {self.model}\n")

            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_image(self, image_path: str) -> bool:
        """Simula a impressão de uma imagem."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        try:
            await self.update_status(PeripheralStatus.BUSY)

            # Verificar se o arquivo existe
            if not os.path.exists(image_path):
                await self.update_status(
                    PeripheralStatus.ERROR,
                    f"Arquivo de imagem não encontrado: {image_path}",
                )
                return False

            # Gerar um nome de arquivo único
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"image_{timestamp}_{self.print_count}.txt"
            filepath = os.path.join(self.output_dir, filename)

            # Escrever informações sobre a imagem
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("=== IMAGEM SIMULADA ===\n")
                f.write(f"Modelo: {self.model}\n")
                f.write(f"Data/Hora: {datetime.now().isoformat()}\n")
                f.write(f"Arquivo de origem: {image_path}\n")

                # Em uma implementação real, poderíamos copiar a imagem
                # ou gerar uma visualização ASCII da imagem

            self.print_count += 1
            self.last_output = filepath

            await self.update_status(PeripheralStatus.ONLINE)
            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_barcode(self, data: str, barcode_type: str = "CODE128") -> bool:
        """Simula a impressão de um código de barras."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        try:
            await self.update_status(PeripheralStatus.BUSY)

            # Gerar um nome de arquivo único
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"barcode_{timestamp}_{self.print_count}.txt"
            filepath = os.path.join(self.output_dir, filename)

            # Escrever informações sobre o código de barras
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("=== CÓDIGO DE BARRAS SIMULADO ===\n")
                f.write(f"Modelo: {self.model}\n")
                f.write(f"Data/Hora: {datetime.now().isoformat()}\n")
                f.write(f"Tipo: {barcode_type}\n")
                f.write(f"Dados: {data}\n")

            self.print_count += 1
            self.last_output = filepath

            await self.update_status(PeripheralStatus.ONLINE)
            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_qrcode(self, data: str, size: int = 6) -> bool:
        """Simula a impressão de um QR code."""
        if not self.connected:
            await self.update_status(PeripheralStatus.ERROR, "Impressora não conectada")
            return False

        try:
            await self.update_status(PeripheralStatus.BUSY)

            # Gerar um nome de arquivo único
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"qrcode_{timestamp}_{self.print_count}.txt"
            filepath = os.path.join(self.output_dir, filename)

            # Escrever informações sobre o QR code
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("=== QR CODE SIMULADO ===\n")
                f.write(f"Modelo: {self.model}\n")
                f.write(f"Data/Hora: {datetime.now().isoformat()}\n")
                f.write(f"Tamanho: {size}\n")
                f.write(f"Dados: {data}\n")

            self.print_count += 1
            self.last_output = filepath

            await self.update_status(PeripheralStatus.ONLINE)
            return True

        except Exception as e:
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False
