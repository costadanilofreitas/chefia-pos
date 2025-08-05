import sys
import unittest

# Adicionar o diretório raiz ao path para importações
sys.path.append("/home/ubuntu/pos-modern")

# Importar os testes
from src.remote_orders.tests.test_ifood_adapter import TestIFoodAdapter
from src.remote_orders.tests.test_remote_order_service import TestRemoteOrderService
from src.remote_orders.tests.test_remote_order_router import TestRemoteOrderRouter

if __name__ == "__main__":
    # Criar o runner de testes
    runner = unittest.TextTestRunner(verbosity=2)

    # Executar os testes do adaptador iFood
    print("\n=== Executando testes do adaptador iFood ===\n")
    adapter_suite = unittest.TestLoader().loadTestsFromTestCase(TestIFoodAdapter)
    adapter_result = runner.run(adapter_suite)

    # Executar os testes do serviço de pedidos remotos
    print("\n=== Executando testes do serviço de pedidos remotos ===\n")
    service_suite = unittest.TestLoader().loadTestsFromTestCase(TestRemoteOrderService)
    service_result = runner.run(service_suite)

    # Executar os testes do router de pedidos remotos
    print("\n=== Executando testes do router de pedidos remotos ===\n")
    router_suite = unittest.TestLoader().loadTestsFromTestCase(TestRemoteOrderRouter)
    router_result = runner.run(router_suite)

    # Verificar se todos os testes passaram
    if (
        adapter_result.wasSuccessful()
        and service_result.wasSuccessful()
        and router_result.wasSuccessful()
    ):
        print("\n=== Todos os testes foram executados com sucesso! ===\n")
        sys.exit(0)
    else:
        print("\n=== Alguns testes falharam. Verifique os resultados acima. ===\n")
        sys.exit(1)
