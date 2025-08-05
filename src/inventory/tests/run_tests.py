import unittest
import sys
import os

# Add the parent directory to the path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import test modules
from src.inventory.tests.test_inventory_service import TestInventoryService
from src.inventory.tests.test_inventory_router import TestInventoryRouter
from src.inventory.tests.test_inventory_financial_integration import TestInventoryFinancialIntegration

def run_tests():
    """Run all inventory module tests."""
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Add service tests
    service_tests = unittest.defaultTestLoader.loadTestsFromTestCase(TestInventoryService)
    suite.addTests(service_tests)
    
    # Add router tests
    router_tests = unittest.defaultTestLoader.loadTestsFromTestCase(TestInventoryRouter)
    suite.addTests(router_tests)
    
    # Add financial integration tests
    integration_tests = unittest.defaultTestLoader.loadTestsFromTestCase(TestInventoryFinancialIntegration)
    suite.addTests(integration_tests)
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
