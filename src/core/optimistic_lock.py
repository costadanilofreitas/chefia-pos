"""
Optimistic Locking System
Sistema de locks otimistas para prevenir conflitos em edições simultâneas
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapped, mapped_column


class OptimisticLockMixin:
    """
    Mixin para adicionar versionamento otimista em modelos SQLAlchemy
    """

    @declared_attr
    def version(cls) -> Mapped[int]:
        """Número da versão para controle otimista"""
        return mapped_column(Integer, default=1, nullable=False)

    @declared_attr
    def last_modified_by(cls) -> Mapped[Optional[int]]:
        """ID do usuário que fez a última modificação"""
        return mapped_column(Integer, nullable=True)

    @declared_attr
    def last_modified_at(cls) -> Mapped[Optional[datetime]]:
        """Timestamp da última modificação"""
        return mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def increment_version(self):
        """Incrementa a versão do objeto"""
        self.version = (self.version or 0) + 1
        self.last_modified_at = datetime.utcnow()


class OptimisticLockManager:
    """
    Gerenciador de locks otimistas para coordenar edições
    """

    def __init__(self):
        # Cache de locks ativos: entity_key -> lock_info
        self.active_locks: Dict[str, Dict[str, Any]] = {}
        # Tempo máximo de lock (para limpeza automática)
        self.lock_timeout = timedelta(minutes=5)

    def generate_entity_key(self, entity_type: str, entity_id: str) -> str:
        """Gera chave única para entidade"""
        return f"{entity_type}:{entity_id}"

    def generate_etag(self, data: Dict[str, Any], version: int) -> str:
        """
        Gera ETag baseado no conteúdo e versão
        Similar ao HTTP ETag para cache validation
        """
        content = json.dumps(data, sort_keys=True)
        hash_input = f"{content}:v{version}"
        return hashlib.md5(hash_input.encode()).hexdigest()

    def acquire_lock(
        self,
        entity_type: str,
        entity_id: str,
        user_id: str,
        current_version: int,
        terminal_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tenta adquirir lock otimista para edição
        """
        entity_key = self.generate_entity_key(entity_type, entity_id)
        now = datetime.utcnow()

        # Limpar locks expirados
        self._cleanup_expired_locks()

        # Verificar se há lock ativo
        if entity_key in self.active_locks:
            lock = self.active_locks[entity_key]

            # Se o lock é do mesmo usuário, renovar
            if lock["user_id"] == user_id:
                lock["acquired_at"] = now
                lock["version"] = current_version
                return {
                    "success": True,
                    "lock_id": lock["lock_id"],
                    "message": "Lock renovado"
                }

            # Se lock de outro usuário ainda válido, negar
            if lock["acquired_at"] + self.lock_timeout > now:
                return {
                    "success": False,
                    "locked_by": lock["user_id"],
                    "locked_at": lock["acquired_at"].isoformat(),
                    "terminal_id": lock.get("terminal_id"),
                    "message": "Entidade sendo editada por outro usuário"
                }

        # Criar novo lock
        lock_id = hashlib.md5(f"{entity_key}:{user_id}:{now}".encode()).hexdigest()[:16]

        self.active_locks[entity_key] = {
            "lock_id": lock_id,
            "user_id": user_id,
            "terminal_id": terminal_id,
            "version": current_version,
            "acquired_at": now,
            "entity_type": entity_type,
            "entity_id": entity_id
        }

        return {
            "success": True,
            "lock_id": lock_id,
            "version": current_version,
            "message": "Lock adquirido com sucesso"
        }

    def validate_version(
        self,
        entity_type: str,
        entity_id: str,
        client_version: int,
        current_version: int,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Valida se a versão do cliente está atualizada
        """
        entity_key = self.generate_entity_key(entity_type, entity_id)

        # Verificar versão
        if client_version != current_version:
            # Se há lock ativo do mesmo usuário, permitir se versão do lock bate
            if user_id and entity_key in self.active_locks:
                lock = self.active_locks[entity_key]
                if lock["user_id"] == user_id and lock["version"] == client_version:
                    return True

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "VERSION_CONFLICT",
                    "message": "Dados foram modificados por outro usuário",
                    "client_version": client_version,
                    "current_version": current_version,
                    "entity": f"{entity_type}:{entity_id}"
                }
            )

        return True

    def release_lock(
        self,
        entity_type: str,
        entity_id: str,
        user_id: str,
        lock_id: Optional[str] = None
    ) -> bool:
        """
        Libera lock otimista
        """
        entity_key = self.generate_entity_key(entity_type, entity_id)

        if entity_key in self.active_locks:
            lock = self.active_locks[entity_key]

            # Verificar se é o dono do lock
            if lock["user_id"] == user_id:
                # Se lock_id fornecido, validar
                if lock_id and lock["lock_id"] != lock_id:
                    return False

                del self.active_locks[entity_key]
                return True

        return False

    def get_lock_info(
        self,
        entity_type: str,
        entity_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Obtém informações sobre lock ativo
        """
        entity_key = self.generate_entity_key(entity_type, entity_id)

        if entity_key in self.active_locks:
            lock = self.active_locks[entity_key]
            now = datetime.utcnow()

            # Verificar se ainda válido
            if lock["acquired_at"] + self.lock_timeout > now:
                return {
                    "locked": True,
                    "user_id": lock["user_id"],
                    "terminal_id": lock.get("terminal_id"),
                    "acquired_at": lock["acquired_at"].isoformat(),
                    "expires_at": (lock["acquired_at"] + self.lock_timeout).isoformat(),
                    "version": lock["version"]
                }

        return {"locked": False}

    def _cleanup_expired_locks(self):
        """
        Remove locks expirados
        """
        now = datetime.utcnow()
        expired_keys = []

        for key, lock in self.active_locks.items():
            if lock["acquired_at"] + self.lock_timeout <= now:
                expired_keys.append(key)

        for key in expired_keys:
            del self.active_locks[key]

    def handle_conflict_resolution(
        self,
        entity_type: str,
        entity_id: str,
        client_data: Dict[str, Any],
        server_data: Dict[str, Any],
        strategy: str = "LAST_WRITE_WINS"
    ) -> Dict[str, Any]:
        """
        Resolve conflitos entre versões
        
        Estratégias:
        - LAST_WRITE_WINS: Cliente sempre vence
        - SERVER_WINS: Servidor sempre vence
        - MERGE: Tenta mesclar mudanças não conflitantes
        - MANUAL: Retorna ambas versões para resolução manual
        """

        if strategy == "LAST_WRITE_WINS":
            return client_data

        elif strategy == "SERVER_WINS":
            return server_data

        elif strategy == "MERGE":
            # Merge inteligente de campos não conflitantes
            merged = server_data.copy()

            for key, client_value in client_data.items():
                if key not in server_data:
                    # Campo novo do cliente
                    merged[key] = client_value
                elif server_data[key] != client_value:
                    # Conflito real - usar timestamp para decidir
                    client_ts = client_data.get("last_modified_at")
                    server_ts = server_data.get("last_modified_at")

                    if client_ts and server_ts:
                        if client_ts > server_ts:
                            merged[key] = client_value
                    else:
                        # Sem timestamp, manter servidor
                        pass

            return merged

        elif strategy == "MANUAL":
            return {
                "conflict": True,
                "client_version": client_data,
                "server_version": server_data,
                "requires_manual_resolution": True
            }

        return server_data


# Singleton instance
optimistic_lock_manager = OptimisticLockManager()


def check_version_conflict(
    db_version: int,
    client_version: int,
    entity_name: str = "record"
) -> None:
    """
    Helper function para verificar conflito de versão
    
    Raises:
        HTTPException: Se houver conflito de versão
    """
    if db_version != client_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "VERSION_CONFLICT",
                "message": f"O {entity_name} foi modificado por outro usuário. Por favor, recarregue e tente novamente.",
                "current_version": db_version,
                "your_version": client_version
            }
        )
