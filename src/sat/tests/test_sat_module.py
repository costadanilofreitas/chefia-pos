import asyncio
import json
import os
import unittest

from src.sat.drivers.simulated_driver import SimulatedSATDriver
from src.sat.models.sat_models import (
    CFe,
    ContingencyMode,
    SATConfig,
    SATDriverType,
    SATResponse,
    SATStatus,
    SATStatusResponse,
)
from src.sat.services.sat_service import get_sat_service


class TestSATModule(unittest.TestCase):
    """Testes para o módulo SAT."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Criar diretório de configuração se não existir
        os.makedirs(os.path.join(os.path.dirname(__file__), "../config"), exist_ok=True)

        # Criar configuração de teste
        self.test_config = SATConfig(
            enabled=True,
            driver_type=SATDriverType.SIMULATED,
            device_code="900004019",
            activation_code="12345678",
            signature_ac="SGR-SAT SISTEMA DE GESTAO E RETAGUARDA DO SAT",
            cnpj="61099008000141",
            ie="111111111111",
            business_name="EMPRESA TESTE LTDA",
            contingency_mode=ContingencyMode.OFFLINE,
            auto_print=True,
            retry_attempts=3,
        )

        # Salvar configuração para testes
        config_path = os.path.join(os.path.dirname(__file__), "../config/config.json")
        with open(config_path, "w") as f:
            json.dump(self.test_config.dict(), f, indent=2)

        # Criar diretório de configuração POS se não existir
        os.makedirs(
            os.path.join(os.path.dirname(__file__), "../../pos/config"), exist_ok=True
        )

        # Criar configuração de terminal para testes
        terminal_config = {
            "terminal_id": "TEST001",
            "terminal_name": "Terminal de Teste",
            "sat": {
                "enabled": True,
                "device_code": "900004019",
                "activation_code": "12345678",
                "signature_ac": "SGR-SAT SISTEMA DE GESTAO E RETAGUARDA DO SAT",
                "cnpj": "61099008000141",
                "ie": "111111111111",
                "business_name": "EMPRESA TESTE LTDA",
            },
        }

        # Salvar configuração de terminal para testes
        terminal_config_path = os.path.join(
            os.path.dirname(__file__), "../../pos/config/1.json"
        )
        with open(terminal_config_path, "w") as f:
            json.dump(terminal_config, f, indent=2)

        # Obter serviço SAT
        self.sat_service = get_sat_service()

        # Forçar reinicialização do serviço para carregar novas configurações
        asyncio.run(self.sat_service.shutdown())
        self.sat_service._load_config()

    def test_sat_config_loading(self):
        """Testa o carregamento da configuração do SAT."""
        # Verificar se a configuração foi carregada corretamente
        self.assertTrue(self.sat_service.config.enabled)
        self.assertEqual(self.sat_service.config.driver_type, SATDriverType.SIMULATED)
        self.assertEqual(self.sat_service.config.device_code, "900004019")
        self.assertEqual(self.sat_service.config.cnpj, "61099008000141")

    def test_sat_initialization(self):
        """Testa a inicialização do serviço SAT."""
        # Inicializar serviço
        result = asyncio.run(self.sat_service.initialize())

        # Verificar se a inicialização foi bem-sucedida
        self.assertTrue(result)

        # Verificar se o driver foi criado para o terminal
        self.assertIn("1", self.sat_service.drivers)

        # Verificar se o driver é do tipo correto
        driver = self.sat_service.drivers["1"]
        self.assertIsInstance(driver, SimulatedSATDriver)

    def test_sat_status(self):
        """Testa a obtenção do status do SAT."""
        # Inicializar serviço
        asyncio.run(self.sat_service.initialize())

        # Obter status
        status_response = asyncio.run(self.sat_service.get_status("1"))

        # Verificar se a resposta é do tipo correto
        self.assertIsInstance(status_response, SATStatusResponse)

        # Verificar se o status é válido
        self.assertIn(status_response.status, [s for s in SATStatus])

    def test_sat_emit_cfe(self):
        """Testa a emissão de CF-e."""
        # Inicializar serviço
        asyncio.run(self.sat_service.initialize())

        # Criar dados de pedido para teste
        order_data = {
            "id": "TEST-ORDER-001",
            "total": 100.0,
            "discount": 0,
            "service_fee": 0,
            "items": [
                {
                    "product_id": "P001",
                    "name": "Produto Teste",
                    "quantity": 2,
                    "unit": "UN",
                    "price": 50.0,
                    "total": 100.0,
                }
            ],
            "payment": {
                "method": "CREDIT_CARD",
                "amount": 100.0,
                "card_acquirer": "CIELO",
                "card_authorization": "123456",
            },
            "customer": {"document": "12345678909", "name": "Cliente Teste"},
        }

        # Emitir CF-e
        response = asyncio.run(self.sat_service.emit_cfe(order_data, "1"))

        # Verificar se a resposta é do tipo correto
        self.assertIsInstance(response, SATResponse)

        # Como estamos usando o driver simulado, a emissão deve ser bem-sucedida na maioria das vezes
        # Mas pode falhar aleatoriamente devido à simulação de erros
        if response.success:
            # Verificar se o CF-e foi criado corretamente
            self.assertIsNotNone(response.cfe)
            self.assertEqual(response.cfe.status, "emitido")
            self.assertIsNotNone(response.cfe.chave_acesso)
            self.assertIsNotNone(response.cfe.xml)
        else:
            # Se falhou, deve ter uma mensagem de erro
            self.assertIsNotNone(response.message)
            print(f"Emissão falhou (esperado em simulação): {response.message}")

    def test_sat_disabled(self):
        """Testa o comportamento quando o SAT está desabilitado."""
        # Desabilitar SAT
        self.sat_service.config.enabled = False

        # Inicializar serviço
        asyncio.run(self.sat_service.initialize())

        # Verificar se o SAT está desabilitado
        is_enabled = asyncio.run(self.sat_service.is_enabled("1"))
        self.assertFalse(is_enabled)

        # Criar dados de pedido para teste
        order_data = {
            "id": "TEST-ORDER-002",
            "total": 100.0,
            "items": [
                {
                    "product_id": "P001",
                    "name": "Produto Teste",
                    "quantity": 1,
                    "price": 100.0,
                    "total": 100.0,
                }
            ],
            "payment": {"method": "CASH", "amount": 100.0},
        }

        # Tentar emitir CF-e
        response = asyncio.run(self.sat_service.emit_cfe(order_data, "1"))

        # Verificar se a resposta indica que o SAT está desabilitado
        self.assertFalse(response.success)
        self.assertIn("não habilitado", response.message.lower())

    def test_convert_order_to_cfe(self):
        """Testa a conversão de pedido para CF-e."""
        # Inicializar serviço
        asyncio.run(self.sat_service.initialize())

        # Criar dados de pedido para teste
        order_data = {
            "id": "TEST-ORDER-003",
            "total": 150.0,
            "discount": 10.0,
            "service_fee": 5.0,
            "items": [
                {
                    "product_id": "P001",
                    "name": "Produto Teste 1",
                    "quantity": 2,
                    "unit": "UN",
                    "price": 50.0,
                    "total": 100.0,
                },
                {
                    "product_id": "P002",
                    "name": "Produto Teste 2",
                    "quantity": 1,
                    "unit": "UN",
                    "price": 55.0,
                    "total": 55.0,
                },
            ],
            "payment": {
                "method": "CREDIT_CARD",
                "amount": 150.0,
                "card_acquirer": "CIELO",
                "card_authorization": "123456",
            },
            "customer": {"document": "12345678909", "name": "Cliente Teste"},
        }

        # Converter pedido para CF-e
        cfe = asyncio.run(self.sat_service.convert_order_to_cfe(order_data, "1"))

        # Verificar se o CF-e foi criado corretamente
        self.assertIsInstance(cfe, CFe)
        self.assertEqual(cfe.order_id, "TEST-ORDER-003")
        self.assertEqual(cfe.valor_total, 150.0)
        self.assertEqual(cfe.desconto, 10.0)
        self.assertEqual(cfe.acrescimo, 5.0)
        self.assertEqual(cfe.cpf_destinatario, "12345678909")
        self.assertEqual(cfe.nome_destinatario, "Cliente Teste")

        # Verificar itens
        self.assertEqual(len(cfe.itens), 2)
        self.assertEqual(cfe.itens[0].codigo, "P001")
        self.assertEqual(cfe.itens[0].descricao, "Produto Teste 1")
        self.assertEqual(cfe.itens[0].quantidade, 2)
        self.assertEqual(cfe.itens[0].valor_unitario, 50.0)
        self.assertEqual(cfe.itens[0].valor_total, 100.0)

        # Verificar pagamentos
        self.assertEqual(len(cfe.pagamentos), 1)
        self.assertEqual(cfe.pagamentos[0].tipo, "03")  # 03 = Cartão de Crédito
        self.assertEqual(cfe.pagamentos[0].valor, 150.0)
        self.assertEqual(cfe.pagamentos[0].credenciadora, "CIELO")
        self.assertEqual(cfe.pagamentos[0].nsu, "123456")

    def test_payment_method_mapping(self):
        """Testa o mapeamento de métodos de pagamento para códigos SAT."""
        # Testar diferentes métodos de pagamento
        self.assertEqual(self.sat_service._map_payment_method("CASH"), "01")
        self.assertEqual(self.sat_service._map_payment_method("CREDIT_CARD"), "03")
        self.assertEqual(self.sat_service._map_payment_method("DEBIT_CARD"), "04")
        self.assertEqual(self.sat_service._map_payment_method("PIX"), "17")
        self.assertEqual(self.sat_service._map_payment_method("UNKNOWN"), "99")

    def tearDown(self):
        """Limpeza após os testes."""
        # Finalizar serviço
        asyncio.run(self.sat_service.shutdown())

        # Remover arquivos de configuração de teste
        config_path = os.path.join(os.path.dirname(__file__), "../config/config.json")
        if os.path.exists(config_path):
            os.remove(config_path)

        terminal_config_path = os.path.join(
            os.path.dirname(__file__), "../../pos/config/1.json"
        )
        if os.path.exists(terminal_config_path):
            os.remove(terminal_config_path)


if __name__ == "__main__":
    unittest.main()
