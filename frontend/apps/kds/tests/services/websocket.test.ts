/**
 * WebSocket Service Test Suite
 */

import { WebSocketService, WebSocketMessage } from '../../src/services/websocket';
import { MockWebSocket, setupMockWebSocket, waitFor, cleanupMocks } from '../utils/testUtils';

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    setupMockWebSocket();
    wsService = new WebSocketService({ 
      url: 'ws://localhost:8001/kds',
      reconnectDelay: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000
    });

    // Capture the WebSocket instance when created
    const originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = jest.fn((url: string) => {
      mockWs = new MockWebSocket(url);
      return mockWs;
    });
  });

  afterEach(() => {
    wsService.disconnect();
    jest.clearAllTimers();
    jest.useRealTimers();
    cleanupMocks();
  });

  describe('Connection Management', () => {
    test('should establish connection when connect() is called', () => {
      wsService.connect();
      expect(mockWs).toBeDefined();
      expect(mockWs.url).toBe('ws://localhost:8001/kds');
    });

    test('should not create duplicate connections', () => {
      wsService.connect();
      const firstWs = mockWs;
      
      mockWs.mockOpen();
      wsService.connect(); // Try to connect again
      
      expect(mockWs).toBe(firstWs); // Should be the same instance
    });

    test('should emit connected event when connection opens', () => {
      const onConnected = jest.fn();
      wsService.on('connected', onConnected);
      
      wsService.connect();
      mockWs.mockOpen();
      
      expect(onConnected).toHaveBeenCalled();
      expect(wsService.isConnected()).toBe(true);
    });

    test('should emit disconnected event when connection closes', () => {
      const onDisconnected = jest.fn();
      wsService.on('disconnected', onDisconnected);
      
      wsService.connect();
      mockWs.mockOpen();
      mockWs.mockClose();
      
      expect(onDisconnected).toHaveBeenCalled();
      expect(wsService.isConnected()).toBe(false);
    });

    test('should emit error event on connection error', () => {
      const onError = jest.fn();
      wsService.on('error', onError);
      
      wsService.connect();
      mockWs.mockError(new Error('Connection failed'));
      
      expect(onError).toHaveBeenCalled();
    });

    test('should update status correctly', () => {
      const onStatusChange = jest.fn();
      wsService.on('status_changed', onStatusChange);
      
      expect(wsService.getStatus()).toBe('disconnected');
      
      wsService.connect();
      expect(onStatusChange).toHaveBeenCalledWith('connecting');
      
      mockWs.mockOpen();
      expect(onStatusChange).toHaveBeenCalledWith('connected');
      
      mockWs.mockClose();
      expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('Reconnection Logic', () => {
    test('should attempt reconnection on unexpected disconnect', () => {
      const onReconnecting = jest.fn();
      wsService.on('reconnecting', onReconnecting);
      
      wsService.connect();
      mockWs.mockOpen();
      mockWs.mockClose(); // Unexpected close
      
      expect(onReconnecting).toHaveBeenCalledWith({
        attempt: 1,
        maxAttempts: 3,
        delay: 100
      });
      
      jest.advanceTimersByTime(100);
      expect(wsService.getStatus()).toBe('connecting');
    });

    test('should use exponential backoff for reconnection', () => {
      const onReconnecting = jest.fn();
      wsService.on('reconnecting', onReconnecting);
      
      wsService.connect();
      mockWs.mockClose();
      
      // First attempt - 100ms
      expect(onReconnecting).toHaveBeenCalledWith({
        attempt: 1,
        maxAttempts: 3,
        delay: 100
      });
      
      jest.advanceTimersByTime(100);
      mockWs.mockClose(); // Fail again
      
      // Second attempt - 150ms (100 * 1.5)
      expect(onReconnecting).toHaveBeenCalledWith({
        attempt: 2,
        maxAttempts: 3,
        delay: 150
      });
      
      jest.advanceTimersByTime(150);
      mockWs.mockClose(); // Fail again
      
      // Third attempt - 225ms (150 * 1.5)
      expect(onReconnecting).toHaveBeenCalledWith({
        attempt: 3,
        maxAttempts: 3,
        delay: 225
      });
    });

    test('should stop reconnecting after max attempts', () => {
      const onMaxReconnect = jest.fn();
      wsService.on('max_reconnect_attempts', onMaxReconnect);
      
      wsService.connect();
      
      // Fail all reconnection attempts
      for (let i = 0; i < 3; i++) {
        mockWs.mockClose();
        jest.advanceTimersByTime(1000);
      }
      
      mockWs.mockClose(); // One more failure
      expect(onMaxReconnect).toHaveBeenCalled();
    });

    test('should not reconnect on intentional disconnect', () => {
      const onReconnecting = jest.fn();
      wsService.on('reconnecting', onReconnecting);
      
      wsService.connect();
      mockWs.mockOpen();
      wsService.disconnect(); // Intentional disconnect
      
      jest.advanceTimersByTime(1000);
      expect(onReconnecting).not.toHaveBeenCalled();
    });

    test('should reset reconnect attempts on successful connection', () => {
      wsService.connect();
      mockWs.mockClose(); // First failure
      
      jest.advanceTimersByTime(100);
      mockWs.mockOpen(); // Successful reconnection
      
      // Verify attempts were reset by triggering another disconnect
      mockWs.mockClose();
      const onReconnecting = jest.fn();
      wsService.on('reconnecting', onReconnecting);
      
      expect(onReconnecting).toHaveBeenCalledWith({
        attempt: 1, // Should be 1 again, not 2
        maxAttempts: 3,
        delay: 100
      });
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      wsService.connect();
      mockWs.mockOpen();
    });

    test('should handle order.created message', () => {
      const onOrderUpdate = jest.fn();
      wsService.on('order_update', onOrderUpdate);
      
      const orderData = { id: 1, status: 'pending' };
      mockWs.mockMessage({ type: 'order.created', data: orderData, timestamp: Date.now() });
      
      expect(onOrderUpdate).toHaveBeenCalledWith(orderData);
    });

    test('should handle order.updated message', () => {
      const onOrderUpdate = jest.fn();
      wsService.on('order_update', onOrderUpdate);
      
      const orderData = { id: 1, status: 'preparing' };
      mockWs.mockMessage({ type: 'order.updated', data: orderData, timestamp: Date.now() });
      
      expect(onOrderUpdate).toHaveBeenCalledWith(orderData);
    });

    test('should handle order.status_changed message', () => {
      const onOrderUpdate = jest.fn();
      wsService.on('order_update', onOrderUpdate);
      
      const orderData = { id: 1, status: 'ready' };
      mockWs.mockMessage({ type: 'order.status_changed', data: orderData, timestamp: Date.now() });
      
      expect(onOrderUpdate).toHaveBeenCalledWith(orderData);
    });

    test('should handle order.item_status_changed message', () => {
      const onOrderUpdate = jest.fn();
      wsService.on('order_update', onOrderUpdate);
      
      const orderData = { id: 1, itemId: 2, status: 'completed' };
      mockWs.mockMessage({ type: 'order.item_status_changed', data: orderData, timestamp: Date.now() });
      
      expect(onOrderUpdate).toHaveBeenCalledWith(orderData);
    });

    test('should handle order.cancelled message', () => {
      const onOrderUpdate = jest.fn();
      wsService.on('order_update', onOrderUpdate);
      
      const orderData = { id: 1, status: 'cancelled' };
      mockWs.mockMessage({ type: 'order.cancelled', data: orderData, timestamp: Date.now() });
      
      expect(onOrderUpdate).toHaveBeenCalledWith(orderData);
    });

    test('should handle station.updated message', () => {
      const onStationUpdate = jest.fn();
      wsService.on('station_update', onStationUpdate);
      
      const stationData = { station: 'kitchen', status: 'busy' };
      mockWs.mockMessage({ type: 'station.updated', data: stationData, timestamp: Date.now() });
      
      expect(onStationUpdate).toHaveBeenCalledWith(stationData);
    });

    test('should respond to ping with pong', () => {
      const sendSpy = jest.spyOn(wsService, 'send');
      
      mockWs.mockMessage({ type: 'ping', data: null, timestamp: Date.now() });
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'pong', data: null })
      );
    });

    test('should ignore pong messages', () => {
      const onMessage = jest.fn();
      wsService.on('message', onMessage);
      
      mockWs.mockMessage({ type: 'pong', data: null, timestamp: Date.now() });
      
      expect(onMessage).not.toHaveBeenCalled();
    });

    test('should emit generic message for unknown types', () => {
      const onMessage = jest.fn();
      wsService.on('message', onMessage);
      
      const unknownMessage = { type: 'unknown.event', data: { test: true }, timestamp: Date.now() };
      mockWs.mockMessage(unknownMessage);
      
      expect(onMessage).toHaveBeenCalledWith(unknownMessage);
    });

    test('should handle invalid JSON messages gracefully', () => {
      const onMessage = jest.fn();
      const onError = jest.fn();
      wsService.on('message', onMessage);
      wsService.on('error', onError);
      
      // Simulate invalid JSON
      if (mockWs.onmessage) {
        mockWs.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
      
      expect(onMessage).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled(); // Silent error
    });
  });

  describe('Message Sending', () => {
    test('should send message when connected', () => {
      wsService.connect();
      mockWs.mockOpen();
      
      const sendSpy = jest.spyOn(mockWs, 'send');
      const message: WebSocketMessage = { type: 'test', data: { value: 1 }, timestamp: Date.now() };
      
      const result = wsService.send(message);
      
      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('should queue message when not connected', () => {
      const message: WebSocketMessage = { type: 'test', data: { value: 1 }, timestamp: Date.now() };
      
      const result = wsService.send(message);
      
      expect(result).toBe(false);
      expect(wsService.getQueueSize()).toBe(1);
    });

    test('should flush message queue on connection', () => {
      const messages = [
        { type: 'test1', data: { value: 1 }, timestamp: Date.now() },
        { type: 'test2', data: { value: 2 }, timestamp: Date.now() },
        { type: 'test3', data: { value: 3 }, timestamp: Date.now() }
      ];
      
      // Queue messages while disconnected
      messages.forEach(msg => wsService.send(msg));
      expect(wsService.getQueueSize()).toBe(3);
      
      // Connect and verify queue is flushed
      wsService.connect();
      const sendSpy = jest.spyOn(mockWs, 'send');
      mockWs.mockOpen();
      
      expect(wsService.getQueueSize()).toBe(0);
      expect(sendSpy).toHaveBeenCalledTimes(3);
    });

    test('should queue message if send fails', () => {
      wsService.connect();
      mockWs.mockOpen();
      
      // Make send throw an error
      mockWs.send = jest.fn(() => {
        throw new Error('Send failed');
      });
      
      const message: WebSocketMessage = { type: 'test', data: { value: 1 }, timestamp: Date.now() };
      const result = wsService.send(message);
      
      expect(result).toBe(false);
      expect(wsService.getQueueSize()).toBe(1);
    });

    test('should clear queue on disconnect', () => {
      // Queue some messages
      wsService.send({ type: 'test1', data: null, timestamp: Date.now() });
      wsService.send({ type: 'test2', data: null, timestamp: Date.now() });
      expect(wsService.getQueueSize()).toBe(2);
      
      wsService.disconnect();
      expect(wsService.getQueueSize()).toBe(0);
    });

    test('clearQueue should empty the message queue', () => {
      // Queue some messages
      wsService.send({ type: 'test1', data: null, timestamp: Date.now() });
      wsService.send({ type: 'test2', data: null, timestamp: Date.now() });
      expect(wsService.getQueueSize()).toBe(2);
      
      wsService.clearQueue();
      expect(wsService.getQueueSize()).toBe(0);
    });
  });

  describe('Heartbeat Mechanism', () => {
    test('should start heartbeat on connection', () => {
      const sendSpy = jest.spyOn(wsService, 'send');
      
      wsService.connect();
      mockWs.mockOpen();
      
      jest.advanceTimersByTime(1000); // Heartbeat interval
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ping', data: null })
      );
    });

    test('should send heartbeat at regular intervals', () => {
      const sendSpy = jest.spyOn(wsService, 'send');
      
      wsService.connect();
      mockWs.mockOpen();
      
      jest.advanceTimersByTime(3000); // 3 heartbeat intervals
      
      expect(sendSpy).toHaveBeenCalledTimes(3);
      sendSpy.mock.calls.forEach(call => {
        expect(call[0]).toMatchObject({ type: 'ping', data: null });
      });
    });

    test('should stop heartbeat on disconnect', () => {
      const sendSpy = jest.spyOn(wsService, 'send');
      
      wsService.connect();
      mockWs.mockOpen();
      
      jest.advanceTimersByTime(1000);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      
      wsService.disconnect();
      jest.advanceTimersByTime(2000);
      
      expect(sendSpy).toHaveBeenCalledTimes(1); // No additional calls
    });

    test('should not send heartbeat when disconnected', () => {
      const sendSpy = jest.spyOn(wsService, 'send');
      
      wsService.connect();
      mockWs.mockOpen();
      mockWs.mockClose(); // Disconnect
      
      jest.advanceTimersByTime(1000);
      
      // Should attempt to send but fail due to disconnection
      expect(sendSpy).toHaveBeenCalled();
      const lastCall = sendSpy.mock.results[sendSpy.mock.results.length - 1];
      expect(lastCall.value).toBe(false); // Send should return false
    });
  });

  describe('Event Emitter Functionality', () => {
    test('should add and remove event listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsService.on('test_event', handler1);
      wsService.on('test_event', handler2);
      
      wsService['emit']('test_event', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
      
      wsService.off('test_event', handler1);
      wsService['emit']('test_event', 'data2');
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(2);
    });

    test('should handle removing non-existent listener', () => {
      const handler = jest.fn();
      
      // Should not throw
      expect(() => wsService.off('nonexistent', handler)).not.toThrow();
    });

    test('should remove all listeners for an event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsService.on('test_event', handler1);
      wsService.on('test_event', handler2);
      
      wsService['removeAllListeners']('test_event');
      wsService['emit']('test_event', 'data');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    test('should remove all listeners for all events', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsService.on('event1', handler1);
      wsService.on('event2', handler2);
      
      wsService['removeAllListeners']();
      wsService['emit']('event1', 'data');
      wsService['emit']('event2', 'data');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    test('isConnected should return correct state', () => {
      expect(wsService.isConnected()).toBe(false);
      
      wsService.connect();
      expect(wsService.isConnected()).toBe(false);
      
      mockWs.mockOpen();
      expect(wsService.isConnected()).toBe(true);
      
      mockWs.mockClose();
      expect(wsService.isConnected()).toBe(false);
    });

    test('getStatus should return current status', () => {
      expect(wsService.getStatus()).toBe('disconnected');
      
      wsService.connect();
      expect(wsService.getStatus()).toBe('connecting');
      
      mockWs.mockOpen();
      expect(wsService.getStatus()).toBe('connected');
      
      mockWs.mockClose();
      expect(wsService.getStatus()).toBe('disconnected');
    });

    test('getQueueSize should return queue length', () => {
      expect(wsService.getQueueSize()).toBe(0);
      
      wsService.send({ type: 'test1', data: null, timestamp: Date.now() });
      expect(wsService.getQueueSize()).toBe(1);
      
      wsService.send({ type: 'test2', data: null, timestamp: Date.now() });
      expect(wsService.getQueueSize()).toBe(2);
      
      wsService.clearQueue();
      expect(wsService.getQueueSize()).toBe(0);
    });
  });
});