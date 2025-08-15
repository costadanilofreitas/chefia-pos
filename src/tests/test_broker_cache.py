"""
Teste das funcionalidades de RabbitMQ e Redis.
"""

import asyncio
from datetime import datetime

from src.core.cache.redis_client import close_redis_client, get_redis_client
from src.core.messaging.message_broker import close_message_broker, get_message_broker


async def test_redis_cache():
    """Testa as operações de cache Redis."""
    print("\n--- Testando Redis Cache ---")

    try:
        redis_client = await get_redis_client()

        if not redis_client.connected:
            print("❌ Redis não está conectado")
            return False

        # Test basic operations
        print("✓ Redis conectado com sucesso")

        # Set and get
        test_key = "test:cache:key"
        test_data = {
            "id": "12345",
            "name": "Test Product",
            "price": 29.99,
            "timestamp": datetime.now().isoformat(),
        }

        # Set data
        success = await redis_client.set(test_key, test_data, ttl=300)
        if success:
            print("✓ Dados salvos no cache")
        else:
            print("❌ Falha ao salvar no cache")
            return False

        # Get data
        retrieved_data = await redis_client.get(test_key)
        if retrieved_data and retrieved_data["id"] == test_data["id"]:
            print("✓ Dados recuperados do cache corretamente")
        else:
            print("❌ Falha ao recuperar dados do cache")
            return False

        # Check existence
        exists = await redis_client.exists(test_key)
        if exists:
            print("✓ Verificação de existência funcionando")
        else:
            print("❌ Falha na verificação de existência")
            return False

        # Increment counter
        counter_key = "test:counter"
        count = await redis_client.increment(counter_key)
        if count == 1:
            print("✓ Incremento de contador funcionando")
        else:
            print("❌ Falha no incremento de contador")
            return False

        # Delete
        deleted = await redis_client.delete(test_key)
        if deleted:
            print("✓ Remoção de chave funcionando")
        else:
            print("❌ Falha na remoção de chave")
            return False

        print("✅ Todos os testes de Redis passaram!")
        return True

    except Exception as e:
        print(f"❌ Erro no teste Redis: {e}")
        return False


async def test_message_broker():
    """Testa as operações de RabbitMQ."""
    print("\n--- Testando RabbitMQ Message Broker ---")

    try:
        broker = await get_message_broker()

        if not broker.connected:
            print("❌ RabbitMQ não está conectado")
            return False

        print("✓ RabbitMQ conectado com sucesso")

        # Test event publishing
        order_event = {
            "order_id": "ORD-12345",
            "customer_id": "CUST-67890",
            "total": 59.99,
            "status": "confirmed",
            "items": [{"product_id": "PROD-1", "quantity": 2, "price": 29.99}],
        }

        # Publish order event
        success = await broker.publish_order_event("created", order_event)
        if success:
            print("✓ Evento de pedido publicado")
        else:
            print("❌ Falha ao publicar evento de pedido")
            return False

        # Publish payment event
        payment_event = {
            "payment_id": "PAY-12345",
            "order_id": "ORD-12345",
            "amount": 59.99,
            "method": "credit_card",
            "status": "approved",
        }

        success = await broker.publish_payment_event("processed", payment_event)
        if success:
            print("✓ Evento de pagamento publicado")
        else:
            print("❌ Falha ao publicar evento de pagamento")
            return False

        # Publish product event
        product_event = {
            "product_id": "PROD-1",
            "name": "Test Product",
            "price": 29.99,
            "category": "Food",
            "stock": 10,
        }

        success = await broker.publish_product_event("updated", product_event)
        if success:
            print("✓ Evento de produto publicado")
        else:
            print("❌ Falha ao publicar evento de produto")
            return False

        # Publish notification
        notification = {
            "type": "order_ready",
            "message": "Pedido ORD-12345 está pronto para retirada",
            "targets": ["kds", "waiter", "customer"],
        }

        success = await broker.publish_notification(notification)
        if success:
            print("✓ Notificação publicada")
        else:
            print("❌ Falha ao publicar notificação")
            return False

        print("✅ Todos os testes de RabbitMQ passaram!")
        return True

    except Exception as e:
        print(f"❌ Erro no teste RabbitMQ: {e}")
        return False


async def test_integration():
    """Testa integração entre cache e message broker."""
    print("\n--- Testando Integração Cache + Broker ---")

    try:
        redis_client = await get_redis_client()
        broker = await get_message_broker()

        if not redis_client.connected or not broker.connected:
            print("❌ Nem todos os serviços estão conectados")
            return False

        # Simulate order flow with cache and events
        order_id = "ORD-INT-12345"

        # 1. Cache order data
        order_data = {
            "order_id": order_id,
            "status": "pending",
            "items": [{"product_id": "PROD-1", "quantity": 1}],
            "created_at": datetime.now().isoformat(),
        }

        cache_key = f"order:{order_id}"
        await redis_client.set(cache_key, order_data, ttl=3600)
        print("✓ Pedido salvo no cache")

        # 2. Publish order created event
        await broker.publish_order_event("created", order_data)
        print("✓ Evento de criação do pedido publicado")

        # 3. Update order status
        order_data["status"] = "confirmed"
        await redis_client.set(cache_key, order_data, ttl=3600)
        await broker.publish_order_event(
            "status_changed",
            {"order_id": order_id, "old_status": "pending", "new_status": "confirmed"},
        )
        print("✓ Status do pedido atualizado (cache + evento)")

        # 4. Retrieve from cache
        cached_order = await redis_client.get(cache_key)
        if cached_order and cached_order["status"] == "confirmed":
            print("✓ Dados atualizados recuperados do cache")
        else:
            print("❌ Falha na recuperação de dados atualizados")
            return False

        print("✅ Teste de integração passou!")
        return True

    except Exception as e:
        print(f"❌ Erro no teste de integração: {e}")
        return False


async def main():
    """Executa todos os testes."""
    print("TESTANDO BROKER E CACHE")
    print("=" * 50)

    tests = [
        ("Redis Cache", test_redis_cache),
        ("RabbitMQ Broker", test_message_broker),
        ("Integração", test_integration),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n🔄 Executando: {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}: ERRO - {e}")
            results.append((test_name, False))

    # Cleanup
    try:
        await close_redis_client()
        await close_message_broker()
        print("\n🔧 Conexões fechadas")
    except Exception as e:
        print(f"⚠️ Erro ao fechar conexões: {e}")

    # Summary
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES")
    print("=" * 50)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{test_name:<20} {status}")

    print(f"\nResultado Final: {passed}/{total} testes passaram")

    if passed == total:
        print("\n🎉 TODOS OS TESTES DE BROKER E CACHE PASSARAM!")
    else:
        print(f"\n⚠️ {total - passed} teste(s) falharam")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    print(f"\n{'✅ Sucesso' if success else '❌ Falha'}")
