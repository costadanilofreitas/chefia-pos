import asyncio
import os
import sys
import unittest
from datetime import datetime

# Adicionar diretório raiz ao path para importações
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

# Importar testes
# TODO: Atualizar imports com as classes corretas de teste
# from src.order.tests.test_order_service import OrderServiceTestCase
# from src.payment.tests.test_asaas_adapter import AsaasAdapterTestCase
# from src.payment.tests.test_payment_service import PaymentServiceTestCase
# from src.remote_orders.tests.test_ifood_adapter import IFoodAdapterTestCase
# from src.remote_orders.tests.test_rappi_adapter import RappiAdapterTestCase
# from src.remote_orders.tests.test_remote_order_integration import RemoteOrderIntegrationTestCase
# from src.remote_orders.tests.test_remote_order_service import RemoteOrderServiceTestCase


def run_tests():
    """Executa todos os testes do sistema."""
    # Criar test suite
    test_suite = unittest.TestSuite()

    # Adicionar testes
    # TODO: Adicionar test cases quando as classes forem criadas
    # test_suite.addTest(unittest.makeSuite(OrderServiceTestCase))
    # test_suite.addTest(unittest.makeSuite(PaymentServiceTestCase))
    # test_suite.addTest(unittest.makeSuite(AsaasAdapterTestCase))
    # test_suite.addTest(unittest.makeSuite(IFoodAdapterTestCase))
    # test_suite.addTest(unittest.makeSuite(RappiAdapterTestCase))
    # test_suite.addTest(unittest.makeSuite(RemoteOrderServiceTestCase))
    # test_suite.addTest(unittest.makeSuite(RemoteOrderIntegrationTestCase))

    # Executar testes
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)

    return result


def run_async_tests():
    """Executa testes assíncronos."""
    loop = asyncio.get_event_loop()

    # Executar testes assíncronos aqui
    # ...

    loop.close()


if __name__ == "__main__":
    print(f"Iniciando testes do POS Modern em {datetime.now().isoformat()}")
    print("=" * 80)

    # Executar testes síncronos
    result = run_tests()

    # Executar testes assíncronos
    run_async_tests()

    # Exibir resumo
    print("=" * 80)
    print(f"Testes concluídos em {datetime.now().isoformat()}")
    print(f"Total de testes: {result.testsRun}")
    print(f"Falhas: {len(result.failures)}")
    print(f"Erros: {len(result.errors)}")

    # Sair com código de erro se houver falhas
    sys.exit(len(result.failures) + len(result.errors))
