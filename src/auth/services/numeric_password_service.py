import bcrypt
import random
import uuid
import os
from datetime import datetime, timedelta
from typing import Dict, Any
import jwt

from ..models.numeric_password_models import (
    OperatorCredential, OperatorCredentialCreate, 
    OperatorCredentialUpdate, OperatorCredentialReset,
    LoginRequest, LoginResponse, AuthConfig
)

class NumericPasswordService:
    """Serviço para gerenciamento de senhas numéricas de operadores."""
    
    def __init__(self, repository=None, config: AuthConfig = None):
        """
        Inicializa o serviço de senhas numéricas.
        
        Args:
            repository: Repositório para armazenamento de credenciais
            config: Configurações de autenticação
        """
        self.repository = repository
        self.config = config or AuthConfig()
        self.jwt_secret = os.getenv("JWT_SECRET", "default_secret_key_change_in_production")
    
    async def create_credential(self, credential_data: OperatorCredentialCreate) -> OperatorCredential:
        """
        Cria uma nova credencial para um operador.
        
        Args:
            credential_data: Dados para criação da credencial
            
        Returns:
            OperatorCredential: Credencial criada
            
        Raises:
            ValueError: Se o operador já possuir credencial
        """
        # Verificar se já existe credencial para este operador
        existing = self.repository.get_credentials(credential_data.operator_id)
        if existing:
            raise ValueError(f"Operador {credential_data.operator_id} já possui credencial")
        
        # Gerar salt e hash da senha
        salt = bcrypt.gensalt().decode('utf-8')
        password_hash = self._hash_password(credential_data.password, salt)
        
        # Criar credencial
        now = datetime.utcnow()
        credential = OperatorCredential(
            id=str(uuid.uuid4()),
            operator_id=credential_data.operator_id,
            password_hash=password_hash,
            salt=salt,
            failed_attempts=0,
            last_failed_attempt=None,
            is_locked=False,
            lock_expiration=None,
            last_password_change=now,
            created_at=now,
            updated_at=now
        )
        
        # Salvar no repositório
        return self.repository.create_credentials(credential)
    
    async def update_password(self, operator_id: str, update_data: OperatorCredentialUpdate) -> OperatorCredential:
        """
        Atualiza a senha de um operador.
        
        Args:
            operator_id: ID do operador
            update_data: Dados para atualização da senha
            
        Returns:
            OperatorCredential: Credencial atualizada
            
        Raises:
            ValueError: Se a senha atual estiver incorreta
            ValueError: Se o operador não possuir credencial
        """
        # Obter credencial atual
        credential = self.repository.get_credentials(operator_id)
        if not credential:
            raise ValueError(f"Operador {operator_id} não possui credencial")
        
        # Verificar senha atual
        if not self._verify_password(update_data.current_password, credential.password_hash, credential.salt):
            raise ValueError("Senha atual incorreta")
        
        # Verificar se a nova senha é igual à atual
        if self._verify_password(update_data.new_password, credential.password_hash, credential.salt):
            raise ValueError("Nova senha não pode ser igual à senha atual")
        
        # Gerar novo salt e hash
        salt = bcrypt.gensalt().decode('utf-8')
        password_hash = self._hash_password(update_data.new_password, salt)
        
        # Atualizar credencial
        credential.password_hash = password_hash
        credential.salt = salt
        credential.last_password_change = datetime.utcnow()
        credential.updated_at = datetime.utcnow()
        credential.failed_attempts = 0
        credential.is_locked = False
        credential.lock_expiration = None
        
        # Salvar no repositório
        return self.repository.update_credentials(credential)
    
    async def reset_password(self, reset_data: OperatorCredentialReset) -> Dict[str, Any]:
        """
        Reseta a senha de um operador.
        
        Args:
            reset_data: Dados para reset de senha
            
        Returns:
            Dict com nova senha temporária (se gerada) e credencial atualizada
            
        Raises:
            ValueError: Se o operador não possuir credencial
        """
        # Obter credencial atual
        credential = self.repository.get_credentials(reset_data.operator_id)
        if not credential:
            raise ValueError(f"Operador {reset_data.operator_id} não possui credencial")
        
        # Definir nova senha
        new_password = reset_data.new_password
        if reset_data.generate_temporary or not new_password:
            new_password = self._generate_temporary_password()
        
        # Gerar novo salt e hash
        salt = bcrypt.gensalt().decode('utf-8')
        password_hash = self._hash_password(new_password, salt)
        
        # Atualizar credencial
        credential.password_hash = password_hash
        credential.salt = salt
        credential.last_password_change = datetime.utcnow()
        credential.updated_at = datetime.utcnow()
        credential.failed_attempts = 0
        credential.is_locked = False
        credential.lock_expiration = None
        
        # Salvar no repositório
        updated_credential = self.repository.update_credentials(credential)
        
        return {
            "credential": updated_credential,
            "temporary_password": new_password if reset_data.generate_temporary else None
        }
    
    async def authenticate(self, login_data: LoginRequest) -> LoginResponse:
        """
        Autentica um operador.
        
        Args:
            login_data: Dados de login
            
        Returns:
            LoginResponse: Resposta de login com token de acesso
            
        Raises:
            ValueError: Se as credenciais forem inválidas
            ValueError: Se a conta estiver bloqueada
        """
        # Obter credencial
        credential = self.repository.get_credentials(login_data.operator_id)
        if not credential:
            raise ValueError("Credenciais inválidas")
        
        # Verificar se a conta está bloqueada
        if credential.locked_until:
            if credential.locked_until > datetime.utcnow():
                minutes_remaining = (credential.locked_until - datetime.utcnow()).total_seconds() / 60
                raise ValueError(f"Conta bloqueada. Tente novamente em {int(minutes_remaining)} minutos")
            else:
                # Desbloquear conta se o tempo expirou
                credential.locked_until = None
                self.repository.update_credentials(credential)
        
        # Verificar senha
        if not self.repository.verify_password(login_data.operator_id, login_data.password):
            # Incrementar contador de tentativas falhas
            credential.failed_attempts += 1
            credential.last_failed_attempt = datetime.utcnow()
            
            # Verificar se deve bloquear a conta
            if credential.failed_attempts >= self.config.max_failed_attempts:
                credential.locked_until = datetime.utcnow() + timedelta(minutes=self.config.lock_duration_minutes)
                self.repository.update_credentials(credential)
                raise ValueError(f"Conta bloqueada por {self.config.lock_duration_minutes} minutos devido a múltiplas tentativas falhas")
            
            self.repository.update_credentials(credential)
            raise ValueError("Credenciais inválidas")
        
        # Resetar contador de tentativas falhas
        if credential.failed_attempts > 0:
            credential.failed_attempts = 0
            credential.last_failed_attempt = None
            self.repository.update_credentials(credential)
        
        # Verificar se a senha expirou
        require_password_change = False
        if self.config.password_expiry_days > 0:
            password_age = (datetime.utcnow() - credential.created_at).days
            if password_age > self.config.password_expiry_days:
                require_password_change = True
        
        # Gerar token JWT
        token_expiry = datetime.utcnow() + timedelta(minutes=self.config.session_expiry_minutes)
        token_payload = {
            "sub": login_data.operator_id,
            "name": credential.name,
            "roles": [credential.role],
            "permissions": [],
            "exp": token_expiry.timestamp(),
            "require_password_change": require_password_change
        }
        
        access_token = jwt.encode(token_payload, self.jwt_secret, algorithm="HS256")
        
        # Retornar resposta de login
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=self.config.session_expiry_minutes * 60,
            operator_id=login_data.operator_id,
            operator_name=credential.name,
            roles=[credential.role],
            permissions=[],
            require_password_change=require_password_change
        )
    
    def _hash_password(self, password: str, salt: str) -> str:
        """
        Gera o hash de uma senha com salt.
        
        Args:
            password: Senha em texto plano
            salt: Salt para o hash
            
        Returns:
            str: Hash da senha
        """
        password_bytes = password.encode('utf-8')
        salt_bytes = salt.encode('utf-8')
        hashed = bcrypt.hashpw(password_bytes, salt_bytes)
        return hashed.decode('utf-8')
    
    def _verify_password(self, password: str, password_hash: str, salt: str) -> bool:
        """
        Verifica se uma senha corresponde ao hash armazenado.
        
        Args:
            password: Senha em texto plano
            password_hash: Hash armazenado
            salt: Salt utilizado
            
        Returns:
            bool: True se a senha for válida, False caso contrário
        """
        password_bytes = password.encode('utf-8')
        hash_bytes = password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    
    def _generate_temporary_password(self) -> str:
        """
        Gera uma senha temporária aleatória de 6 dígitos.
        
        Returns:
            str: Senha temporária
        """
        # Evitar sequências óbvias
        while True:
            # Gerar 6 dígitos aleatórios
            digits = [str(random.randint(0, 9)) for _ in range(6)]
            password = ''.join(digits)
            
            # Verificar se não é uma sequência óbvia
            if password not in ['123456', '654321', '111111', '222222', '333333', 
                               '444444', '555555', '666666', '777777', '888888', '999999', '000000']:
                return password
