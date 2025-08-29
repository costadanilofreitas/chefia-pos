import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService, WebSocketStatus } from '../services/websocket';
import { OrderUpdateData, StationUpdateData, ReconnectInfo } from '../types';

// Type guards for safer type assertions
function isWebSocketStatus(value: unknown): value is WebSocketStatus {
  return (
    typeof value === 'string' &&
    ['connecting', 'connected', 'disconnected', 'reconnecting'].includes(value)
  );
}

function isOrderUpdateData(value: unknown): value is OrderUpdateData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value
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

function isReconnectInfo(value: unknown): value is ReconnectInfo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'attempt' in value &&
    'maxAttempts' in value &&
    'delay' in value
  );
}

interface UseWebSocketOptions {
  onOrderUpdate?: (data: OrderUpdateData) => void;
  onStationUpdate?: (data: StationUpdateData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: (info: ReconnectInfo) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const optionsRef = useRef(options);
  
  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Setup WebSocket connection and event handlers
  useEffect(() => {
    const handleStatusChange = (...args: unknown[]) => {
      const newStatus = args[0];
      if (isWebSocketStatus(newStatus)) {
        setStatus(newStatus);
        setIsConnected(newStatus === 'connected');
      }
    };

    const handleOrderUpdate = (...args: unknown[]) => {
      const data = args[0];
      if (isOrderUpdateData(data)) {
        optionsRef.current.onOrderUpdate?.(data);
      }
    };

    const handleStationUpdate = (...args: unknown[]) => {
      const data = args[0];
      if (isStationUpdateData(data)) {
        optionsRef.current.onStationUpdate?.(data);
      }
    };

    const handleConnected = () => {
      setQueueSize(0);
      optionsRef.current.onConnected?.();
    };

    const handleDisconnected = () => {
      optionsRef.current.onDisconnected?.();
    };

    const handleReconnecting = (...args: unknown[]) => {
      const info = args[0];
      if (isReconnectInfo(info)) {
        optionsRef.current.onReconnecting?.(info);
      }
    };

    // Register event listeners
    websocketService.on('status_changed', handleStatusChange);
    websocketService.on('order_update', handleOrderUpdate);
    websocketService.on('station_update', handleStationUpdate);
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('reconnecting', handleReconnecting);

    // Auto-connect if enabled
    if (options.autoConnect !== false) {
      websocketService.connect();
    }

    // Set initial status
    setStatus(websocketService.getStatus());
    setIsConnected(websocketService.isConnected());

    // Cleanup
    return () => {
      websocketService.off('status_changed', handleStatusChange);
      websocketService.off('order_update', handleOrderUpdate);
      websocketService.off('station_update', handleStationUpdate);
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('reconnecting', handleReconnecting);
    };
  }, [options.autoConnect]);

  // Update queue size periodically
  useEffect(() => {
    const QUEUE_UPDATE_INTERVAL = 1000; // 1 second
    const interval = setInterval(() => {
      setQueueSize(websocketService.getQueueSize());
    }, QUEUE_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(() => {
    websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const sendMessage = useCallback((type: string, data: Record<string, unknown>) => {
    return websocketService.send({
      type,
      data,
      timestamp: Date.now()
    });
  }, []);

  return {
    status,
    isConnected,
    queueSize,
    connect,
    disconnect,
    sendMessage
  };
}