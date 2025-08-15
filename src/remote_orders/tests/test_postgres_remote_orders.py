#!/usr/bin/env python3
"""
Testes específicos de Remote Orders com PostgreSQL.
"""

import asyncio
import os
import sys
from datetime import datetime

import pytest

# Adicionar diretório raiz do projeto ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Configurar variáveis de ambiente para teste
os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "5432"
os.environ["DB_USER"] = "posmodern"
os.environ["DB_PASSWORD"] = "posmodern123"
os.environ["DB_NAME"] = "posmodern"


@pytest.mark.asyncio
async def test_remote_order_repository():
    """Testa operações básicas do repository."""
    from src.remote_orders.models.remote_order_models import (
        RemoteOrder,
        RemoteOrderCustomer,
        RemoteOrderItem,
        RemoteOrderPayment,
        RemoteOrderStatus,
        RemotePlatform,
    )
    from src.remote_orders.repositories.remote_order_repository import (
        RemoteOrderRepository,
    )

    repo = RemoteOrderRepository()

    # Criar dados de teste
    customer = RemoteOrderCustomer(
        name="Cliente Teste", phone="(11) 99999-9999", email="teste@email.com"
    )

    payment = RemoteOrderPayment(
        method="CREDIT_CARD", status="PAID", total=50.00, prepaid=True, online=True
    )

    items = [
        RemoteOrderItem(
            id="1",
            name="Produto Teste",
            quantity=2,
            unit_price=25.00,
            total_price=50.00,
        )
    ]

    test_order = RemoteOrder(
        id="test-order-001",
        platform=RemotePlatform.IFOOD,
        external_order_id=f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        status=RemoteOrderStatus.PENDING,
        items=items,
        customer=customer,
        payment=payment,
        subtotal=50.00,
        total=50.00,
        raw_data={"test": True},
    )

    # Testar criação
    created_order = await repo.create_remote_order(test_order)
    assert created_order.id == test_order.id
    assert created_order.platform == RemotePlatform.IFOOD
    assert len(created_order.items) == 1

    # Testar busca
    found_order = await repo.get_remote_order(created_order.id)
    assert found_order is not None
    assert found_order.external_order_id == test_order.external_order_id

    # Testar listagem
    orders = await repo.list_remote_orders(limit=5)
    assert len(orders) >= 1

    print("✅ Todos os testes do repository passaram!")


@pytest.mark.asyncio
async def test_remote_order_service():
    """Testa operações do service."""
    from src.remote_orders.services.remote_order_service import remote_order_service

    # Testar configurações
    configs = await remote_order_service.list_platform_configs()
    assert isinstance(configs, list)

    # Testar resumo
    summary = await remote_order_service.get_orders_summary()
    assert "total_orders" in summary
    assert "pending_orders" in summary

    # Testar estatísticas
    stats = await remote_order_service.get_stats_by_platform()
    assert isinstance(stats, dict)

    print("✅ Todos os testes do service passaram!")


async def run_tests():
    """Executa todos os testes."""
    print("🧪 Iniciando testes de Remote Orders com PostgreSQL")
    print("=" * 50)

    try:
        await test_remote_order_repository()
        await test_remote_order_service()

        print("\n🎉 Todos os testes passaram!")
        return True

    except Exception as e:
        print(f"\n❌ Erro nos testes: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    asyncio.run(run_tests())
