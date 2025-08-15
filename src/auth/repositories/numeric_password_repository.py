import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..models.numeric_password_models import OperatorCredential


class NumericPasswordRepository:
    """Repository para gerenciamento de credenciais de operadores."""

    def __init__(self, storage_file: str = "/tmp/operator_credentials.json"):
        """
        Inicializa o repository com armazenamento em arquivo JSON.

        Args:
            storage_file: Caminho para o arquivo de armazenamento
        """
        self.storage_file = storage_file
        self._ensure_storage_file()

    def _ensure_storage_file(self):
        """Garante que o arquivo de armazenamento existe."""
        if not os.path.exists(self.storage_file):
            with open(self.storage_file, "w") as f:
                json.dump({}, f)

    def _load_data(self) -> Dict[str, Any]:
        """Carrega dados do arquivo de armazenamento."""
        try:
            with open(self.storage_file, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_data(self, data: Dict[str, Any]):
        """Salva dados no arquivo de armazenamento."""
        with open(self.storage_file, "w") as f:
            json.dump(data, f, indent=2, default=str)

    async def create(self, credential: OperatorCredential) -> OperatorCredential:
        """Cria uma nova credencial de operador."""
        data = self._load_data()

        # Converte para dict para armazenamento
        credential_dict = {
            "operator_id": credential.operator_id,
            "password_hash": credential.password_hash,
            "salt": credential.salt,
            "is_active": getattr(credential, "is_active", True),
            "is_temporary": getattr(credential, "is_temporary", False),
            "created_at": credential.created_at.isoformat(),
            "updated_at": credential.updated_at.isoformat(),
            "expires_at": getattr(credential, "expires_at", None),
            "failed_attempts": credential.failed_attempts,
            "locked_until": getattr(credential, "locked_until", None),
            "last_login": getattr(credential, "last_login", None),
            "is_locked": credential.is_locked,
            "lock_expiration": (
                credential.lock_expiration.isoformat()
                if credential.lock_expiration
                else None
            ),
            "last_password_change": credential.last_password_change.isoformat(),
            "last_failed_attempt": (
                credential.last_failed_attempt.isoformat()
                if credential.last_failed_attempt
                else None
            ),
        }

        data[credential.operator_id] = credential_dict
        self._save_data(data)

        return credential

    async def get_by_operator_id(
        self, operator_id: str
    ) -> Optional[OperatorCredential]:
        """Busca credencial por ID do operador."""
        data = self._load_data()

        if operator_id not in data:
            return None

        credential_data = data[operator_id]

        # Converte de volta para OperatorCredential
        return OperatorCredential(
            id=credential_data.get("id", credential_data["operator_id"]),
            operator_id=credential_data["operator_id"],
            password_hash=credential_data["password_hash"],
            salt=credential_data["salt"],
            failed_attempts=credential_data["failed_attempts"],
            last_failed_attempt=(
                datetime.fromisoformat(credential_data["last_failed_attempt"])
                if credential_data["last_failed_attempt"]
                else None
            ),
            is_locked=credential_data["is_locked"],
            lock_expiration=(
                datetime.fromisoformat(credential_data["lock_expiration"])
                if credential_data["lock_expiration"]
                else None
            ),
            last_password_change=datetime.fromisoformat(
                credential_data["last_password_change"]
            ),
            created_at=datetime.fromisoformat(credential_data["created_at"]),
            updated_at=datetime.fromisoformat(credential_data["updated_at"]),
        )

    async def update(self, credential: OperatorCredential) -> OperatorCredential:
        """Atualiza uma credencial existente."""
        return await self.create(credential)  # Sobrescreve

    async def delete(self, operator_id: str) -> bool:
        """Remove uma credencial."""
        data = self._load_data()

        if operator_id in data:
            del data[operator_id]
            self._save_data(data)
            return True

        return False

    async def get_credential_by_operator_id(
        self, operator_id: str
    ) -> Optional[OperatorCredential]:
        """Busca credencial por ID do operador."""
        return await self.get_by_operator_id(operator_id)

    async def create_credential(
        self, credential: OperatorCredential
    ) -> OperatorCredential:
        """Cria uma nova credencial de operador."""
        return await self.create(credential)

    async def update_credential(
        self, credential: OperatorCredential
    ) -> OperatorCredential:
        """Atualiza uma credencial existente."""
        return await self.update(credential)

    async def list_all(self) -> List[OperatorCredential]:
        data = self._load_data()
        credentials = []

        for _operator_id, credential_data in data.items():
            credential = OperatorCredential(
                id=credential_data.get("id", credential_data["operator_id"]),
                operator_id=credential_data["operator_id"],
                password_hash=credential_data["password_hash"],
                salt=credential_data["salt"],
                failed_attempts=credential_data["failed_attempts"],
                last_failed_attempt=(
                    datetime.fromisoformat(credential_data["last_failed_attempt"])
                    if credential_data["last_failed_attempt"]
                    else None
                ),
                is_locked=credential_data["is_locked"],
                lock_expiration=(
                    datetime.fromisoformat(credential_data["lock_expiration"])
                    if credential_data["lock_expiration"]
                    else None
                ),
                last_password_change=datetime.fromisoformat(
                    credential_data["last_password_change"]
                ),
                created_at=datetime.fromisoformat(credential_data["created_at"]),
                updated_at=datetime.fromisoformat(credential_data["updated_at"]),
            )
            credentials.append(credential)

        return credentials
