"""
Teste das funcionalidades de RabbitMQ e Redis - versao simplificada.
"""

import asyncio


async def test_redis_cache():
    """Testa as operações de cache Redis."""
    print("\n--- Testando Redis Cache ---")

    try:
        from src.core.cache.redis_client import get_redis_client

        redis_client = await get_redis_client()

        if not redis_client.connected:
            print("X Redis nao esta conectado")
            return False

        print("+ Redis conectado com sucesso")

        # Test basic operations
        test_key = "test:cache:key"
        test_data = {"id": "12345", "name": "Test Product"}

        # Set and get
        success = await redis_client.set(test_key, test_data, ttl=300)
        if success:
            print("+ Dados salvos no cache")
        else:
            print("X Falha ao salvar no cache")
            return False

        retrieved_data = await redis_client.get(test_key)
        if retrieved_data and retrieved_data["id"] == test_data["id"]:
            print("+ Dados recuperados do cache corretamente")
        else:
            print("X Falha ao recuperar dados do cache")
            return False

        print("+ Todos os testes de Redis passaram!")
        return True

    except Exception as e:
        print(f"X Erro no teste Redis: {e}")
        return False


async def test_message_broker():
    """Testa as operações de RabbitMQ."""
    print("\n--- Testando RabbitMQ Message Broker ---")

    try:
        from src.core.messaging.message_broker import get_message_broker

        broker = await get_message_broker()

        if not broker.connected:
            print("X RabbitMQ nao esta conectado")
            return False

        print("+ RabbitMQ conectado com sucesso")

        # Test event publishing
        order_event = {
            "order_id": "ORD-12345",
            "customer_id": "CUST-67890",
            "total": 59.99,
            "status": "confirmed",
        }

        success = await broker.publish_order_event("created", order_event)
        if success:
            print("+ Evento de pedido publicado")
        else:
            print("X Falha ao publicar evento de pedido")
            return False

        print("+ Todos os testes de RabbitMQ passaram!")
        return True

    except Exception as e:
        print(f"X Erro no teste RabbitMQ: {e}")
        return False


async def main():
    """Executa todos os testes."""
    print("TESTANDO BROKER E CACHE")
    print("=" * 50)

    tests = [
        ("Redis Cache", test_redis_cache),
        ("RabbitMQ Broker", test_message_broker),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\nExecutando: {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"X {test_name}: ERRO - {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 50)
    print("RESUMO DOS TESTES")
    print("=" * 50)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "+ PASSOU" if result else "X FALHOU"
        print(f"{test_name:<20} {status}")

    print(f"\nResultado Final: {passed}/{total} testes passaram")

    if passed == total:
        print("\nTODOS OS TESTES PASSARAM!")
        print("Sistema pronto para usar RabbitMQ e Redis")
    else:
        print(f"\n{total - passed} teste(s) falharam")
        print("Verifique se Docker esta rodando: docker-compose up -d")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    print(f"\n{'Sucesso' if success else 'Falha'}")
