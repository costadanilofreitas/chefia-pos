import asyncio
import json
import logging
import os
import sys
import unittest
from unittest.mock import patch

# Adicionar diretório raiz ao path para importações
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from src.peripherals.drivers.barcode_reader import SimulatedBarcodeReader
from src.peripherals.drivers.cash_drawer import SimulatedCashDrawer
from src.peripherals.drivers.payment_terminal import SimulatedPaymentTerminal
from src.peripherals.drivers.pix_reader import SimulatedPixReader
from src.peripherals.models.peripheral_models import PeripheralConfig, PeripheralStatus
from src.peripherals.services.peripheral_manager import (
    PeripheralFactory,
    PeripheralManager,
)

# Configurar logging
logging.basicConfig(level=logging.INFO)


class TestPeripheralDrivers(unittest.TestCase):
    """Testes para os drivers de periféricos."""

    def setUp(self):
        """Configuração inicial para os testes."""
        # Criar configurações para os periféricos simulados
        self.printer_config = PeripheralConfig(
            id="test_printer",
            type="thermal_printer",
            driver="simulated",
            name="Impressora de Teste",
            options={"width": 80},
        )

        self.barcode_reader_config = PeripheralConfig(
            id="test_barcode",
            type="barcode_reader",
            driver="simulated",
            name="Leitor de Código de Barras de Teste",
        )

        self.pix_reader_config = PeripheralConfig(
            id="test_pix",
            type="pix_reader",
            driver="simulated",
            name="Leitor de PIX de Teste",
        )

        self.cash_drawer_config = PeripheralConfig(
            id="test_drawer",
            type="cash_drawer",
            driver="simulated",
            name="Gaveta de Dinheiro de Teste",
        )

        self.payment_terminal_config = PeripheralConfig(
            id="test_terminal",
            type="payment_terminal",
            driver="simulated",
            name="Terminal de Pagamento de Teste",
            options={"decline_rate": 0.0},  # Sem recusas para testes
        )

        # Criar instâncias dos periféricos
        self.printer = SimulatedThermalPrinter(self.printer_config)
        self.barcode_reader = SimulatedBarcodeReader(self.barcode_reader_config)
        self.pix_reader = SimulatedPixReader(self.pix_reader_config)
        self.cash_drawer = SimulatedCashDrawer(self.cash_drawer_config)
        self.payment_terminal = SimulatedPaymentTerminal(self.payment_terminal_config)

        # Criar diretório de logs se não existir
        log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
        os.makedirs(log_dir, exist_ok=True)

    def tearDown(self):
        """Limpeza após os testes."""
        # Executar loop de eventos para finalizar periféricos
        loop = asyncio.get_event_loop()

        async def shutdown_peripherals():
            await self.printer.shutdown()
            await self.barcode_reader.shutdown()
            await self.pix_reader.shutdown()
            await self.cash_drawer.shutdown()
            await self.payment_terminal.shutdown()

        loop.run_until_complete(shutdown_peripherals())

    def test_thermal_printer_initialization(self):
        """Testa a inicialização da impressora térmica."""
        loop = asyncio.get_event_loop()

        async def test_init():
            # Inicializar impressora
            result = await self.printer.initialize()
            self.assertTrue(result, "Falha ao inicializar impressora")

            # Verificar status
            status = await self.printer.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.ONLINE,
                "Status da impressora não é ONLINE",
            )

            # Finalizar impressora
            result = await self.printer.shutdown()
            self.assertTrue(result, "Falha ao finalizar impressora")

            # Verificar status após finalização
            status = await self.printer.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.OFFLINE,
                "Status da impressora não é OFFLINE após finalização",
            )

        loop.run_until_complete(test_init())

    def test_thermal_printer_printing(self):
        """Testa a impressão na impressora térmica."""
        loop = asyncio.get_event_loop()

        async def test_print():
            # Inicializar impressora
            await self.printer.initialize()

            # Imprimir texto simples
            result = await self.printer.print("Teste de Impressão\nLinha 2\nLinha 3")
            self.assertTrue(result, "Falha ao imprimir texto simples")

            # Imprimir com formatação
            formatting = {"bold": True, "font_size": "large", "align": "center"}
            result = await self.printer.print("Texto Formatado", formatting)
            self.assertTrue(result, "Falha ao imprimir texto formatado")

            # Imprimir recibo
            receipt = {
                "title": "RECIBO DE VENDA",
                "store": "Loja Exemplo",
                "date": "2025-05-24",
                "items": [
                    {"name": "Produto 1", "qty": 2, "price": 10.50},
                    {"name": "Produto 2", "qty": 1, "price": 15.75},
                ],
                "total": 36.75,
                "payment": "Cartão de Crédito",
                "footer": "Obrigado pela preferência!",
            }
            result = await self.printer.print_receipt(receipt)
            self.assertTrue(result, "Falha ao imprimir recibo")

        loop.run_until_complete(test_print())

    def test_barcode_reader(self):
        """Testa o leitor de código de barras."""
        loop = asyncio.get_event_loop()

        async def test_barcode():
            # Inicializar leitor
            result = await self.barcode_reader.initialize()
            self.assertTrue(result, "Falha ao inicializar leitor de código de barras")

            # Verificar status
            status = await self.barcode_reader.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.ONLINE,
                "Status do leitor não é ONLINE",
            )

            # Simular leitura (com timeout curto para o teste)
            with patch.object(
                self.barcode_reader, "_simulate_scan", return_value="7891234567890"
            ):
                barcode = await self.barcode_reader.read(timeout=1)
                self.assertEqual(
                    barcode, "7891234567890", "Código de barras lido incorretamente"
                )

        loop.run_until_complete(test_barcode())

    def test_pix_reader(self):
        """Testa o leitor de PIX."""
        loop = asyncio.get_event_loop()

        async def test_pix():
            # Inicializar leitor
            result = await self.pix_reader.initialize()
            self.assertTrue(result, "Falha ao inicializar leitor de PIX")

            # Verificar status
            status = await self.pix_reader.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.ONLINE,
                "Status do leitor não é ONLINE",
            )

            # Simular leitura (com timeout curto para o teste)
            pix_payload = (
                "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426655440000"
            )
            with patch.object(
                self.pix_reader, "_simulate_scan", return_value=pix_payload
            ):
                result = await self.pix_reader.read(timeout=1)
                self.assertEqual(result, pix_payload, "Payload PIX lido incorretamente")

        loop.run_until_complete(test_pix())

    def test_cash_drawer(self):
        """Testa a gaveta de dinheiro."""
        loop = asyncio.get_event_loop()

        async def test_drawer():
            # Inicializar gaveta
            result = await self.cash_drawer.initialize()
            self.assertTrue(result, "Falha ao inicializar gaveta de dinheiro")

            # Verificar status
            status = await self.cash_drawer.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.ONLINE,
                "Status da gaveta não é ONLINE",
            )

            # Abrir gaveta
            result = await self.cash_drawer.open()
            self.assertTrue(result, "Falha ao abrir gaveta")

            # Verificar status após abertura
            status = await self.cash_drawer.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.WARNING,
                "Status da gaveta não é WARNING após abertura",
            )

            # Fechar gaveta
            with patch.object(self.cash_drawer, "_simulate_close", return_value=True):
                result = await self.cash_drawer.close()
                self.assertTrue(result, "Falha ao fechar gaveta")

            # Verificar status após fechamento
            status = await self.cash_drawer.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.ONLINE,
                "Status da gaveta não é ONLINE após fechamento",
            )

        loop.run_until_complete(test_drawer())

    def test_payment_terminal(self):
        """Testa o terminal de pagamento."""
        loop = asyncio.get_event_loop()

        async def test_payment():
            # Inicializar terminal
            result = await self.payment_terminal.initialize()
            self.assertTrue(result, "Falha ao inicializar terminal de pagamento")

            # Verificar status
            status = await self.payment_terminal.get_status()
            self.assertEqual(
                status["status"],
                PeripheralStatus.ONLINE,
                "Status do terminal não é ONLINE",
            )

            # Processar pagamento
            payment_data = {"amount": 50.75, "type": "CREDIT", "installments": 1}
            result = await self.payment_terminal.process_payment(payment_data)
            self.assertTrue(
                result["success"],
                f"Falha ao processar pagamento: {result.get('message', '')}",
            )

            # Verificar detalhes do pagamento
            self.assertIsNotNone(
                result["transaction_id"], "ID da transação não retornado"
            )
            self.assertIsNotNone(
                result["details"].get("authorization_code"),
                "Código de autorização não retornado",
            )

            # Cancelar pagamento
            cancel_result = await self.payment_terminal.cancel_transaction(
                result["transaction_id"]
            )
            self.assertTrue(
                cancel_result["success"],
                f"Falha ao cancelar pagamento: {cancel_result.get('message', '')}",
            )

        loop.run_until_complete(test_payment())

    def test_peripheral_factory(self):
        """Testa a fábrica de periféricos."""
        # Testar criação de impressora térmica
        printer = PeripheralFactory.create_peripheral(self.printer_config)
        self.assertIsNotNone(printer, "Falha ao criar impressora térmica")
        self.assertIsInstance(
            printer, SimulatedThermalPrinter, "Tipo incorreto de impressora térmica"
        )

        # Testar criação de leitor de código de barras
        barcode_reader = PeripheralFactory.create_peripheral(self.barcode_reader_config)
        self.assertIsNotNone(
            barcode_reader, "Falha ao criar leitor de código de barras"
        )
        self.assertIsInstance(
            barcode_reader,
            SimulatedBarcodeReader,
            "Tipo incorreto de leitor de código de barras",
        )

        # Testar criação de leitor de PIX
        pix_reader = PeripheralFactory.create_peripheral(self.pix_reader_config)
        self.assertIsNotNone(pix_reader, "Falha ao criar leitor de PIX")
        self.assertIsInstance(
            pix_reader, SimulatedPixReader, "Tipo incorreto de leitor de PIX"
        )

        # Testar criação de gaveta de dinheiro
        cash_drawer = PeripheralFactory.create_peripheral(self.cash_drawer_config)
        self.assertIsNotNone(cash_drawer, "Falha ao criar gaveta de dinheiro")
        self.assertIsInstance(
            cash_drawer, SimulatedCashDrawer, "Tipo incorreto de gaveta de dinheiro"
        )

        # Testar criação de terminal de pagamento
        payment_terminal = PeripheralFactory.create_peripheral(
            self.payment_terminal_config
        )
        self.assertIsNotNone(payment_terminal, "Falha ao criar terminal de pagamento")
        self.assertIsInstance(
            payment_terminal,
            SimulatedPaymentTerminal,
            "Tipo incorreto de terminal de pagamento",
        )

        # Testar tipo inválido
        invalid_config = PeripheralConfig(
            id="invalid",
            type="invalid_type",
            driver="simulated",
            name="Periférico Inválido",
        )
        invalid_peripheral = PeripheralFactory.create_peripheral(invalid_config)
        self.assertIsNone(
            invalid_peripheral, "Periférico com tipo inválido não deveria ser criado"
        )

        # Testar driver inválido
        invalid_driver_config = PeripheralConfig(
            id="invalid_driver",
            type="thermal_printer",
            driver="invalid_driver",
            name="Driver Inválido",
        )
        invalid_driver_peripheral = PeripheralFactory.create_peripheral(
            invalid_driver_config
        )
        self.assertIsNone(
            invalid_driver_peripheral,
            "Periférico com driver inválido não deveria ser criado",
        )

    def test_peripheral_manager(self):
        """Testa o gerenciador de periféricos."""
        # Criar gerenciador com configuração temporária
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "config",
            "test_peripherals.json",
        )

        # Criar diretório de configuração se não existir
        os.makedirs(os.path.dirname(config_path), exist_ok=True)

        # Criar arquivo de configuração de teste
        config_data = {
            "peripherals": {
                "test_printer": {
                    "type": "thermal_printer",
                    "driver": "simulated",
                    "name": "Impressora de Teste",
                    "auto_load": True,
                    "options": {"width": 80},
                },
                "test_barcode": {
                    "type": "barcode_reader",
                    "driver": "simulated",
                    "name": "Leitor de Código de Barras de Teste",
                    "auto_load": True,
                },
            }
        }

        with open(config_path, "w") as f:
            json.dump(config_data, f)

        # Criar gerenciador com patch para usar o arquivo de configuração de teste
        with patch(
            "src.peripherals.services.peripheral_manager.PeripheralManager.config_path",
            config_path,
        ):
            manager = PeripheralManager()

            # Verificar se os periféricos foram carregados
            peripherals = manager.get_all_peripherals()
            self.assertEqual(
                len(peripherals), 2, "Número incorreto de periféricos carregados"
            )
            self.assertIn("test_printer", peripherals, "Impressora não foi carregada")
            self.assertIn(
                "test_barcode",
                peripherals,
                "Leitor de código de barras não foi carregado",
            )

            # Testar adição de periférico
            manager.add_peripheral(self.pix_reader_config)
            peripherals = manager.get_all_peripherals()
            self.assertEqual(len(peripherals), 3, "Periférico não foi adicionado")
            self.assertIn("test_pix", peripherals, "Leitor de PIX não foi adicionado")

            # Testar remoção de periférico
            manager.remove_peripheral("test_barcode")
            peripherals = manager.get_all_peripherals()
            self.assertEqual(len(peripherals), 2, "Periférico não foi removido")
            self.assertNotIn(
                "test_barcode",
                peripherals,
                "Leitor de código de barras não foi removido",
            )

            # Testar obtenção por tipo
            printers = manager.get_peripherals_by_type("thermal_printer")
            self.assertEqual(len(printers), 1, "Número incorreto de impressoras")
            self.assertIn(
                "test_printer", printers, "Impressora não encontrada por tipo"
            )

            # Testar inicialização e finalização
            loop = asyncio.get_event_loop()

            async def test_init_shutdown():
                # Inicializar todos
                results = await manager.initialize_all()
                self.assertEqual(
                    len(results), 2, "Número incorreto de resultados de inicialização"
                )
                self.assertTrue(
                    results["test_printer"], "Falha ao inicializar impressora"
                )
                self.assertTrue(
                    results["test_pix"], "Falha ao inicializar leitor de PIX"
                )

                # Finalizar todos
                results = await manager.shutdown_all()
                self.assertEqual(
                    len(results), 2, "Número incorreto de resultados de finalização"
                )
                self.assertTrue(
                    results["test_printer"], "Falha ao finalizar impressora"
                )
                self.assertTrue(results["test_pix"], "Falha ao finalizar leitor de PIX")

            loop.run_until_complete(test_init_shutdown())

        # Limpar arquivo de configuração de teste
        if os.path.exists(config_path):
            os.remove(config_path)


if __name__ == "__main__":
    unittest.main()
