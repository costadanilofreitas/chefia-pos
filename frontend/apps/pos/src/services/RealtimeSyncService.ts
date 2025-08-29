/**
 * Realtime Synchronization Service
 * Sincroniza dados entre múltiplos terminais POS em tempo real
 * 
 * IMPORTANTE: Este serviço garante que todos os terminais
 * recebam atualizações instantâneas de mudanças críticas
 */

import eventBus from '../utils/EventBus';
import { requestCache } from './RequestCache';
import { isDev, isTest } from '../utils/env';

interface SyncMessage {
  type: 'UPDATE' | 'DELETE' | 'CREATE' | 'INVALIDATE_CACHE';
  entity: string;
  entityId?: string;
  data?: any;
  timestamp: number;
  terminalId: string;
  userId: string;
}

interface ConflictResolution {
  strategy: 'LAST_WRITE_WINS' | 'MERGE' | 'MANUAL';
  resolver?: (local: any, remote: any) => any;
}

class RealtimeSyncService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly terminalId = this.generateTerminalId();
  private readonly reconnectDelay = 3000;
  private isConnected = false;
  private messageQueue: SyncMessage[] = [];
  
  // Configuração de conflitos por entidade
  private readonly conflictStrategies: Record<string, ConflictResolution> = {
    'order': { strategy: 'LAST_WRITE_WINS' },
    'table': { strategy: 'LAST_WRITE_WINS' },
    'cashier': { strategy: 'MANUAL' }, // Caixa requer resolução manual
    'inventory': { strategy: 'MERGE' }, // Inventário pode ser mesclado
  };

  constructor() {
    this.connect();
    this.setupEventListeners();
    
    // Reconectar se perder conexão
    window.addEventListener('online', () => this.connect());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Conecta ao servidor WebSocket
   */
  private connect() {
    try {
      // Usar mesma porta do backend mas endpoint diferente
      const wsUrl = isDev 
        ? 'ws://localhost:8001/ws/sync'
        : `ws://${window.location.hostname}:8001/ws/sync`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.info('[RealtimeSync] Connected to sync server');
        this.isConnected = true;
        this.flushMessageQueue();
        eventBus.emit('sync:connected');
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onerror = (error) => {
        console.error('[RealtimeSync] WebSocket error:', error);
        eventBus.emit('sync:error', error);
      };
      
      this.ws.onclose = () => {
        console.warn('[RealtimeSync] Disconnected from sync server');
        this.isConnected = false;
        eventBus.emit('sync:disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[RealtimeSync] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Agenda reconexão automática
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      console.info('[RealtimeSync] Attempting to reconnect...');
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Processa mensagem recebida do servidor
   */
  private handleMessage(data: string) {
    try {
      const message: SyncMessage = JSON.parse(data);
      
      // Ignorar mensagens do próprio terminal
      if (message.terminalId === this.terminalId) {
        return;
      }
      
      // Aplicar atualização baseado no tipo
      switch (message.type) {
        case 'UPDATE':
        case 'CREATE':
          this.handleDataUpdate(message);
          break;
          
        case 'DELETE':
          this.handleDataDelete(message);
          break;
          
        case 'INVALIDATE_CACHE':
          this.handleCacheInvalidation(message);
          break;
      }
      
      // Emitir evento local para componentes interessados
      eventBus.emit(`sync:${message.entity}:${message.type.toLowerCase()}`, message.data);
      
    } catch (error) {
      console.error('[RealtimeSync] Failed to process message:', error);
    }
  }

  /**
   * Processa atualização de dados
   */
  private handleDataUpdate(message: SyncMessage) {
    // Invalidar cache relacionado
    requestCache.invalidatePattern(message.entity);
    
    // Se houver conflito, resolver
    const strategy = this.conflictStrategies[message.entity];
    if (strategy && strategy.strategy === 'MANUAL') {
      // Emitir evento de conflito para resolução manual
      eventBus.emit('sync:conflict', {
        entity: message.entity,
        remote: message.data,
        timestamp: message.timestamp
      });
    }
    
    // Log para auditoria
    if (isDev) {
      console.debug(`[RealtimeSync] ${message.entity} updated by terminal ${message.terminalId}`);
    }
  }

  /**
   * Processa exclusão de dados
   */
  private handleDataDelete(message: SyncMessage) {
    requestCache.invalidatePattern(message.entity);
    
    if (isDev) {
      console.debug(`[RealtimeSync] ${message.entity} deleted by terminal ${message.terminalId}`);
    }
  }

  /**
   * Processa invalidação de cache
   */
  private handleCacheInvalidation(message: SyncMessage) {
    if (message.entityId) {
      requestCache.invalidate(`${message.entity}-${message.entityId}`);
    } else {
      requestCache.invalidatePattern(message.entity);
    }
  }

  /**
   * Envia mensagem de sincronização para outros terminais
   */
  broadcast(type: SyncMessage['type'], entity: string, data?: any, entityId?: string) {
    const message: SyncMessage = {
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      terminalId: this.terminalId,
      userId: this.getCurrentUserId()
    };
    
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Adicionar à fila para enviar quando reconectar
      this.messageQueue.push(message);
    }
  }

  /**
   * Invalida cache em todos os terminais
   */
  invalidateCache(entity: string, entityId?: string) {
    this.broadcast('INVALIDATE_CACHE', entity, undefined, entityId);
  }

  /**
   * Notifica criação de entidade
   */
  notifyCreate(entity: string, data: any) {
    this.broadcast('CREATE', entity, data);
  }

  /**
   * Notifica atualização de entidade
   */
  notifyUpdate(entity: string, entityId: string, data: any) {
    this.broadcast('UPDATE', entity, data, entityId);
  }

  /**
   * Notifica exclusão de entidade
   */
  notifyDelete(entity: string, entityId: string) {
    this.broadcast('DELETE', entity, undefined, entityId);
  }

  /**
   * Configura listeners de eventos locais
   */
  private setupEventListeners() {
    // Escutar mudanças críticas e propagar
    const criticalEvents = [
      'order:created',
      'order:updated', 
      'order:cancelled',
      'table:status:changed',
      'cashier:opened',
      'cashier:closed',
      'payment:completed',
      'inventory:updated'
    ];
    
    criticalEvents.forEach(event => {
      eventBus.on(event, (data: any) => {
        const [entity, action] = event.split(':');
        
        switch (action) {
          case 'created':
            this.notifyCreate(entity, data);
            break;
          case 'updated':
          case 'changed':
            this.notifyUpdate(entity, data.id, data);
            break;
          case 'cancelled':
          case 'deleted':
            this.notifyDelete(entity, data.id);
            break;
          case 'opened':
          case 'closed':
          case 'completed':
            this.notifyUpdate(entity, data.id || 'current', data);
            break;
        }
      });
    });
  }

  /**
   * Envia mensagens da fila quando reconectar
   */
  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(msg => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      }
    });
    
    console.info(`[RealtimeSync] Flushed ${messages.length} queued messages`);
  }

  /**
   * Lida com modo offline
   */
  private handleOffline() {
    console.warn('[RealtimeSync] System is offline, queueing messages');
    eventBus.emit('sync:offline');
  }

  /**
   * Gera ID único para o terminal
   */
  private generateTerminalId(): string {
    const stored = localStorage.getItem('terminal_id');
    if (stored) return stored;
    
    const id = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('terminal_id', id);
    return id;
  }

  /**
   * Obtém ID do usuário atual
   */
  private getCurrentUserId(): string {
    // TODO: Integrar com sistema de autenticação
    return localStorage.getItem('user_id') || 'unknown';
  }

  /**
   * Estado da conexão
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Destrói o serviço
   */
  destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    eventBus.removeAllListeners();
  }
}

// Singleton instance
export const realtimeSync = new RealtimeSyncService();

// Auto-inicializar se não estiver em testes
if (!isTest) {
  // O serviço se auto-conecta no constructor
}

export default realtimeSync;