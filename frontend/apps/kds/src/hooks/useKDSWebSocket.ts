import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketService } from '../services/websocket';
import { Order } from '../services/kdsService';
import { API_CONFIG } from '../config/api';
import { StationUpdateData } from '../types';

// Type guards for safer type narrowing
function isOrder(value: unknown): value is Order {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'items' in value
  );
}

function isStationUpdateData(value: unknown): value is StationUpdateData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'station' in value &&
    'type' in value
  );
}

function hasOrderId(value: unknown): value is { orderId: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'orderId' in value &&
    typeof (value as { orderId: unknown }).orderId === 'string'
  );
}

interface UseKDSWebSocketOptions {
  url?: string;
  onOrderUpdate?: (order: Order) => void;
  onOrderDelete?: (orderId: string) => void;
  onStationUpdate?: (station: string, data: StationUpdateData) => void;
  onConnectionChange?: (connected: boolean) => void;
  autoConnect?: boolean;
}

export function useKDSWebSocket(options: UseKDSWebSocketOptions = {}) {
  const {
    url = API_CONFIG.WS_URL,
    onOrderUpdate,
    onOrderDelete,
    onStationUpdate,
    onConnectionChange,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocketService | null>(null);
  const handlersRef = useRef<Map<string, (...args: unknown[]) => void>>(new Map());

  // Initialize WebSocket
  const initWebSocket = useCallback(() => {
    if (!wsRef.current) {
      wsRef.current = new WebSocketService({ url });
      
      // Connection handlers
      wsRef.current.on('connected', () => {
        setIsConnected(true);
        onConnectionChange?.(true);
      });

      wsRef.current.on('disconnected', () => {
        setIsConnected(false);
        onConnectionChange?.(false);
      });

      wsRef.current.on('error', () => {
        // Silently handle errors to avoid flickering messages
        // Errors are handled by connection status change
      });

      // Message handlers
      if (onOrderUpdate) {
        const orderHandler = (...args: unknown[]) => {
          const order = args[0];
          if (isOrder(order)) {
            onOrderUpdate(order);
          }
        };
        wsRef.current.on('order:created', orderHandler);
        wsRef.current.on('order:updated', orderHandler);
        handlersRef.current.set('order:created', orderHandler);
        handlersRef.current.set('order:updated', orderHandler);
      }

      if (onOrderDelete) {
        const deleteHandler = (...args: unknown[]) => {
          const data = args[0];
          if (hasOrderId(data)) {
            onOrderDelete(data.orderId);
          }
        };
        wsRef.current.on('order:deleted', deleteHandler);
        handlersRef.current.set('order:deleted', deleteHandler);
      }

      if (onStationUpdate) {
        const stationHandler = (...args: unknown[]) => {
          const data = args[0];
          if (isStationUpdateData(data)) {
            onStationUpdate(data.station, data);
          }
        };
        wsRef.current.on('station:update', stationHandler);
        handlersRef.current.set('station:update', stationHandler);
      }
    }
  }, [url, onOrderUpdate, onOrderDelete, onStationUpdate, onConnectionChange]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!wsRef.current) {
      initWebSocket();
    }
    wsRef.current?.connect();
  }, [initWebSocket]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((type: string, data: Record<string, unknown>) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send({ type, ...data, timestamp: Date.now() });
      return true;
    }
    return false;
  }, [isConnected]);

  // Subscribe to custom event
  const subscribe = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (wsRef.current) {
      wsRef.current.on(event, handler);
      handlersRef.current.set(event, handler);
    }
  }, []);

  // Unsubscribe from custom event
  const unsubscribe = useCallback((event: string) => {
    if (wsRef.current) {
      const handler = handlersRef.current.get(event);
      if (handler) {
        wsRef.current.off(event, handler);
        handlersRef.current.delete(event);
      }
    }
  }, []);

  // Station-specific operations
  const stationOperations = {
    joinStation: (station: string) => 
      sendMessage('station:join', { data: { station } }),
    
    leaveStation: (station: string) => 
      sendMessage('station:leave', { data: { station } }),
    
    updateStationStatus: (station: string, status: string) =>
      sendMessage('station:status', { data: { station, status } })
  };

  // Order-specific operations
  const orderOperations = {
    markOrderStarted: (orderId: string) =>
      sendMessage('order:started', { data: { orderId } }),
    
    markOrderCompleted: (orderId: string) =>
      sendMessage('order:completed', { data: { orderId } }),
    
    markItemReady: (orderId: string, itemId: string) =>
      sendMessage('item:ready', { data: { orderId, itemId } }),
    
    requestOrderUpdate: (orderId: string) =>
      sendMessage('order:refresh', { data: { orderId } })
  };

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      initWebSocket();
      connect();
    }

    const handlers = handlersRef.current;
    const ws = wsRef.current;
    
    return () => {
      // Cleanup handlers
      handlers.forEach((handler, event) => {
        ws?.off(event, handler);
      });
      handlers.clear();
      
      // Disconnect if connected
      if (ws?.isConnected()) {
        ws.disconnect();
      }
    };
  }, [autoConnect, initWebSocket, connect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    ...stationOperations,
    ...orderOperations
  };
}