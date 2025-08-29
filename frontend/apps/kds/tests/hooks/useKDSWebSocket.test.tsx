/**
 * useKDSWebSocket Hook Test Suite
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKDSWebSocket } from '../useKDSWebSocket';
import { WebSocketService } from '../../services/websocket';
import { createMockOrder } from '../../__tests__/utils/testUtils';
import { Order } from '../../services/kdsService';
import { StationUpdateData } from '../../types';

// Mock the WebSocket service
jest.mock('../../services/websocket', () => ({
  WebSocketService: jest.fn()
}));

describe('useKDSWebSocket', () => {
  let mockWsService: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    // Create mock WebSocket service instance
    mockWsService = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn().mockReturnValue(true),
      on: jest.fn(),
      off: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      getStatus: jest.fn().mockReturnValue('disconnected'),
      getQueueSize: jest.fn().mockReturnValue(0),
      clearQueue: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    } as any;

    // Mock the constructor
    (WebSocketService as jest.Mock).mockImplementation(() => mockWsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Connection', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useKDSWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionError).toBeNull();
    });

    test('should auto-connect when autoConnect is true', () => {
      renderHook(() => useKDSWebSocket({ autoConnect: true }));

      expect(WebSocketService).toHaveBeenCalledWith({ url: 'ws://localhost:8001' });
      expect(mockWsService.connect).toHaveBeenCalled();
    });

    test('should not auto-connect when autoConnect is false', () => {
      renderHook(() => useKDSWebSocket({ autoConnect: false }));

      expect(mockWsService.connect).not.toHaveBeenCalled();
    });

    test('should use custom URL when provided', () => {
      const customUrl = 'ws://custom.server:3000';
      renderHook(() => useKDSWebSocket({ url: customUrl }));

      expect(WebSocketService).toHaveBeenCalledWith({ url: customUrl });
    });

    test('should handle manual connection', () => {
      const { result } = renderHook(() => useKDSWebSocket({ autoConnect: false }));

      act(() => {
        result.current.connect();
      });

      expect(mockWsService.connect).toHaveBeenCalled();
    });

    test('should handle manual disconnection', () => {
      const { result } = renderHook(() => useKDSWebSocket());

      act(() => {
        result.current.disconnect();
      });

      expect(mockWsService.disconnect).toHaveBeenCalled();
    });

    test('should cleanup on unmount', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { unmount } = renderHook(() => useKDSWebSocket());

      unmount();

      expect(mockWsService.off).toHaveBeenCalled();
      expect(mockWsService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Connection State Management', () => {
    test('should update isConnected on connection', async () => {
      const { result } = renderHook(() => useKDSWebSocket());

      // Simulate connection
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];

      act(() => {
        connectedHandler?.();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionError).toBeNull();
    });

    test('should update isConnected on disconnection', () => {
      const { result } = renderHook(() => useKDSWebSocket());

      // First connect
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      // Then disconnect
      const disconnectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];
      act(() => disconnectedHandler?.());

      expect(result.current.isConnected).toBe(false);
    });

    test('should handle connection errors', () => {
      const { result } = renderHook(() => useKDSWebSocket());

      const errorHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      act(() => {
        errorHandler?.(new Error('Connection failed'));
      });

      expect(result.current.connectionError).toBe('Connection failed');
    });

    test('should handle non-Error error objects', () => {
      const { result } = renderHook(() => useKDSWebSocket());

      const errorHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      act(() => {
        errorHandler?.('String error');
      });

      expect(result.current.connectionError).toBe('Unknown connection error');
    });

    test('should call onConnectionChange callback', () => {
      const onConnectionChange = jest.fn();
      renderHook(() => useKDSWebSocket({ onConnectionChange }));

      // Connect
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      expect(onConnectionChange).toHaveBeenCalledWith(true);

      // Disconnect
      const disconnectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];
      act(() => disconnectedHandler?.());

      expect(onConnectionChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Order Event Handling', () => {
    test('should handle order create event', () => {
      const onOrderUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderUpdate }));

      const order = createMockOrder({ id: 1 });
      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:created'
      )?.[1];

      act(() => {
        handler?.(order);
      });

      expect(onOrderUpdate).toHaveBeenCalledWith(order);
    });

    test('should handle order update event', () => {
      const onOrderUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderUpdate }));

      const order = createMockOrder({ id: 1, status: 'preparing' });
      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:updated'
      )?.[1];

      act(() => {
        handler?.(order);
      });

      expect(onOrderUpdate).toHaveBeenCalledWith(order);
    });

    test('should validate order data before calling handler', () => {
      const onOrderUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderUpdate }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:created'
      )?.[1];

      // Invalid order data
      act(() => {
        handler?.({ invalid: 'data' });
      });

      expect(onOrderUpdate).not.toHaveBeenCalled();

      // Valid order data
      const validOrder = createMockOrder();
      act(() => {
        handler?.(validOrder);
      });

      expect(onOrderUpdate).toHaveBeenCalledWith(validOrder);
    });

    test('should handle order delete event', () => {
      const onOrderDelete = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderDelete }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:deleted'
      )?.[1];

      act(() => {
        handler?.({ orderId: '123' });
      });

      expect(onOrderDelete).toHaveBeenCalledWith('123');
    });

    test('should validate order delete data', () => {
      const onOrderDelete = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderDelete }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:deleted'
      )?.[1];

      // Invalid data
      act(() => {
        handler?.({ invalid: 'data' });
      });

      expect(onOrderDelete).not.toHaveBeenCalled();

      // Valid data
      act(() => {
        handler?.({ orderId: '456' });
      });

      expect(onOrderDelete).toHaveBeenCalledWith('456');
    });
  });

  describe('Station Event Handling', () => {
    test('should handle station update event', () => {
      const onStationUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onStationUpdate }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'station:update'
      )?.[1];

      const stationData: StationUpdateData = {
        station: 'kitchen',
        type: 'urgent',
        orderId: '123'
      };

      act(() => {
        handler?.(stationData);
      });

      expect(onStationUpdate).toHaveBeenCalledWith('kitchen', stationData);
    });

    test('should validate station update data', () => {
      const onStationUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onStationUpdate }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'station:update'
      )?.[1];

      // Invalid data
      act(() => {
        handler?.({ invalid: 'data' });
      });

      expect(onStationUpdate).not.toHaveBeenCalled();

      // Valid data
      const validData: StationUpdateData = {
        station: 'bar',
        type: 'normal'
      };

      act(() => {
        handler?.(validData);
      });

      expect(onStationUpdate).toHaveBeenCalledWith('bar', validData);
    });
  });

  describe('Message Sending', () => {
    test('should send message when connected', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      const sent = result.current.sendMessage('test:event', { data: 'test' });

      expect(sent).toBe(true);
      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test:event',
          data: 'test',
          timestamp: expect.any(Number)
        })
      );
    });

    test('should not send message when disconnected', () => {
      mockWsService.isConnected.mockReturnValue(false);
      const { result } = renderHook(() => useKDSWebSocket());

      const sent = result.current.sendMessage('test:event', { data: 'test' });

      expect(sent).toBe(false);
      expect(mockWsService.send).not.toHaveBeenCalled();
    });
  });

  describe('Custom Event Subscription', () => {
    test('should subscribe to custom events', () => {
      const { result } = renderHook(() => useKDSWebSocket());
      const handler = jest.fn();

      act(() => {
        result.current.subscribe('custom:event', handler);
      });

      expect(mockWsService.on).toHaveBeenCalledWith('custom:event', handler);
    });

    test('should unsubscribe from custom events', () => {
      const { result } = renderHook(() => useKDSWebSocket());
      const handler = jest.fn();

      // Subscribe first
      act(() => {
        result.current.subscribe('custom:event', handler);
      });

      // Then unsubscribe
      act(() => {
        result.current.unsubscribe('custom:event');
      });

      expect(mockWsService.off).toHaveBeenCalledWith('custom:event', handler);
    });

    test('should track handlers for cleanup', () => {
      const { result, unmount } = renderHook(() => useKDSWebSocket());
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      act(() => {
        result.current.subscribe('event1', handler1);
        result.current.subscribe('event2', handler2);
      });

      unmount();

      expect(mockWsService.off).toHaveBeenCalledWith('event1', handler1);
      expect(mockWsService.off).toHaveBeenCalledWith('event2', handler2);
    });
  });

  describe('Station Operations', () => {
    test('should join station', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.joinStation('kitchen');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'station:join',
          data: { station: 'kitchen' }
        })
      );
    });

    test('should leave station', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.leaveStation('kitchen');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'station:leave',
          data: { station: 'kitchen' }
        })
      );
    });

    test('should update station status', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.updateStationStatus('kitchen', 'busy');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'station:status',
          data: { station: 'kitchen', status: 'busy' }
        })
      );
    });
  });

  describe('Order Operations', () => {
    test('should mark order as started', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.markOrderStarted('123');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'order:started',
          data: { orderId: '123' }
        })
      );
    });

    test('should mark order as completed', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.markOrderCompleted('123');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'order:completed',
          data: { orderId: '123' }
        })
      );
    });

    test('should mark item as ready', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.markItemReady('123', '456');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'item:ready',
          data: { orderId: '123', itemId: '456' }
        })
      );
    });

    test('should request order update', () => {
      mockWsService.isConnected.mockReturnValue(true);
      const { result } = renderHook(() => useKDSWebSocket());

      // Update connected state
      const connectedHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      act(() => connectedHandler?.());

      result.current.requestOrderUpdate('123');

      expect(mockWsService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'order:refresh',
          data: { orderId: '123' }
        })
      );
    });
  });

  describe('Type Guards', () => {
    test('isError type guard should work correctly', () => {
      const { result } = renderHook(() => useKDSWebSocket());
      const errorHandler = mockWsService.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      // Test with Error instance
      act(() => {
        errorHandler?.(new Error('Test error'));
      });
      expect(result.current.connectionError).toBe('Test error');

      // Test with non-Error
      act(() => {
        errorHandler?.({ message: 'Not an error' });
      });
      expect(result.current.connectionError).toBe('Unknown connection error');
    });

    test('isOrder type guard should work correctly', () => {
      const onOrderUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderUpdate }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:created'
      )?.[1];

      // Valid order
      const validOrder = { id: 1, items: [] };
      act(() => handler?.(validOrder));
      expect(onOrderUpdate).toHaveBeenCalledWith(validOrder);

      onOrderUpdate.mockClear();

      // Invalid order - missing id
      act(() => handler?.({ items: [] }));
      expect(onOrderUpdate).not.toHaveBeenCalled();

      // Invalid order - missing items
      act(() => handler?.({ id: 1 }));
      expect(onOrderUpdate).not.toHaveBeenCalled();

      // Invalid order - null
      act(() => handler?.(null));
      expect(onOrderUpdate).not.toHaveBeenCalled();
    });

    test('isStationUpdateData type guard should work correctly', () => {
      const onStationUpdate = jest.fn();
      renderHook(() => useKDSWebSocket({ onStationUpdate }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'station:update'
      )?.[1];

      // Valid station data
      const validData = { station: 'kitchen', type: 'urgent' };
      act(() => handler?.(validData));
      expect(onStationUpdate).toHaveBeenCalledWith('kitchen', validData);

      onStationUpdate.mockClear();

      // Invalid - missing station
      act(() => handler?.({ type: 'urgent' }));
      expect(onStationUpdate).not.toHaveBeenCalled();

      // Invalid - missing type
      act(() => handler?.({ station: 'kitchen' }));
      expect(onStationUpdate).not.toHaveBeenCalled();
    });

    test('hasOrderId type guard should work correctly', () => {
      const onOrderDelete = jest.fn();
      renderHook(() => useKDSWebSocket({ onOrderDelete }));

      const handler = mockWsService.on.mock.calls.find(
        call => call[0] === 'order:deleted'
      )?.[1];

      // Valid data with orderId
      act(() => handler?.({ orderId: '123' }));
      expect(onOrderDelete).toHaveBeenCalledWith('123');

      onOrderDelete.mockClear();

      // Invalid - missing orderId
      act(() => handler?.({ id: '123' }));
      expect(onOrderDelete).not.toHaveBeenCalled();

      // Invalid - orderId not string
      act(() => handler?.({ orderId: 123 }));
      expect(onOrderDelete).not.toHaveBeenCalled();
    });
  });
});