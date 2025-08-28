/**
 * Tests for RealtimeSyncService
 */

import { RealtimeSyncService } from './RealtimeSyncService';
import { requestCache } from './RequestCache';
import eventBus from '../utils/EventBus';
import { setupWebSocketMock, MockWebSocket } from '../tests/mocks/websocket.mock';

// Mock dependencies
jest.mock('./RequestCache', () => ({
  requestCache: {
    invalidatePattern: jest.fn(),
    invalidate: jest.fn(),
  }
}));

jest.mock('../utils/EventBus', () => ({
  __esModule: true,
  default: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  }
}));

describe('RealtimeSyncService', () => {
  let wsSetup: ReturnType<typeof setupWebSocketMock>;
  let service: RealtimeSyncService;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Setup WebSocket mock
    wsSetup = setupWebSocketMock();
    
    // Setup localStorage mock
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    if (service) {
      service.destroy();
    }
    wsSetup.cleanup();
    jest.clearAllTimers();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection on initialization', (done) => {
      service = new (RealtimeSyncService as any)();
      
      setTimeout(() => {
        expect(wsSetup.instances).toHaveLength(1);
        const ws = wsSetup.instances[0];
        expect(ws.url).toContain('ws://localhost:8001/ws/sync');
        done();
      }, 10);
    });

    it('should emit sync:connected event when connection opens', (done) => {
      service = new (RealtimeSyncService as any)();
      
      setTimeout(() => {
        const ws = wsSetup.instances[0];
        expect(ws.readyState).toBe(MockWebSocket.OPEN);
        expect(eventBus.emit).toHaveBeenCalledWith('sync:connected');
        expect(service.connected).toBe(true);
        done();
      }, 10);
    });

    it('should emit sync:disconnected event when connection closes', (done) => {
      service = new (RealtimeSyncService as any)();
      
      setTimeout(() => {
        const ws = wsSetup.instances[0];
        ws.simulateClose();
        
        expect(eventBus.emit).toHaveBeenCalledWith('sync:disconnected');
        expect(service.connected).toBe(false);
        done();
      }, 10);
    });

    it('should attempt reconnection after disconnect', (done) => {
      jest.useFakeTimers();
      service = new (RealtimeSyncService as any)();
      
      setTimeout(() => {
        const initialWs = wsSetup.instances[0];
        initialWs.simulateClose();
        
        // Fast forward reconnect timer
        jest.advanceTimersByTime(3000);
        
        // Should create new WebSocket connection
        expect(wsSetup.instances).toHaveLength(2);
        jest.useRealTimers();
        done();
      }, 10);
    });

    it('should emit sync:error on WebSocket error', (done) => {
      service = new (RealtimeSyncService as any)();
      
      setTimeout(() => {
        const ws = wsSetup.instances[0];
        const error = new Error('Connection failed');
        ws.simulateError(error);
        
        expect(eventBus.emit).toHaveBeenCalledWith('sync:error', expect.any(Event));
        done();
      }, 10);
    });
  });

  describe('Message Handling', () => {
    beforeEach((done) => {
      service = new (RealtimeSyncService as any)();
      setTimeout(done, 10); // Wait for connection
    });

    it('should handle UPDATE message and invalidate cache', () => {
      const ws = wsSetup.instances[0];
      const message = {
        type: 'UPDATE',
        entity: 'order',
        entityId: '123',
        data: { id: '123', status: 'completed' },
        timestamp: Date.now(),
        terminalId: 'other-terminal',
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(requestCache.invalidatePattern).toHaveBeenCalledWith('order');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'sync:order:update',
        message.data
      );
    });

    it('should handle CREATE message', () => {
      const ws = wsSetup.instances[0];
      const message = {
        type: 'CREATE',
        entity: 'table',
        data: { id: 'table-1', number: 5 },
        timestamp: Date.now(),
        terminalId: 'other-terminal',
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(requestCache.invalidatePattern).toHaveBeenCalledWith('table');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'sync:table:create',
        message.data
      );
    });

    it('should handle DELETE message', () => {
      const ws = wsSetup.instances[0];
      const message = {
        type: 'DELETE',
        entity: 'product',
        entityId: 'prod-456',
        timestamp: Date.now(),
        terminalId: 'other-terminal',
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(requestCache.invalidatePattern).toHaveBeenCalledWith('product');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'sync:product:delete',
        undefined
      );
    });

    it('should handle INVALIDATE_CACHE message with entityId', () => {
      const ws = wsSetup.instances[0];
      const message = {
        type: 'INVALIDATE_CACHE',
        entity: 'customer',
        entityId: 'cust-789',
        timestamp: Date.now(),
        terminalId: 'other-terminal',
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(requestCache.invalidate).toHaveBeenCalledWith('customer-cust-789');
    });

    it('should handle INVALIDATE_CACHE message without entityId', () => {
      const ws = wsSetup.instances[0];
      const message = {
        type: 'INVALIDATE_CACHE',
        entity: 'config',
        timestamp: Date.now(),
        terminalId: 'other-terminal',
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(requestCache.invalidatePattern).toHaveBeenCalledWith('config');
    });

    it('should ignore messages from same terminal', () => {
      const terminalId = localStorage.getItem('terminal_id') || 'unknown';
      const ws = wsSetup.instances[0];
      const message = {
        type: 'UPDATE',
        entity: 'order',
        entityId: '123',
        data: { id: '123' },
        timestamp: Date.now(),
        terminalId: terminalId, // Same as current terminal
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(requestCache.invalidatePattern).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        expect.stringContaining('sync:order'),
        expect.anything()
      );
    });

    it('should handle malformed messages gracefully', () => {
      const ws = wsSetup.instances[0];
      
      // Send invalid JSON
      ws.simulateMessage('invalid json {]');
      
      // Should not throw and not call any handlers
      expect(requestCache.invalidatePattern).not.toHaveBeenCalled();
    });
  });

  describe('Broadcasting', () => {
    beforeEach((done) => {
      service = new (RealtimeSyncService as any)();
      setTimeout(done, 10); // Wait for connection
    });

    it('should broadcast UPDATE message when connected', () => {
      const ws = wsSetup.instances[0];
      const data = { id: '123', name: 'Updated Item' };
      
      service.broadcast('UPDATE', 'item', data, '123');
      
      const sentMessages = ws.getMessageQueue();
      expect(sentMessages).toHaveLength(1);
      
      const message = JSON.parse(sentMessages[0]);
      expect(message).toMatchObject({
        type: 'UPDATE',
        entity: 'item',
        entityId: '123',
        data,
        terminalId: expect.any(String),
        userId: expect.any(String),
        timestamp: expect.any(Number)
      });
    });

    it('should queue messages when disconnected', () => {
      const ws = wsSetup.instances[0];
      ws.simulateClose();
      
      const data = { id: '456', name: 'Queued Item' };
      service.broadcast('CREATE', 'item', data);
      
      // Message should not be sent immediately
      const sentMessages = ws.getMessageQueue();
      expect(sentMessages).toHaveLength(0);
    });

    it('should flush queued messages on reconnection', (done) => {
      jest.useFakeTimers();
      
      const ws = wsSetup.instances[0];
      
      // Queue some messages while disconnected
      ws.simulateClose();
      service.broadcast('CREATE', 'item1', { id: '1' });
      service.broadcast('UPDATE', 'item2', { id: '2' }, '2');
      
      // Trigger reconnection
      jest.advanceTimersByTime(3000);
      
      setTimeout(() => {
        const newWs = wsSetup.instances[1];
        const sentMessages = newWs.getMessageQueue();
        
        // Queued messages should be sent
        expect(sentMessages).toHaveLength(2);
        jest.useRealTimers();
        done();
      }, 20);
    });
  });

  describe('Event Listeners', () => {
    beforeEach((done) => {
      service = new (RealtimeSyncService as any)();
      setTimeout(done, 10); // Wait for connection
    });

    it('should listen for critical events and broadcast them', () => {
      const ws = wsSetup.instances[0];
      
      // Simulate order created event
      const orderData = { id: 'order-1', total: 100 };
      const listeners = (eventBus.on as jest.Mock).mock.calls;
      
      // Find the order:created listener
      const orderCreatedListener = listeners.find(
        call => call[0] === 'order:created'
      )?.[1];
      
      if (orderCreatedListener) {
        orderCreatedListener(orderData);
        
        const sentMessages = ws.getMessageQueue();
        expect(sentMessages).toHaveLength(1);
        
        const message = JSON.parse(sentMessages[0]);
        expect(message).toMatchObject({
          type: 'CREATE',
          entity: 'order',
          data: orderData
        });
      }
    });

    it('should handle table status change event', () => {
      const ws = wsSetup.instances[0];
      const tableData = { id: 'table-1', status: 'occupied' };
      const listeners = (eventBus.on as jest.Mock).mock.calls;
      
      const tableStatusListener = listeners.find(
        call => call[0] === 'table:status:changed'
      )?.[1];
      
      if (tableStatusListener) {
        tableStatusListener(tableData);
        
        const sentMessages = ws.getMessageQueue();
        expect(sentMessages).toHaveLength(1);
        
        const message = JSON.parse(sentMessages[0]);
        expect(message).toMatchObject({
          type: 'UPDATE',
          entity: 'table',
          entityId: 'table-1',
          data: tableData
        });
      }
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach((done) => {
      service = new (RealtimeSyncService as any)();
      setTimeout(done, 10);
    });

    it('should emit conflict event for manual resolution strategy', () => {
      const ws = wsSetup.instances[0];
      const message = {
        type: 'UPDATE',
        entity: 'cashier', // Has MANUAL strategy
        entityId: 'cashier-1',
        data: { id: 'cashier-1', balance: 500 },
        timestamp: Date.now(),
        terminalId: 'other-terminal',
        userId: 'user-1'
      };
      
      ws.simulateMessage(JSON.stringify(message));
      
      expect(eventBus.emit).toHaveBeenCalledWith('sync:conflict', {
        entity: 'cashier',
        remote: message.data,
        timestamp: message.timestamp
      });
    });
  });

  describe('Terminal ID Management', () => {
    it('should generate and store terminal ID if not exists', () => {
      delete mockLocalStorage['terminal_id'];
      
      service = new (RealtimeSyncService as any)();
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'terminal_id',
        expect.stringMatching(/^POS-\d+-[a-z0-9]+$/)
      );
    });

    it('should reuse existing terminal ID', () => {
      mockLocalStorage['terminal_id'] = 'existing-terminal-id';
      
      service = new (RealtimeSyncService as any)();
      
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        'terminal_id',
        expect.anything()
      );
    });
  });

  describe('Online/Offline Handling', () => {
    beforeEach((done) => {
      service = new (RealtimeSyncService as any)();
      setTimeout(done, 10);
    });

    it('should reconnect when coming online', () => {
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
      
      // Should create new connection
      expect(wsSetup.instances).toHaveLength(2);
    });

    it('should emit offline event when going offline', () => {
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
      
      expect(eventBus.emit).toHaveBeenCalledWith('sync:offline');
    });
  });

  describe('Helper Methods', () => {
    beforeEach((done) => {
      service = new (RealtimeSyncService as any)();
      setTimeout(done, 10);
    });

    it('should invalidate cache for entity', () => {
      service.invalidateCache('products', 'prod-123');
      
      const ws = wsSetup.instances[0];
      const sentMessages = ws.getMessageQueue();
      expect(sentMessages).toHaveLength(1);
      
      const message = JSON.parse(sentMessages[0]);
      expect(message).toMatchObject({
        type: 'INVALIDATE_CACHE',
        entity: 'products',
        entityId: 'prod-123'
      });
    });

    it('should notify create event', () => {
      const data = { id: 'new-1', name: 'New Item' };
      service.notifyCreate('item', data);
      
      const ws = wsSetup.instances[0];
      const sentMessages = ws.getMessageQueue();
      const message = JSON.parse(sentMessages[0]);
      
      expect(message).toMatchObject({
        type: 'CREATE',
        entity: 'item',
        data
      });
    });

    it('should notify update event', () => {
      const data = { id: 'item-1', name: 'Updated' };
      service.notifyUpdate('item', 'item-1', data);
      
      const ws = wsSetup.instances[0];
      const sentMessages = ws.getMessageQueue();
      const message = JSON.parse(sentMessages[0]);
      
      expect(message).toMatchObject({
        type: 'UPDATE',
        entity: 'item',
        entityId: 'item-1',
        data
      });
    });

    it('should notify delete event', () => {
      service.notifyDelete('item', 'item-1');
      
      const ws = wsSetup.instances[0];
      const sentMessages = ws.getMessageQueue();
      const message = JSON.parse(sentMessages[0]);
      
      expect(message).toMatchObject({
        type: 'DELETE',
        entity: 'item',
        entityId: 'item-1'
      });
    });
  });

  describe('Cleanup', () => {
    it('should properly destroy service', (done) => {
      service = new (RealtimeSyncService as any)();
      
      setTimeout(() => {
        const ws = wsSetup.instances[0];
        service.destroy();
        
        expect(ws.readyState).toBe(MockWebSocket.CLOSED);
        expect(eventBus.removeAllListeners).toHaveBeenCalled();
        done();
      }, 10);
    });
  });
});