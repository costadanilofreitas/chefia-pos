"""
Configuração e gerenciamento de conexão com PostgreSQL.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

logger = logging.getLogger(__name__)

# Base para modelos SQLAlchemy
Base = declarative_base()


class DatabaseConfig:
    """Configuração do banco de dados."""

    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = int(os.getenv("DB_PORT", "5432"))
        self.user = os.getenv("DB_USER", "posmodern")
        self.password = os.getenv("DB_PASSWORD", "posmodern123")
        self.database = os.getenv("DB_NAME", "posmodern")
        self.schema = "pos_modern"

    @property
    def url(self) -> str:
        """URL de conexão SQLAlchemy."""
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

    @property
    def asyncpg_url(self) -> str:
        """URL de conexão asyncpg."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class DatabaseManager:
    """Gerenciador de conexões com banco de dados."""

    def __init__(self):
        self.config = DatabaseConfig()
        self.engine = None
        self.session_factory = None
        self._pool = None

    async def initialize(self):
        """Inicializa conexões com banco de dados."""
        try:
            # Configurar SQLAlchemy
            self.engine = create_async_engine(
                self.config.url,
                echo=bool(os.getenv("DB_ECHO", False)),
                pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
                max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
                pool_pre_ping=True,
                pool_recycle=3600,
            )

            self.session_factory = async_sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )

            # Configurar pool asyncpg para consultas diretas
            self._pool = await asyncpg.create_pool(
                self.config.asyncpg_url,
                min_size=5,
                max_size=20,
                command_timeout=60,
                server_settings={"search_path": self.config.schema},
            )

            logger.info(
                f"Conexão com banco de dados estabelecida: {self.config.host}:{self.config.port}"
            )

        except Exception as e:
            logger.error(f"Erro ao conectar com banco de dados: {e}")
            raise

    async def close(self):
        """Fecha conexões com banco de dados."""
        if self.engine:
            await self.engine.dispose()

        if self._pool:
            await self._pool.close()

    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Obtém sessão SQLAlchemy."""
        if not self.session_factory:
            await self.initialize()

        if not self.session_factory:
            raise RuntimeError("Database not initialized")
        session = self.session_factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

    async def get_connection(self):
        """Obtém conexão asyncpg."""
        if not self._pool:
            await self.initialize()
        if not self._pool:
            raise RuntimeError("Database pool not initialized")
        return await self._pool.acquire()

    async def release_connection(self, connection):
        """Libera conexão asyncpg."""
        if self._pool:
            await self._pool.release(connection)

    async def execute_query(self, query: str, *args) -> list:
        """Executa query e retorna resultados."""
        if not self._pool:
            raise RuntimeError("Database pool not initialized")
        async with self._pool.acquire() as connection:
            return await connection.fetch(query, *args)

    async def execute_command(self, command: str, *args) -> str:
        """Executa comando e retorna status."""
        if not self._pool:
            raise RuntimeError("Database pool not initialized")
        async with self._pool.acquire() as connection:
            return await connection.execute(command, *args)

    async def health_check(self) -> bool:
        """Verifica saúde da conexão."""
        try:
            if not self._pool:
                raise RuntimeError("Database pool not initialized")
            async with self._pool.acquire() as connection:
                await connection.fetchval("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Health check falhou: {e}")
            return False


# Instância global do gerenciador
_db_manager: Optional[DatabaseManager] = None


def get_database_manager() -> DatabaseManager:
    """Obtém instância do gerenciador de banco de dados."""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency para obter sessão de banco de dados."""
    db_manager = get_database_manager()
    async with db_manager.get_session() as session:
        yield session


async def get_db_connection():
    """Dependency para obter conexão asyncpg."""
    db_manager = get_database_manager()
    connection = await db_manager.get_connection()
    try:
        yield connection
    finally:
        await db_manager.release_connection(connection)
