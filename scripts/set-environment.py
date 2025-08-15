#!/usr/bin/env python3
"""
Script para configurar o ambiente de desenvolvimento.
Uso: python scripts/set-environment.py [development|staging|production|test]
"""
import sys
import os
import shutil
from pathlib import Path

def set_environment(env_name: str):
    """Define o ambiente de desenvolvimento."""
    project_root = Path(__file__).parent.parent
    config_dir = project_root / "config"
    frontend_dir = project_root / "frontend"
    
    # Validar ambiente
    valid_envs = ["development", "staging", "production", "test"]
    if env_name not in valid_envs:
        print(f"❌ Ambiente inválido: {env_name}")
        print(f"Ambientes válidos: {', '.join(valid_envs)}")
        return False
    
    print(f"🔧 Configurando ambiente: {env_name}")
    
    try:
        # 1. Criar arquivo .env no backend
        backend_env_file = project_root / ".env"
        if backend_env_file.exists():
            backup_file = project_root / f".env.backup.{env_name}"
            shutil.copy2(backend_env_file, backup_file)
            print(f"📦 Backup criado: {backup_file}")
        
        # Usar o config manager para criar o arquivo .env
        sys.path.append(str(config_dir))
        from config import config_manager
        
        env_file_path = config_manager.create_environment_file(env_name)
        print(f"✅ Arquivo .env criado: {env_file_path}")
        
        # 2. Configurar frontend environment
        frontend_env_source = frontend_dir / f".env.{env_name}"
        frontend_env_target = frontend_dir / ".env"
        
        if frontend_env_source.exists():
            if frontend_env_target.exists():
                backup_frontend = frontend_dir / f".env.backup.{env_name}"
                shutil.copy2(frontend_env_target, backup_frontend)
                print(f"📦 Backup frontend criado: {backup_frontend}")
            
            shutil.copy2(frontend_env_source, frontend_env_target)
            print(f"✅ Configuração frontend aplicada: {frontend_env_target}")
        else:
            print(f"⚠️ Arquivo de configuração frontend não encontrado: {frontend_env_source}")
        
        # 3. Definir variável de ambiente
        os.environ["ENVIRONMENT"] = env_name
        
        # 4. Criar arquivo de status
        status_file = project_root / ".current-environment"
        with open(status_file, 'w') as f:
            f.write(env_name)
        
        print(f"✅ Ambiente configurado: {env_name}")
        print_environment_info(env_name, config_manager)
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao configurar ambiente: {e}")
        return False

def print_environment_info(env_name: str, config_manager):
    """Exibe informações sobre o ambiente configurado."""
    try:
        config = config_manager.get_environment_config(env_name)
        
        print("\n📋 Informações do Ambiente:")
        print(f"   Nome: {config['name']}")
        
        backend = config.get('backend', {})
        print(f"   Backend: {backend.get('api_url', 'N/A')}")
        
        frontend_pos = config.get('frontend', {}).get('pos', {})
        print(f"   Frontend POS: http://localhost:{frontend_pos.get('port', 'N/A')}")
        
        db = config.get('database', {})
        print(f"   Database: {db.get('host', 'N/A')}:{db.get('port', 'N/A')}/{db.get('name', 'N/A')}")
        
        features = config.get('features', {})
        print(f"   Debug: {features.get('enable_debug_toolbar', False)}")
        print(f"   Hot Reload: {features.get('enable_hot_reload', False)}")
        
    except Exception as e:
        print(f"⚠️ Erro ao exibir informações: {e}")

def get_current_environment():
    """Obtém o ambiente atual."""
    project_root = Path(__file__).parent.parent
    status_file = project_root / ".current-environment"
    
    if status_file.exists():
        with open(status_file, 'r') as f:
            return f.read().strip()
    
    return os.getenv("ENVIRONMENT", "development")

def main():
    """Função principal."""
    if len(sys.argv) != 2:
        current_env = get_current_environment()
        print(f"Ambiente atual: {current_env}")
        print("\nUso: python scripts/set-environment.py [development|staging|production|test]")
        print("\nExemplos:")
        print("  python scripts/set-environment.py development")
        print("  python scripts/set-environment.py staging")
        print("  python scripts/set-environment.py production")
        print("  python scripts/set-environment.py test")
        return
    
    env_name = sys.argv[1].lower()
    success = set_environment(env_name)
    
    if success:
        print("\n🎉 Configuração concluída!")
        print("Para aplicar as configurações:")
        print("1. Reinicie o VS Code")
        print("2. Execute: docker-compose up -d postgres rabbitmq redis")
        print("3. Execute: python -m src.main")
        print("4. Execute: cd frontend && npm run dev")
    else:
        print("\n❌ Falha na configuração")
        sys.exit(1)

if __name__ == "__main__":
    main()