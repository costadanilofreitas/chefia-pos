from src.core.events.event_bus import EventHandler, Event, EventType, get_event_bus
from src.auth.models import User
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class AuthEventHandler(EventHandler):
    """Handler para eventos de autenticação."""

    async def handle(self, event: Event) -> None:
        """Processa eventos de autenticação."""
        if event.type == EventType.USER_LOGGED_IN:
            await self._handle_user_logged_in(event)
        elif event.type == EventType.USER_LOGGED_OUT:
            await self._handle_user_logged_out(event)
        elif event.type == EventType.USER_PERMISSION_CHANGED:
            await self._handle_user_permission_changed(event)

    async def _handle_user_logged_in(self, event: Event) -> None:
        """Processa evento de login de usuário."""
        user_data = event.data.get("user", {})
        username = user_data.get("username", "unknown")
        role = user_data.get("role", "unknown")
        logger.info(f"Usuário {username} com papel {role} fez login no sistema")

        # Aqui poderia ter lógica adicional, como:
        # - Registrar a sessão do usuário
        # - Verificar se é o primeiro login do dia
        # - Atualizar estatísticas de uso

    async def _handle_user_logged_out(self, event: Event) -> None:
        """Processa evento de logout de usuário."""
        user_data = event.data.get("user", {})
        username = user_data.get("username", "unknown")
        logger.info(f"Usuário {username} fez logout do sistema")

        # Aqui poderia ter lógica adicional, como:
        # - Encerrar a sessão do usuário
        # - Registrar o tempo de sessão

    async def _handle_user_permission_changed(self, event: Event) -> None:
        """Processa evento de alteração de permissões de usuário."""
        user_data = event.data.get("user", {})
        username = user_data.get("username", "unknown")
        permissions = event.data.get("permissions", [])
        logger.info(f"Permissões do usuário {username} foram alteradas: {permissions}")

        # Aqui poderia ter lógica adicional, como:
        # - Atualizar cache de permissões
        # - Notificar outros serviços sobre a mudança


class SystemEventHandler(EventHandler):
    """Handler para eventos de sistema."""

    async def handle(self, event: Event) -> None:
        """Processa eventos de sistema."""
        if event.type == EventType.SYSTEM_STARTED:
            await self._handle_system_started(event)
        elif event.type == EventType.SYSTEM_STOPPED:
            await self._handle_system_stopped(event)
        elif event.type == EventType.SYSTEM_ERROR:
            await self._handle_system_error(event)
        elif event.type == EventType.SYSTEM_CONFIG_CHANGED:
            await self._handle_system_config_changed(event)

    async def _handle_system_started(self, event: Event) -> None:
        """Processa evento de início do sistema."""
        logger.info("Sistema iniciado com sucesso")
        # Aqui poderia ter lógica adicional, como:
        # - Inicializar recursos
        # - Verificar atualizações
        # - Carregar configurações

    async def _handle_system_stopped(self, event: Event) -> None:
        """Processa evento de parada do sistema."""
        logger.info("Sistema parado")
        # Aqui poderia ter lógica adicional, como:
        # - Liberar recursos
        # - Salvar estado

    async def _handle_system_error(self, event: Event) -> None:
        """Processa evento de erro do sistema."""
        error_data = event.data.get("error", {})
        error_message = error_data.get("message", "Erro desconhecido")
        error_code = error_data.get("code", "UNKNOWN")
        logger.error(f"Erro do sistema: [{error_code}] {error_message}")

        # Aqui poderia ter lógica adicional, como:
        # - Enviar notificação para administradores
        # - Tentar recuperação automática
        # - Registrar em sistema de monitoramento

    async def _handle_system_config_changed(self, event: Event) -> None:
        """Processa evento de alteração de configuração do sistema."""
        config_data = event.data.get("config", {})
        logger.info(f"Configuração do sistema alterada: {config_data}")

        # Aqui poderia ter lógica adicional, como:
        # - Recarregar configurações
        # - Aplicar novas configurações
        # - Notificar componentes afetados


# Funções auxiliares para publicação de eventos de autenticação


async def publish_user_logged_in(user: User) -> None:
    """Publica evento de login de usuário."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.USER_LOGGED_IN,
        data={
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "permissions": user.permissions,
            },
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)


async def publish_user_logged_out(user: User) -> None:
    """Publica evento de logout de usuário."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.USER_LOGGED_OUT,
        data={
            "user": {"id": user.id, "username": user.username, "role": user.role},
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)


async def publish_user_permission_changed(
    user: User, old_permissions: list, new_permissions: list
) -> None:
    """Publica evento de alteração de permissões de usuário."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.USER_PERMISSION_CHANGED,
        data={
            "user": {"id": user.id, "username": user.username, "role": user.role},
            "permissions": {
                "old": old_permissions,
                "new": new_permissions,
                "added": [p for p in new_permissions if p not in old_permissions],
                "removed": [p for p in old_permissions if p not in new_permissions],
            },
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)


# Funções auxiliares para publicação de eventos de sistema


async def publish_system_started(version: str, config: Dict[str, Any] = None) -> None:
    """Publica evento de início do sistema."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.SYSTEM_STARTED,
        data={
            "version": version,
            "config": config or {},
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)


async def publish_system_stopped(reason: str = None) -> None:
    """Publica evento de parada do sistema."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.SYSTEM_STOPPED,
        data={
            "reason": reason or "Normal shutdown",
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)


async def publish_system_error(
    message: str, code: str = None, details: Dict[str, Any] = None
) -> None:
    """Publica evento de erro do sistema."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.SYSTEM_ERROR,
        data={
            "error": {
                "message": message,
                "code": code or "UNKNOWN",
                "details": details or {},
            },
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)


async def publish_system_config_changed(
    config: Dict[str, Any], changed_by: str = None
) -> None:
    """Publica evento de alteração de configuração do sistema."""
    event_bus = get_event_bus()
    event = Event(
        event_type=EventType.SYSTEM_CONFIG_CHANGED,
        data={
            "config": config,
            "changed_by": changed_by,
            "timestamp": Event.timestamp,
        },
    )
    await event_bus.publish(event)
