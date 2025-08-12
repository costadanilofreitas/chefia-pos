"""
Serviço para integração contábil e exportação de documentos fiscais
"""

import os
import logging
import json
import csv
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from uuid import uuid4

from src.fiscal.models.accounting_models import (
    AccountingExportBatch,
    AccountingExportStatus,
    AccountingExportItem,
    DocumentType,
    AccountingMapping,
    AccountingProvider,
    AccountingSchedule,
)

# Configuração de logging
logger = logging.getLogger(__name__)


class AccountingService:
    """
    Serviço para integração contábil e exportação de documentos fiscais
    """

    def __init__(self, db_service, nfce_service, cfe_service, config_service):
        """
        Inicializa o serviço de integração contábil

        Args:
            db_service: Serviço de banco de dados
            nfce_service: Serviço de NFC-e
            cfe_service: Serviço de CF-e
            config_service: Serviço de configuração
        """
        self.db_service = db_service
        self.nfce_service = nfce_service
        self.cfe_service = cfe_service
        self.config_service = config_service

    def register_provider(self, provider_data: Dict[str, Any]) -> AccountingProvider:
        """
        Registra um novo provedor de serviços contábeis

        Args:
            provider_data: Dados do provedor

        Returns:
            Provedor registrado
        """
        # Gera um ID único para o provedor
        provider_id = str(uuid4())

        # Define valores padrão
        provider_data["id"] = provider_id
        provider_data["created_at"] = datetime.now()
        provider_data["updated_at"] = datetime.now()

        # Valida os dados do provedor
        self._validate_provider_data(provider_data)

        # Salva o provedor no banco de dados
        self.db_service.insert_one("fiscal_accounting_providers", provider_data)

        # Retorna o provedor registrado
        return AccountingProvider(**provider_data)

    def _validate_provider_data(self, provider_data: Dict[str, Any]) -> None:
        """
        Valida os dados do provedor

        Args:
            provider_data: Dados do provedor

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = [
            "name",
            "provider_type",
            "api_url",
            "auth_method",
            "export_format",
        ]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in provider_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se o nome é único
        existing = self.db_service.find_one(
            "fiscal_accounting_providers", {"name": provider_data["name"]}
        )

        if existing:
            raise ValueError(
                f"Já existe um provedor com o nome {provider_data['name']}"
            )

        # Verifica se o formato de exportação é suportado
        supported_formats = ["json", "xml", "csv"]
        if provider_data["export_format"] not in supported_formats:
            raise ValueError(
                f"Formato de exportação não suportado: {provider_data['export_format']}. Formatos suportados: {', '.join(supported_formats)}"
            )

    def get_provider(self, provider_id: str) -> Optional[AccountingProvider]:
        """
        Obtém um provedor pelo ID

        Args:
            provider_id: ID do provedor

        Returns:
            Provedor ou None se não encontrado
        """
        provider_data = self.db_service.find_one(
            "fiscal_accounting_providers", {"id": provider_id}
        )

        if not provider_data:
            return None

        return AccountingProvider(**provider_data)

    def update_provider(
        self, provider_id: str, update_data: Dict[str, Any]
    ) -> Optional[AccountingProvider]:
        """
        Atualiza um provedor

        Args:
            provider_id: ID do provedor
            update_data: Dados a serem atualizados

        Returns:
            Provedor atualizado ou None se não encontrado
        """
        # Obtém o provedor atual
        provider_data = self.db_service.find_one(
            "fiscal_accounting_providers", {"id": provider_id}
        )

        if not provider_data:
            return None

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        provider_data.update(update_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "fiscal_accounting_providers", {"id": provider_id}, {"$set": update_data}
        )

        # Retorna o provedor atualizado
        return AccountingProvider(**provider_data)

    def create_mapping(self, mapping_data: Dict[str, Any]) -> AccountingMapping:
        """
        Cria um novo mapeamento de contas contábeis

        Args:
            mapping_data: Dados do mapeamento

        Returns:
            Mapeamento criado
        """
        # Gera um ID único para o mapeamento
        mapping_id = str(uuid4())

        # Define valores padrão
        mapping_data["id"] = mapping_id
        mapping_data["created_at"] = datetime.now()
        mapping_data["updated_at"] = datetime.now()

        # Valida os dados do mapeamento
        self._validate_mapping_data(mapping_data)

        # Salva o mapeamento no banco de dados
        self.db_service.insert_one("fiscal_accounting_mappings", mapping_data)

        # Retorna o mapeamento criado
        return AccountingMapping(**mapping_data)

    def _validate_mapping_data(self, mapping_data: Dict[str, Any]) -> None:
        """
        Valida os dados do mapeamento

        Args:
            mapping_data: Dados do mapeamento

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = ["source_code", "target_code", "description", "account_type"]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in mapping_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica se o código de origem é único
        existing = self.db_service.find_one(
            "fiscal_accounting_mappings", {"source_code": mapping_data["source_code"]}
        )

        if existing:
            raise ValueError(
                f"Já existe um mapeamento para o código de origem {mapping_data['source_code']}"
            )

    def get_mapping(self, mapping_id: str) -> Optional[AccountingMapping]:
        """
        Obtém um mapeamento pelo ID

        Args:
            mapping_id: ID do mapeamento

        Returns:
            Mapeamento ou None se não encontrado
        """
        mapping_data = self.db_service.find_one(
            "fiscal_accounting_mappings", {"id": mapping_id}
        )

        if not mapping_data:
            return None

        return AccountingMapping(**mapping_data)

    def update_mapping(
        self, mapping_id: str, update_data: Dict[str, Any]
    ) -> Optional[AccountingMapping]:
        """
        Atualiza um mapeamento

        Args:
            mapping_id: ID do mapeamento
            update_data: Dados a serem atualizados

        Returns:
            Mapeamento atualizado ou None se não encontrado
        """
        # Obtém o mapeamento atual
        mapping_data = self.db_service.find_one(
            "fiscal_accounting_mappings", {"id": mapping_id}
        )

        if not mapping_data:
            return None

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        mapping_data.update(update_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "fiscal_accounting_mappings", {"id": mapping_id}, {"$set": update_data}
        )

        # Retorna o mapeamento atualizado
        return AccountingMapping(**mapping_data)

    def create_export_batch(
        self,
        reference_period: str,
        export_destination: str,
        created_by: str,
        notes: Optional[str] = None,
    ) -> AccountingExportBatch:
        """
        Cria um novo lote de exportação contábil

        Args:
            reference_period: Período de referência (YYYY-MM)
            export_destination: Destino da exportação (ID do provedor)
            created_by: Identificador de quem criou
            notes: Notas adicionais

        Returns:
            Lote de exportação criado
        """
        # Gera um ID único para o lote
        batch_id = str(uuid4())

        # Obtém o provedor
        provider = self.get_provider(export_destination)
        if not provider:
            raise ValueError(f"Provedor não encontrado: {export_destination}")

        # Define valores padrão
        batch_data = {
            "id": batch_id,
            "reference_period": reference_period,
            "status": AccountingExportStatus.PENDING,
            "start_date": datetime.now(),
            "document_count": 0,
            "total_value": 0.0,
            "export_destination": export_destination,
            "created_by": created_by,
            "notes": notes,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }

        # Salva o lote no banco de dados
        self.db_service.insert_one("fiscal_accounting_export_batches", batch_data)

        # Retorna o lote criado
        return AccountingExportBatch(**batch_data)

    def get_export_batch(self, batch_id: str) -> Optional[AccountingExportBatch]:
        """
        Obtém um lote de exportação pelo ID

        Args:
            batch_id: ID do lote

        Returns:
            Lote de exportação ou None se não encontrado
        """
        batch_data = self.db_service.find_one(
            "fiscal_accounting_export_batches", {"id": batch_id}
        )

        if not batch_data:
            return None

        return AccountingExportBatch(**batch_data)

    def update_export_batch(
        self, batch_id: str, update_data: Dict[str, Any]
    ) -> Optional[AccountingExportBatch]:
        """
        Atualiza um lote de exportação

        Args:
            batch_id: ID do lote
            update_data: Dados a serem atualizados

        Returns:
            Lote de exportação atualizado ou None se não encontrado
        """
        # Obtém o lote atual
        batch_data = self.db_service.find_one(
            "fiscal_accounting_export_batches", {"id": batch_id}
        )

        if not batch_data:
            return None

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        batch_data.update(update_data)

        # Atualiza no banco de dados
        self.db_service.update_one(
            "fiscal_accounting_export_batches", {"id": batch_id}, {"$set": update_data}
        )

        # Retorna o lote atualizado
        return AccountingExportBatch(**batch_data)

    def process_export_batch(self, batch_id: str) -> Tuple[bool, str, Optional[str]]:
        """
        Processa um lote de exportação contábil

        Args:
            batch_id: ID do lote

        Returns:
            Tupla com (sucesso, mensagem, caminho do arquivo exportado)
        """
        # Obtém o lote
        batch = self.get_export_batch(batch_id)

        if not batch:
            return False, "Lote de exportação não encontrado", None

        # Verifica se o lote já foi processado
        if batch.status not in [
            AccountingExportStatus.PENDING,
            AccountingExportStatus.FAILED,
        ]:
            return (
                False,
                f"Lote com status {batch.status} não pode ser processado",
                None,
            )

        try:
            # Atualiza o status para PROCESSING
            self.update_export_batch(
                batch_id, {"status": AccountingExportStatus.PROCESSING}
            )

            # Obtém o provedor
            provider = self.get_provider(batch.export_destination)
            if not provider:
                raise ValueError(f"Provedor não encontrado: {batch.export_destination}")

            # Extrai o ano e mês do período de referência
            year, month = batch.reference_period.split("-")

            # Define o período de datas
            start_date = datetime(int(year), int(month), 1)
            if int(month) == 12:
                end_date = datetime(int(year) + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(int(year), int(month) + 1, 1) - timedelta(days=1)

            # Obtém os documentos fiscais do período
            nfce_documents = self.nfce_service.get_nfce_for_accounting(
                start_date, end_date
            )
            cfe_documents = self.cfe_service.get_cfe_for_accounting(
                start_date, end_date
            )

            # Cria itens de exportação para cada documento
            export_items = []
            total_value = 0.0

            # Processa NFC-e
            for nfce in nfce_documents:
                item_id = str(uuid4())

                item_data = {
                    "id": item_id,
                    "batch_id": batch_id,
                    "document_type": DocumentType.NFCE,
                    "document_id": nfce.id,
                    "document_number": nfce.number,
                    "document_date": nfce.issue_date,
                    "document_value": nfce.total_value,
                    "status": AccountingExportStatus.PENDING,
                    "export_data": self._prepare_nfce_export_data(nfce),
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                }

                # Salva o item no banco de dados
                self.db_service.insert_one("fiscal_accounting_export_items", item_data)

                export_items.append(AccountingExportItem(**item_data))
                total_value += nfce.total_value

            # Processa CF-e
            for cfe in cfe_documents:
                item_id = str(uuid4())

                item_data = {
                    "id": item_id,
                    "batch_id": batch_id,
                    "document_type": DocumentType.CFE,
                    "document_id": cfe.id,
                    "document_number": cfe.number,
                    "document_date": cfe.issue_date,
                    "document_value": cfe.total_value,
                    "status": AccountingExportStatus.PENDING,
                    "export_data": self._prepare_cfe_export_data(cfe),
                    "created_at": datetime.now(),
                    "updated_at": datetime.now(),
                }

                # Salva o item no banco de dados
                self.db_service.insert_one("fiscal_accounting_export_items", item_data)

                export_items.append(AccountingExportItem(**item_data))
                total_value += cfe.total_value

            # Verifica se há documentos para exportar
            if not export_items:
                self.update_export_batch(
                    batch_id,
                    {
                        "status": AccountingExportStatus.COMPLETED,
                        "end_date": datetime.now(),
                        "document_count": 0,
                        "total_value": 0.0,
                        "notes": f"{batch.notes or ''}\nNenhum documento encontrado para o período.",
                    },
                )

                return True, "Nenhum documento encontrado para exportação", None

            # Gera o arquivo de exportação
            export_file_path = self._generate_export_file(batch, export_items, provider)

            # Marca os documentos como exportados
            for item in export_items:
                if item.document_type == DocumentType.NFCE:
                    self.nfce_service.mark_as_exported(item.document_id)
                elif item.document_type == DocumentType.CFE:
                    self.cfe_service.mark_as_exported(item.document_id)

                # Atualiza o status do item
                self.db_service.update_one(
                    "fiscal_accounting_export_items",
                    {"id": item.id},
                    {"$set": {"status": AccountingExportStatus.COMPLETED}},
                )

            # Atualiza o lote
            self.update_export_batch(
                batch_id,
                {
                    "status": AccountingExportStatus.COMPLETED,
                    "end_date": datetime.now(),
                    "document_count": len(export_items),
                    "total_value": total_value,
                },
            )

            return (
                True,
                f"Exportação concluída com sucesso. {len(export_items)} documentos exportados.",
                export_file_path,
            )

        except Exception as e:
            logger.error(f"Erro ao processar lote de exportação {batch_id}: {str(e)}")

            # Atualiza o lote com erro
            self.update_export_batch(
                batch_id,
                {
                    "status": AccountingExportStatus.FAILED,
                    "end_date": datetime.now(),
                    "error_details": {"exception": str(e)},
                },
            )

            return False, f"Erro ao processar lote de exportação: {str(e)}", None

    def _prepare_nfce_export_data(self, nfce) -> Dict[str, Any]:
        """
        Prepara os dados de exportação para uma NFC-e

        Args:
            nfce: Documento NFC-e

        Returns:
            Dados formatados para exportação
        """
        # Em um ambiente real, isso seria uma implementação completa de formatação de dados
        # Aqui estamos apenas gerando dados básicos para demonstração

        export_data = {
            "document_type": "NFC-e",
            "document_number": nfce.number,
            "document_series": nfce.series,
            "issue_date": nfce.issue_date.isoformat(),
            "issuer": {"name": nfce.issuer.name, "cnpj": nfce.issuer.cnpj},
            "total_value": nfce.total_value,
            "total_taxes": nfce.total_taxes,
            "items": [],
        }

        # Adiciona os itens
        for item in nfce.items:
            export_data["items"].append(
                {
                    "product_code": item.product_code,
                    "description": item.product_description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                }
            )

        # Adiciona os pagamentos
        export_data["payments"] = []
        for payment in nfce.payments:
            export_data["payments"].append(
                {"type": payment.type, "value": payment.value}
            )

        # Adiciona informações da resposta, se disponível
        if nfce.response:
            export_data["authorization"] = {
                "date": nfce.response.authorization_date.isoformat(),
                "protocol": nfce.response.authorization_protocol,
                "access_key": nfce.response.access_key,
            }

        return export_data

    def _prepare_cfe_export_data(self, cfe) -> Dict[str, Any]:
        """
        Prepara os dados de exportação para um CF-e

        Args:
            cfe: Documento CF-e

        Returns:
            Dados formatados para exportação
        """
        # Em um ambiente real, isso seria uma implementação completa de formatação de dados
        # Aqui estamos apenas gerando dados básicos para demonstração

        export_data = {
            "document_type": "CF-e",
            "document_number": cfe.number,
            "issue_date": cfe.issue_date.isoformat(),
            "issuer": {"name": cfe.issuer.name, "cnpj": cfe.issuer.cnpj},
            "total_value": cfe.total_value,
            "total_taxes": cfe.total_taxes,
            "items": [],
        }

        # Adiciona os itens
        for item in cfe.items:
            export_data["items"].append(
                {
                    "product_code": item.product_code,
                    "description": item.product_description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "total_price": item.total_price,
                }
            )

        # Adiciona os pagamentos
        export_data["payments"] = []
        for payment in cfe.payments:
            export_data["payments"].append(
                {"type": payment.type, "value": payment.value}
            )

        # Adiciona informações da resposta, se disponível
        if cfe.response:
            export_data["authorization"] = {
                "date": cfe.response.authorization_date.isoformat(),
                "protocol": cfe.response.authorization_protocol,
                "access_key": cfe.response.access_key,
                "sat_serial": cfe.response.sat_serial_number,
            }

        return export_data

    def _generate_export_file(
        self,
        batch: AccountingExportBatch,
        items: List[AccountingExportItem],
        provider: AccountingProvider,
    ) -> str:
        """
        Gera o arquivo de exportação

        Args:
            batch: Lote de exportação
            items: Itens de exportação
            provider: Provedor de serviços contábeis

        Returns:
            Caminho do arquivo gerado
        """
        # Cria o diretório de exportação se não existir
        export_dir = os.path.join(os.getcwd(), "exports", "accounting")
        os.makedirs(export_dir, exist_ok=True)

        # Define o nome do arquivo
        filename = (
            f"export_{batch.reference_period}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )

        # Gera o arquivo no formato adequado
        if provider.export_format == "json":
            return self._generate_json_export(batch, items, export_dir, filename)
        elif provider.export_format == "xml":
            return self._generate_xml_export(batch, items, export_dir, filename)
        elif provider.export_format == "csv":
            return self._generate_csv_export(batch, items, export_dir, filename)
        else:
            raise ValueError(
                f"Formato de exportação não suportado: {provider.export_format}"
            )

    def _generate_json_export(
        self,
        batch: AccountingExportBatch,
        items: List[AccountingExportItem],
        export_dir: str,
        filename: str,
    ) -> str:
        """
        Gera um arquivo de exportação em formato JSON

        Args:
            batch: Lote de exportação
            items: Itens de exportação
            export_dir: Diretório de exportação
            filename: Nome base do arquivo

        Returns:
            Caminho do arquivo gerado
        """
        # Cria a estrutura de dados para exportação
        export_data = {
            "batch": {
                "id": batch.id,
                "reference_period": batch.reference_period,
                "export_date": datetime.now().isoformat(),
                "document_count": len(items),
                "total_value": sum(item.document_value for item in items),
            },
            "documents": [],
        }

        # Adiciona os documentos
        for item in items:
            export_data["documents"].append(item.export_data)

        # Define o caminho completo do arquivo
        file_path = os.path.join(export_dir, f"{filename}.json")

        # Escreve o arquivo
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return file_path

    def _generate_xml_export(
        self,
        batch: AccountingExportBatch,
        items: List[AccountingExportItem],
        export_dir: str,
        filename: str,
    ) -> str:
        """
        Gera um arquivo de exportação em formato XML

        Args:
            batch: Lote de exportação
            items: Itens de exportação
            export_dir: Diretório de exportação
            filename: Nome base do arquivo

        Returns:
            Caminho do arquivo gerado
        """
        # Cria a estrutura XML
        root = ET.Element("AccountingExport")

        # Adiciona informações do lote
        batch_elem = ET.SubElement(root, "Batch")
        ET.SubElement(batch_elem, "Id").text = batch.id
        ET.SubElement(batch_elem, "ReferencePeriod").text = batch.reference_period
        ET.SubElement(batch_elem, "ExportDate").text = datetime.now().isoformat()
        ET.SubElement(batch_elem, "DocumentCount").text = str(len(items))
        ET.SubElement(batch_elem, "TotalValue").text = str(
            sum(item.document_value for item in items)
        )

        # Adiciona os documentos
        documents_elem = ET.SubElement(root, "Documents")

        for item in items:
            doc_elem = ET.SubElement(documents_elem, "Document")

            # Adiciona os atributos básicos
            ET.SubElement(doc_elem, "Type").text = item.document_type
            ET.SubElement(doc_elem, "Number").text = item.document_number
            ET.SubElement(doc_elem, "Date").text = item.document_date.isoformat()
            ET.SubElement(doc_elem, "Value").text = str(item.document_value)

            # Adiciona os dados específicos do documento
            export_data_elem = ET.SubElement(doc_elem, "ExportData")
            self._dict_to_xml(item.export_data, export_data_elem)

        # Define o caminho completo do arquivo
        file_path = os.path.join(export_dir, f"{filename}.xml")

        # Escreve o arquivo
        tree = ET.ElementTree(root)
        tree.write(file_path, encoding="utf-8", xml_declaration=True)

        return file_path

    def _dict_to_xml(self, data: Dict[str, Any], parent_elem: ET.Element) -> None:
        """
        Converte um dicionário em elementos XML

        Args:
            data: Dicionário a ser convertido
            parent_elem: Elemento pai
        """
        for key, value in data.items():
            if isinstance(value, dict):
                sub_elem = ET.SubElement(parent_elem, key)
                self._dict_to_xml(value, sub_elem)
            elif isinstance(value, list):
                list_elem = ET.SubElement(parent_elem, key)
                for item in value:
                    if isinstance(item, dict):
                        item_elem = ET.SubElement(list_elem, "Item")
                        self._dict_to_xml(item, item_elem)
                    else:
                        item_elem = ET.SubElement(list_elem, "Item")
                        item_elem.text = str(item)
            else:
                ET.SubElement(parent_elem, key).text = str(value)

    def _generate_csv_export(
        self,
        batch: AccountingExportBatch,
        items: List[AccountingExportItem],
        export_dir: str,
        filename: str,
    ) -> str:
        """
        Gera um arquivo de exportação em formato CSV

        Args:
            batch: Lote de exportação
            items: Itens de exportação
            export_dir: Diretório de exportação
            filename: Nome base do arquivo

        Returns:
            Caminho do arquivo gerado
        """
        # Define o caminho completo do arquivo
        file_path = os.path.join(export_dir, f"{filename}.csv")

        # Escreve o arquivo
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            # Escreve o cabeçalho
            writer.writerow(
                [
                    "Tipo",
                    "Número",
                    "Data",
                    "CNPJ Emissor",
                    "Nome Emissor",
                    "Valor Total",
                    "Impostos",
                    "Chave de Acesso",
                    "Protocolo",
                ]
            )

            # Escreve os dados
            for item in items:
                data = item.export_data

                # Extrai os valores
                document_type = data.get("document_type", "")
                document_number = data.get("document_number", "")
                issue_date = data.get("issue_date", "")
                issuer_cnpj = data.get("issuer", {}).get("cnpj", "")
                issuer_name = data.get("issuer", {}).get("name", "")
                total_value = data.get("total_value", 0)
                total_taxes = data.get("total_taxes", 0)

                # Extrai informações de autorização
                access_key = data.get("authorization", {}).get("access_key", "")
                protocol = data.get("authorization", {}).get("protocol", "")

                # Escreve a linha
                writer.writerow(
                    [
                        document_type,
                        document_number,
                        issue_date,
                        issuer_cnpj,
                        issuer_name,
                        total_value,
                        total_taxes,
                        access_key,
                        protocol,
                    ]
                )

            # Escreve um resumo no final
            writer.writerow([])
            writer.writerow(["Resumo", "", "", "", "", "", "", "", ""])
            writer.writerow(
                ["Período", batch.reference_period, "", "", "", "", "", "", ""]
            )
            writer.writerow(
                ["Total de Documentos", len(items), "", "", "", "", "", "", ""]
            )
            writer.writerow(
                [
                    "Valor Total",
                    sum(item.document_value for item in items),
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            )
            writer.writerow(
                [
                    "Data de Exportação",
                    datetime.now().isoformat(),
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            )

        return file_path

    def create_schedule(self, schedule_data: Dict[str, Any]) -> AccountingSchedule:
        """
        Cria um novo agendamento de exportação contábil

        Args:
            schedule_data: Dados do agendamento

        Returns:
            Agendamento criado
        """
        # Gera um ID único para o agendamento
        schedule_id = str(uuid4())

        # Define valores padrão
        schedule_data["id"] = schedule_id
        schedule_data["created_at"] = datetime.now()
        schedule_data["updated_at"] = datetime.now()

        # Calcula a próxima execução
        next_run = self._calculate_next_run(schedule_data)
        schedule_data["next_run"] = next_run

        # Valida os dados do agendamento
        self._validate_schedule_data(schedule_data)

        # Salva o agendamento no banco de dados
        self.db_service.insert_one("fiscal_accounting_schedules", schedule_data)

        # Retorna o agendamento criado
        return AccountingSchedule(**schedule_data)

    def _validate_schedule_data(self, schedule_data: Dict[str, Any]) -> None:
        """
        Valida os dados do agendamento

        Args:
            schedule_data: Dados do agendamento

        Raises:
            ValueError: Se os dados forem inválidos
        """
        required_fields = ["frequency", "time_of_day"]

        # Verifica campos obrigatórios
        for field in required_fields:
            if field not in schedule_data:
                raise ValueError(f"Campo obrigatório ausente: {field}")

        # Verifica a frequência
        if schedule_data["frequency"] not in ["daily", "weekly", "monthly"]:
            raise ValueError(
                f"Frequência inválida: {schedule_data['frequency']}. Valores válidos: daily, weekly, monthly"
            )

        # Verifica o dia da semana para frequência semanal
        if (
            schedule_data["frequency"] == "weekly"
            and "day_of_week" not in schedule_data
        ):
            raise ValueError("Dia da semana é obrigatório para frequência semanal")

        if "day_of_week" in schedule_data and schedule_data["day_of_week"] not in range(
            7
        ):
            raise ValueError(
                "Dia da semana deve ser um número entre 0 (segunda-feira) e 6 (domingo)"
            )

        # Verifica o dia do mês para frequência mensal
        if (
            schedule_data["frequency"] == "monthly"
            and "day_of_month" not in schedule_data
        ):
            raise ValueError("Dia do mês é obrigatório para frequência mensal")

        if "day_of_month" in schedule_data and schedule_data[
            "day_of_month"
        ] not in range(1, 32):
            raise ValueError("Dia do mês deve ser um número entre 1 e 31")

        # Verifica o formato da hora
        try:
            hour, minute = schedule_data["time_of_day"].split(":")
            hour = int(hour)
            minute = int(minute)

            if hour < 0 or hour > 23 or minute < 0 or minute > 59:
                raise ValueError()
        except:
            raise ValueError("Hora deve estar no formato HH:MM (24h)")

    def _calculate_next_run(self, schedule_data: Dict[str, Any]) -> datetime:
        """
        Calcula a próxima execução do agendamento

        Args:
            schedule_data: Dados do agendamento

        Returns:
            Data e hora da próxima execução
        """
        # Obtém a data e hora atual
        now = datetime.now()

        # Extrai a hora e minuto do agendamento
        hour, minute = map(int, schedule_data["time_of_day"].split(":"))

        # Cria uma data base com a hora do agendamento
        base_date = datetime(now.year, now.month, now.day, hour, minute)

        # Se a data base já passou, avança para o próximo dia
        if base_date <= now:
            base_date += timedelta(days=1)

        # Ajusta conforme a frequência
        if schedule_data["frequency"] == "daily":
            # Já está correto
            return base_date

        elif schedule_data["frequency"] == "weekly":
            # Ajusta para o dia da semana
            day_of_week = schedule_data["day_of_week"]
            days_ahead = day_of_week - base_date.weekday()

            if days_ahead < 0:  # Já passou esta semana
                days_ahead += 7

            return base_date + timedelta(days=days_ahead)

        elif schedule_data["frequency"] == "monthly":
            # Ajusta para o dia do mês
            day_of_month = schedule_data["day_of_month"]

            # Tenta criar uma data com o dia do mês
            try:
                next_date = datetime(
                    base_date.year, base_date.month, day_of_month, hour, minute
                )

                # Se a data já passou, avança para o próximo mês
                if next_date <= now:
                    if base_date.month == 12:
                        next_date = datetime(
                            base_date.year + 1, 1, day_of_month, hour, minute
                        )
                    else:
                        next_date = datetime(
                            base_date.year,
                            base_date.month + 1,
                            day_of_month,
                            hour,
                            minute,
                        )

                return next_date

            except ValueError:
                # Dia inválido para o mês (ex: 31 de fevereiro)
                # Avança para o próximo mês e tenta novamente
                if base_date.month == 12:
                    return datetime(base_date.year + 1, 1, 1, hour, minute)
                else:
                    return datetime(
                        base_date.year, base_date.month + 1, 1, hour, minute
                    )

        # Caso padrão (não deve ocorrer)
        return base_date

    def get_schedule(self, schedule_id: str) -> Optional[AccountingSchedule]:
        """
        Obtém um agendamento pelo ID

        Args:
            schedule_id: ID do agendamento

        Returns:
            Agendamento ou None se não encontrado
        """
        schedule_data = self.db_service.find_one(
            "fiscal_accounting_schedules", {"id": schedule_id}
        )

        if not schedule_data:
            return None

        return AccountingSchedule(**schedule_data)

    def update_schedule(
        self, schedule_id: str, update_data: Dict[str, Any]
    ) -> Optional[AccountingSchedule]:
        """
        Atualiza um agendamento

        Args:
            schedule_id: ID do agendamento
            update_data: Dados a serem atualizados

        Returns:
            Agendamento atualizado ou None se não encontrado
        """
        # Obtém o agendamento atual
        schedule_data = self.db_service.find_one(
            "fiscal_accounting_schedules", {"id": schedule_id}
        )

        if not schedule_data:
            return None

        # Atualiza os dados
        update_data["updated_at"] = datetime.now()

        # Mescla os dados atuais com os novos dados
        schedule_data.update(update_data)

        # Recalcula a próxima execução se necessário
        if (
            "frequency" in update_data
            or "day_of_week" in update_data
            or "day_of_month" in update_data
            or "time_of_day" in update_data
        ):
            schedule_data["next_run"] = self._calculate_next_run(schedule_data)
            update_data["next_run"] = schedule_data["next_run"]

        # Atualiza no banco de dados
        self.db_service.update_one(
            "fiscal_accounting_schedules", {"id": schedule_id}, {"$set": update_data}
        )

        # Retorna o agendamento atualizado
        return AccountingSchedule(**schedule_data)

    def execute_scheduled_exports(self) -> List[Tuple[str, bool, str]]:
        """
        Executa as exportações agendadas que estão pendentes

        Returns:
            Lista de tuplas com (ID do agendamento, sucesso, mensagem)
        """
        # Obtém a data e hora atual
        now = datetime.now()

        # Busca agendamentos pendentes
        schedules = self.db_service.find(
            "fiscal_accounting_schedules",
            {"is_active": True, "next_run": {"$lte": now}},
        )

        results = []

        for schedule in schedules:
            schedule_id = schedule["id"]

            try:
                # Determina o período de referência
                if schedule["frequency"] == "monthly":
                    # Mês anterior
                    if now.month == 1:
                        reference_period = f"{now.year - 1}-12"
                    else:
                        reference_period = f"{now.year}-{now.month - 1:02d}"
                else:
                    # Mês atual
                    reference_period = f"{now.year}-{now.month:02d}"

                # Cria um lote de exportação
                batch = self.create_export_batch(
                    reference_period=reference_period,
                    export_destination=self._get_default_provider_id(),
                    created_by="scheduler",
                    notes=f"Exportação automática agendada (ID: {schedule_id})",
                )

                # Processa o lote
                success, message, _ = self.process_export_batch(batch.id)

                # Atualiza o agendamento
                self.update_schedule(
                    schedule_id,
                    {"last_run": now, "next_run": self._calculate_next_run(schedule)},
                )

                results.append((schedule_id, success, message))

            except Exception as e:
                logger.error(
                    f"Erro ao executar exportação agendada {schedule_id}: {str(e)}"
                )
                results.append((schedule_id, False, f"Erro: {str(e)}"))

                # Atualiza o agendamento mesmo em caso de erro
                self.update_schedule(
                    schedule_id,
                    {"last_run": now, "next_run": self._calculate_next_run(schedule)},
                )

        return results

    def _get_default_provider_id(self) -> str:
        """
        Obtém o ID do provedor padrão

        Returns:
            ID do provedor padrão
        """
        # Busca um provedor ativo
        provider = self.db_service.find_one(
            "fiscal_accounting_providers", {"is_active": True}
        )

        if not provider:
            raise ValueError("Nenhum provedor de serviços contábeis ativo encontrado")

        return provider["id"]

    def list_export_batches(
        self, filters: Dict[str, Any], page: int = 1, page_size: int = 20
    ) -> Tuple[List[AccountingExportBatch], int]:
        """
        Lista lotes de exportação com filtros e paginação

        Args:
            filters: Filtros a serem aplicados
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de lotes, total de lotes)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os lotes no banco de dados
        batches = self.db_service.find(
            "fiscal_accounting_export_batches",
            filters,
            skip=skip,
            limit=page_size,
            sort=[("start_date", -1)],
        )

        # Conta o total de lotes
        total = self.db_service.count("fiscal_accounting_export_batches", filters)

        # Converte para objetos AccountingExportBatch
        export_batches = [AccountingExportBatch(**batch) for batch in batches]

        return export_batches, total

    def list_export_items(
        self, batch_id: str, page: int = 1, page_size: int = 20
    ) -> Tuple[List[AccountingExportItem], int]:
        """
        Lista itens de exportação de um lote

        Args:
            batch_id: ID do lote
            page: Número da página
            page_size: Tamanho da página

        Returns:
            Tupla com (lista de itens, total de itens)
        """
        # Calcula o offset para paginação
        skip = (page - 1) * page_size

        # Busca os itens no banco de dados
        items = self.db_service.find(
            "fiscal_accounting_export_items",
            {"batch_id": batch_id},
            skip=skip,
            limit=page_size,
            sort=[("document_date", -1)],
        )

        # Conta o total de itens
        total = self.db_service.count(
            "fiscal_accounting_export_items", {"batch_id": batch_id}
        )

        # Converte para objetos AccountingExportItem
        export_items = [AccountingExportItem(**item) for item in items]

        return export_items, total
