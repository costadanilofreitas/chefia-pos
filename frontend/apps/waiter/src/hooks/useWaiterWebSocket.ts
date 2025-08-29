import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService } from '../services/websocket';
import { logger } from '../services/logger';
import type { WebSocketMessageData } from '../types';

interface UseWaiterWebSocketOptions {
  autoConnect?: boolean;
  tableIds?: number[];
  onTableUpdate?: (data: WebSocketMessageData) => void;
  onOrderUpdate?: (data: WebSocketMessageData) => void;
  onNotification?: (data: WebSocketMessageData) => void;
  onKitchenUpdate?: (data: WebSocketMessageData) => void;
}

export function useWaiterWebSocket({
  autoConnect = true,
  tableIds = [],
  onTableUpdate,
  onOrderUpdate,
  onNotification,
  onKitchenUpdate
}: UseWaiterWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const subscribedTablesRef = useRef<Set<number>>(new Set());

  // Handle connection status changes
  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus as typeof status);
    setIsConnected(newStatus === 'connected');
    logger.info(`WebSocket status changed: ${newStatus}`, 'useWaiterWebSocket');
  }, []);

  // Handle reconnecting
  const handleReconnecting = useCallback((info: { attempt: number; maxAttempts: number; delay: number }) => {
    setReconnectAttempt(info.attempt);
    logger.info(`WebSocket reconnecting: attempt ${info.attempt}/${info.maxAttempts}`, 'useWaiterWebSocket');
  }, []);

  // Subscribe to tables
  const subscribeToTables = useCallback((ids: number[]) => {
    const newIds = ids.filter(id => !subscribedTablesRef.current.has(id));
    if (newIds.length > 0) {
      websocketService.subscribeToTables(newIds);
      newIds.forEach(id => subscribedTablesRef.current.add(id));
      logger.info(`Subscribed to tables: ${newIds.join(', ')}`, 'useWaiterWebSocket');
    }
  }, []);

  // Unsubscribe from tables
  const unsubscribeFromTables = useCallback((ids: number[]) => {
    const existingIds = ids.filter(id => subscribedTablesRef.current.has(id));
    if (existingIds.length > 0) {
      websocketService.unsubscribeFromTables(existingIds);
      existingIds.forEach(id => subscribedTablesRef.current.delete(id));
      logger.info(`Unsubscribed from tables: ${existingIds.join(', ')}`, 'useWaiterWebSocket');
    }
  }, []);

  // Send table service notification
  const notifyTableService = useCallback((tableId: number, action: string) => {
    websocketService.notifyTableService(tableId, action);
    logger.info(`Table service notification sent: table ${tableId}, action ${action}`, 'useWaiterWebSocket');
  }, []);

  // Request assistance
  const requestAssistance = useCallback((tableId: number, type: string) => {
    websocketService.requestAssistance(tableId, type);
    logger.info(`Assistance requested: table ${tableId}, type ${type}`, 'useWaiterWebSocket');
  }, []);

  // Connect WebSocket
  const connect = useCallback(() => {
    websocketService.connect();
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    subscribedTablesRef.current.clear();
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      // Re-subscribe to tables after reconnection
      if (subscribedTablesRef.current.size > 0) {
        const tableIds = Array.from(subscribedTablesRef.current);
        websocketService.subscribeToTables(tableIds);
        logger.info(`Re-subscribed to tables after reconnection: ${tableIds.join(', ')}`, 'useWaiterWebSocket');
      }
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleTableUpdate = (data?: WebSocketMessageData) => {
      if (data && onTableUpdate) {
        onTableUpdate(data);
      }
    };

    const handleOrderUpdate = (data?: WebSocketMessageData) => {
      if (data && onOrderUpdate) {
        onOrderUpdate(data);
      }
    };

    const handleNotification = (data?: WebSocketMessageData) => {
      if (data && onNotification) {
        onNotification(data);
      }
    };

    const handleKitchenUpdate = (data?: WebSocketMessageData) => {
      if (data && onKitchenUpdate) {
        onKitchenUpdate(data);
      }
    };

    // Register event listeners
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('status_changed', handleStatusChange as (...args: unknown[]) => void);
    websocketService.on('reconnecting', handleReconnecting as (...args: unknown[]) => void);
    websocketService.on('table_update', handleTableUpdate as (...args: unknown[]) => void);
    websocketService.on('order_update', handleOrderUpdate as (...args: unknown[]) => void);
    websocketService.on('notification', handleNotification as (...args: unknown[]) => void);
    websocketService.on('kitchen_update', handleKitchenUpdate as (...args: unknown[]) => void);

    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Subscribe to initial tables
    if (tableIds.length > 0 && isConnected) {
      subscribeToTables(tableIds);
    }

    // Cleanup
    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('status_changed', handleStatusChange as (...args: unknown[]) => void);
      websocketService.off('reconnecting', handleReconnecting as (...args: unknown[]) => void);
      websocketService.off('table_update', handleTableUpdate as (...args: unknown[]) => void);
      websocketService.off('order_update', handleOrderUpdate as (...args: unknown[]) => void);
      websocketService.off('notification', handleNotification as (...args: unknown[]) => void);
      websocketService.off('kitchen_update', handleKitchenUpdate as (...args: unknown[]) => void);
    };
  }, [
    autoConnect,
    connect,
    handleStatusChange,
    handleReconnecting,
    isConnected,
    onTableUpdate,
    onOrderUpdate,
    onNotification,
    onKitchenUpdate,
    subscribeToTables,
    tableIds
  ]);

  // Update table subscriptions when tableIds change
  useEffect(() => {
    if (isConnected && tableIds.length > 0) {
      // Calculate tables to subscribe/unsubscribe
      const currentTables = Array.from(subscribedTablesRef.current);
      const toSubscribe = tableIds.filter(id => !subscribedTablesRef.current.has(id));
      const toUnsubscribe = currentTables.filter(id => !tableIds.includes(id));

      if (toUnsubscribe.length > 0) {
        unsubscribeFromTables(toUnsubscribe);
      }
      if (toSubscribe.length > 0) {
        subscribeToTables(toSubscribe);
      }
    }
  }, [tableIds, isConnected, subscribeToTables, unsubscribeFromTables]);

  return {
    isConnected,
    status,
    reconnectAttempt,
    connect,
    disconnect,
    subscribeToTables,
    unsubscribeFromTables,
    notifyTableService,
    requestAssistance
  };
}