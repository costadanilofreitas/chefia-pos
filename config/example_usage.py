"""
Exemplo de uso do sistema de configuração.
"""
from config.config import config_manager, get_config, is_feature_enabled

# Exemplo 1: Obter configuração completa
def example_full_config():
    """Exemplo de obtenção da configuração completa."""
    config = get_config('development')
    print(f"Configuração: {config['name']}")
    print(f"API URL: {config['backend']['api_url']}")

# Exemplo 2: Configuração específica do backend
def example_backend_config():
    """Exemplo de configuração do backend."""
    backend_config = config_manager.get_backend_config('development')
    host = backend_config.get('host', 'localhost')
    port = backend_config.get('port', 8001)
    debug = backend_config.get('debug', False)
    
    print(f"Backend rodará em {host}:{port}")
    print(f"Debug mode: {debug}")

# Exemplo 3: Configuração do banco de dados
def example_database_config():
    """Exemplo de configuração do banco de dados."""
    db_url = config_manager.get_database_url('development')
    print(f"Database URL: {db_url}")
    
    # Configuração detalhada
    db_config = config_manager.get_database_config('development')
    print(f"Pool size: {db_config.get('pool_size', 5)}")
    print(f"Echo SQL: {db_config.get('echo_sql', False)}")

# Exemplo 4: Feature flags
def example_feature_flags():
    """Exemplo de uso de feature flags."""
    if is_feature_enabled('enable_debug_toolbar', 'development'):
        print("Debug toolbar habilitado")
    
    if is_feature_enabled('enable_analytics', 'production'):
        print("Analytics habilitado em produção")

# Exemplo 5: Configuração do frontend
def example_frontend_config():
    """Exemplo de configuração do frontend."""
    pos_config = config_manager.get_frontend_config('pos', 'development')
    print(f"POS App rodará na porta: {pos_config.get('port', 3000)}")
    print(f"API URL: {pos_config.get('api_url', 'http://localhost:8001')}")

# Exemplo 6: URLs de conexão
def example_connection_urls():
    """Exemplo de URLs de conexão."""
    db_url = config_manager.get_database_url('development')
    redis_url = config_manager.get_redis_url('development')
    rabbitmq_url = config_manager.get_rabbitmq_url('development')
    
    print(f"Database: {db_url}")
    print(f"Redis: {redis_url}")
    print(f"RabbitMQ: {rabbitmq_url}")

# Exemplo 7: Configuração condicional por ambiente
def example_conditional_config():
    """Exemplo de configuração condicional."""
    import os
    current_env = os.getenv('ENVIRONMENT', 'development')
    
    if current_env == 'development':
        # Configurações para desenvolvimento
        log_level = 'DEBUG'
        enable_cors = True
        enable_swagger = True
    elif current_env == 'production':
        # Configurações para produção
        log_level = 'WARNING'
        enable_cors = False
        enable_swagger = False
    else:
        # Configurações padrão
        log_level = 'INFO'
        enable_cors = True
        enable_swagger = True
    
    print(f"Ambiente: {current_env}")
    print(f"Log level: {log_level}")
    print(f"CORS: {enable_cors}")
    print(f"Swagger: {enable_swagger}")

# Exemplo 8: Integração com FastAPI
def example_fastapi_integration():
    """Exemplo de integração com FastAPI."""
    from fastapi import FastAPI
    
    backend_config = config_manager.get_backend_config()
    features = config_manager.get_features_config()
    
    app = FastAPI(
        title="ChefIA POS API",
        debug=backend_config.get('debug', False),
        docs_url="/docs" if features.get('enable_swagger', False) else None,
        redoc_url="/redoc" if features.get('enable_swagger', False) else None
    )
    
    # Configurar CORS se habilitado
    if features.get('enable_cors', False):
        from fastapi.middleware.cors import CORSMiddleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://localhost:3001"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    return app

# Exemplo 9: Configuração de logging
def example_logging_config():
    """Exemplo de configuração de logging."""
    import logging
    
    backend_config = config_manager.get_backend_config()
    log_level = backend_config.get('log_level', 'INFO')
    
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('app.log') if log_level != 'DEBUG' else logging.NullHandler()
        ]
    )

# Exemplo 10: Configuração de SQLAlchemy
def example_sqlalchemy_config():
    """Exemplo de configuração do SQLAlchemy."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    
    db_config = config_manager.get_database_config()
    db_url = config_manager.get_database_url()
    
    engine = create_async_engine(
        db_url,
        pool_size=db_config.get('pool_size', 5),
        max_overflow=db_config.get('max_overflow', 10),
        echo=db_config.get('echo_sql', False)
    )
    
    SessionLocal = async_sessionmaker(
        engine,
        expire_on_commit=False
    )
    
    return engine, SessionLocal

if __name__ == "__main__":
    print("=== Exemplos de Configuração ===\n")
    
    print("1. Configuração Completa:")
    example_full_config()
    
    print("\n2. Configuração do Backend:")
    example_backend_config()
    
    print("\n3. Configuração do Banco:")
    example_database_config()
    
    print("\n4. Feature Flags:")
    example_feature_flags()
    
    print("\n5. Configuração do Frontend:")
    example_frontend_config()
    
    print("\n6. URLs de Conexão:")
    example_connection_urls()
    
    print("\n7. Configuração Condicional:")
    example_conditional_config()