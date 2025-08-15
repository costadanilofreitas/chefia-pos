#!/usr/bin/env python3
"""
Script para instalar dependências PostgreSQL necessárias.
"""

import subprocess
import sys
import importlib

def check_package(package_name):
    """Verifica se um pacote está instalado."""
    try:
        importlib.import_module(package_name)
        return True
    except ImportError:
        return False

def install_package(package):
    """Instala um pacote via pip."""
    print(f"📦 Instalando {package}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ {package} instalado com sucesso!")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ Erro ao instalar {package}")
        return False

def main():
    """Verifica e instala dependências PostgreSQL."""
    print("🔧 Verificando dependências PostgreSQL para Remote Orders...")
    print("=" * 60)
    
    # Lista de dependências necessárias
    dependencies = [
        ("asyncpg", "asyncpg==0.30.0"),
        ("sqlalchemy", "sqlalchemy[asyncio]==2.0.43"),
        ("email_validator", "email-validator==2.2.0"),
        ("greenlet", "greenlet==3.2.4"),
    ]
    
    missing_packages = []
    
    # Verificar quais pacotes estão faltando
    for module_name, pip_package in dependencies:
        if check_package(module_name):
            print(f"✅ {module_name} - OK")
        else:
            print(f"❌ {module_name} - FALTANDO")
            missing_packages.append(pip_package)
    
    if not missing_packages:
        print("\n🎉 Todas as dependências PostgreSQL estão instaladas!")
        return True
    
    # Instalar pacotes faltantes
    print(f"\n📥 Instalando {len(missing_packages)} pacote(s) faltante(s)...")
    
    success_count = 0
    for package in missing_packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 Resultado: {success_count}/{len(missing_packages)} pacotes instalados")
    
    if success_count == len(missing_packages):
        print("🎉 Todas as dependências foram instaladas com sucesso!")
        print("\nAgora você pode:")
        print("• Executar testes PostgreSQL")
        print("• Usar Remote Orders com banco de dados")
        print("• Rodar o sistema completo")
        return True
    else:
        print("⚠️ Alguns pacotes não foram instalados. Verifique os erros acima.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)