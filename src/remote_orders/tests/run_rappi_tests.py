import unittest
import sys
import os

# Adicionar diretório raiz ao path para importações
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.remote_orders.tests.test_rappi_adapter import TestRappiAdapter
from src.remote_orders.tests.test_rappi_order_service import TestRappiOrderService
from src.remote_orders.tests.test_rappi_router import TestRappiRouter

def run_tests():
    """Executa todos os testes da integração com Rappi."""
    # Criar test suite
    test_suite = unittest.TestSuite()
    
    # Adicionar testes do adaptador
    test_suite.addTest(unittest.makeSuite(TestRappiAdapter))
    
    # Adicionar testes do serviço
    test_suite.addTest(unittest.makeSuite(TestRappiOrderService))
    
    # Adicionar testes do router
    test_suite.addTest(unittest.makeSuite(TestRappiRouter))
    
    # Executar testes
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_tests()
    print(f"Testes concluídos com {'sucesso' if success else 'falhas'}")
    
    # Código de saída baseado no resultado dos testes
    sys.exit(0 if success else 1)
