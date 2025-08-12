import unittest
import os
import sys

# Adicionar diretório raiz ao path para importar módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

# Importar testes
from test_payment_service import TestPaymentService
from test_asaas_adapter import TestAsaasAdapter
from test_payment_router import TestPaymentRouter

if __name__ == "__main__":
    # Criar suíte de testes
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Adicionar testes à suíte
    suite.addTests(loader.loadTestsFromTestCase(TestPaymentService))
    suite.addTests(loader.loadTestsFromTestCase(TestAsaasAdapter))
    suite.addTests(loader.loadTestsFromTestCase(TestPaymentRouter))

    # Executar testes
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite)
