#!/usr/bin/env python3
"""
Testes de API para Remote Orders.
Testa a comunicação entre frontend e backend através das APIs.
"""

import os
import sys
from datetime import datetime

import requests

# Adicionar diretório raiz do projeto ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

API_BASE_URL = "http://localhost:8001/api/v1"


def test_authentication():
    """Testa autenticação e obtenção de token."""
    print("🔐 Testando autenticação...")

    login_data = {"username": "123", "password": "456789"}

    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/token",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code == 200:
            token_data = response.json()
            print(f"✅ Login realizado: {token_data['operator_name']}")
            return token_data["access_token"]
        else:
            print(f"❌ Erro no login: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"❌ Erro de conexão no login: {e}")
        return None


def test_remote_orders_endpoints(token: str):
    """Testa os endpoints de Remote Orders."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("\n📦 Testando endpoints de Remote Orders...")

    # 1. Listar configurações de plataformas
    print("\n1. Listando configurações de plataformas...")
    try:
        response = requests.get(f"{API_BASE_URL}/remote-platforms/", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            configs = response.json()
            print(f"✅ Configurações encontradas: {len(configs)}")
        else:
            print(f"⚠️ Nenhuma configuração: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao listar configurações: {e}")

    # 2. Criar configuração de teste para iFood
    print("\n2. Criando configuração de teste para iFood...")
    ifood_config = {
        "platform": "ifood",
        "enabled": True,
        "api_key": "test_api_key",
        "api_secret": "test_api_secret",
        "webhook_url": "http://localhost:8001/api/v1/remote-orders/webhook/ifood",
        "auto_accept": False,
        "default_preparation_time": 30,
    }

    try:
        response = requests.put(
            f"{API_BASE_URL}/remote-platforms/ifood", headers=headers, json=ifood_config
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Configuração iFood criada com sucesso")
        else:
            print(f"❌ Erro ao criar configuração: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao criar configuração: {e}")

    # 3. Criar pedido de teste
    print("\n3. Criando pedido remoto de teste...")
    test_order_data = {
        "platform": "ifood",
        "external_order_id": f"TEST_ORDER_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "items": [
            {
                "id": "1",
                "name": "Hambúrguer Artesanal",
                "quantity": 2,
                "unit_price": 25.90,
                "total_price": 51.80,
                "notes": "Sem cebola",
                "customizations": [],
            },
            {
                "id": "2",
                "name": "Batata Frita",
                "quantity": 1,
                "unit_price": 12.00,
                "total_price": 12.00,
                "customizations": [],
            },
        ],
        "customer": {
            "name": "João da Silva",
            "phone": "(11) 99999-9999",
            "email": "joao@email.com",
            "address": {
                "street": "Rua das Flores, 123",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "zipcode": "01234-567",
            },
        },
        "payment": {
            "method": "CREDIT_CARD",
            "status": "PAID",
            "total": 68.80,
            "prepaid": True,
            "online": True,
        },
        "subtotal": 63.80,
        "delivery_fee": 5.00,
        "discount": 0.00,
        "total": 68.80,
        "notes": "Entregar no portão principal",
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/remote-orders/test", headers=headers, json=test_order_data
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            order = response.json()
            print(f"✅ Pedido criado: ID {order['id']}")
            return order["id"]
        else:
            print(f"❌ Erro ao criar pedido: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erro ao criar pedido: {e}")
        return None


def test_order_actions(token: str, order_id: str):
    """Testa ações sobre pedidos remotos."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print(f"\n🎯 Testando ações no pedido {order_id}...")

    # 1. Buscar pedido específico
    print("\n1. Buscando pedido...")
    try:
        response = requests.get(
            f"{API_BASE_URL}/remote-orders/{order_id}", headers=headers
        )
        if response.status_code == 200:
            order = response.json()
            print(
                f"✅ Pedido encontrado: {order['external_order_id']} - Status: {order['status']}"
            )
        else:
            print(f"❌ Erro ao buscar pedido: {response.text}")
            return
    except Exception as e:
        print(f"❌ Erro ao buscar pedido: {e}")
        return

    # 2. Aceitar pedido
    print("\n2. Aceitando pedido...")
    try:
        response = requests.post(
            f"{API_BASE_URL}/remote-orders/{order_id}/accept", headers=headers
        )
        if response.status_code == 200:
            order = response.json()
            print(f"✅ Pedido aceito: Status {order['status']}")
        else:
            print(f"❌ Erro ao aceitar pedido: {response.text}")
            return
    except Exception as e:
        print(f"❌ Erro ao aceitar pedido: {e}")
        return

    # 3. Marcar como pronto
    print("\n3. Marcando pedido como pronto...")
    try:
        # Primeiro atualizar para "preparing"
        response = requests.post(
            f"{API_BASE_URL}/remote-orders/{order_id}/ready", headers=headers
        )
        if response.status_code == 200:
            order = response.json()
            print(f"✅ Pedido marcado como pronto: Status {order['status']}")
        else:
            print(f"⚠️ Erro ao marcar como pronto: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao marcar como pronto: {e}")

    # 4. Despachar pedido
    print("\n4. Despachando pedido...")
    try:
        response = requests.post(
            f"{API_BASE_URL}/remote-orders/{order_id}/dispatch", headers=headers
        )
        if response.status_code == 200:
            order = response.json()
            print(f"✅ Pedido despachado: Status {order['status']}")
        else:
            print(f"⚠️ Erro ao despachar: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao despachar: {e}")


def test_statistics(token: str):
    """Testa endpoints de estatísticas."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    print("\n📊 Testando estatísticas...")

    # 1. Resumo de pedidos
    print("\n1. Obtendo resumo de pedidos...")
    try:
        response = requests.get(
            f"{API_BASE_URL}/remote-orders/stats/summary", headers=headers
        )
        if response.status_code == 200:
            summary = response.json()
            print("✅ Resumo obtido:")
            print(f"   - Pedidos pendentes: {summary.get('pending_orders', 0)}")
            print(f"   - Pedidos ativos: {summary.get('active_orders', 0)}")
            print(f"   - Total hoje: {summary.get('total_today', 0)}")
            print(f"   - Receita hoje: R$ {summary.get('revenue_today', 0):.2f}")
        else:
            print(f"❌ Erro ao obter resumo: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao obter resumo: {e}")

    # 2. Estatísticas por plataforma
    print("\n2. Obtendo estatísticas por plataforma...")
    try:
        response = requests.get(
            f"{API_BASE_URL}/remote-orders/stats/by-platform", headers=headers
        )
        if response.status_code == 200:
            stats = response.json()
            print("✅ Estatísticas por plataforma obtidas:")
            for platform, data in stats.items():
                print(f"   - {platform}: {data.get('total_orders', 0)} pedidos")
        else:
            print(f"❌ Erro ao obter estatísticas: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao obter estatísticas: {e}")


def test_webhook_simulation(token: str):
    """Simula recebimento de webhook."""
    print("\n🔄 Testando webhook simulation...")

    # Simular webhook do iFood
    webhook_payload = {
        "id": f"WEBHOOK_TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "items": [
            {
                "id": "123",
                "name": "Pizza Margherita",
                "quantity": 1,
                "unitPrice": 32.90,
                "totalPrice": 32.90,
                "options": [],
            }
        ],
        "customer": {"name": "Cliente Webhook", "phone": "(11) 88888-8888"},
        "payments": [{"method": "ONLINE", "status": "PAID", "prepaid": True}],
        "subTotal": 32.90,
        "deliveryFee": 4.00,
        "discount": 0.00,
        "totalPrice": 36.90,
        "notes": "Pedido via webhook",
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/remote-orders/webhook/ifood",
            json=webhook_payload,
            headers={"Content-Type": "application/json"},
        )

        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Webhook processado: {result['message']}")
        else:
            print(f"❌ Erro no webhook: {response.text}")

    except Exception as e:
        print(f"❌ Erro no webhook: {e}")


def main():
    """Executa todos os testes."""
    print("🚀 Iniciando testes do fluxo Remote Orders")
    print("=" * 50)

    # 1. Autenticação
    token = test_authentication()
    if not token:
        print("❌ Falha na autenticação. Encerrando testes.")
        return

    # 2. Testes de endpoints
    order_id = test_remote_orders_endpoints(token)

    # 3. Testes de ações de pedidos
    if order_id:
        test_order_actions(token, order_id)

    # 4. Testes de estatísticas
    test_statistics(token)

    # 5. Teste de webhook
    test_webhook_simulation(token)

    print("\n" + "=" * 50)
    print("✅ Testes concluídos!")


if __name__ == "__main__":
    main()
