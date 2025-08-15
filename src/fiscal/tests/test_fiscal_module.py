import asyncio
import os
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from ..models.fiscal_models import (
    BeneficioFiscal,
    ConfiguracaoRegional,
    GrupoFiscal,
    OrigemProduto,
    ProductFiscalInfo,
    RegimeTributario,
    RegraNcm,
    TipoImposto,
    TipoItem,
)
from ..services.fiscal_service import FiscalService


class TestFiscalModule(unittest.TestCase):
    """Testes para o módulo fiscal."""

    def setUp(self):
        """Configura o ambiente de teste."""
        # Cria diretório temporário para configurações
        self.test_config_dir = "/tmp/fiscal_test_config"
        os.makedirs(os.path.join(self.test_config_dir, "regional"), exist_ok=True)
        os.makedirs(os.path.join(self.test_config_dir, "groups"), exist_ok=True)

        # Cria instância do serviço fiscal com diretório de teste
        self.fiscal_service = FiscalService(config_dir=self.test_config_dir)

        # Cria configurações de teste
        self._create_test_configs()

    def tearDown(self):
        """Limpa o ambiente após os testes."""
        # Remove arquivos de configuração de teste
        import shutil

        if os.path.exists(self.test_config_dir):
            shutil.rmtree(self.test_config_dir)

    def _create_test_configs(self):
        """Cria configurações fiscais para testes."""
        # Configuração para São Paulo
        sp_config = ConfiguracaoRegional(
            id="sp",
            uf="SP",
            regime_tributario=RegimeTributario.SIMPLES,
            aliquota_icms_padrao=18.0,
            aliquota_iss_padrao=5.0,
            regras_ncm=[
                RegraNcm(
                    codigo_ncm="1234",
                    descricao="Produto teste",
                    aliquota_icms=18.0,
                    aliquota_pis=1.65,
                    aliquota_cofins=7.6,
                    cst_icms="00",
                    cst_pis="01",
                    cst_cofins="01",
                    cfop="5102",
                )
            ],
        )

        # Configuração para Rio de Janeiro
        rj_config = ConfiguracaoRegional(
            id="rj",
            uf="RJ",
            regime_tributario=RegimeTributario.SIMPLES,
            aliquota_icms_padrao=20.0,
            aliquota_iss_padrao=5.0,
        )

        # Grupo fiscal para alimentos
        food_group = GrupoFiscal(
            id="food",
            descricao="Alimentos",
            codigo_ncm="1234",
            tipo_item=TipoItem.PRODUTO,
            origem=OrigemProduto.NACIONAL,
            icms={"cst": "00", "aliquota": 18.0, "base_calculo": 100.0},
            pis={"cst": "01", "aliquota": 1.65, "base_calculo": 100.0},
            cofins={"cst": "01", "aliquota": 7.6, "base_calculo": 100.0},
        )

        # Grupo fiscal para serviços
        service_group = GrupoFiscal(
            id="service",
            descricao="Serviços",
            tipo_item=TipoItem.SERVICO,
            iss={"aliquota": 5.0, "base_calculo": 100.0, "codigo_servico": "1234"},
        )

        # Salva as configurações
        self.fiscal_service.save_regional_config(sp_config)
        self.fiscal_service.save_regional_config(rj_config)
        self.fiscal_service.save_fiscal_group(food_group)
        self.fiscal_service.save_fiscal_group(service_group)

    def test_get_regional_config(self):
        """Testa a obtenção de configuração regional."""
        # Obtém configuração para SP
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)
        self.assertEqual(sp_config.uf, "SP")
        self.assertEqual(sp_config.aliquota_icms_padrao, 18.0)

        # Obtém configuração para RJ
        rj_config = self.fiscal_service.get_regional_config("RJ")
        self.assertIsNotNone(rj_config)
        self.assertEqual(rj_config.uf, "RJ")
        self.assertEqual(rj_config.aliquota_icms_padrao, 20.0)

        # Tenta obter configuração inexistente
        mg_config = self.fiscal_service.get_regional_config("MG")
        self.assertIsNone(mg_config)

    def test_get_fiscal_group(self):
        """Testa a obtenção de grupo fiscal."""
        # Obtém grupo fiscal para alimentos
        food_group = self.fiscal_service.get_fiscal_group("food")
        self.assertIsNotNone(food_group)
        self.assertEqual(food_group.descricao, "Alimentos")
        self.assertEqual(food_group.tipo_item, TipoItem.PRODUTO)

        # Obtém grupo fiscal para serviços
        service_group = self.fiscal_service.get_fiscal_group("service")
        self.assertIsNotNone(service_group)
        self.assertEqual(service_group.descricao, "Serviços")
        self.assertEqual(service_group.tipo_item, TipoItem.SERVICO)

        # Tenta obter grupo fiscal inexistente
        invalid_group = self.fiscal_service.get_fiscal_group("invalid")
        self.assertIsNone(invalid_group)

    def test_calculate_icms(self):
        """Testa o cálculo de ICMS."""
        # Configura o evento loop para testes assíncronos
        loop = asyncio.get_event_loop()

        # Obtém configuração para SP
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)

        # Obtém grupo fiscal para alimentos
        food_group = self.fiscal_service.get_fiscal_group("food")
        self.assertIsNotNone(food_group)

        # Calcula ICMS
        icms = loop.run_until_complete(
            self.fiscal_service._calculate_icms(
                valor=100.0,
                fiscal_group=food_group,
                ncm_rule=None,
                regional_config=sp_config,
                ncm="1234",
            )
        )

        # Verifica resultado
        self.assertEqual(icms.tipo, TipoImposto.ICMS)
        self.assertEqual(icms.cst, "00")
        self.assertEqual(icms.aliquota, 18.0)
        self.assertEqual(icms.base_calculo, 100.0)
        self.assertEqual(icms.valor, 18.0)

    def test_calculate_item_taxes(self):
        """Testa o cálculo de impostos para um item."""
        # Configura o evento loop para testes assíncronos
        loop = asyncio.get_event_loop()

        # Obtém configuração para SP
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)

        # Cria item de teste
        item = {
            "id": "item1",
            "product_id": "prod1",
            "quantity": 2,
            "unit_price": 50.0,
            "total_price": 100.0,
            "discount": 0.0,
        }

        # Cria informações fiscais do produto
        product_fiscal_info = ProductFiscalInfo(
            fiscal_group_id="food", ncm="1234", origem=OrigemProduto.NACIONAL
        )

        # Calcula impostos do item
        item_taxes = loop.run_until_complete(
            self.fiscal_service.calculate_item_taxes(
                item=item,
                product_fiscal_info=product_fiscal_info,
                regional_config=sp_config,
            )
        )

        # Verifica resultado
        self.assertEqual(item_taxes.item_id, "item1")
        self.assertEqual(item_taxes.valor_bruto, 100.0)
        self.assertEqual(item_taxes.valor_liquido, 100.0)
        self.assertEqual(len(item_taxes.impostos), 3)  # ICMS, PIS, COFINS

        # Verifica ICMS
        self.assertIn("icms", item_taxes.impostos)
        icms = item_taxes.impostos["icms"]
        self.assertEqual(icms.tipo, TipoImposto.ICMS)
        self.assertEqual(icms.aliquota, 18.0)
        self.assertEqual(icms.valor, 18.0)

        # Verifica PIS
        self.assertIn("pis", item_taxes.impostos)
        pis = item_taxes.impostos["pis"]
        self.assertEqual(pis.tipo, TipoImposto.PIS)
        self.assertEqual(pis.aliquota, 1.65)
        self.assertEqual(pis.valor, 1.65)

        # Verifica COFINS
        self.assertIn("cofins", item_taxes.impostos)
        cofins = item_taxes.impostos["cofins"]
        self.assertEqual(cofins.tipo, TipoImposto.COFINS)
        self.assertEqual(cofins.aliquota, 7.6)
        self.assertEqual(cofins.valor, 7.6)

        # Verifica total de impostos
        self.assertAlmostEqual(item_taxes.total_impostos, 27.25, places=2)

    @patch("src.fiscal.services.fiscal_service.FiscalService._get_product_fiscal_info")
    def test_calculate_order_taxes(self, mock_get_product_fiscal_info):
        """Testa o cálculo de impostos para um pedido completo."""
        # Configura o evento loop para testes assíncronos
        loop = asyncio.get_event_loop()

        # Configura mock para informações fiscais do produto
        mock_get_product_fiscal_info.return_value = asyncio.Future()
        mock_get_product_fiscal_info.return_value.set_result(
            ProductFiscalInfo(
                fiscal_group_id="food", ncm="1234", origem=OrigemProduto.NACIONAL
            )
        )

        # Obtém configuração para SP
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)

        # Cria pedido de teste
        order = {
            "id": "order1",
            "number": "001",
            "subtotal": 200.0,
            "discount": 20.0,
            "total": 180.0,
            "items": [
                {
                    "id": "item1",
                    "product_id": "prod1",
                    "quantity": 2,
                    "unit_price": 50.0,
                    "total_price": 100.0,
                    "discount": 10.0,
                },
                {
                    "id": "item2",
                    "product_id": "prod2",
                    "quantity": 1,
                    "unit_price": 100.0,
                    "total_price": 100.0,
                    "discount": 10.0,
                },
            ],
        }

        # Calcula impostos do pedido
        order_taxes = loop.run_until_complete(
            self.fiscal_service.calculate_order_taxes(
                order=order, regional_config=sp_config, product_service=MagicMock()
            )
        )

        # Verifica resultado
        self.assertEqual(order_taxes.order_id, "order1")
        self.assertEqual(order_taxes.subtotal, 200.0)
        self.assertEqual(order_taxes.descontos, 20.0)
        self.assertEqual(order_taxes.valor_total, 180.0)
        self.assertEqual(len(order_taxes.itens), 2)

        # Verifica total de impostos
        self.assertGreater(order_taxes.total_impostos, 0)

    def test_regional_tax_variations(self):
        """Testa variações regionais de impostos."""
        # Configura o evento loop para testes assíncronos
        loop = asyncio.get_event_loop()

        # Obtém configurações regionais
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)

        rj_config = self.fiscal_service.get_regional_config("RJ")
        self.assertIsNotNone(rj_config)

        # Obtém grupo fiscal
        food_group = self.fiscal_service.get_fiscal_group("food")
        self.assertIsNotNone(food_group)

        # Calcula ICMS para SP
        icms_sp = loop.run_until_complete(
            self.fiscal_service._calculate_icms(
                valor=100.0,
                fiscal_group=food_group,
                ncm_rule=None,
                regional_config=sp_config,
            )
        )

        # Calcula ICMS para RJ
        icms_rj = loop.run_until_complete(
            self.fiscal_service._calculate_icms(
                valor=100.0,
                fiscal_group=food_group,
                ncm_rule=None,
                regional_config=rj_config,
            )
        )

        # Verifica diferenças regionais
        self.assertEqual(icms_sp.aliquota, 18.0)
        self.assertEqual(icms_rj.aliquota, 20.0)
        self.assertEqual(icms_sp.valor, 18.0)
        self.assertEqual(icms_rj.valor, 20.0)

    def test_benefits_application(self):
        """Testa aplicação de benefícios fiscais."""
        # Configura o evento loop para testes assíncronos
        loop = asyncio.get_event_loop()

        # Obtém configuração para SP
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)

        # Adiciona benefício fiscal
        benefit = BeneficioFiscal(
            codigo="B001",
            descricao="Redução ICMS Alimentos",
            tipo_imposto=TipoImposto.ICMS,
            percentual_reducao=50.0,
            data_inicio=datetime(2020, 1, 1),
            codigos_ncm=["1234"],
        )

        sp_config.beneficios_fiscais.append(benefit)
        self.fiscal_service.save_regional_config(sp_config)

        # Recarrega configurações
        self.fiscal_service.reload_configurations()

        # Obtém configuração atualizada
        sp_config = self.fiscal_service.get_regional_config("SP")
        self.assertIsNotNone(sp_config)

        # Obtém grupo fiscal
        food_group = self.fiscal_service.get_fiscal_group("food")
        self.assertIsNotNone(food_group)

        # Calcula ICMS com benefício
        icms = loop.run_until_complete(
            self.fiscal_service._calculate_icms(
                valor=100.0,
                fiscal_group=food_group,
                ncm_rule=None,
                regional_config=sp_config,
                ncm="1234",
            )
        )

        # Verifica aplicação do benefício
        self.assertEqual(icms.tipo, TipoImposto.ICMS)
        self.assertEqual(icms.aliquota, 18.0)
        self.assertEqual(icms.base_calculo, 50.0)  # Redução de 50%
        self.assertEqual(icms.valor, 9.0)  # 18% de 50


if __name__ == "__main__":
    unittest.main()
