"""
Configuration management for ChefIA POS system.
"""
import os
import json
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """Manages configuration for different environments."""
    
    def __init__(self):
        self.config_dir = Path(__file__).parent
        self.environments_dir = self.config_dir / "environments"
        self._config_cache: Dict[str, Dict[str, Any]] = {}
        self.current_env = os.getenv("ENVIRONMENT", "development")
        
    def get_environment_config(self, environment: str = None) -> Dict[str, Any]:
        """Get configuration for a specific environment."""
        env = environment or self.current_env
        
        if env in self._config_cache:
            return self._config_cache[env]
        
        config_file = self.environments_dir / f"{env}.json"
        
        if not config_file.exists():
            logger.error(f"Configuration file not found: {config_file}")
            raise FileNotFoundError(f"Configuration file for environment '{env}' not found")
        
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Replace environment variables
            config = self._replace_env_vars(config)
            
            # Cache the config
            self._config_cache[env] = config
            
            logger.info(f"Loaded configuration for environment: {env}")
            return config
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file {config_file}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading config file {config_file}: {e}")
            raise
    
    def _replace_env_vars(self, config: Any) -> Any:
        """Replace ${VAR_NAME} placeholders with environment variables."""
        if isinstance(config, dict):
            return {key: self._replace_env_vars(value) for key, value in config.items()}
        elif isinstance(config, list):
            return [self._replace_env_vars(item) for item in config]
        elif isinstance(config, str) and config.startswith("${") and config.endswith("}"):
            env_var = config[2:-1]
            return os.getenv(env_var, config)
        else:
            return config
    
    def get_backend_config(self, environment: str = None) -> Dict[str, Any]:
        """Get backend-specific configuration."""
        config = self.get_environment_config(environment)
        return config.get("backend", {})
    
    def get_frontend_config(self, app: str, environment: str = None) -> Dict[str, Any]:
        """Get frontend configuration for a specific app."""
        config = self.get_environment_config(environment)
        frontend_config = config.get("frontend", {})
        return frontend_config.get(app, {})
    
    def get_database_config(self, environment: str = None) -> Dict[str, Any]:
        """Get database configuration."""
        config = self.get_environment_config(environment)
        return config.get("database", {})
    
    def get_redis_config(self, environment: str = None) -> Dict[str, Any]:
        """Get Redis configuration."""
        config = self.get_environment_config(environment)
        return config.get("redis", {})
    
    def get_rabbitmq_config(self, environment: str = None) -> Dict[str, Any]:
        """Get RabbitMQ configuration."""
        config = self.get_environment_config(environment)
        return config.get("rabbitmq", {})
    
    def get_auth_config(self, environment: str = None) -> Dict[str, Any]:
        """Get authentication configuration."""
        config = self.get_environment_config(environment)
        return config.get("auth", {})
    
    def get_features_config(self, environment: str = None) -> Dict[str, Any]:
        """Get feature flags configuration."""
        config = self.get_environment_config(environment)
        return config.get("features", {})
    
    def get_external_services_config(self, environment: str = None) -> Dict[str, Any]:
        """Get external services configuration."""
        config = self.get_environment_config(environment)
        return config.get("external_services", {})
    
    def is_feature_enabled(self, feature: str, environment: str = None) -> bool:
        """Check if a feature is enabled."""
        features = self.get_features_config(environment)
        return features.get(feature, False)
    
    def get_database_url(self, environment: str = None) -> str:
        """Get database connection URL."""
        db_config = self.get_database_config(environment)
        host = db_config.get("host", "localhost")
        port = db_config.get("port", 5432)
        name = db_config.get("name", "posmodern")
        user = db_config.get("user", "posmodern")
        password = db_config.get("password", "posmodern123")
        
        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{name}"
    
    def get_redis_url(self, environment: str = None) -> str:
        """Get Redis connection URL."""
        redis_config = self.get_redis_config(environment)
        host = redis_config.get("host", "localhost")
        port = redis_config.get("port", 6379)
        password = redis_config.get("password", "")
        db = redis_config.get("db", 0)
        
        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        else:
            return f"redis://{host}:{port}/{db}"
    
    def get_rabbitmq_url(self, environment: str = None) -> str:
        """Get RabbitMQ connection URL."""
        rabbitmq_config = self.get_rabbitmq_config(environment)
        host = rabbitmq_config.get("host", "localhost")
        port = rabbitmq_config.get("port", 5672)
        user = rabbitmq_config.get("user", "posmodern")
        password = rabbitmq_config.get("password", "posmodern123")
        vhost = rabbitmq_config.get("virtual_host", "/")
        
        return f"amqp://{user}:{password}@{host}:{port}{vhost}"
    
    def create_environment_file(self, environment: str = None) -> str:
        """Create .env file from configuration."""
        env = environment or self.current_env
        config = self.get_environment_config(env)
        
        env_content = []
        env_content.append(f"# Environment: {env}")
        env_content.append(f"ENVIRONMENT={env}")
        env_content.append("")
        
        # Backend config
        backend = config.get("backend", {})
        env_content.append("# Backend Configuration")
        env_content.append(f"BACKEND_HOST={backend.get('host', 'localhost')}")
        env_content.append(f"BACKEND_PORT={backend.get('port', 8001)}")
        env_content.append(f"API_URL={backend.get('api_url', 'http://localhost:8001')}")
        env_content.append(f"DEBUG={str(backend.get('debug', False)).lower()}")
        env_content.append(f"LOG_LEVEL={backend.get('log_level', 'INFO')}")
        env_content.append("")
        
        # Database config
        db = config.get("database", {})
        env_content.append("# Database Configuration")
        env_content.append(f"POSTGRES_HOST={db.get('host', 'localhost')}")
        env_content.append(f"POSTGRES_PORT={db.get('port', 5432)}")
        env_content.append(f"POSTGRES_DB={db.get('name', 'posmodern')}")
        env_content.append(f"POSTGRES_USER={db.get('user', 'posmodern')}")
        env_content.append(f"POSTGRES_PASSWORD={db.get('password', 'posmodern123')}")
        env_content.append("")
        
        # Redis config
        redis = config.get("redis", {})
        env_content.append("# Redis Configuration")
        env_content.append(f"REDIS_HOST={redis.get('host', 'localhost')}")
        env_content.append(f"REDIS_PORT={redis.get('port', 6379)}")
        env_content.append(f"REDIS_PASSWORD={redis.get('password', 'posmodern123')}")
        env_content.append("")
        
        # RabbitMQ config
        rabbitmq = config.get("rabbitmq", {})
        env_content.append("# RabbitMQ Configuration")
        env_content.append(f"RABBITMQ_HOST={rabbitmq.get('host', 'localhost')}")
        env_content.append(f"RABBITMQ_PORT={rabbitmq.get('port', 5672)}")
        env_content.append(f"RABBITMQ_USER={rabbitmq.get('user', 'posmodern')}")
        env_content.append(f"RABBITMQ_PASSWORD={rabbitmq.get('password', 'posmodern123')}")
        env_content.append("")
        
        # Auth config
        auth = config.get("auth", {})
        env_content.append("# Authentication Configuration")
        env_content.append(f"JWT_SECRET={auth.get('jwt_secret', 'change-me-in-production')}")
        env_content.append(f"JWT_ALGORITHM={auth.get('jwt_algorithm', 'HS256')}")
        env_content.append("")
        
        env_file_path = self.config_dir.parent / f".env.{env}"
        with open(env_file_path, 'w') as f:
            f.write('\n'.join(env_content))
        
        logger.info(f"Created environment file: {env_file_path}")
        return str(env_file_path)

# Global instance
config_manager = ConfigManager()

def get_config(environment: str = None) -> Dict[str, Any]:
    """Get configuration for current or specified environment."""
    return config_manager.get_environment_config(environment)

def get_backend_config(environment: str = None) -> Dict[str, Any]:
    """Get backend configuration."""
    return config_manager.get_backend_config(environment)

def get_frontend_config(app: str, environment: str = None) -> Dict[str, Any]:
    """Get frontend configuration for specific app."""
    return config_manager.get_frontend_config(app, environment)

def is_feature_enabled(feature: str, environment: str = None) -> bool:
    """Check if feature is enabled."""
    return config_manager.is_feature_enabled(feature, environment)