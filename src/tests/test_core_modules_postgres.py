"""
Testes para os módulos core migrados para PostgreSQL.
Testa auth, business_day, cashier, product e order.
"""

import asyncio
import os
import sys
from datetime import datetime
from decimal import Decimal
from uuid import uuid4

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Test imports
from src.auth.models.db_models import NumericCredential, User, UserSession
from src.business_day.models.db_models import BusinessDay, BusinessDayOperation
from src.cashier.models.db_models import Cashier, CashierOperation, CashierWithdrawal
from src.core.database.connection import DatabaseManager
from src.order.models.db_models import (
    Order,
    OrderDiscount,
    OrderHistory,
    OrderItem,
    OrderPayment,
)
from src.product.models.db_models import (
    Ingredient,
    Product,
    ProductCategory,
    ProductImage,
)


class TestCoreModulesPostgreSQL:
    """Testes para módulos core com PostgreSQL."""

    def __init__(self):
        self.db_manager = DatabaseManager()

    async def test_database_connection(self):
        """Testa conexão com PostgreSQL."""
        print("🔌 Testando conexão PostgreSQL...")

        try:
            async with self.db_manager.get_session() as session:
                result = await session.execute("SELECT 1 as test")
                row = result.fetchone()
                assert row[0] == 1
                print("✅ Conexão PostgreSQL estabelecida")
                return True
        except Exception as e:
            print(f"❌ Erro na conexão: {e}")
            return False

    async def test_auth_models(self):
        """Testa modelos do módulo auth."""
        print("🔐 Testando modelos de autenticação...")

        try:
            async with self.db_manager.get_session() as session:
                # Test User creation
                user = User(
                    user_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    username="test_user",
                    password="hashed_password",
                    name="Test User",
                    email="test@example.com",
                    role="admin",
                    permissions=["all"],
                    is_active=True,
                )

                session.add(user)
                await session.flush()

                # Test NumericCredential
                credential = NumericCredential(
                    credential_id=uuid4(),
                    user_id=user.user_id,
                    operator_code="1234",
                    password_hash="hashed_numeric_password",
                    is_active=True,
                    failed_attempts="0",
                )

                session.add(credential)
                await session.flush()

                # Test UserSession
                user_session = UserSession(
                    session_id=uuid4(),
                    user_id=user.user_id,
                    token_hash="token_hash",
                    expires_at=datetime.utcnow(),
                    is_active=True,
                    device_info={"device": "test"},
                    ip_address="127.0.0.1",
                )

                session.add(user_session)
                await session.commit()

                print("✅ Modelos de autenticação criados com sucesso")
                return True

        except Exception as e:
            print(f"❌ Erro nos modelos de auth: {e}")
            return False

    async def test_business_day_models(self):
        """Testa modelos do módulo business_day."""
        print("📅 Testando modelos de dia de operação...")

        try:
            async with self.db_manager.get_session() as session:
                # Test BusinessDay
                business_day = BusinessDay(
                    business_day_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    date="2025-08-14",
                    status="open",
                    opened_by=uuid4(),
                    opened_at=datetime.utcnow(),
                    total_sales=Decimal("0.0"),
                    total_orders=0,
                    notes="Test business day",
                )

                session.add(business_day)
                await session.flush()

                # Test BusinessDayOperation
                operation = BusinessDayOperation(
                    operation_id=uuid4(),
                    business_day_id=business_day.business_day_id,
                    operation_type="open",
                    operator_id=uuid4(),
                    amount=Decimal("100.0"),
                    notes="Opening operation",
                )

                session.add(operation)
                await session.commit()

                print("✅ Modelos de business_day criados com sucesso")
                return True

        except Exception as e:
            print(f"❌ Erro nos modelos de business_day: {e}")
            return False

    async def test_cashier_models(self):
        """Testa modelos do módulo cashier."""
        print("💰 Testando modelos de caixa...")

        try:
            async with self.db_manager.get_session() as session:
                # Test Cashier
                cashier = Cashier(
                    cashier_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    terminal_id="POS-001",
                    business_day_id=uuid4(),
                    status="open",
                    current_operator_id=uuid4(),
                    opening_balance=Decimal("100.0"),
                    current_balance=Decimal("100.0"),
                    expected_balance=Decimal("100.0"),
                    opened_at=datetime.utcnow(),
                    notes="Test cashier",
                )

                session.add(cashier)
                await session.flush()

                # Test CashierOperation
                operation = CashierOperation(
                    operation_id=uuid4(),
                    cashier_id=cashier.cashier_id,
                    operation_type="opening",
                    amount=Decimal("100.0"),
                    operator_id=uuid4(),
                    payment_method="cash",
                    balance_before=Decimal("0.0"),
                    balance_after=Decimal("100.0"),
                    notes="Opening operation",
                )

                session.add(operation)
                await session.flush()

                # Test CashierWithdrawal
                withdrawal = CashierWithdrawal(
                    withdrawal_id=uuid4(),
                    cashier_id=cashier.cashier_id,
                    operation_id=operation.operation_id,
                    amount=Decimal("50.0"),
                    operator_id=uuid4(),
                    reason="Test withdrawal",
                    notes="Test withdrawal notes",
                )

                session.add(withdrawal)
                await session.commit()

                print("✅ Modelos de cashier criados com sucesso")
                return True

        except Exception as e:
            print(f"❌ Erro nos modelos de cashier: {e}")
            return False

    async def test_product_models(self):
        """Testa modelos do módulo product."""
        print("🍔 Testando modelos de produto...")

        try:
            async with self.db_manager.get_session() as session:
                # Test ProductCategory
                category = ProductCategory(
                    category_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    name="Test Category",
                    description="Test category description",
                    is_active=True,
                )

                session.add(category)
                await session.flush()

                # Test Product
                product = Product(
                    product_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    code="PROD001",
                    barcode="1234567890",
                    name="Test Product",
                    description="Test product description",
                    price=Decimal("10.50"),
                    cost=Decimal("5.25"),
                    category_id=category.category_id,
                    sku="SKU001",
                    status="ACTIVE",
                    type="SIMPLE",
                    is_featured=True,
                    weight_based=False,
                    pricing_strategy="FIXED",
                    is_active=True,
                )

                session.add(product)
                await session.flush()

                # Test ProductImage
                image = ProductImage(
                    image_id=uuid4(),
                    product_id=product.product_id,
                    url="https://example.com/image.jpg",
                    filename="image.jpg",
                    is_main=True,
                )

                session.add(image)
                await session.flush()

                # Test Ingredient
                ingredient = Ingredient(
                    ingredient_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    name="Test Ingredient",
                    description="Test ingredient",
                    unit="unit",
                    cost_per_unit=Decimal("1.50"),
                    current_stock=Decimal("100.0"),
                    minimum_stock=Decimal("10.0"),
                    is_active=True,
                )

                session.add(ingredient)
                await session.commit()

                print("✅ Modelos de product criados com sucesso")
                return True

        except Exception as e:
            print(f"❌ Erro nos modelos de product: {e}")
            return False

    async def test_order_models(self):
        """Testa modelos do módulo order."""
        print("📋 Testando modelos de pedido...")

        try:
            async with self.db_manager.get_session() as session:
                # Test Order
                order = Order(
                    order_id=uuid4(),
                    client_id="test",
                    store_id="test",
                    order_number="ORD001",
                    status="pending",
                    order_type="dine_in",
                    customer_id=uuid4(),
                    waiter_id=uuid4(),
                    table_id=uuid4(),
                    business_day_id=uuid4(),
                    cashier_id=uuid4(),
                    subtotal=Decimal("20.00"),
                    tax=Decimal("2.00"),
                    discount=Decimal("1.00"),
                    service_fee=Decimal("2.50"),
                    delivery_fee=Decimal("0.00"),
                    total=Decimal("23.50"),
                    payment_status="pending",
                    payment_method="credit_card",
                    notes="Test order",
                    delivery_address={"street": "Test St", "number": "123"},
                    estimated_preparation_time=30,
                )

                session.add(order)
                await session.flush()

                # Test OrderItem
                order_item = OrderItem(
                    item_id=uuid4(),
                    order_id=order.order_id,
                    product_id=uuid4(),
                    product_name="Test Product",
                    quantity=Decimal("2.0"),
                    unit_price=Decimal("10.00"),
                    subtotal=Decimal("20.00"),
                    status="pending",
                    notes="Test item notes",
                    customizations={"size": "large"},
                    preparation_time=15,
                )

                session.add(order_item)
                await session.flush()

                # Test OrderDiscount
                discount = OrderDiscount(
                    discount_id=uuid4(),
                    order_id=order.order_id,
                    discount_type="percentage",
                    discount_code="TEST10",
                    discount_amount=Decimal("1.00"),
                    discount_percentage=Decimal("5.0"),
                    description="Test discount",
                    applied_by=uuid4(),
                )

                session.add(discount)
                await session.flush()

                # Test OrderPayment
                payment = OrderPayment(
                    payment_id=uuid4(),
                    order_id=order.order_id,
                    payment_method="credit_card",
                    amount=Decimal("23.50"),
                    status="pending",
                    transaction_id="TXN123",
                    provider_payment_id="PAY123",
                    processed_by=uuid4(),
                    notes="Test payment",
                    metadata={"gateway": "test"},
                )

                session.add(payment)
                await session.flush()

                # Test OrderHistory
                history = OrderHistory(
                    history_id=uuid4(),
                    order_id=order.order_id,
                    previous_status=None,
                    new_status="pending",
                    changed_by=uuid4(),
                    reason="Order created",
                    metadata={"source": "test"},
                )

                session.add(history)
                await session.commit()

                print("✅ Modelos de order criados com sucesso")
                return True

        except Exception as e:
            print(f"❌ Erro nos modelos de order: {e}")
            return False

    async def run_all_tests(self):
        """Executa todos os testes."""
        print("🧪 INICIANDO TESTES DOS MÓDULOS CORE")
        print("=" * 50)

        tests = [
            ("Conexão PostgreSQL", self.test_database_connection()),
            ("Modelos Auth", self.test_auth_models()),
            ("Modelos Business Day", self.test_business_day_models()),
            ("Modelos Cashier", self.test_cashier_models()),
            ("Modelos Product", self.test_product_models()),
            ("Modelos Order", self.test_order_models()),
        ]

        results = []
        for test_name, test_coro in tests:
            print(f"\n🔄 Executando: {test_name}")
            try:
                result = await test_coro
                results.append((test_name, result))
                if result:
                    print(f"✅ {test_name}: PASSOU")
                else:
                    print(f"❌ {test_name}: FALHOU")
            except Exception as e:
                print(f"❌ {test_name}: ERRO - {e}")
                results.append((test_name, False))

        # Summary
        print("\n" + "=" * 50)
        print("📊 RESUMO DOS TESTES MÓDULOS CORE")
        print("=" * 50)

        passed = sum(1 for _, result in results if result)
        total = len(results)

        for test_name, result in results:
            status = "✅ PASSOU" if result else "❌ FALHOU"
            print(f"{test_name:<30} {status}")

        print(f"\nResultado Final: {passed}/{total} testes passaram")

        if passed == total:
            print("\n🎉 TODOS OS TESTES DOS MÓDULOS CORE PASSARAM!")
            print("✅ Auth, Business Day, Cashier, Product e Order funcionando!")
        else:
            print(f"\n⚠️ {total - passed} teste(s) falharam. Verifique os erros acima.")

        return passed == total


async def main():
    """Função principal para executar os testes."""
    tester = TestCoreModulesPostgreSQL()
    success = await tester.run_all_tests()
    return success


if __name__ == "__main__":
    # Executar os testes
    result = asyncio.run(main())

    if result:
        print("\n✅ Todos os testes passaram!")
        exit(0)
    else:
        print("\n❌ Alguns testes falharam!")
        exit(1)
