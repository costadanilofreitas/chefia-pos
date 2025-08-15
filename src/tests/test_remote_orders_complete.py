#!/usr/bin/env python3
"""
Suite completa de testes para Remote Orders - PostgreSQL + API.
Este arquivo centraliza todos os testes relacionados aos Remote Orders.
"""

import asyncio
import os
import subprocess
import sys
from datetime import datetime

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def run_command(command, description):
    """Executa um comando e retorna o resultado."""
    print(f"\n🔧 {description}")
    print(f"Comando: {command}")
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=120
        )

        if result.returncode == 0:
            print(f"✅ {description} - SUCESSO")
            if result.stdout:
                print(f"Output: {result.stdout[:500]}...")
            return True
        else:
            print(f"❌ {description} - FALHOU")
            if result.stderr:
                print(f"Erro: {result.stderr[:500]}...")
            return False

    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - TIMEOUT")
        return False
    except Exception as e:
        print(f"💥 {description} - ERRO: {e}")
        return False


async def test_database_setup():
    """Testa se o PostgreSQL está configurado."""
    print("🗄️ Verificando configuração do PostgreSQL...")

    # Configurar variáveis de ambiente
    os.environ.update(
        {
            "DB_HOST": "localhost",
            "DB_PORT": "5432",
            "DB_USER": "posmodern",
            "DB_PASSWORD": "posmodern123",
            "DB_NAME": "posmodern",
        }
    )

    try:
        from src.core.database import get_database_manager

        db_manager = get_database_manager()
        await db_manager.initialize()

        health = await db_manager.health_check()
        await db_manager.close()

        if health:
            print("✅ PostgreSQL conectado e funcionando")
            return True
        else:
            print("❌ PostgreSQL não está respondendo")
            return False

    except Exception as e:
        print(f"❌ Erro ao conectar PostgreSQL: {e}")
        return False


async def run_postgres_tests():
    """Executa testes específicos do PostgreSQL."""
    print("\n📊 Executando testes de integração PostgreSQL...")

    try:
        from src.tests.test_postgres_integration import main as postgres_main

        await postgres_main()
        return True
    except Exception as e:
        print(f"❌ Erro nos testes PostgreSQL: {e}")
        return False


def run_unit_tests():
    """Executa testes unitários do remote orders."""
    print("\n🧪 Executando testes unitários...")

    test_commands = [
        (
            "python -m pytest src/remote_orders/tests/ -v",
            "Testes unitários Remote Orders",
        ),
        (
            "python src/remote_orders/tests/test_postgres_remote_orders.py",
            "Testes PostgreSQL específicos",
        ),
    ]

    results = []
    for command, description in test_commands:
        try:
            result = run_command(command, description)
            results.append((description, result))
        except Exception as e:
            print(f"❌ Erro em {description}: {e}")
            results.append((description, False))

    return results


def check_server_status():
    """Verifica se o servidor está rodando."""
    print("\n🌐 Verificando status do servidor...")

    import requests

    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Servidor está rodando")
            return True
        else:
            print(f"⚠️ Servidor respondeu com status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Servidor não está acessível: {e}")
        return False


async def run_api_tests():
    """Executa testes de API se o servidor estiver rodando."""
    if not check_server_status():
        print("⏭️ Pulando testes de API (servidor não está rodando)")
        return True

    print("\n🌐 Executando testes de API...")

    try:
        from src.remote_orders.tests.test_remote_orders_api import main as api_main

        api_main()
        return True
    except Exception as e:
        print(f"❌ Erro nos testes de API: {e}")
        return False


async def main():
    """Executa todos os testes de forma organizada."""
    print("🚀 Iniciando Suite Completa de Testes - Remote Orders")
    print("=" * 70)
    print(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    all_results = []

    # 1. Verificar configuração do banco
    print("\n" + "=" * 50)
    print("1️⃣ VERIFICAÇÃO DE DEPENDÊNCIAS")
    print("=" * 50)

    db_ok = await test_database_setup()
    all_results.append(("Configuração PostgreSQL", db_ok))

    if not db_ok:
        print("⚠️ PostgreSQL não está disponível. Alguns testes serão pulados.")

    # 2. Testes unitários
    print("\n" + "=" * 50)
    print("2️⃣ TESTES UNITÁRIOS")
    print("=" * 50)

    unit_results = run_unit_tests()
    all_results.extend(unit_results)

    # 3. Testes de integração PostgreSQL
    if db_ok:
        print("\n" + "=" * 50)
        print("3️⃣ TESTES DE INTEGRAÇÃO POSTGRESQL")
        print("=" * 50)

        postgres_ok = await run_postgres_tests()
        all_results.append(("Integração PostgreSQL", postgres_ok))

    # 4. Testes de API
    print("\n" + "=" * 50)
    print("4️⃣ TESTES DE API")
    print("=" * 50)

    api_ok = await run_api_tests()
    all_results.append(("Testes de API", api_ok))

    # Resumo final
    print("\n" + "=" * 70)
    print("📊 RESUMO FINAL DOS TESTES")
    print("=" * 70)

    passed = 0
    for test_name, result in all_results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{test_name:.<50} {status}")
        if result:
            passed += 1

    print(f"\nResultado Final: {passed}/{len(all_results)} testes passaram")

    if passed == len(all_results):
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("✅ Remote Orders com PostgreSQL está funcionando perfeitamente!")
    else:
        print(f"\n⚠️ {len(all_results) - passed} teste(s) falharam.")
        print("Verifique os logs acima para mais detalhes.")

    print("\n" + "=" * 70)
    return passed == len(all_results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
