import { EventMessage } from '../types';

/**
 * Event Bus service for handling real-time communication
 */
export class EventBusService {
  private static instance: EventBusService;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connected = false;
  private connecting = false;
  private queue: EventMessage[] = [];

  /**
   * Get the EventBusService singleton instance
   */
  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Connect to the event bus
   * @param url - WebSocket URL
   * @returns Promise that resolves when connected
   */
  connect(url: string): Promise<void> {
    if (this.connected) {
      return Promise.resolve();
    }

    if (this.connecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.connected) {
            clearInterval(checkConnection);
            resolve();
          } else if (!this.connecting) {
            clearInterval(checkConnection);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          console.log('Connected to event bus');
          
          // Send any queued messages
          this.flushQueue();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: EventMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing event message:', error);
          }
        };

        this.socket.onclose = () => {
          this.connected = false;
          this.connecting = false;
          console.log('Disconnected from event bus');
          
          // Attempt to reconnect
          this.attemptReconnect(url);
        };

        this.socket.onerror = (error) => {
          console.error('Event bus error:', error);
          if (!this.connected) {
            this.connecting = false;
            reject(error);
          }
        };
      } catch (error) {
        this.connecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the event bus
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      this.connecting = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Subscribe to an event type
   * @param eventType - Type of event to subscribe to
   * @param callback - Function to call when event is received
   * @returns Unsubscribe function
   */
  subscribe<T = any>(eventType: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const eventListeners = this.listeners.get(eventType)!;
    eventListeners.add(callback as any);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback as any);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Publish an event to the event bus
   * @param eventType - Type of event to publish
   * @param payload - Event payload
   * @returns Promise that resolves when event is sent
   */
  publish<T = any>(eventType: string, payload: T): Promise<void> {
    const message: EventMessage = {
      id: this.generateId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      payload,
      source: 'frontend'
    };
    
    if (!this.connected) {
      // Queue the message for later
      this.queue.push(message);
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.queue.push(message);
        resolve();
        return;
      }
      
      try {
        this.socket.send(JSON.stringify(message));
        resolve();
      } catch (error) {
        console.error('Error publishing event:', error);
        // Queue the message for later
        this.queue.push(message);
        reject(error);
      }
    });
  }

  /**
   * Handle an incoming event message
   * @param message - Event message
   */
  private handleMessage(message: EventMessage): void {
    const { type, payload } = message;
    
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect to the event bus
   * @param url - WebSocket URL
   */
  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(url).catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * Send any queued messages
   */
  private flushQueue(): void {
    if (this.queue.length === 0 || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    console.log(`Sending ${this.queue.length} queued messages`);
    
    while (this.queue.length > 0) {
      const message = this.queue.shift();
      if (message) {
        try {
          this.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending queued message:', error);
          // Put the message back in the queue
          this.queue.unshift(message);
          break;
        }
      }
    }
  }

  /**
   * Generate a unique ID for an event
   * @returns Unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}
