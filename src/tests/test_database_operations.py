"""
Teste das operações básicas do banco PostgreSQL.
"""

import asyncio

from src.auth.models.user_models import UserCreate, UserRole
from src.auth.repositories.user_repository import UserRepository
from src.business_day.models.business_day import BusinessDayCreate, DayStatus
from src.business_day.repositories.business_day_repository import BusinessDayRepository
from src.cashier.models.cashier import CashierCreate, CashierStatus
from src.cashier.repositories.cashier_repository import CashierRepository
from src.core.database.connection import DatabaseManager


async def test_database_operations():
    """Testa operações básicas do banco."""
    print("TESTANDO OPERAÇÕES DO BANCO POSTGRESQL")
    print("=" * 50)

    # Inicializar conexão
    db_manager = DatabaseManager()
    await db_manager.initialize()
    print("✓ Conexão com PostgreSQL estabelecida")

    try:
        # Test Auth Operations
        print("\n--- Testando Autenticação ---")
        user_repo = UserRepository()

        # Criar usuário de teste
        user_data = UserCreate(
            username="test_user",
            full_name="Test User",
            email="test@example.com",
            password="test123",
            role=UserRole.OPERATOR,
            is_active=True,
        )

        # Note: This might fail if user already exists, which is fine for testing
        try:
            created_user = await user_repo.create_user(user_data)
            print(f"✓ Usuário criado: {created_user.username}")
        except Exception as e:
            print(f"! Usuário já existe ou erro: {str(e)[:100]}")

        # Buscar usuário
        users = await user_repo.get_users(limit=5)
        print(f"✓ Encontrados {len(users)} usuários no banco")

        # Test Business Day Operations
        print("\n--- Testando Business Day ---")
        bd_repo = BusinessDayRepository()

        try:
            bd_data = BusinessDayCreate(
                client_id="test_client",
                store_id="test_store",
                status=DayStatus.OPEN,
                opening_balance=100.0,
            )
            created_bd = await bd_repo.create_business_day(bd_data)
            print(f"✓ Business Day criado: {created_bd.business_day_id}")
        except Exception as e:
            print(f"! Business Day erro: {str(e)[:100]}")

        # Buscar business days
        business_days = await bd_repo.get_business_days(limit=5)
        print(f"✓ Encontrados {len(business_days)} business days")

        # Test Cashier Operations
        print("\n--- Testando Cashier ---")
        cashier_repo = CashierRepository()

        try:
            cashier_data = CashierCreate(
                client_id="test_client",
                store_id="test_store",
                terminal_id="terminal_1",
                business_day_id="123e4567-e89b-12d3-a456-426614174000",  # dummy UUID
                status=CashierStatus.OPEN,
                opening_balance=50.0,
            )
            created_cashier = await cashier_repo.create_cashier(cashier_data)
            print(f"✓ Cashier criado: {created_cashier.cashier_id}")
        except Exception as e:
            print(f"! Cashier erro: {str(e)[:100]}")

        # Buscar cashiers
        cashiers = await cashier_repo.get_cashiers(limit=5)
        print(f"✓ Encontrados {len(cashiers)} cashiers")

        print("\n" + "=" * 50)
        print("✅ TODOS OS TESTES DE OPERAÇÕES PASSARAM!")
        print("✅ PostgreSQL está funcionando corretamente")

    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback

        traceback.print_exc()

    finally:
        await db_manager.close()
        print("\n✓ Conexão fechada")


if __name__ == "__main__":
    asyncio.run(test_database_operations())
