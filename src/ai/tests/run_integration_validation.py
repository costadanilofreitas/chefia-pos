"""
Script para executar validação de integração do módulo de IA.

Este script executa:
1. Validação de integração entre previsão de demanda e otimização operacional
2. Validação de integração com fontes de dados externas
3. Validação de fluxo completo de ponta a ponta
"""

import asyncio
import json
import os
import sys
from datetime import datetime

# Adicionar diretório raiz ao path
sys.path.append("/home/ubuntu/pos-modern")

# Importar validador de integração
from src.ai.tests.integration_validator import IntegrationValidator


async def main():
    """Função principal para executar validações."""
    print("Iniciando validação de integração do módulo de IA...")

    # Criar diretório de resultados se não existir
    results_dir = "/home/ubuntu/pos-modern/src/ai/tests/results"
    os.makedirs(results_dir, exist_ok=True)

    # Inicializar validador
    validator = IntegrationValidator()

    # ID de restaurante para teste
    restaurant_id = "test-restaurant-1"

    # Executar todas as validações
    print(f"Executando validações para restaurante {restaurant_id}...")
    results = await validator.run_all_validations(restaurant_id)

    # Salvar resultados em arquivo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"{results_dir}/integration_validation_{timestamp}.json"

    with open(results_file, "w") as f:
        json.dump(results, f, indent=2, default=str)

    # Exibir resumo dos resultados
    print("\nResumo dos resultados:")
    print(f"Sucesso geral: {results['overall_success']}")

    for validation_name, validation_results in results["validations"].items():
        print(
            f"\n{validation_name}: {'✅ Sucesso' if validation_results['success'] else '❌ Falha'}"
        )

        if not validation_results["success"]:
            print("Erros encontrados:")
            for error in validation_results["errors"]:
                print(f"  - {error['test']}: {error['error']}")

    print(f"\nResultados detalhados salvos em: {results_file}")

    return results


if __name__ == "__main__":
    # Executar validações
    validation_results = asyncio.run(main())

    # Sair com código de erro se validação falhar
    sys.exit(0 if validation_results["overall_success"] else 1)
