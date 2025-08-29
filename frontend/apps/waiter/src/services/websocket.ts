import { API_CONFIG } from '../config/api';
import type { WebSocketMessage, WebSocketMessageData } from '../types';
import { logger } from './logger';

// Timing constants
const DEFAULT_RECONNECT_DELAY = 3000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_BACKOFF_FACTOR = 1.5;

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface WebSocketConfig {
  url?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// Simple EventEmitter for browser
class EventEmitter {
  private events: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private status: WebSocketStatus = 'disconnected';
  private messageQueue: WebSocketMessage[] = [];
  private isIntentionallyClosed = false;

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectDelay: config.reconnectDelay || DEFAULT_RECONNECT_DELAY,
      maxReconnectAttempts: config.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: config.heartbeatInterval || DEFAULT_HEARTBEAT_INTERVAL
    };
  }

  private getWebSocketUrl(): string {
    return `${API_CONFIG.WS_URL}/waiter`;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setStatus('connecting');
    logger.info('Connecting to WebSocket', 'WebSocketService');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      logger.error('Failed to create WebSocket connection', error, 'WebSocketService');
      this.handleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.startHeartbeat();
      this.emit('connected');
      logger.info('WebSocket connected', 'WebSocketService');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', error, 'WebSocketService');
      }
    };

    this.ws.onerror = (error) => {
      logger.error('WebSocket error', error, 'WebSocketService');
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.stopHeartbeat();
      this.emit('disconnected');
      logger.info('WebSocket disconnected', 'WebSocketService');
      
      if (!this.isIntentionallyClosed) {
        this.handleReconnect();
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    logger.debug('WebSocket message received', 'WebSocketService', { type: message.type });
    
    // Handle different message types
    switch (message.type) {
      // Table events
      case 'table.status_changed':
      case 'table.assigned':
      case 'table.unassigned':
        this.emit('table_update', message.data);
        break;
      
      // Order events
      case 'order.created':
      case 'order.updated':
      case 'order.status_changed':
      case 'order.item_ready':
      case 'order.cancelled':
        this.emit('order_update', message.data);
        break;
      
      // Notification events
      case 'notification':
        this.emit('notification', message.data);
        break;
      
      // Kitchen events
      case 'kitchen.item_ready':
        this.emit('kitchen_update', message.data);
        break;
      
      // Heartbeat
      case 'ping':
        this.send({ type: 'pong', timestamp: Date.now() });
        break;
      
      case 'pong':
        // Heartbeat response received
        break;
      
      default:
        this.emit('message', message);
    }
  }

  private handleReconnect(): void {
    if (this.isIntentionallyClosed) return;
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', undefined, 'WebSocketService');
      this.emit('max_reconnect_attempts');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(RECONNECT_BACKOFF_FACTOR, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY
    );

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`, 'WebSocketService');

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  send(message: WebSocketMessage): boolean {
    if (!this.isConnected()) {
      this.queueMessage(message);
      return false;
    }

    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('Failed to send WebSocket message', error, 'WebSocketService');
      this.queueMessage(message);
      return false;
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    logger.debug('Message queued for sending', 'WebSocketService', { 
      queueSize: this.messageQueue.length 
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.setStatus('disconnected');
    this.messageQueue = [];
    logger.info('WebSocket disconnected intentionally', 'WebSocketService');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('status_changed', status);
    }
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  // Waiter-specific methods
  subscribeToTables(tableIds: number[]): void {
    this.send({
      type: 'subscribe.tables',
      data: { tableIds },
      timestamp: Date.now()
    });
  }

  unsubscribeFromTables(tableIds: number[]): void {
    this.send({
      type: 'unsubscribe.tables',
      data: { tableIds },
      timestamp: Date.now()
    });
  }

  notifyTableService(tableId: number, action: string): void {
    this.send({
      type: 'table.service',
      data: { tableId, action },
      timestamp: Date.now()
    });
  }

  requestAssistance(tableId: number, type: string): void {
    this.send({
      type: 'assistance.request',
      data: { tableId, type },
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Export class for testing
export { WebSocketService };