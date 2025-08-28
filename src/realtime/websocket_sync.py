"""
WebSocket Synchronization Module
Sincroniza dados entre múltiplos terminais POS em tempo real
"""

import json
import logging
from datetime import datetime
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
from src.audit.audit_logger import audit_logger

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])


class ConnectionManager:
    """Gerencia conexões WebSocket de múltiplos terminais"""

    def __init__(self):
        # Armazena conexões ativas por terminal_id
        self.active_connections: Dict[str, WebSocket] = {}
        # Rastreia qual usuário está em qual terminal
        self.terminal_users: Dict[str, str] = {}
        # Fila de mensagens para terminais offline
        self.offline_queue: Dict[str, list] = {}

    async def connect(self, websocket: WebSocket, terminal_id: str, user_id: str):
        """Aceita nova conexão WebSocket"""
        await websocket.accept()

        # Se terminal já estava conectado, desconectar anterior
        if terminal_id in self.active_connections:
            old_ws = self.active_connections[terminal_id]
            try:
                await old_ws.close()
            except:
                pass

        self.active_connections[terminal_id] = websocket
        self.terminal_users[terminal_id] = user_id

        # Enviar mensagens enfileiradas se houver
        if terminal_id in self.offline_queue:
            messages = self.offline_queue.pop(terminal_id, [])
            for msg in messages:
                try:
                    await websocket.send_text(json.dumps(msg))
                except:
                    pass

        logger.info(f"Terminal {terminal_id} connected (user: {user_id})")

        # Notificar outros terminais
        await self.broadcast_except(
            {
                "type": "TERMINAL_CONNECTED",
                "terminal_id": terminal_id,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            terminal_id
        )

    def disconnect(self, terminal_id: str):
        """Remove conexão WebSocket"""
        if terminal_id in self.active_connections:
            del self.active_connections[terminal_id]

        if terminal_id in self.terminal_users:
            user_id = self.terminal_users.pop(terminal_id)
            logger.info(f"Terminal {terminal_id} disconnected (user: {user_id})")

    async def send_to_terminal(self, terminal_id: str, message: dict):
        """Envia mensagem para terminal específico"""
        if terminal_id in self.active_connections:
            websocket = self.active_connections[terminal_id]
            try:
                await websocket.send_text(json.dumps(message))
                return True
            except:
                # Se falhar, remover conexão
                self.disconnect(terminal_id)
                return False
        else:
            # Adicionar à fila offline
            if terminal_id not in self.offline_queue:
                self.offline_queue[terminal_id] = []
            self.offline_queue[terminal_id].append(message)
            return False

    async def broadcast(self, message: dict):
        """Envia mensagem para todos os terminais conectados"""
        disconnected = []

        for terminal_id in list(self.active_connections.keys()):
            success = await self.send_to_terminal(terminal_id, message)
            if not success:
                disconnected.append(terminal_id)

        # Limpar conexões que falharam
        for terminal_id in disconnected:
            self.disconnect(terminal_id)

    async def broadcast_except(self, message: dict, exclude_terminal: str):
        """Envia mensagem para todos exceto terminal específico"""
        disconnected = []

        for terminal_id in list(self.active_connections.keys()):
            if terminal_id != exclude_terminal:
                success = await self.send_to_terminal(terminal_id, message)
                if not success:
                    disconnected.append(terminal_id)

        # Limpar conexões que falharam
        for terminal_id in disconnected:
            self.disconnect(terminal_id)

    def get_connected_terminals(self) -> Dict[str, str]:
        """Retorna lista de terminais conectados com seus usuários"""
        return {
            terminal_id: self.terminal_users.get(terminal_id, "unknown")
            for terminal_id in self.active_connections.keys()
        }


# Instância global do gerenciador
manager = ConnectionManager()


@router.websocket("/sync")
async def websocket_sync(websocket: WebSocket):
    """
    Endpoint WebSocket para sincronização entre terminais
    
    Protocolo:
    1. Cliente conecta e envia identificação: {"terminal_id": "xxx", "user_id": "yyy"}
    2. Servidor confirma: {"type": "CONNECTED", "terminal_id": "xxx"}
    3. Cliente envia atualizações: {"type": "UPDATE", "entity": "order", ...}
    4. Servidor propaga para outros terminais
    """
    terminal_id = None

    try:
        # Aguardar identificação inicial
        await websocket.accept()

        # Primeira mensagem deve ser identificação
        data = await websocket.receive_text()
        init_msg = json.loads(data)

        terminal_id = init_msg.get("terminal_id")
        user_id = init_msg.get("user_id", "unknown")

        if not terminal_id:
            await websocket.close(code=4000, reason="Terminal ID required")
            return

        # Conectar terminal
        await manager.connect(websocket, terminal_id, user_id)

        # Enviar confirmação
        await websocket.send_text(json.dumps({
            "type": "CONNECTED",
            "terminal_id": terminal_id,
            "timestamp": datetime.utcnow().isoformat()
        }))

        # Loop principal de mensagens
        while True:
            # Receber mensagem
            data = await websocket.receive_text()
            message = json.loads(data)

            # Adicionar metadata
            message["from_terminal"] = terminal_id
            message["from_user"] = user_id
            message["server_timestamp"] = datetime.utcnow().isoformat()

            # Validar tipo de mensagem
            msg_type = message.get("type")

            if msg_type in ["UPDATE", "CREATE", "DELETE", "INVALIDATE_CACHE"]:
                # Propagar para outros terminais
                await manager.broadcast_except(message, terminal_id)

                # Log para auditoria
                entity = message.get("entity", "unknown")
                entity_id = message.get("entity_id")
                logger.debug(f"Sync {msg_type} for {entity} from {terminal_id}")

                # Registrar no audit log
                connected_terminals = list(manager.active_connections.keys())
                connected_terminals.remove(terminal_id)  # Remover o remetente

                await audit_logger.log_sync_event(
                    action=msg_type,
                    entity_type=entity,
                    entity_id=entity_id or "unknown",
                    from_terminal=terminal_id,
                    to_terminals=connected_terminals,
                    user_id=user_id,
                    success=True
                )

            elif msg_type == "PING":
                # Responder com PONG
                await websocket.send_text(json.dumps({
                    "type": "PONG",
                    "timestamp": datetime.utcnow().isoformat()
                }))

            else:
                logger.warning(f"Unknown message type: {msg_type} from {terminal_id}")

    except WebSocketDisconnect:
        if terminal_id:
            manager.disconnect(terminal_id)

            # Notificar outros terminais
            await manager.broadcast_except(
                {
                    "type": "TERMINAL_DISCONNECTED",
                    "terminal_id": terminal_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                terminal_id
            )

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from {terminal_id}: {e}")
        await websocket.close(code=4001, reason="Invalid JSON")

    except Exception as e:
        logger.error(f"WebSocket error for {terminal_id}: {e}")
        if terminal_id:
            manager.disconnect(terminal_id)


@router.get("/sync/status")
async def get_sync_status():
    """Retorna status do sistema de sincronização"""
    return {
        "connected_terminals": manager.get_connected_terminals(),
        "total_connections": len(manager.active_connections),
        "queued_messages": {
            terminal: len(messages)
            for terminal, messages in manager.offline_queue.items()
        }
    }


# Funções auxiliares para integração com outros módulos

async def notify_data_change(
    entity: str,
    entity_id: str,
    action: str,
    data: Optional[Dict] = None,
    user_id: Optional[str] = None
):
    """
    Notifica mudança de dados para todos os terminais
    
    Args:
        entity: Tipo de entidade (order, table, etc)
        entity_id: ID da entidade
        action: Ação realizada (create, update, delete)
        data: Dados da entidade (opcional)
        user_id: ID do usuário que fez a mudança
    """
    message = {
        "type": action.upper(),
        "entity": entity,
        "entity_id": entity_id,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id or "system"
    }

    await manager.broadcast(message)


async def invalidate_cache(entity: str, entity_id: Optional[str] = None):
    """
    Invalida cache em todos os terminais
    
    Args:
        entity: Tipo de entidade para invalidar
        entity_id: ID específico ou None para invalidar todos
    """
    message = {
        "type": "INVALIDATE_CACHE",
        "entity": entity,
        "entity_id": entity_id,
        "timestamp": datetime.utcnow().isoformat()
    }

    await manager.broadcast(message)
