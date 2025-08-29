/**
 * Comprehensive tests for WebSocketService
 * Tests reconnection logic, message handling, heartbeat, queue management
 */

// Mock import.meta globally before importing modules
(global as any).import = {
  meta: {
    env: {
      PROD: false,
      DEV: true,
      VITE_API_URL: 'http://localhost:8001',
      VITE_WS_URL: 'ws://localhost:8001'
    }
  }
};

// Mock config/api
jest.mock('../../config/api', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8001',
    WS_URL: 'ws://localhost:8001',
    ENDPOINTS: {
      ORDERS: '/api/v1/orders',
      KDS: '/api/v1/kds'
    }
  }
}));

import { WebSocketService, WebSocketStatus, WebSocketMessage } from '../../services/websocket';
import { API_CONFIG } from '../../config/api';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
  }
  
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  });
  
  // Helper methods for testing
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
  
  triggerMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
  
  triggerError(error?: any) {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
  
  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Create fresh service instance
    service = new WebSocketService();
    
    // Capture WebSocket instance when created
    const originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = jest.fn((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    });
    (global as any).WebSocket.CONNECTING = MockWebSocket.CONNECTING;
    (global as any).WebSocket.OPEN = MockWebSocket.OPEN;
    (global as any).WebSocket.CLOSING = MockWebSocket.CLOSING;
    (global as any).WebSocket.CLOSED = MockWebSocket.CLOSED;
  });

  afterEach(() => {
    jest.useRealTimers();
    service.disconnect();
  });

  describe('Connection Management', () => {
    it('should create WebSocket connection with correct URL', () => {
      service.connect();
      
      expect((global as any).WebSocket).toHaveBeenCalledWith(`${API_CONFIG.WS_URL}/kds`);
    });

    it('should not create duplicate connections', () => {
      service.connect();
      mockWebSocket.triggerOpen();
      
      const firstWs = mockWebSocket;
      service.connect();
      
      expect(mockWebSocket).toBe(firstWs);
    });

    it('should emit connected event when connection opens', () => {
      const connectedSpy = jest.fn();
      service.on('connected', connectedSpy);
      
      service.connect();
      mockWebSocket.triggerOpen();
      
      expect(connectedSpy).toHaveBeenCalled();
    });

    it('should emit disconnected event when connection closes', () => {
      const disconnectedSpy = jest.fn();
      service.on('disconnected', disconnectedSpy);
      
      service.connect();
      mockWebSocket.triggerOpen();
      mockWebSocket.triggerClose();
      
      expect(disconnectedSpy).toHaveBeenCalled();
    });

    it('should emit error event on WebSocket error', () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      service.connect();
      mockWebSocket.triggerError();
      
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should set status correctly during connection lifecycle', () => {
      expect(service.getStatus()).toBe('disconnected');
      
      service.connect();
      expect(service.getStatus()).toBe('connecting');
      
      mockWebSocket.triggerOpen();
      expect(service.getStatus()).toBe('connected');
      
      mockWebSocket.triggerClose();
      expect(service.getStatus()).toBe('disconnected');
    });

    it('should handle intentional disconnection', () => {
      const reconnectingSpy = jest.fn();
      service.on('reconnecting', reconnectingSpy);
      
      service.connect();
      mockWebSocket.triggerOpen();
      service.disconnect();
      
      // Should not attempt reconnection
      jest.advanceTimersByTime(10000);
      expect(reconnectingSpy).not.toHaveBeenCalled();
    });

    it('should clear message queue on disconnect', () => {
      service.connect();
      
      // Queue some messages while disconnected
      service.send({ type: 'test', data: null, timestamp: Date.now() });
      expect(service.getQueueSize()).toBe(1);
      
      service.disconnect();
      expect(service.getQueueSize()).toBe(0);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection after unintentional disconnect', () => {
      const reconnectingSpy = jest.fn();
      service.on('reconnecting', reconnectingSpy);
      
      service.connect();
      mockWebSocket.triggerOpen();
      mockWebSocket.triggerClose();
      
      jest.advanceTimersByTime(3000);
      
      expect(reconnectingSpy).toHaveBeenCalledWith({
        attempt: 1,
        maxAttempts: 10,
        delay: 3000
      });
    });

    it('should use exponential backoff for reconnection', () => {
      const reconnectingSpy = jest.fn();
      service.on('reconnecting', reconnectingSpy);
      
      service.connect();
      
      // Simulate multiple failed connection attempts
      for (let i = 1; i <= 3; i++) {
        mockWebSocket.triggerClose();
        jest.advanceTimersByTime(30000); // Advance past max delay
        
        if (i < 3) {
          // Reset for next attempt
          service.connect();
        }
      }
      
      // Check delays increase with backoff factor
      expect(reconnectingSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({ delay: 3000 }));
      expect(reconnectingSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ delay: 4500 }));
      expect(reconnectingSpy).toHaveBeenNthCalledWith(3, expect.objectContaining({ delay: 6750 }));
    });

    it('should cap reconnection delay at maximum', () => {
      const reconnectingSpy = jest.fn();
      service.on('reconnecting', reconnectingSpy);
      
      // Set high reconnect attempts to test max delay
      (service as any).reconnectAttempts = 20;
      
      service.connect();
      mockWebSocket.triggerClose();
      
      jest.advanceTimersByTime(30000);
      
      expect(reconnectingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 30000 })
      );
    });

    it('should emit max_reconnect_attempts event after max attempts', () => {
      const maxAttemptsSpy = jest.fn();
      service.on('max_reconnect_attempts', maxAttemptsSpy);
      
      // Set to max attempts
      (service as any).reconnectAttempts = 10;
      
      service.connect();
      mockWebSocket.triggerClose();
      
      expect(maxAttemptsSpy).toHaveBeenCalled();
    });

    it('should reset reconnect attempts on successful connection', () => {
      service.connect();
      
      // Fail first attempt
      mockWebSocket.triggerClose();
      jest.advanceTimersByTime(3000);
      expect((service as any).reconnectAttempts).toBe(1);
      
      // Succeed second attempt
      service.connect();
      mockWebSocket.triggerOpen();
      expect((service as any).reconnectAttempts).toBe(0);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      service.connect();
      mockWebSocket.triggerOpen();
    });

    it('should emit order_update for order events', () => {
      const orderUpdateSpy = jest.fn();
      service.on('order_update', orderUpdateSpy);
      
      const orderData = { id: '123', status: 'preparing' };
      mockWebSocket.triggerMessage({
        type: 'order.created',
        data: orderData,
        timestamp: Date.now()
      });
      
      expect(orderUpdateSpy).toHaveBeenCalledWith(orderData);
    });

    it('should handle all order event types', () => {
      const orderUpdateSpy = jest.fn();
      service.on('order_update', orderUpdateSpy);
      
      const orderEvents = [
        'order.created',
        'order.updated',
        'order.status_changed',
        'order.item_status_changed',
        'order.cancelled'
      ];
      
      orderEvents.forEach(eventType => {
        mockWebSocket.triggerMessage({
          type: eventType,
          data: { id: '123' },
          timestamp: Date.now()
        });
      });
      
      expect(orderUpdateSpy).toHaveBeenCalledTimes(5);
    });

    it('should emit station_update for station events', () => {
      const stationUpdateSpy = jest.fn();
      service.on('station_update', stationUpdateSpy);
      
      const stationData = { station: 'Kitchen-1', status: 'active' };
      mockWebSocket.triggerMessage({
        type: 'station.updated',
        data: stationData,
        timestamp: Date.now()
      });
      
      expect(stationUpdateSpy).toHaveBeenCalledWith(stationData);
    });

    it('should respond to ping with pong', () => {
      mockWebSocket.triggerMessage({
        type: 'ping',
        data: null,
        timestamp: Date.now()
      });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'pong',
          data: null,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle pong messages silently', () => {
      const messageSpy = jest.fn();
      service.on('message', messageSpy);
      
      mockWebSocket.triggerMessage({
        type: 'pong',
        data: null,
        timestamp: Date.now()
      });
      
      expect(messageSpy).not.toHaveBeenCalled();
    });

    it('should emit generic message for unknown types', () => {
      const messageSpy = jest.fn();
      service.on('message', messageSpy);
      
      const unknownMessage = {
        type: 'custom.event',
        data: { custom: 'data' },
        timestamp: Date.now()
      };
      
      mockWebSocket.triggerMessage(unknownMessage);
      
      expect(messageSpy).toHaveBeenCalledWith(unknownMessage);
    });

    it('should handle malformed messages gracefully', () => {
      const errorSpy = jest.fn();
      service.on('error', errorSpy);
      
      // Trigger message with invalid JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
      
      // Should not throw or emit error
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Sending Messages', () => {
    it('should send messages when connected', () => {
      service.connect();
      mockWebSocket.triggerOpen();
      
      const message: WebSocketMessage = {
        type: 'test',
        data: { test: 'data' },
        timestamp: Date.now()
      };
      
      const result = service.send(message);
      
      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should queue messages when disconnected', () => {
      const message: WebSocketMessage = {
        type: 'test',
        data: { test: 'data' },
        timestamp: Date.now()
      };
      
      const result = service.send(message);
      
      expect(result).toBe(false);
      expect(service.getQueueSize()).toBe(1);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should flush message queue when connection opens', () => {
      // Queue messages while disconnected
      const messages = [
        { type: 'test1', data: null, timestamp: Date.now() },
        { type: 'test2', data: null, timestamp: Date.now() },
        { type: 'test3', data: null, timestamp: Date.now() }
      ];
      
      messages.forEach(msg => service.send(msg));
      expect(service.getQueueSize()).toBe(3);
      
      // Connect and verify queue is flushed
      service.connect();
      mockWebSocket.triggerOpen();
      
      expect(service.getQueueSize()).toBe(0);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(3);
    });

    it('should handle send errors gracefully', () => {
      service.connect();
      mockWebSocket.triggerOpen();
      
      // Make send throw an error
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      const message: WebSocketMessage = {
        type: 'test',
        data: null,
        timestamp: Date.now()
      };
      
      const result = service.send(message);
      
      expect(result).toBe(false);
      expect(service.getQueueSize()).toBe(1);
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should start heartbeat when connected', () => {
      service.connect();
      mockWebSocket.triggerOpen();
      
      // Advance time to trigger heartbeat
      jest.advanceTimersByTime(30000);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'ping',
          data: null,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should send heartbeat at configured interval', () => {
      const customService = new WebSocketService({
        heartbeatInterval: 10000
      });
      
      customService.connect();
      
      // Capture the new WebSocket
      const customWs = mockWebSocket;
      customWs.triggerOpen();
      
      jest.advanceTimersByTime(10000);
      expect(customWs.send).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(10000);
      expect(customWs.send).toHaveBeenCalledTimes(2);
      
      customService.disconnect();
    });

    it('should stop heartbeat when disconnected', () => {
      service.connect();
      mockWebSocket.triggerOpen();
      
      // Verify heartbeat is running
      jest.advanceTimersByTime(30000);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
      
      // Disconnect
      mockWebSocket.triggerClose();
      
      // Advance time and verify no more heartbeats
      jest.advanceTimersByTime(30000);
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    });

    it('should not send heartbeat when not connected', () => {
      service.connect();
      mockWebSocket.triggerOpen();
      
      // Manually set readyState to simulate connection issue
      mockWebSocket.readyState = MockWebSocket.CLOSED;
      
      jest.advanceTimersByTime(30000);
      
      // Should check isConnected before sending
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Status Management', () => {
    it('should track status changes correctly', () => {
      const statusChangeSpy = jest.fn();
      service.on('status_changed', statusChangeSpy);
      
      service.connect();
      expect(statusChangeSpy).toHaveBeenCalledWith('connecting');
      
      mockWebSocket.triggerOpen();
      expect(statusChangeSpy).toHaveBeenCalledWith('connected');
      
      mockWebSocket.triggerClose();
      expect(statusChangeSpy).toHaveBeenCalledWith('disconnected');
    });

    it('should not emit duplicate status changes', () => {
      const statusChangeSpy = jest.fn();
      service.on('status_changed', statusChangeSpy);
      
      service.connect();
      service.connect(); // Try to connect again
      
      expect(statusChangeSpy).toHaveBeenCalledTimes(1);
      expect(statusChangeSpy).toHaveBeenCalledWith('connecting');
    });

    it('should return correct connection status', () => {
      expect(service.isConnected()).toBe(false);
      
      service.connect();
      expect(service.isConnected()).toBe(false);
      
      mockWebSocket.triggerOpen();
      expect(service.isConnected()).toBe(true);
      
      mockWebSocket.triggerClose();
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Event Emitter', () => {
    it('should handle multiple listeners for same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.on('connected', listener1);
      service.on('connected', listener2);
      
      service.connect();
      mockWebSocket.triggerOpen();
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove specific listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.on('connected', listener1);
      service.on('connected', listener2);
      service.off('connected', listener1);
      
      service.connect();
      mockWebSocket.triggerOpen();
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove all listeners for an event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.on('connected', listener1);
      service.on('connected', listener2);
      service.removeAllListeners('connected');
      
      service.connect();
      mockWebSocket.triggerOpen();
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events', () => {
      const connectedSpy = jest.fn();
      const disconnectedSpy = jest.fn();
      
      service.on('connected', connectedSpy);
      service.on('disconnected', disconnectedSpy);
      service.removeAllListeners();
      
      service.connect();
      mockWebSocket.triggerOpen();
      mockWebSocket.triggerClose();
      
      expect(connectedSpy).not.toHaveBeenCalled();
      expect(disconnectedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom URL when provided', () => {
      const customService = new WebSocketService({
        url: 'ws://custom.server:8080/ws'
      });
      
      customService.connect();
      
      expect((global as any).WebSocket).toHaveBeenCalledWith('ws://custom.server:8080/ws');
      
      customService.disconnect();
    });

    it('should use custom reconnect delay', () => {
      const reconnectingSpy = jest.fn();
      const customService = new WebSocketService({
        reconnectDelay: 5000
      });
      
      customService.on('reconnecting', reconnectingSpy);
      customService.connect();
      mockWebSocket.triggerClose();
      
      jest.advanceTimersByTime(5000);
      
      expect(reconnectingSpy).toHaveBeenCalledWith(
        expect.objectContaining({ delay: 5000 })
      );
      
      customService.disconnect();
    });

    it('should use custom max reconnect attempts', () => {
      const maxAttemptsSpy = jest.fn();
      const customService = new WebSocketService({
        maxReconnectAttempts: 3
      });
      
      customService.on('max_reconnect_attempts', maxAttemptsSpy);
      (customService as any).reconnectAttempts = 3;
      
      customService.connect();
      mockWebSocket.triggerClose();
      
      expect(maxAttemptsSpy).toHaveBeenCalled();
      
      customService.disconnect();
    });
  });

  describe('Queue Management', () => {
    it('should clear queue on demand', () => {
      // Add messages to queue
      service.send({ type: 'test1', data: null, timestamp: Date.now() });
      service.send({ type: 'test2', data: null, timestamp: Date.now() });
      
      expect(service.getQueueSize()).toBe(2);
      
      service.clearQueue();
      
      expect(service.getQueueSize()).toBe(0);
    });

    it('should maintain message order in queue', () => {
      const messages = [
        { type: 'first', data: { order: 1 }, timestamp: Date.now() },
        { type: 'second', data: { order: 2 }, timestamp: Date.now() },
        { type: 'third', data: { order: 3 }, timestamp: Date.now() }
      ];
      
      messages.forEach(msg => service.send(msg));
      
      service.connect();
      mockWebSocket.triggerOpen();
      
      // Verify messages sent in correct order
      expect(mockWebSocket.send).toHaveBeenNthCalledWith(1, JSON.stringify(messages[0]));
      expect(mockWebSocket.send).toHaveBeenNthCalledWith(2, JSON.stringify(messages[1]));
      expect(mockWebSocket.send).toHaveBeenNthCalledWith(3, JSON.stringify(messages[2]));
    });
  });
});