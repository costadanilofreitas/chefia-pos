export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface WebSocketConfig {
  url?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// Simple EventEmitter implementation for browser
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
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
      reconnectDelay: config.reconnectDelay || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    };
  }

  private getWebSocketUrl(): string {
    const apiUrl = process.env['VITE_API_URL'] || 'http://localhost:8001';
    return apiUrl.replace(/^http/, 'ws') + '/ws/kds';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      // Log error silently - no console usage
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
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        // Silent error - invalid message format
      }
    };

    this.ws.onerror = (error) => {
      // WebSocket error occurred
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      this.stopHeartbeat();
      this.emit('disconnected');
      
      if (!this.isIntentionallyClosed) {
        this.handleReconnect();
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // Handle different message types
    switch (message.type) {
      case 'order.created':
      case 'order.updated':
      case 'order.status_changed':
      case 'order.item_status_changed':
      case 'order.cancelled':
        this.emit('order_update', message.data);
        break;
      
      case 'station.updated':
        this.emit('station_update', message.data);
        break;
      
      case 'ping':
        this.send({ type: 'pong', data: null, timestamp: Date.now() });
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
      this.emit('max_reconnect_attempts');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

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
        this.send({ type: 'ping', data: null, timestamp: Date.now() });
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
      // Queue message for later delivery
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      // Failed to send - will be queued
      this.messageQueue.push(message);
      return false;
    }
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
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Export class for testing
export { WebSocketService };