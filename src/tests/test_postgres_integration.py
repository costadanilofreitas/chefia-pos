#!/usr/bin/env python3
"""
Testes de integração com PostgreSQL para Remote Orders.
"""

import asyncio
import os
import sys
from datetime import datetime

# Adicionar diretório raiz do projeto ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Configurar variáveis de ambiente para teste local
os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "5432"
os.environ["DB_USER"] = "posmodern"
os.environ["DB_PASSWORD"] = "posmodern123"
os.environ["DB_NAME"] = "posmodern"


async def test_database_connection():
    """Testa conexão básica com PostgreSQL."""
    print("🔌 Testando conexão com PostgreSQL...")

    try:
        from src.core.database import get_database_manager

        db_manager = get_database_manager()
        await db_manager.initialize()

        # Teste de health check
        health = await db_manager.health_check()
        if health:
            print("✅ Conexão com PostgreSQL estabelecida com sucesso!")
        else:
            print("❌ Falha no health check do PostgreSQL")
            return False

        await db_manager.close()
        return True

    except Exception as e:
        print(f"❌ Erro ao conectar com PostgreSQL: {e}")
        return False


async def test_remote_order_models():
    """Testa modelos de Remote Orders."""
    print("\n📋 Testando modelos de Remote Orders...")

    try:
        from src.remote_orders.models.remote_order_models import (
            RemoteOrder,
            RemoteOrderCustomer,
            RemoteOrderItem,
            RemoteOrderPayment,
            RemoteOrderStatus,
            RemotePlatform,
        )

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

        remote_order = RemoteOrder(
            id="test-order-001",
            platform=RemotePlatform.IFOOD,
            external_order_id="IFOOD123456",
            status=RemoteOrderStatus.PENDING,
            items=items,
            customer=customer,
            payment=payment,
            subtotal=50.00,
            total=50.00,
            raw_data={"test": True},
        )

        print("✅ Modelos Pydantic criados com sucesso!")
        print(f"   - Pedido: {remote_order.external_order_id}")
        print(f"   - Plataforma: {remote_order.platform}")
        print(f"   - Status: {remote_order.status}")
        print(f"   - Total: R$ {remote_order.total:.2f}")

        return True

    except Exception as e:
        print(f"❌ Erro ao testar modelos: {e}")
        return False


async def test_repository_operations():
    """Testa operações do repository."""
    print("\n🗄️ Testando operações do Repository...")

    try:
        from src.remote_orders.models.remote_order_models import (
            RemoteOrder,
            RemoteOrderCustomer,
            RemoteOrderItem,
            RemoteOrderPayment,
            RemoteOrderStatus,
            RemotePlatform,
            RemotePlatformConfig,
        )
        from src.remote_orders.repositories.remote_order_repository import (
            RemoteOrderRepository,
        )

        repo = RemoteOrderRepository()

        # 1. Testar configuração de plataforma
        print("\n1. Testando configuração de plataforma...")
        config = RemotePlatformConfig(
            platform=RemotePlatform.IFOOD,
            enabled=True,
            api_key="test_key",
            api_secret="test_secret",
            webhook_url="http://localhost:8001/webhook/ifood",
            auto_accept=False,
            default_preparation_time=30,
        )

        saved_config = await repo.update_platform_config(config)
        print(
            f"✅ Configuração salva: {saved_config.platform} - {saved_config.enabled}"
        )

        # 2. Criar pedido de teste
        print("\n2. Testando criação de pedido...")
        customer = RemoteOrderCustomer(
            name="Cliente Repository Test",
            phone="(11) 88888-8888",
            email="repo@test.com",
        )

        payment = RemoteOrderPayment(
            method="PIX", status="PAID", total=75.50, prepaid=True, online=True
        )

        items = [
            RemoteOrderItem(
                id="repo-item-1",
                name="Pizza Margherita",
                quantity=1,
                unit_price=75.50,
                total_price=75.50,
            )
        ]

        test_order = RemoteOrder(
            id="repo-test-001",
            platform=RemotePlatform.IFOOD,
            external_order_id=f"REPO_TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            status=RemoteOrderStatus.PENDING,
            items=items,
            customer=customer,
            payment=payment,
            subtotal=75.50,
            total=75.50,
            raw_data={"test_repo": True, "timestamp": datetime.now().isoformat()},
        )

        created_order = await repo.create_remote_order(test_order)
        print(f"✅ Pedido criado: {created_order.external_order_id}")
        print(f"   - ID: {created_order.id}")
        print(f"   - Cliente: {created_order.customer.name}")
        print(f"   - Itens: {len(created_order.items)}")

        # 3. Buscar pedido criado
        print("\n3. Testando busca de pedido...")
        found_order = await repo.get_remote_order(created_order.id)
        if found_order:
            print(f"✅ Pedido encontrado: {found_order.external_order_id}")
        else:
            print("❌ Pedido não encontrado")
            return False

        # 4. Listar pedidos
        print("\n4. Testando listagem de pedidos...")
        orders = await repo.list_remote_orders(limit=5)
        print(f"✅ {len(orders)} pedidos encontrados")

        # 5. Estatísticas
        print("\n5. Testando estatísticas...")
        summary = await repo.get_orders_summary()
        print("✅ Resumo obtido:")
        print(f"   - Total de pedidos: {summary.get('total_orders', 0)}")
        print(f"   - Pedidos hoje: {summary.get('total_today', 0)}")
        print(f"   - Receita hoje: R$ {summary.get('revenue_today', 0):.2f}")

        stats = await repo.get_stats_by_platform()
        print("✅ Estatísticas por plataforma:")
        for platform, data in stats.items():
            print(f"   - {platform}: {data.get('total_orders', 0)} pedidos")

        return True

    except Exception as e:
        print(f"❌ Erro ao testar repository: {e}")
        import traceback

        traceback.print_exc()
        return False


async def test_service_integration():
    """Testa integração do serviço com PostgreSQL."""
    print("\n🔧 Testando integração do Service...")

    try:
        from src.remote_orders.services.remote_order_service import remote_order_service

        # 1. Listar configurações
        print("\n1. Testando listagem de configurações...")
        configs = await remote_order_service.list_platform_configs()
        print(f"✅ {len(configs)} configurações encontradas")
        for config in configs:
            print(f"   - {config.platform}: {'Ativo' if config.enabled else 'Inativo'}")

        # 2. Obter resumo
        print("\n2. Testando resumo de pedidos...")
        summary = await remote_order_service.get_orders_summary()
        print("✅ Resumo obtido:")
        print(f"   - Pedidos pendentes: {summary.get('pending_orders', 0)}")
        print(f"   - Pedidos ativos: {summary.get('active_orders', 0)}")

        # 3. Estatísticas por plataforma
        print("\n3. Testando estatísticas...")
        stats = await remote_order_service.get_stats_by_platform()
        print(f"✅ Estatísticas obtidas para {len(stats)} plataformas")

        return True

    except Exception as e:
        print(f"❌ Erro ao testar service: {e}")
        import traceback

        traceback.print_exc()
        return False


async def main():
    """Executa todos os testes."""
    print("🚀 Iniciando testes de integração PostgreSQL")
    print("=" * 60)

    # Lista de testes
    tests = [
        ("Conexão PostgreSQL", test_database_connection),
        ("Modelos Pydantic", test_remote_order_models),
        ("Repository Operations", test_repository_operations),
        ("Service Integration", test_service_integration),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n🧪 Executando teste: {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erro no teste {test_name}: {e}")
            results.append((test_name, False))

    # Resumo dos resultados
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES")
    print("=" * 60)

    passed = 0
    for test_name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{test_name:.<40} {status}")
        if result:
            passed += 1

    print(f"\nResultado: {passed}/{len(results)} testes passaram")

    if passed == len(results):
        print("\n🎉 Todos os testes passaram! Integração PostgreSQL OK!")
    else:
        print("\n⚠️ Alguns testes falharam. Verifique a configuração.")


if __name__ == "__main__":
    asyncio.run(main())
