import json
import os
from datetime import datetime
from typing import Any, Dict

from src.peripherals.models.peripheral_models import PrinterException, ReceiptTemplate
from src.peripherals.services.peripheral_service import get_peripheral_manager


class PrintService:
    """Serviço para operações de impressão."""

    def __init__(self) -> None:
        self.peripheral_manager = get_peripheral_manager()
        self.templates: Dict[str, ReceiptTemplate] = {}
        self.initialized = False

    async def initialize(self, templates_path: str) -> None:
        """Inicializa o serviço com templates de um diretório."""
        if self.initialized:
            return

        # Carregar templates
        try:
            for filename in os.listdir(templates_path):
                if filename.endswith(".json"):
                    template_name = os.path.splitext(filename)[0]
                    with open(os.path.join(templates_path, filename), "r") as f:
                        template_data = json.load(f)
                        self.templates[template_name] = ReceiptTemplate(
                            id=template_data.get("id", template_name),
                            name=template_data.get("name", template_name),
                            content=json.dumps(template_data),
                            variables=template_data.get("variables", []),
                            options=template_data.get("options", {})
                        )
        except Exception as e:
            print(f"Erro ao carregar templates: {str(e)}")
            # Em produção, registrar em log

        self.initialized = True

    async def print_receipt(
        self, printer_id: str, template_name: str, data: Dict[str, Any]
    ) -> bool:
        """Imprime um recibo usando um template e dados."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_printer(printer_id)
        if not printer:
            raise PrinterException(f"Impressora não encontrada: {printer_id}")

        # Obter o template
        template = self.templates.get(template_name)
        if not template:
            raise PrinterException(f"Template não encontrado: {template_name}")

        # Renderizar o template com os dados
        receipt = self._render_template(template, data)

        # Imprimir o recibo
        success = await printer.print_receipt(receipt)  # type: ignore

        # Cortar o papel
        if success:
            await printer.cut_paper()  # type: ignore

        return success

    async def print_text(self, printer_id: str, text: str) -> bool:
        """Imprime texto simples."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_printer(printer_id)
        if not printer:
            raise PrinterException(f"Impressora não encontrada: {printer_id}")

        # Imprimir o texto
        return await printer.print_text(text)  # type: ignore

    async def print_image(self, printer_id: str, image_path: str) -> bool:
        """Imprime uma imagem."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_printer(printer_id)
        if not printer:
            raise PrinterException(f"Impressora não encontrada: {printer_id}")

        # Verificar se o arquivo existe
        if not os.path.exists(image_path):
            raise PrinterException(f"Arquivo de imagem não encontrado: {image_path}")

        # Imprimir a imagem
        return await printer.print_image(image_path)  # type: ignore

    async def print_barcode(
        self, printer_id: str, data: str, barcode_type: str = "CODE128"
    ) -> bool:
        """Imprime um código de barras."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_printer(printer_id)
        if not printer:
            raise PrinterException(f"Impressora não encontrada: {printer_id}")

        # Imprimir o código de barras
        return await printer.print_barcode(data, barcode_type)  # type: ignore

    async def print_qrcode(self, printer_id: str, data: str, size: int = 6) -> bool:
        """Imprime um QR code."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_printer(printer_id)
        if not printer:
            raise PrinterException(f"Impressora não encontrada: {printer_id}")

        # Imprimir o QR code
        return await printer.print_qrcode(data, size)  # type: ignore

    async def open_cash_drawer(self, printer_id: str) -> bool:
        """Abre a gaveta de dinheiro conectada à impressora."""
        # Obter a impressora
        printer = await self.peripheral_manager.get_printer(printer_id)
        if not printer:
            raise PrinterException(f"Impressora não encontrada: {printer_id}")

        # Verificar se a impressora suporta gaveta de dinheiro
        if not printer.config.cash_drawer_enabled:  # type: ignore
            raise PrinterException(
                f"Impressora {printer_id} não suporta gaveta de dinheiro"
            )

        # Abrir a gaveta
        return await printer.open_cash_drawer()  # type: ignore

    def _render_template(
        self, template: ReceiptTemplate, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Renderiza um template com dados."""
        # Implementação básica de renderização de template
        # Em uma implementação real, usaria Jinja2 ou outra biblioteca de templates

        rendered_receipt = {
            "template_name": template.name,
            "template_version": template.options.get("version", "1.0"),
            "content": [],
        }

        # Processar cada seção do template
        template_content = json.loads(template.content)
        for section in template_content.get("sections", []):
            section_type = section.get("type", "")
            section_content = section.get("content", [])

            rendered_section = {"type": section_type, "content": []}

            # Processar cada item de conteúdo da seção
            for content_item in section_content:
                item_type = content_item.get("type", "")

                if item_type == "text":
                    # Substituir variáveis no texto
                    text_value = content_item.get("value", "")
                    rendered_text = self._replace_variables(text_value, data)

                    rendered_item = {
                        "type": "text",
                        "value": rendered_text,
                        "align": content_item.get("align", "left"),
                        "style": content_item.get("style", "normal"),
                    }

                    rendered_section["content"].append(rendered_item)

                elif item_type == "line":
                    rendered_item = {
                        "type": "line",
                        "style": content_item.get("style", "single"),
                    }

                    rendered_section["content"].append(rendered_item)

                elif item_type == "barcode":
                    # Substituir variáveis no valor do código de barras
                    barcode_value = content_item.get("value", "")
                    rendered_value = self._replace_variables(barcode_value, data)

                    rendered_item = {
                        "type": "barcode",
                        "value": rendered_value,
                        "barcode_type": content_item.get("barcode_type", "CODE128"),
                        "align": content_item.get("align", "center"),
                    }

                    rendered_section["content"].append(rendered_item)

                elif item_type == "qrcode":
                    # Substituir variáveis no valor do QR code
                    qrcode_value = content_item.get("value", "")
                    rendered_value = self._replace_variables(qrcode_value, data)

                    rendered_item = {
                        "type": "qrcode",
                        "value": rendered_value,
                        "size": content_item.get("size", 6),
                        "align": content_item.get("align", "center"),
                    }

                    rendered_section["content"].append(rendered_item)

                # Adicionar suporte para outros tipos de conteúdo conforme necessário

            rendered_receipt["content"].append(rendered_section)

        return rendered_receipt

    def _replace_variables(self, text: str, data: Dict[str, Any]) -> str:
        """Substitui variáveis em um texto por valores de um dicionário."""
        # Implementação básica de substituição de variáveis
        # Em uma implementação real, usaria uma biblioteca de templates

        # Exemplo: {{order.id}} -> data["order"]["id"]
        import re

        def replace_match(match):
            var_path = match.group(1).strip()

            # Verificar se há formatação (ex: {{value|date}})
            if "|" in var_path:
                var_path, formatter = var_path.split("|", 1)
                var_path = var_path.strip()
                formatter = formatter.strip()
            else:
                formatter = None

            # Navegar pela estrutura de dados
            parts = var_path.split(".")
            value = data

            try:
                for part in parts:
                    if isinstance(value, dict):
                        value = value.get(part)
                    else:
                        return match.group(0)  # Manter o original se não puder navegar

                # Aplicar formatação, se houver
                if formatter:
                    if formatter == "date":
                        if isinstance(value, str):
                            try:
                                dt = datetime.fromisoformat(value)
                                value = dt.strftime("%d/%m/%Y")
                            except ValueError:
                                pass
                        elif isinstance(value, datetime):
                            value = value.strftime("%d/%m/%Y")

                    elif formatter == "time":
                        if isinstance(value, str):
                            try:
                                dt = datetime.fromisoformat(value)
                                value = dt.strftime("%H:%M:%S")
                            except ValueError:
                                pass
                        elif isinstance(value, datetime):
                            value = value.strftime("%H:%M:%S")

                    elif formatter.startswith("number:"):
                        try:
                            decimals = int(formatter.split(":")[1])
                            value = f"{float(value):.{decimals}f}"
                        except (ValueError, IndexError):
                            pass

                return str(value) if value is not None else ""

            except Exception:
                return match.group(0)  # Manter o original em caso de erro

        pattern = r"\{\{(.*?)\}\}"
        return re.sub(pattern, replace_match, text)


# Singleton para o serviço de impressão
_print_service_instance = None


def get_print_service() -> PrintService:
    """Retorna a instância singleton do serviço de impressão."""
    global _print_service_instance
    if _print_service_instance is None:
        _print_service_instance = PrintService()
    return _print_service_instance
