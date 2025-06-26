from typing import Optional, Dict, List
from datetime import datetime, timedelta
import bcrypt
from ..models.numeric_password_models import (
    NumericPasswordCredentials,
    AuthUser,
    LoginAttempt
)

class NumericPasswordRepository:
    """
    Repositório em memória para credenciais de senhas numéricas.
    Em produção, seria substituído por implementação com banco de dados.
    """
    
    def __init__(self):
        # Dados em memória (em produção seria banco de dados)
        self.credentials: Dict[str, NumericPasswordCredentials] = {}
        self.login_attempts: List[LoginAttempt] = []
        
        # Criar usuários padrão para desenvolvimento
        self._create_default_users()
    
    def _create_default_users(self):
        """Criar usuários padrão para desenvolvimento"""
        default_users = [
            {
                "operator_id": "admin",
                "password": "147258",
                "name": "Administrador",
                "role": "admin",
                "store_id": "1",
                "terminal_id": "1"
            },
            {
                "operator_id": "manager",
                "password": "123456",
                "name": "Gerente",
                "role": "manager",
                "store_id": "1",
                "terminal_id": "1"
            },
            {
                "operator_id": "cashier",
                "password": "654321",
                "name": "Operador de Caixa",
                "role": "cashier",
                "store_id": "1",
                "terminal_id": "1"
            }
        ]
        
        for user_data in default_users:
            password_hash = bcrypt.hashpw(
                user_data["password"].encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            credentials = NumericPasswordCredentials(
                operator_id=user_data["operator_id"],
                password_hash=password_hash,
                name=user_data["name"],
                role=user_data["role"],
                store_id=user_data["store_id"],
                terminal_id=user_data["terminal_id"],
                is_active=True,
                created_at=datetime.utcnow(),
                last_login=None,
                failed_attempts=0,
                locked_until=None
            )
            
            self.credentials[user_data["operator_id"]] = credentials
    
    def get_credentials(self, operator_id: str) -> Optional[NumericPasswordCredentials]:
        """Buscar credenciais por ID do operador"""
        return self.credentials.get(operator_id)
    
    def create_credentials(self, credentials: NumericPasswordCredentials) -> NumericPasswordCredentials:
        """Criar novas credenciais"""
        self.credentials[credentials.operator_id] = credentials
        return credentials
    
    def update_credentials(self, credentials: NumericPasswordCredentials) -> NumericPasswordCredentials:
        """Atualizar credenciais existentes"""
        self.credentials[credentials.operator_id] = credentials
        return credentials
    
    def delete_credentials(self, operator_id: str) -> bool:
        """Deletar credenciais"""
        if operator_id in self.credentials:
            del self.credentials[operator_id]
            return True
        return False
    
    def verify_password(self, operator_id: str, password: str) -> bool:
        """Verificar senha do operador"""
        credentials = self.get_credentials(operator_id)
        if not credentials:
            return False
        
        return bcrypt.checkpw(
            password.encode('utf-8'),
            credentials.password_hash.encode('utf-8')
        )
    
    def record_login_attempt(self, operator_id: str, success: bool, ip_address: str = None):
        """Registrar tentativa de login"""
        attempt = LoginAttempt(
            operator_id=operator_id,
            timestamp=datetime.utcnow(),
            success=success,
            ip_address=ip_address
        )
        self.login_attempts.append(attempt)
        
        # Atualizar contador de tentativas falhas
        credentials = self.get_credentials(operator_id)
        if credentials:
            if success:
                credentials.failed_attempts = 0
                credentials.last_login = datetime.utcnow()
                credentials.locked_until = None
            else:
                credentials.failed_attempts += 1
                # Bloquear após 5 tentativas falhas
                if credentials.failed_attempts >= 5:
                    credentials.locked_until = datetime.utcnow() + timedelta(minutes=30)
            
            self.update_credentials(credentials)
    
    def is_locked(self, operator_id: str) -> bool:
        """Verificar se operador está bloqueado"""
        credentials = self.get_credentials(operator_id)
        if not credentials or not credentials.locked_until:
            return False
        
        return datetime.utcnow() < credentials.locked_until
    
    def unlock_operator(self, operator_id: str) -> bool:
        """Desbloquear operador"""
        credentials = self.get_credentials(operator_id)
        if credentials:
            credentials.failed_attempts = 0
            credentials.locked_until = None
            self.update_credentials(credentials)
            return True
        return False
    
    def get_login_attempts(self, operator_id: str, limit: int = 10) -> List[LoginAttempt]:
        """Buscar tentativas de login recentes"""
        attempts = [
            attempt for attempt in self.login_attempts
            if attempt.operator_id == operator_id
        ]
        # Ordenar por timestamp decrescente
        attempts.sort(key=lambda x: x.timestamp, reverse=True)
        return attempts[:limit]
    
    def list_all_credentials(self) -> List[NumericPasswordCredentials]:
        """Listar todas as credenciais (para admin)"""
        return list(self.credentials.values())

