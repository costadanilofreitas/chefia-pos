from typing import Dict, Optional, Any
import logging
from datetime import datetime

from ..models.fiscal_models import ResultadoCalculoFiscal
from ...peripherals.services.peripheral_service import peripheral_service
from ...peripherals.services.print_service import print_service
from ...peripherals.models.peripheral_models import PrinterType, PrintJob

logger = logging.getLogger(__name__)

class InvoicePrintService:
    """Serviço para impressão de notas fiscais."""
    
    def __init__(self):
        """Inicializa o serviço de impressão de notas fiscais."""
        self.template_dir = "/home/ubuntu/pos-modern/src/fiscal/templates"
    
    async def print_invoice(self, 
                           fiscal_result: ResultadoCalculoFiscal, 
                           order_data: Dict[str, Any],
                           sat_data: Optional[Dict[str, Any]] = None,
                           printer_id: Optional[str] = None) -> bool:
        """Imprime uma nota fiscal com base nos resultados fiscais e dados do SAT.
        
        Args:
            fiscal_result: Resultado do cálculo fiscal
            order_data: Dados do pedido
            sat_data: Dados do SAT (opcional)
            printer_id: ID da impressora a ser utilizada (opcional)
            
        Returns:
            True se a impressão foi bem-sucedida, False caso contrário
        """
        try:
            # Prepara os dados para o template
            template_data = self._prepare_template_data(fiscal_result, order_data, sat_data)
            
            # Obtém a impressora padrão se não for especificada
            if not printer_id:
                printer = await peripheral_service.get_default_printer(PrinterType.THERMAL)
                if printer:
                    printer_id = printer.id
            
            if not printer_id:
                logger.error("Nenhuma impressora térmica disponível para impressão da nota fiscal")
                return False
            
            # Cria o trabalho de impressão
            print_job = PrintJob(
                printer_id=printer_id,
                template_name="invoice",
                template_data=template_data,
                copies=1,
                priority=10  # Alta prioridade para notas fiscais
            )
            
            # Envia para impressão
            job_id = await print_service.print(print_job)
            
            logger.info(f"Nota fiscal enviada para impressão. Job ID: {job_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao imprimir nota fiscal: {str(e)}")
            return False
    
    def _prepare_template_data(self, 
                              fiscal_result: ResultadoCalculoFiscal, 
                              order_data: Dict[str, Any],
                              sat_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Prepara os dados para o template de impressão.
        
        Args:
            fiscal_result: Resultado do cálculo fiscal
            order_data: Dados do pedido
            sat_data: Dados do SAT (opcional)
            
        Returns:
            Dados formatados para o template
        """
        # Dados básicos do estabelecimento
        company_data = {
            "name": order_data.get("company_name", "EMPRESA DEMONSTRAÇÃO"),
            "cnpj": order_data.get("company_cnpj", "00.000.000/0000-00"),
            "address": order_data.get("company_address", "Endereço da Empresa"),
            "city": order_data.get("company_city", "Cidade"),
            "state": order_data.get("company_state", "UF"),
            "phone": order_data.get("company_phone", ""),
            "ie": order_data.get("company_ie", "")
        }
        
        # Dados do cliente
        customer_data = {
            "name": order_data.get("customer_name", "CONSUMIDOR"),
            "document": order_data.get("customer_document", ""),
            "address": order_data.get("customer_address", ""),
            "city": order_data.get("customer_city", ""),
            "state": order_data.get("customer_state", ""),
            "phone": order_data.get("customer_phone", "")
        }
        
        # Dados do pedido
        order_info = {
            "id": order_data.get("id", ""),
            "number": order_data.get("number", ""),
            "date": order_data.get("created_at", datetime.now().isoformat()),
            "payment_method": order_data.get("payment_method", ""),
            "subtotal": order_data.get("subtotal", 0.0),
            "discount": order_data.get("discount", 0.0),
            "total": order_data.get("total", 0.0)
        }
        
        # Dados dos itens
        items = []
        for i, item in enumerate(fiscal_result.itens):
            # Busca informações adicionais do item no pedido original
            original_item = next((oi for oi in order_data.get("items", []) 
                                if oi.get("id") == item.item_id), {})
            
            item_data = {
                "seq": i + 1,
                "code": original_item.get("product_code", ""),
                "name": original_item.get("product_name", ""),
                "quantity": original_item.get("quantity", 0),
                "unit_price": original_item.get("unit_price", 0.0),
                "total_price": item.valor_bruto,
                "discount": item.descontos,
                "net_price": item.valor_liquido,
                "ncm": item.ncm or "",
                "taxes": {}
            }
            
            # Adiciona informações de impostos
            for tax_type, tax_info in item.impostos.items():
                item_data["taxes"][tax_type] = {
                    "cst": tax_info.cst,
                    "rate": tax_info.aliquota,
                    "base": tax_info.base_calculo,
                    "value": tax_info.valor
                }
            
            items.append(item_data)
        
        # Dados do SAT
        sat_info = {}
        if sat_data:
            sat_info = {
                "sat_number": sat_data.get("sat_number", ""),
                "access_key": sat_data.get("access_key", ""),
                "emission_date": sat_data.get("emission_date", ""),
                "emission_protocol": sat_data.get("emission_protocol", ""),
                "qr_code": sat_data.get("qr_code", "")
            }
        
        # Totais de impostos
        tax_totals = {
            "icms": sum(item.impostos.get("icms", ImpostoCalculado(tipo="icms", cst="", aliquota=0, base_calculo=0, valor=0)).valor 
                       for item in fiscal_result.itens if "icms" in item.impostos),
            "pis": sum(item.impostos.get("pis", ImpostoCalculado(tipo="pis", cst="", aliquota=0, base_calculo=0, valor=0)).valor 
                      for item in fiscal_result.itens if "pis" in item.impostos),
            "cofins": sum(item.impostos.get("cofins", ImpostoCalculado(tipo="cofins", cst="", aliquota=0, base_calculo=0, valor=0)).valor 
                         for item in fiscal_result.itens if "cofins" in item.impostos),
            "iss": sum(item.impostos.get("iss", ImpostoCalculado(tipo="iss", cst="", aliquota=0, base_calculo=0, valor=0)).valor 
                      for item in fiscal_result.itens if "iss" in item.impostos),
            "ipi": sum(item.impostos.get("ipi", ImpostoCalculado(tipo="ipi", cst="", aliquota=0, base_calculo=0, valor=0)).valor 
                      for item in fiscal_result.itens if "ipi" in item.impostos),
            "total": fiscal_result.total_impostos
        }
        
        # Monta o resultado final
        template_data = {
            "company": company_data,
            "customer": customer_data,
            "order": order_info,
            "items": items,
            "sat": sat_info,
            "tax_totals": tax_totals,
            "is_homologation": sat_data.get("is_homologation", True) if sat_data else True,
            "print_date": datetime.now().isoformat()
        }
        
        return template_data


# Instância global do serviço de impressão de notas fiscais
invoice_print_service = InvoicePrintService()
