import logging
from typing import Dict, Any, Optional
import os
import subprocess
import tempfile

from src.peripherals.models.peripheral_models import (
    ConventionalPrinter,
    ConventionalPrinterConfig,
    PeripheralStatus,
    PeripheralException,
)


class CupsPrinter(ConventionalPrinter):
    """Driver para impressoras convencionais usando CUPS."""

    def __init__(self, config: ConventionalPrinterConfig):
        super().__init__(config)
        self.printer_name = config.printer_name
        self.initialized = False
        self.options = config.options

    async def initialize(self) -> bool:
        """Inicializa a impressora."""
        try:
            # Verificar se o CUPS está disponível
            result = subprocess.run(
                ["lpstat", "-p", self.printer_name],
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                logging.error(f"Impressora {self.printer_name} não encontrada no CUPS")
                await self.update_status(
                    PeripheralStatus.ERROR,
                    f"Impressora {self.printer_name} não encontrada",
                )
                return False

            # Verificar se a impressora está pronta
            if "idle" in result.stdout or "accepting" in result.stdout:
                self.initialized = True
                await self.update_status(PeripheralStatus.ONLINE)
                return True
            else:
                logging.warning(
                    f"Impressora {self.printer_name} não está pronta: {result.stdout}"
                )
                await self.update_status(
                    PeripheralStatus.WARNING, "Impressora não está pronta"
                )
                return False
        except Exception as e:
            logging.error(f"Erro ao inicializar impressora CUPS: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def shutdown(self) -> bool:
        """Finaliza a impressora."""
        self.initialized = False
        await self.update_status(PeripheralStatus.OFFLINE)
        return True

    async def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual da impressora."""
        if not self.initialized:
            return {
                "status": PeripheralStatus.OFFLINE,
                "message": "Impressora não inicializada",
                "details": {},
            }

        try:
            # Verificar status da impressora
            result = subprocess.run(
                ["lpstat", "-p", self.printer_name],
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                await self.update_status(
                    PeripheralStatus.ERROR, "Erro ao verificar status"
                )
                return {
                    "status": PeripheralStatus.ERROR,
                    "message": "Erro ao verificar status",
                    "details": {"error": result.stderr},
                }

            # Analisar saída
            status_message = result.stdout

            if "idle" in status_message:
                status = PeripheralStatus.ONLINE
                message = "Impressora pronta"
            elif "printing" in status_message:
                status = PeripheralStatus.BUSY
                message = "Impressora ocupada"
            elif "disabled" in status_message or "stopped" in status_message:
                status = PeripheralStatus.ERROR
                message = "Impressora desativada"
            else:
                status = PeripheralStatus.UNKNOWN
                message = "Status desconhecido"

            await self.update_status(status, message)

            return {
                "status": status,
                "message": message,
                "details": {
                    "printer_name": self.printer_name,
                    "raw_status": status_message,
                },
            }
        except Exception as e:
            logging.error(f"Erro ao obter status da impressora CUPS: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return {"status": PeripheralStatus.ERROR, "message": str(e), "details": {}}

    async def print_text(self, text: str) -> bool:
        """Imprime texto simples."""
        if not self.initialized:
            await self.update_status(
                PeripheralStatus.ERROR, "Impressora não inicializada"
            )
            return False

        try:
            # Criar arquivo temporário
            with tempfile.NamedTemporaryFile(mode="w", delete=False) as temp:
                temp.write(text)
                temp_path = temp.name

            # Imprimir arquivo
            result = await self._print_file(temp_path)

            # Remover arquivo temporário
            os.unlink(temp_path)

            return result
        except Exception as e:
            logging.error(f"Erro ao imprimir texto: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_file(self, file_path: str) -> bool:
        """Imprime um arquivo."""
        if not self.initialized:
            await self.update_status(
                PeripheralStatus.ERROR, "Impressora não inicializada"
            )
            return False

        try:
            # Verificar se o arquivo existe
            if not os.path.exists(file_path):
                raise PeripheralException(f"Arquivo não encontrado: {file_path}")

            # Imprimir arquivo
            return await self._print_file(file_path)
        except Exception as e:
            logging.error(f"Erro ao imprimir arquivo: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def _print_file(self, file_path: str) -> bool:
        """Método interno para imprimir um arquivo."""
        try:
            # Preparar opções de impressão
            lp_options = []

            # Adicionar opções específicas
            for key, value in self.options.items():
                if key != "printer_name":  # Evitar duplicação
                    lp_options.extend(["-o", f"{key}={value}"])

            # Comando de impressão
            cmd = ["lp", "-d", self.printer_name] + lp_options + [file_path]

            # Executar comando
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)

            if result.returncode != 0:
                logging.error(f"Erro ao imprimir: {result.stderr}")
                await self.update_status(
                    PeripheralStatus.ERROR, f"Erro ao imprimir: {result.stderr}"
                )
                return False

            # Extrair ID do trabalho
            job_id = None
            if "request id is" in result.stdout:
                job_id = result.stdout.split("request id is")[1].strip()

            await self.update_status(
                PeripheralStatus.BUSY, f"Imprimindo trabalho {job_id}"
            )

            return True
        except Exception as e:
            logging.error(f"Erro ao imprimir arquivo: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_pdf(self, pdf_path: str, options: Dict[str, Any] = None) -> bool:
        """Imprime um arquivo PDF."""
        if not self.initialized:
            await self.update_status(
                PeripheralStatus.ERROR, "Impressora não inicializada"
            )
            return False

        try:
            # Verificar se o arquivo existe
            if not os.path.exists(pdf_path):
                raise PeripheralException(f"Arquivo PDF não encontrado: {pdf_path}")

            # Verificar extensão
            if not pdf_path.lower().endswith(".pdf"):
                raise PeripheralException(f"Arquivo não é um PDF: {pdf_path}")

            # Mesclar opções
            merged_options = self.options.copy()
            if options:
                merged_options.update(options)

            # Preparar opções de impressão
            lp_options = []

            # Adicionar opções específicas para PDF
            for key, value in merged_options.items():
                if key != "printer_name":  # Evitar duplicação
                    lp_options.extend(["-o", f"{key}={value}"])

            # Comando de impressão
            cmd = ["lp", "-d", self.printer_name] + lp_options + [pdf_path]

            # Executar comando
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)

            if result.returncode != 0:
                logging.error(f"Erro ao imprimir PDF: {result.stderr}")
                await self.update_status(
                    PeripheralStatus.ERROR, f"Erro ao imprimir PDF: {result.stderr}"
                )
                return False

            # Extrair ID do trabalho
            job_id = None
            if "request id is" in result.stdout:
                job_id = result.stdout.split("request id is")[1].strip()

            await self.update_status(
                PeripheralStatus.BUSY, f"Imprimindo PDF, trabalho {job_id}"
            )

            return True
        except Exception as e:
            logging.error(f"Erro ao imprimir PDF: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def print_report(
        self, report_data: Dict[str, Any], template: str = "default"
    ) -> bool:
        """Imprime um relatório formatado."""
        if not self.initialized:
            await self.update_status(
                PeripheralStatus.ERROR, "Impressora não inicializada"
            )
            return False

        try:
            # Gerar PDF a partir dos dados do relatório
            pdf_path = await self._generate_report_pdf(report_data, template)

            if not pdf_path:
                return False

            # Imprimir PDF
            result = await self.print_pdf(pdf_path)

            # Remover arquivo temporário
            os.unlink(pdf_path)

            return result
        except Exception as e:
            logging.error(f"Erro ao imprimir relatório: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return False

    async def _generate_report_pdf(
        self, report_data: Dict[str, Any], template: str
    ) -> Optional[str]:
        """Gera um PDF a partir dos dados do relatório."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.platypus import (
                SimpleDocTemplate,
                Table,
                TableStyle,
                Paragraph,
                Spacer,
            )
            from reportlab.lib.styles import getSampleStyleSheet

            # Criar arquivo temporário para o PDF
            temp_pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            temp_pdf.close()
            pdf_path = temp_pdf.name

            # Configurar documento
            doc = SimpleDocTemplate(pdf_path, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []

            # Título do relatório
            if "title" in report_data:
                title = Paragraph(report_data["title"], styles["Heading1"])
                elements.append(title)
                elements.append(Spacer(1, 12))

            # Subtítulo ou descrição
            if "subtitle" in report_data:
                subtitle = Paragraph(report_data["subtitle"], styles["Heading2"])
                elements.append(subtitle)
                elements.append(Spacer(1, 12))

            # Data do relatório
            if "date" in report_data:
                date_text = Paragraph(f"Data: {report_data['date']}", styles["Normal"])
                elements.append(date_text)
                elements.append(Spacer(1, 12))

            # Tabela de dados
            if "data" in report_data and report_data["data"]:
                data = report_data["data"]

                # Cabeçalho da tabela
                if "headers" in report_data:
                    headers = report_data["headers"]
                    table_data = [headers]
                else:
                    # Usar chaves do primeiro item como cabeçalho
                    if isinstance(data[0], dict):
                        headers = list(data[0].keys())
                        table_data = [headers]
                    else:
                        table_data = []

                # Adicionar linhas de dados
                for row in data:
                    if isinstance(row, dict):
                        table_data.append([row.get(h, "") for h in headers])
                    else:
                        table_data.append(row)

                # Criar tabela
                table = Table(table_data)

                # Estilo da tabela
                table_style = TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
                table.setStyle(table_style)

                elements.append(table)
                elements.append(Spacer(1, 12))

            # Texto adicional
            if "text" in report_data:
                text = Paragraph(report_data["text"], styles["Normal"])
                elements.append(text)

            # Rodapé
            if "footer" in report_data:
                elements.append(Spacer(1, 20))
                footer = Paragraph(report_data["footer"], styles["Italic"])
                elements.append(footer)

            # Gerar PDF
            doc.build(elements)

            return pdf_path
        except ImportError:
            logging.error("Biblioteca ReportLab não disponível. Instale 'reportlab'.")
            await self.update_status(
                PeripheralStatus.ERROR, "Biblioteca ReportLab não disponível"
            )
            return None
        except Exception as e:
            logging.error(f"Erro ao gerar PDF do relatório: {str(e)}")
            await self.update_status(PeripheralStatus.ERROR, str(e))
            return None
