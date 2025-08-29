/**
 * Mock WebSocket implementation for testing
 */

export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export class MockWebSocket {
  static CONNECTING = WebSocketState.CONNECTING;
  static OPEN = WebSocketState.OPEN;
  static CLOSING = WebSocketState.CLOSING;
  static CLOSED = WebSocketState.CLOSED;

  url: string;
  readyState: WebSocketState;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  private messageQueue: string[] = [];
  private closeCode?: number;
  private closeReason?: string;

  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocketState.CONNECTING;
    
    // Simulate connection opening
    setTimeout(() => {
      this.simulateOpen();
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== WebSocketState.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = WebSocketState.CLOSING;
    
    setTimeout(() => {
      this.readyState = WebSocketState.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', {
          code: code || 1000,
          reason: reason || '',
          wasClean: true
        }));
      }
    }, 0);
  }

  // Test helper methods
  simulateOpen(): void {
    this.readyState = WebSocketState.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: any): void {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data)
      });
      this.onmessage(event);
    }
  }

  simulateError(error?: any): void {
    if (this.onerror) {
      const event = new Event('error');
      Object.defineProperty(event, 'error', { value: error });
      this.onerror(event);
    }
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = WebSocketState.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', {
        code,
        reason,
        wasClean: code === 1000
      }));
    }
  }

  getMessageQueue(): string[] {
    return [...this.messageQueue];
  }

  clearMessageQueue(): void {
    this.messageQueue = [];
  }
}

// Helper to setup WebSocket mock in tests
export function setupWebSocketMock(): {
  MockWebSocket: typeof MockWebSocket;
  instances: MockWebSocket[];
  cleanup: () => void;
} {
  const instances: MockWebSocket[] = [];
  
  // Override global WebSocket
  const OriginalWebSocket = global.WebSocket;
  
  class TrackedMockWebSocket extends MockWebSocket {
    constructor(url: string) {
      super(url);
      instances.push(this);
    }
  }
  
  (global as any).WebSocket = TrackedMockWebSocket;
  
  return {
    MockWebSocket: TrackedMockWebSocket,
    instances,
    cleanup: () => {
      (global as any).WebSocket = OriginalWebSocket;
      instances.length = 0;
    }
  };
}