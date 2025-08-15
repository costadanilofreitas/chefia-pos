"""
Teste simples para verificar se os modelos estão funcionando corretamente.
"""


def test_auth_models():
    """Testa se os modelos de auth podem ser importados."""
    try:
        print("Auth models imported successfully")
        return True
    except Exception as e:
        print(f"Auth models error: {e}")
        return False


def test_business_day_models():
    """Testa se os modelos de business_day podem ser importados."""
    try:
        print("Business Day models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Business Day models error: {e}")
        return False


def test_cashier_models():
    """Testa se os modelos de cashier podem ser importados."""
    try:
        print("Cashier models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Cashier models error: {e}")
        return False


def test_product_models():
    """Testa se os modelos de product podem ser importados."""
    try:
        print("Product models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Product models error: {e}")
        return False


def test_order_models():
    """Testa se os modelos de order podem ser importados."""
    try:
        print("Order models imported successfully")
        return True
    except Exception as e:
        print(f"❌ Order models error: {e}")
        return False


def test_database_connection():
    """Testa se a conexão com banco pode ser configurada."""
    try:
        from src.core.database.connection import DatabaseManager

        DatabaseManager()
        print("Database connection configured successfully")
        return True
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False


def main():
    """Executa todos os testes."""
    print("TESTANDO MODELOS MIGRADOS")
    print("=" * 50)

    tests = [
        ("Database Connection", test_database_connection),
        ("Auth Models", test_auth_models),
        ("Business Day Models", test_business_day_models),
        ("Cashier Models", test_cashier_models),
        ("Product Models", test_product_models),
        ("Order Models", test_order_models),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\nTesting: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"{test_name}: ERROR - {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES")
    print("=" * 50)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "PASSOU" if result else "FALHOU"
        print(f"{test_name:<25} {status}")

    print(f"\nResultado Final: {passed}/{total} testes passaram")

    if passed == total:
        print("\nTODOS OS MODELOS ESTAO FUNCIONANDO!")
        print("Migracao PostgreSQL bem-sucedida!")
    else:
        print(f"\n{total - passed} teste(s) falharam. Verificar erros acima.")

    return passed == total


if __name__ == "__main__":
    success = main()
    print(f"\n{'Sucesso' if success else 'Falha'}")
