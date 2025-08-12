import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid

from ..models.fiscal_models import (
    ConfiguracaoRegional,
    GrupoFiscal,
    TipoImposto,
    TipoItem,
    OrigemProduto,
    RegraNcm,
    BeneficioFiscal,
    ImpostoCalculado,
    ItemCalculoFiscal,
    ResultadoCalculoFiscal,
    ProductFiscalInfo,
    FiscalLog,
)

logger = logging.getLogger(__name__)


class FiscalService:
    """Serviço principal para cálculo de impostos e gerenciamento de regras fiscais."""

    def __init__(self, config_dir: str = None):
        """Inicializa o serviço fiscal.

        Args:
            config_dir: Diretório de configurações fiscais. Se não fornecido, usa o padrão.
        """
        self.config_dir = config_dir or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "config"
        )
        self.regional_configs: Dict[str, ConfiguracaoRegional] = {}
        self.fiscal_groups: Dict[str, GrupoFiscal] = {}
        self._load_configurations()

    def _load_configurations(self):
        """Carrega todas as configurações fiscais dos arquivos JSON."""
        # Carregar configurações regionais
        regional_dir = os.path.join(self.config_dir, "regional")
        os.makedirs(regional_dir, exist_ok=True)

        for filename in os.listdir(regional_dir):
            if filename.endswith(".json"):
                try:
                    with open(
                        os.path.join(regional_dir, filename), "r", encoding="utf-8"
                    ) as f:
                        config_data = json.load(f)
                        config = ConfiguracaoRegional(**config_data)
                        self.regional_configs[config.id] = config
                        logger.info(
                            f"Configuração regional carregada: {config.uf} - {config.municipio or 'Todos os municípios'}"
                        )
                except Exception as e:
                    logger.error(
                        f"Erro ao carregar configuração regional {filename}: {str(e)}"
                    )

        # Carregar grupos fiscais
        groups_dir = os.path.join(self.config_dir, "groups")
        os.makedirs(groups_dir, exist_ok=True)

        for filename in os.listdir(groups_dir):
            if filename.endswith(".json"):
                try:
                    with open(
                        os.path.join(groups_dir, filename), "r", encoding="utf-8"
                    ) as f:
                        group_data = json.load(f)
                        group = GrupoFiscal(**group_data)
                        self.fiscal_groups[group.id] = group
                        logger.info(
                            f"Grupo fiscal carregado: {group.id} - {group.descricao}"
                        )
                except Exception as e:
                    logger.error(f"Erro ao carregar grupo fiscal {filename}: {str(e)}")

    def reload_configurations(self):
        """Recarrega todas as configurações fiscais."""
        self.regional_configs.clear()
        self.fiscal_groups.clear()
        self._load_configurations()
        logger.info("Configurações fiscais recarregadas")

    def get_regional_config(
        self, uf: str, municipio: Optional[str] = None
    ) -> Optional[ConfiguracaoRegional]:
        """Obtém a configuração regional para uma UF e município específicos.

        Args:
            uf: Unidade federativa (estado)
            municipio: Município (opcional)

        Returns:
            Configuração regional ou None se não encontrada
        """
        # Primeiro tenta encontrar uma configuração específica para o município
        if municipio:
            for config in self.regional_configs.values():
                if (
                    config.uf.upper() == uf.upper()
                    and config.municipio
                    and config.municipio.upper() == municipio.upper()
                    and config.ativo
                ):
                    return config

        # Se não encontrar, busca uma configuração para a UF sem município específico
        for config in self.regional_configs.values():
            if (
                config.uf.upper() == uf.upper()
                and not config.municipio
                and config.ativo
            ):
                return config

        return None

    def get_fiscal_group(self, group_id: str) -> Optional[GrupoFiscal]:
        """Obtém um grupo fiscal pelo ID.

        Args:
            group_id: ID do grupo fiscal

        Returns:
            Grupo fiscal ou None se não encontrado
        """
        return self.fiscal_groups.get(group_id)

    def get_ncm_rule(
        self, ncm: str, regional_config: ConfiguracaoRegional
    ) -> Optional[RegraNcm]:
        """Obtém a regra fiscal para um código NCM específico.

        Args:
            ncm: Código NCM
            regional_config: Configuração regional

        Returns:
            Regra NCM ou None se não encontrada
        """
        # Busca regra exata
        for rule in regional_config.regras_ncm:
            if rule.codigo_ncm == ncm:
                return rule

        # Busca regra por prefixo (primeiros dígitos)
        for i in range(len(ncm), 0, -1):
            prefix = ncm[:i]
            for rule in regional_config.regras_ncm:
                if rule.codigo_ncm == prefix:
                    return rule

        return None

    def get_applicable_benefits(
        self,
        ncm: str,
        tipo_imposto: TipoImposto,
        regional_config: ConfiguracaoRegional,
        data: datetime = None,
    ) -> List[BeneficioFiscal]:
        """Obtém os benefícios fiscais aplicáveis a um NCM e tipo de imposto.

        Args:
            ncm: Código NCM
            tipo_imposto: Tipo de imposto
            regional_config: Configuração regional
            data: Data de referência (usa a data atual se não fornecida)

        Returns:
            Lista de benefícios fiscais aplicáveis
        """
        if data is None:
            data = datetime.now()

        applicable_benefits = []

        for benefit in regional_config.beneficios_fiscais:
            # Verifica se o benefício está ativo
            if not benefit.ativo:
                continue

            # Verifica se o benefício é para o tipo de imposto correto
            if benefit.tipo_imposto != tipo_imposto:
                continue

            # Verifica se o benefício está dentro do período de validade
            if benefit.data_inicio > data:
                continue
            if benefit.data_fim and benefit.data_fim < data:
                continue

            # Verifica se o benefício se aplica ao NCM
            if benefit.codigos_ncm and ncm not in benefit.codigos_ncm:
                # Tenta verificar por prefixo
                ncm_match = False
                for code in benefit.codigos_ncm:
                    if ncm.startswith(code):
                        ncm_match = True
                        break
                if not ncm_match:
                    continue

            applicable_benefits.append(benefit)

        return applicable_benefits

    async def calculate_item_taxes(
        self,
        item: Dict[str, Any],
        product_fiscal_info: ProductFiscalInfo,
        regional_config: ConfiguracaoRegional,
    ) -> ItemCalculoFiscal:
        """Calcula os impostos para um item específico.

        Args:
            item: Dados do item (produto, quantidade, preço, etc.)
            product_fiscal_info: Informações fiscais do produto
            regional_config: Configuração regional

        Returns:
            Resultado do cálculo fiscal para o item
        """
        fiscal_group = self.get_fiscal_group(product_fiscal_info.fiscal_group_id)
        if not fiscal_group:
            logger.warning(
                f"Grupo fiscal não encontrado: {product_fiscal_info.fiscal_group_id}"
            )
            # Usa valores padrão se o grupo fiscal não for encontrado
            return ItemCalculoFiscal(
                item_id=item.get("id", str(uuid.uuid4())),
                valor_bruto=item.get("total_price", 0.0),
                valor_liquido=item.get("total_price", 0.0),
                descontos=0.0,
                acrescimos=0.0,
                impostos={},
                total_impostos=0.0,
                origem=product_fiscal_info.origem,
                ncm=product_fiscal_info.ncm,
                cest=product_fiscal_info.cest,
            )

        # Valores base
        valor_bruto = item.get("total_price", 0.0)
        descontos = item.get("discount", 0.0)
        valor_liquido = valor_bruto - descontos

        # Resultado inicial
        result = ItemCalculoFiscal(
            item_id=item.get("id", str(uuid.uuid4())),
            valor_bruto=valor_bruto,
            valor_liquido=valor_liquido,
            descontos=descontos,
            acrescimos=0.0,
            impostos={},
            total_impostos=0.0,
            origem=fiscal_group.origem,
            ncm=product_fiscal_info.ncm or fiscal_group.codigo_ncm,
            cest=product_fiscal_info.cest or fiscal_group.codigo_cest,
        )

        # Busca regra NCM específica
        ncm = product_fiscal_info.ncm or fiscal_group.codigo_ncm
        ncm_rule = None
        if ncm:
            ncm_rule = self.get_ncm_rule(ncm, regional_config)

        # Calcula ICMS
        if fiscal_group.icms:
            icms_value = await self._calculate_icms(
                valor=valor_liquido,
                fiscal_group=fiscal_group,
                ncm_rule=ncm_rule,
                regional_config=regional_config,
                ncm=ncm,
            )
            result.impostos["icms"] = icms_value
            result.total_impostos += icms_value.valor

        # Calcula PIS
        if fiscal_group.pis:
            pis_value = await self._calculate_pis(
                valor=valor_liquido,
                fiscal_group=fiscal_group,
                ncm_rule=ncm_rule,
                regional_config=regional_config,
                ncm=ncm,
            )
            result.impostos["pis"] = pis_value
            result.total_impostos += pis_value.valor

        # Calcula COFINS
        if fiscal_group.cofins:
            cofins_value = await self._calculate_cofins(
                valor=valor_liquido,
                fiscal_group=fiscal_group,
                ncm_rule=ncm_rule,
                regional_config=regional_config,
                ncm=ncm,
            )
            result.impostos["cofins"] = cofins_value
            result.total_impostos += cofins_value.valor

        # Calcula ISS (se for serviço)
        if (
            fiscal_group.tipo_item in [TipoItem.SERVICO, TipoItem.PRODUTO_SERVICO]
            and fiscal_group.iss
        ):
            iss_value = await self._calculate_iss(
                valor=valor_liquido,
                fiscal_group=fiscal_group,
                regional_config=regional_config,
            )
            result.impostos["iss"] = iss_value
            result.total_impostos += iss_value.valor

        # Calcula IPI (se aplicável)
        if fiscal_group.ipi:
            ipi_value = await self._calculate_ipi(
                valor=valor_liquido,
                fiscal_group=fiscal_group,
                ncm_rule=ncm_rule,
                regional_config=regional_config,
                ncm=ncm,
            )
            result.impostos["ipi"] = ipi_value
            result.total_impostos += ipi_value.valor

        return result

    async def _calculate_icms(
        self,
        valor: float,
        fiscal_group: GrupoFiscal,
        ncm_rule: Optional[RegraNcm],
        regional_config: ConfiguracaoRegional,
        ncm: Optional[str] = None,
    ) -> ImpostoCalculado:
        """Calcula o ICMS para um item.

        Args:
            valor: Valor base para cálculo
            fiscal_group: Grupo fiscal do produto
            ncm_rule: Regra NCM específica (se disponível)
            regional_config: Configuração regional
            ncm: Código NCM do produto

        Returns:
            Resultado do cálculo do ICMS
        """
        # Define valores padrão
        cst = fiscal_group.icms.cst if fiscal_group.icms else "00"
        aliquota = (
            fiscal_group.icms.aliquota
            if fiscal_group.icms
            else regional_config.aliquota_icms_padrao
        )
        base_calculo_percentual = (
            fiscal_group.icms.base_calculo if fiscal_group.icms else 100.0
        )
        reducao_base = (
            fiscal_group.icms.percentual_reducao_base_calculo
            if fiscal_group.icms
            else 0.0
        )

        # Sobrescreve com valores da regra NCM se disponível
        if ncm_rule:
            aliquota = ncm_rule.aliquota_icms
            cst = ncm_rule.cst_icms
            if hasattr(ncm_rule, "percentual_reducao_base_calculo"):
                reducao_base = ncm_rule.percentual_reducao_base_calculo

        # Aplica benefícios fiscais se disponíveis
        if ncm:
            benefits = self.get_applicable_benefits(
                ncm, TipoImposto.ICMS, regional_config
            )
            for benefit in benefits:
                reducao_base = max(reducao_base, benefit.percentual_reducao)

        # Calcula base de cálculo efetiva
        base_calculo_efetiva = valor * (base_calculo_percentual / 100.0)
        if reducao_base > 0:
            base_calculo_efetiva = base_calculo_efetiva * (1 - (reducao_base / 100.0))

        # Calcula valor do imposto
        valor_imposto = base_calculo_efetiva * (aliquota / 100.0)

        return ImpostoCalculado(
            tipo=TipoImposto.ICMS,
            cst=cst,
            aliquota=aliquota,
            base_calculo=base_calculo_efetiva,
            valor=valor_imposto,
            observacoes=(
                "Redução de base de cálculo aplicada" if reducao_base > 0 else None
            ),
        )

    async def _calculate_pis(
        self,
        valor: float,
        fiscal_group: GrupoFiscal,
        ncm_rule: Optional[RegraNcm],
        regional_config: ConfiguracaoRegional,
        ncm: Optional[str] = None,
    ) -> ImpostoCalculado:
        """Calcula o PIS para um item.

        Args:
            valor: Valor base para cálculo
            fiscal_group: Grupo fiscal do produto
            ncm_rule: Regra NCM específica (se disponível)
            regional_config: Configuração regional
            ncm: Código NCM do produto

        Returns:
            Resultado do cálculo do PIS
        """
        # Define valores padrão
        cst = fiscal_group.pis.cst if fiscal_group.pis else "01"
        aliquota = fiscal_group.pis.aliquota if fiscal_group.pis else 1.65
        base_calculo_percentual = (
            fiscal_group.pis.base_calculo if fiscal_group.pis else 100.0
        )

        # Sobrescreve com valores da regra NCM se disponível
        if ncm_rule:
            aliquota = ncm_rule.aliquota_pis
            cst = ncm_rule.cst_pis

        # Aplica benefícios fiscais se disponíveis
        reducao_base = 0.0
        if ncm:
            benefits = self.get_applicable_benefits(
                ncm, TipoImposto.PIS, regional_config
            )
            for benefit in benefits:
                reducao_base = max(reducao_base, benefit.percentual_reducao)

        # Calcula base de cálculo efetiva
        base_calculo_efetiva = valor * (base_calculo_percentual / 100.0)
        if reducao_base > 0:
            base_calculo_efetiva = base_calculo_efetiva * (1 - (reducao_base / 100.0))

        # Calcula valor do imposto
        valor_imposto = base_calculo_efetiva * (aliquota / 100.0)

        return ImpostoCalculado(
            tipo=TipoImposto.PIS,
            cst=cst,
            aliquota=aliquota,
            base_calculo=base_calculo_efetiva,
            valor=valor_imposto,
            observacoes=(
                "Redução de base de cálculo aplicada" if reducao_base > 0 else None
            ),
        )

    async def _calculate_cofins(
        self,
        valor: float,
        fiscal_group: GrupoFiscal,
        ncm_rule: Optional[RegraNcm],
        regional_config: ConfiguracaoRegional,
        ncm: Optional[str] = None,
    ) -> ImpostoCalculado:
        """Calcula o COFINS para um item.

        Args:
            valor: Valor base para cálculo
            fiscal_group: Grupo fiscal do produto
            ncm_rule: Regra NCM específica (se disponível)
            regional_config: Configuração regional
            ncm: Código NCM do produto

        Returns:
            Resultado do cálculo do COFINS
        """
        # Define valores padrão
        cst = fiscal_group.cofins.cst if fiscal_group.cofins else "01"
        aliquota = fiscal_group.cofins.aliquota if fiscal_group.cofins else 7.6
        base_calculo_percentual = (
            fiscal_group.cofins.base_calculo if fiscal_group.cofins else 100.0
        )

        # Sobrescreve com valores da regra NCM se disponível
        if ncm_rule:
            aliquota = ncm_rule.aliquota_cofins
            cst = ncm_rule.cst_cofins

        # Aplica benefícios fiscais se disponíveis
        reducao_base = 0.0
        if ncm:
            benefits = self.get_applicable_benefits(
                ncm, TipoImposto.COFINS, regional_config
            )
            for benefit in benefits:
                reducao_base = max(reducao_base, benefit.percentual_reducao)

        # Calcula base de cálculo efetiva
        base_calculo_efetiva = valor * (base_calculo_percentual / 100.0)
        if reducao_base > 0:
            base_calculo_efetiva = base_calculo_efetiva * (1 - (reducao_base / 100.0))

        # Calcula valor do imposto
        valor_imposto = base_calculo_efetiva * (aliquota / 100.0)

        return ImpostoCalculado(
            tipo=TipoImposto.COFINS,
            cst=cst,
            aliquota=aliquota,
            base_calculo=base_calculo_efetiva,
            valor=valor_imposto,
            observacoes=(
                "Redução de base de cálculo aplicada" if reducao_base > 0 else None
            ),
        )

    async def _calculate_iss(
        self,
        valor: float,
        fiscal_group: GrupoFiscal,
        regional_config: ConfiguracaoRegional,
    ) -> ImpostoCalculado:
        """Calcula o ISS para um item.

        Args:
            valor: Valor base para cálculo
            fiscal_group: Grupo fiscal do produto
            regional_config: Configuração regional

        Returns:
            Resultado do cálculo do ISS
        """
        # Define valores padrão
        aliquota = (
            fiscal_group.iss.aliquota
            if fiscal_group.iss
            else regional_config.aliquota_iss_padrao
        )
        base_calculo_percentual = (
            fiscal_group.iss.base_calculo if fiscal_group.iss else 100.0
        )

        # Calcula base de cálculo efetiva
        base_calculo_efetiva = valor * (base_calculo_percentual / 100.0)

        # Calcula valor do imposto
        valor_imposto = base_calculo_efetiva * (aliquota / 100.0)

        return ImpostoCalculado(
            tipo=TipoImposto.ISS,
            cst="",  # ISS não usa CST
            aliquota=aliquota,
            base_calculo=base_calculo_efetiva,
            valor=valor_imposto,
        )

    async def _calculate_ipi(
        self,
        valor: float,
        fiscal_group: GrupoFiscal,
        ncm_rule: Optional[RegraNcm],
        regional_config: ConfiguracaoRegional,
        ncm: Optional[str] = None,
    ) -> ImpostoCalculado:
        """Calcula o IPI para um item.

        Args:
            valor: Valor base para cálculo
            fiscal_group: Grupo fiscal do produto
            ncm_rule: Regra NCM específica (se disponível)
            regional_config: Configuração regional
            ncm: Código NCM do produto

        Returns:
            Resultado do cálculo do IPI
        """
        # Define valores padrão
        cst = fiscal_group.ipi.cst if fiscal_group.ipi else "50"
        aliquota = fiscal_group.ipi.aliquota if fiscal_group.ipi else 0.0
        base_calculo_percentual = (
            fiscal_group.ipi.base_calculo if fiscal_group.ipi else 100.0
        )

        # Aplica benefícios fiscais se disponíveis
        reducao_base = 0.0
        if ncm:
            benefits = self.get_applicable_benefits(
                ncm, TipoImposto.IPI, regional_config
            )
            for benefit in benefits:
                reducao_base = max(reducao_base, benefit.percentual_reducao)

        # Calcula base de cálculo efetiva
        base_calculo_efetiva = valor * (base_calculo_percentual / 100.0)
        if reducao_base > 0:
            base_calculo_efetiva = base_calculo_efetiva * (1 - (reducao_base / 100.0))

        # Calcula valor do imposto
        valor_imposto = base_calculo_efetiva * (aliquota / 100.0)

        return ImpostoCalculado(
            tipo=TipoImposto.IPI,
            cst=cst,
            aliquota=aliquota,
            base_calculo=base_calculo_efetiva,
            valor=valor_imposto,
            observacoes=(
                "Redução de base de cálculo aplicada" if reducao_base > 0 else None
            ),
        )

    async def calculate_order_taxes(
        self,
        order: Dict[str, Any],
        regional_config: ConfiguracaoRegional,
        product_service: Any,
    ) -> ResultadoCalculoFiscal:
        """Calcula os impostos para um pedido completo.

        Args:
            order: Dados do pedido
            regional_config: Configuração regional
            product_service: Serviço de produtos para obter informações fiscais

        Returns:
            Resultado do cálculo fiscal para o pedido
        """
        result = ResultadoCalculoFiscal(
            order_id=order.get("id", ""),
            subtotal=order.get("subtotal", 0.0),
            descontos=order.get("discount", 0.0)
            + order.get("coupon_discount", 0.0)
            + order.get("points_discount", 0.0),
            valor_total=order.get("total", 0.0),
            itens=[],
            total_impostos=0.0,
        )

        # Calcula impostos para cada item
        for item in order.get("items", []):
            # Obtém informações fiscais do produto
            product_id = item.get("product_id", "")
            product_fiscal_info = await self._get_product_fiscal_info(
                product_id, product_service
            )

            # Calcula impostos do item
            item_tax = await self.calculate_item_taxes(
                item=item,
                product_fiscal_info=product_fiscal_info,
                regional_config=regional_config,
            )

            result.itens.append(item_tax)
            result.total_impostos += item_tax.total_impostos

        # Registra log da operação
        self._log_tax_calculation(order.get("id", ""), regional_config.id, result)

        return result

    async def _get_product_fiscal_info(
        self, product_id: str, product_service: Any
    ) -> ProductFiscalInfo:
        """Obtém informações fiscais de um produto.

        Args:
            product_id: ID do produto
            product_service: Serviço de produtos

        Returns:
            Informações fiscais do produto
        """
        try:
            # Tenta obter informações do produto via serviço
            product = await product_service.get_product(product_id)
            return ProductFiscalInfo(
                fiscal_group_id=product.fiscal_group_id,
                ncm=getattr(product, "ncm", None),
                cest=getattr(product, "cest", None),
                origem=getattr(product, "origem", OrigemProduto.NACIONAL),
            )
        except Exception as e:
            logger.error(
                f"Erro ao obter informações fiscais do produto {product_id}: {str(e)}"
            )
            # Retorna informações padrão em caso de erro
            return ProductFiscalInfo(
                fiscal_group_id="DEFAULT", origem=OrigemProduto.NACIONAL
            )

    def _log_tax_calculation(
        self, order_id: str, region_id: str, result: ResultadoCalculoFiscal
    ):
        """Registra log de cálculo fiscal para auditoria.

        Args:
            order_id: ID do pedido
            region_id: ID da região
            result: Resultado do cálculo fiscal
        """
        log = FiscalLog(
            operation="calculate_taxes",
            order_id=order_id,
            region_id=region_id,
            details={
                "total_impostos": result.total_impostos,
                "valor_total": result.valor_total,
                "num_itens": len(result.itens),
            },
            success=True,
        )

        # Aqui poderia salvar o log em um banco de dados ou arquivo
        logger.info(f"Cálculo fiscal realizado: {log.dict()}")

    def save_regional_config(self, config: ConfiguracaoRegional):
        """Salva uma configuração regional.

        Args:
            config: Configuração regional a ser salva
        """
        # Atualiza o cache
        self.regional_configs[config.id] = config

        # Salva no arquivo
        config_path = os.path.join(self.config_dir, "regional", f"{config.id}.json")
        os.makedirs(os.path.dirname(config_path), exist_ok=True)

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config.dict(), f, ensure_ascii=False, indent=2)

        logger.info(
            f"Configuração regional salva: {config.uf} - {config.municipio or 'Todos os municípios'}"
        )

    def save_fiscal_group(self, group: GrupoFiscal):
        """Salva um grupo fiscal.

        Args:
            group: Grupo fiscal a ser salvo
        """
        # Atualiza o cache
        self.fiscal_groups[group.id] = group

        # Salva no arquivo
        group_path = os.path.join(self.config_dir, "groups", f"{group.id}.json")
        os.makedirs(os.path.dirname(group_path), exist_ok=True)

        with open(group_path, "w", encoding="utf-8") as f:
            json.dump(group.dict(), f, ensure_ascii=False, indent=2)

        logger.info(f"Grupo fiscal salvo: {group.id} - {group.descricao}")

    def delete_regional_config(self, config_id: str) -> bool:
        """Remove uma configuração regional.

        Args:
            config_id: ID da configuração regional

        Returns:
            True se removido com sucesso, False caso contrário
        """
        if config_id not in self.regional_configs:
            return False

        # Remove do cache
        del self.regional_configs[config_id]

        # Remove o arquivo
        config_path = os.path.join(self.config_dir, "regional", f"{config_id}.json")
        if os.path.exists(config_path):
            os.remove(config_path)
            logger.info(f"Configuração regional removida: {config_id}")
            return True

        return False

    def delete_fiscal_group(self, group_id: str) -> bool:
        """Remove um grupo fiscal.

        Args:
            group_id: ID do grupo fiscal

        Returns:
            True se removido com sucesso, False caso contrário
        """
        if group_id not in self.fiscal_groups:
            return False

        # Remove do cache
        del self.fiscal_groups[group_id]

        # Remove o arquivo
        group_path = os.path.join(self.config_dir, "groups", f"{group_id}.json")
        if os.path.exists(group_path):
            os.remove(group_path)
            logger.info(f"Grupo fiscal removido: {group_id}")
            return True

        return False


# Instância global do serviço fiscal
fiscal_service = FiscalService()
