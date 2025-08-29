# KDS Architecture Patterns & Technical Implementation

## 🎯 Overview

This document details the architectural patterns and technical implementations that form the foundation of the modernized KDS module. These patterns establish a scalable, maintainable, and high-performance architecture following industry best practices.

## 🏗️ Architectural Layers

### System Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
├─────────────────────────────────────────────────────────┤
│  React Components │  Hooks  │  Context  │  UI Utils     │
│  - OrderCard      │  - API  │  - Theme  │  - Constants  │
│  - AlertSystem    │  - WS   │  - Error  │  - Helpers    │
│  - Timer          │  - Data │  - Auth   │  - Validators │
└─────────────────────────────────────────────────────────┘
                        ↕ Data Flow
┌─────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                         │
├─────────────────────────────────────────────────────────┤
│  API Service │  WebSocket  │  Storage  │  Audio Service │
│  - REST API  │  - Real-time │ - Cache   │  - Sound Mgmt │
│  - Caching   │  - Events    │ - IndexedDB│ - Notifications│
│  - Retry     │  - Reconnect │ - Sync    │  - Alerts     │
└─────────────────────────────────────────────────────────┘
                        ↕ External Communication
┌─────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────┤
│  Browser APIs │  IndexedDB  │  WebSocket │  LocalStorage │
│  - Notification│  - Offline │  - Backend │  - Preferences│
│  - Audio      │  - Cache    │  - Updates │  - Settings   │
│  - Storage    │  - Sync     │  - Events  │  - State      │
└─────────────────────────────────────────────────────────┘
```

## 🧩 Core Design Patterns

### 1. Dual-Layer Caching Pattern

**Implementation Strategy:**
```typescript
/**
 * Dual-layer caching architecture for optimal performance
 * Layer 1: Memory Cache (fastest access ~1ms)
 * Layer 2: IndexedDB (persistent ~10ms)
 */
class DualLayerCache<T> {
  private memoryCache = new Map<string, CacheEntry<T>>();
  private persistentCache: OfflineStorage;

  constructor(private storeName: string) {
    this.persistentCache = new OfflineStorage();
  }

  async get(key: string): Promise<T | null> {
    // Strategy 1: Check memory cache first
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && this.isValid(memoryCached)) {
      return memoryCached.data;
    }

    // Strategy 2: Check persistent cache
    const persistentCached = await this.persistentCache.get<T>(this.storeName, key);
    if (persistentCached && this.isValid(persistentCached)) {
      // Promote to memory cache for faster future access
      this.memoryCache.set(key, persistentCached);
      return persistentCached.data;
    }

    return null;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ...(ttl && { ttl })
    };

    // Write to both layers simultaneously
    this.memoryCache.set(key, entry);
    await this.persistentCache.set(this.storeName, key, entry, ttl);
  }

  private isValid<U>(entry: CacheEntry<U>): boolean {
    return !entry.ttl || (Date.now() - entry.timestamp) < entry.ttl;
  }
}
```

**Benefits:**
- ✅ **Sub-millisecond access** for frequently used data
- ✅ **Persistent storage** survives page reloads
- ✅ **Automatic promotion** of hot data to memory
- ✅ **TTL-based expiration** prevents stale data

### 2. Event-Driven WebSocket Pattern

**WebSocket Service Architecture:**
```typescript
/**
 * Event-driven WebSocket service with automatic reconnection
 * and message queuing for reliability
 */
class EventDrivenWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private reconnectConfig: ReconnectConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig) {
    super();
    this.reconnectConfig = {
      attempts: 0,
      maxAttempts: config.maxReconnectAttempts || 10,
      baseDelay: config.reconnectDelay || 3000,
      maxDelay: 30000
    };
  }

  // Connection Management with State Machine
  async connect(): Promise<void> {
    this.setStatus('connecting');
    
    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setStatus('connected');
      this.reconnectConfig.attempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.routeMessage(message);
      } catch (error) {
        this.emit('parse_error', { error, raw: event.data });
      }
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      this.setStatus('disconnected');
      this.stopHeartbeat();
      this.emit('disconnected', event);
      
      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  // Message Routing with Type Safety
  private routeMessage(message: WebSocketMessage): void {
    const { type, data } = message;

    // Route based on message type patterns
    if (type.startsWith('order.')) {
      this.emit('order_event', { type, data });
      
      // Specific order events
      switch (type) {
        case 'order.created':
          this.emit('order_created', data);
          break;
        case 'order.updated':
          this.emit('order_updated', data);
          break;
        case 'order.status_changed':
          this.emit('order_status_changed', data);
          break;
      }
    } else if (type.startsWith('station.')) {
      this.emit('station_event', { type, data });
    } else if (type === 'ping') {
      this.send({ type: 'pong', data: null, timestamp: Date.now() });
    } else {
      this.emit('unknown_message', message);
    }
  }

  // Intelligent Reconnection with Exponential Backoff
  private scheduleReconnect(): void {
    if (this.reconnectConfig.attempts >= this.reconnectConfig.maxAttempts) {
      this.emit('max_reconnect_attempts');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectConfig.attempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectConfig.baseDelay * Math.pow(1.5, this.reconnectConfig.attempts - 1),
      this.reconnectConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitteredDelay = delay + (Math.random() * 1000);

    setTimeout(() => {
      this.connect();
    }, jitteredDelay);

    this.emit('reconnecting', {
      attempt: this.reconnectConfig.attempts,
      maxAttempts: this.reconnectConfig.maxAttempts,
      delay: jitteredDelay
    });
  }

  // Message Queuing for Reliability
  send(message: WebSocketMessage): boolean {
    if (this.isConnected()) {
      try {
        this.ws?.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    // Implement message priority and size limits
    if (this.messageQueue.length >= 100) {
      // Remove oldest messages to prevent memory bloat
      this.messageQueue.shift();
    }
    
    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Heartbeat for Connection Health
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          data: null,
          timestamp: Date.now()
        });
      }
    }, this.config.heartbeatInterval);
  }
}
```

### 3. Context-Based State Management Pattern

**Replacing Redux with Context API:**
```typescript
/**
 * Context-based state management replacing Redux
 * Provides type-safe state management with minimal boilerplate
 */

// State Structure
interface KDSState {
  orders: Order[];
  stations: Station[];
  selectedStation: string;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  alerts: Alert[];
}

// Action Types
type KDSAction =
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'REMOVE_ORDER'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: KDSState['connectionStatus'] }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'REMOVE_ALERT'; payload: string };

// Reducer with Type Safety
function kdsReducer(state: KDSState, action: KDSAction): KDSState {
  switch (action.type) {
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
      
    case 'ADD_ORDER':
      return { 
        ...state, 
        orders: [action.payload, ...state.orders] 
      };
      
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id
            ? { ...order, ...action.payload.updates }
            : order
        )
      };
      
    case 'REMOVE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload)
      };
      
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
      
    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, action.payload]
      };
      
    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload)
      };
      
    default:
      return state;
  }
}

// Context Provider with Services Integration
const KDSContext = createContext<{
  state: KDSState;
  dispatch: Dispatch<KDSAction>;
  services: {
    api: ApiService;
    websocket: WebSocketService;
    storage: OfflineStorage;
    audio: AudioService;
  };
} | null>(null);

export const KDSProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(kdsReducer, initialState);
  
  // Service instances
  const services = useMemo(() => ({
    api: new ApiService(),
    websocket: new WebSocketService(),
    storage: new OfflineStorage(),
    audio: new AudioService()
  }), []);

  // WebSocket Integration
  useEffect(() => {
    const { websocket } = services;
    
    websocket.on('connected', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
    });

    websocket.on('disconnected', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    });

    websocket.on('reconnecting', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'reconnecting' });
    });

    websocket.on('order_created', (orderData: OrderUpdateData) => {
      if (isOrderUpdateData(orderData)) {
        dispatch({ type: 'ADD_ORDER', payload: transformToOrder(orderData) });
        
        // Trigger audio notification
        services.audio.playSound('new-order');
        
        // Add alert
        dispatch({
          type: 'ADD_ALERT',
          payload: {
            id: `order-${orderData.id}`,
            type: 'info',
            title: 'New Order',
            message: `Order #${orderData.id} received`,
            timeout: 5000
          }
        });
      }
    });

    websocket.on('order_updated', (orderData: OrderUpdateData) => {
      if (isOrderUpdateData(orderData)) {
        dispatch({
          type: 'UPDATE_ORDER',
          payload: {
            id: orderData.id.toString(),
            updates: transformToOrder(orderData)
          }
        });
      }
    });

    websocket.connect();

    return () => {
      websocket.disconnect();
    };
  }, [services]);

  return (
    <KDSContext.Provider value={{ state, dispatch, services }}>
      {children}
    </KDSContext.Provider>
  );
};

// Custom Hook for Context Access
export const useKDS = () => {
  const context = useContext(KDSContext);
  if (!context) {
    throw new Error('useKDS must be used within KDSProvider');
  }
  return context;
};
```

### 4. Component Composition Pattern

**Composable Component Architecture:**
```typescript
/**
 * Component composition pattern for maximum reusability
 * and maintainability
 */

// Base Components
interface BaseComponentProps {
  children?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

// Card Component System
const Card = {
  Root: ({ children, className = '', ...props }: BaseComponentProps) => (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  ),

  Header: ({ children, className = '', ...props }: BaseComponentProps) => (
    <div 
      className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  ),

  Body: ({ children, className = '', ...props }: BaseComponentProps) => (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  ),

  Footer: ({ children, className = '', ...props }: BaseComponentProps) => (
    <div 
      className={`px-4 py-3 border-t border-gray-200 dark:border-gray-700 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
};

// Timer Component System
const Timer = {
  Display: memo(({ startTime, urgencyLevel }: { 
    startTime: string; 
    urgencyLevel: 'normal' | 'warning' | 'urgent';
  }) => {
    const [elapsed, setElapsed] = useState(0);
    const rafRef = useRef<number>();

    useEffect(() => {
      const startTimestamp = new Date(startTime).getTime();
      
      const animate = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTimestamp) / 1000);
        setElapsed(diff);
        
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, [startTime]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const colorClasses = {
      normal: 'text-green-500',
      warning: 'text-yellow-500',
      urgent: 'text-red-500 animate-pulse'
    };

    return (
      <span className={`font-mono text-2xl font-bold ${colorClasses[urgencyLevel]}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    );
  }),

  Badge: ({ urgencyLevel }: { urgencyLevel: 'normal' | 'warning' | 'urgent' }) => {
    const badgeClasses = {
      normal: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-100 text-red-800'
    };

    const labels = {
      normal: 'On Time',
      warning: 'Delayed',
      urgent: 'Critical'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badgeClasses[urgencyLevel]}`}>
        {labels[urgencyLevel]}
      </span>
    );
  }
};

// Composed OrderCard using composition pattern
export const OrderCard = memo<OrderCardProps>(({ order, onStatusChange, nextStatus }) => {
  const urgencyLevel = useMemo(() => 
    getUrgencyLevel(order.created_at), 
    [order.created_at]
  );

  const handleStatusChange = useCallback(() => {
    onStatusChange(order.id, nextStatus);
  }, [order.id, nextStatus, onStatusChange]);

  return (
    <Card.Root 
      className={urgencyLevel === 'urgent' ? 'ring-2 ring-red-500' : ''}
      data-testid={`order-card-${order.id}`}
    >
      <Card.Header>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Order #{order.id}</h3>
          <Timer.Badge urgencyLevel={urgencyLevel} />
        </div>
        {order.table_number && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Table {order.table_number}
          </p>
        )}
      </Card.Header>

      <Card.Body>
        <div className="mb-4">
          <Timer.Display startTime={order.created_at} urgencyLevel={urgencyLevel} />
        </div>

        <OrderItemList items={order.items} />

        {order.customer_name && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Customer: {order.customer_name}
          </div>
        )}
      </Card.Body>

      <Card.Footer>
        <Button
          onClick={handleStatusChange}
          variant={urgencyLevel === 'urgent' ? 'danger' : 'primary'}
          fullWidth
        >
          {nextStatus === 'preparing' ? 'Start Cooking' : 'Mark Ready'}
        </Button>
      </Card.Footer>
    </Card.Root>
  );
});
```

### 5. Custom Hook Architecture Pattern

**Specialized Hooks for Business Logic:**
```typescript
/**
 * Custom hooks pattern for encapsulating business logic
 * and state management
 */

// Data Fetching Hook
export const useKDSOrders = (options: UseKDSOrdersOptions = {}) => {
  const { selectedStation, onNewOrder, onOrderUpdate } = options;
  const { services, dispatch } = useKDS();
  
  const [localState, setLocalState] = useState({
    loading: false,
    error: null as string | null
  });

  // Memoized order filtering
  const filteredOrders = useMemo(() => {
    if (!selectedStation || selectedStation === 'all') {
      return state.orders;
    }
    
    return state.orders.filter(order =>
      order.items.some(item => item.station === selectedStation)
    );
  }, [state.orders, selectedStation]);

  // Memoized statistics
  const stats = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.total++;
        acc[order.status as keyof typeof acc]++;
        return acc;
      },
      { total: 0, pending: 0, preparing: 0, ready: 0, completed: 0 }
    );
  }, [filteredOrders]);

  // Load orders function
  const loadOrders = useCallback(async () => {
    setLocalState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const cacheKey = `orders:${selectedStation || 'all'}`;
      let orders = await services.storage.get<Order[]>(cacheKey);

      if (!orders || navigator.onLine) {
        // Fetch from API
        const response = await services.api.get<Order[]>('/kds/orders', {
          params: selectedStation ? { station: selectedStation } : {}
        });
        
        orders = response.data;
        
        // Cache for 5 minutes
        await services.storage.set(cacheKey, orders, 300000);
      }

      dispatch({ type: 'SET_ORDERS', payload: orders });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load orders';
      setLocalState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setLocalState(prev => ({ ...prev, loading: false }));
    }
  }, [selectedStation, services, dispatch]);

  // Update order status
  const updateOrderStatus = useCallback(async (
    orderId: string | number, 
    status: string
  ) => {
    try {
      await services.api.put(`/kds/orders/${orderId}/status`, { status });
      
      dispatch({
        type: 'UPDATE_ORDER',
        payload: { id: orderId.toString(), updates: { status } }
      });

      // Invalidate cache
      await services.storage.delete('orders', `orders:${selectedStation || 'all'}`);
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }, [services, dispatch, selectedStation]);

  // Auto-refresh effect
  useEffect(() => {
    loadOrders();
    
    const interval = setInterval(loadOrders, TIMING_CONSTANTS.AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // WebSocket event handling
  useEffect(() => {
    const handleOrderCreated = (orderData: OrderUpdateData) => {
      const order = transformToOrder(orderData);
      onNewOrder?.(order);
      
      dispatch({ type: 'ADD_ORDER', payload: order });
    };

    const handleOrderUpdated = (orderData: OrderUpdateData) => {
      const order = transformToOrder(orderData);
      onOrderUpdate?.(order);
      
      dispatch({
        type: 'UPDATE_ORDER',
        payload: { id: order.id, updates: order }
      });
    };

    services.websocket.on('order_created', handleOrderCreated);
    services.websocket.on('order_updated', handleOrderUpdated);

    return () => {
      services.websocket.off('order_created', handleOrderCreated);
      services.websocket.off('order_updated', handleOrderUpdated);
    };
  }, [services.websocket, onNewOrder, onOrderUpdate, dispatch]);

  return {
    orders: filteredOrders,
    loading: localState.loading,
    error: localState.error,
    stats,
    loadOrders,
    updateOrderStatus
  };
};

// Alert Management Hook
export const useKDSAlerts = (options: UseKDSAlertsOptions = {}) => {
  const { soundEnabled = true, autoRemoveDelay = 5000 } = options;
  const { services } = useKDS();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const fullAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setAlerts(prev => [...prev, fullAlert]);

    // Auto-remove if specified
    if (autoRemoveDelay > 0) {
      setTimeout(() => {
        removeAlert(fullAlert.id);
      }, autoRemoveDelay);
    }

    // Play sound if enabled
    if (soundEnabled && alert.type === 'urgent') {
      services.audio.playSound('urgent-alert');
    } else if (soundEnabled && alert.type === 'success') {
      services.audio.playSound('success');
    }

    return fullAlert.id;
  }, [soundEnabled, autoRemoveDelay, services.audio, removeAlert]);

  // Specialized alert creators
  const alertCreators = useMemo(() => ({
    newOrder: (orderId: string) => addAlert({
      type: 'info',
      title: 'New Order',
      message: `Order #${orderId} has been received`,
      timeout: 3000
    }),

    urgentOrder: (orderId: string) => addAlert({
      type: 'urgent',
      title: 'Urgent Order!',
      message: `Order #${orderId} requires immediate attention`,
      timeout: 10000
    }),

    orderReady: (orderId: string) => addAlert({
      type: 'success',
      title: 'Order Ready',
      message: `Order #${orderId} is ready for pickup`,
      timeout: 5000
    }),

    orderDelayed: (orderId: string, minutes: number) => addAlert({
      type: 'warning',
      title: 'Order Delayed',
      message: `Order #${orderId} has been waiting for ${minutes} minutes`,
      timeout: 8000
    })
  }), [addAlert]);

  return {
    alerts,
    removeAlert,
    addAlert,
    clearAllAlerts: () => setAlerts([]),
    ...alertCreators
  };
};
```

## 🔄 Integration Patterns

### Service Integration Pattern

**Unified Service Layer:**
```typescript
/**
 * Service integration pattern for consistent API access
 * across the application
 */
class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }
}

// Service initialization
export const initializeServices = async () => {
  const registry = ServiceRegistry.getInstance();

  // Initialize storage first
  const storage = new OfflineStorage();
  await storage.init();
  registry.register('storage', storage);

  // Initialize API service with storage
  const api = new ApiService({
    baseURL: API_CONFIG.BASE_URL,
    storage: registry.get<OfflineStorage>('storage')
  });
  registry.register('api', api);

  // Initialize WebSocket service
  const websocket = new WebSocketService({
    url: API_CONFIG.WS_URL
  });
  registry.register('websocket', websocket);

  // Initialize audio service
  const audio = new AudioService();
  registry.register('audio', audio);

  return registry;
};

// Service hook for component access
export const useServices = () => {
  const registry = useMemo(() => ServiceRegistry.getInstance(), []);
  
  return {
    api: registry.get<ApiService>('api'),
    websocket: registry.get<WebSocketService>('websocket'),
    storage: registry.get<OfflineStorage>('storage'),
    audio: registry.get<AudioService>('audio')
  };
};
```

## 📊 Performance Architecture Patterns

### 1. Virtual Scrolling Architecture

**High-Performance List Rendering:**
```typescript
/**
 * Virtual scrolling implementation for handling large datasets
 * efficiently without performance degradation
 */
export const useVirtualScrolling = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items
      .slice(visibleRange.startIndex, visibleRange.endIndex)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index
      }));
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};
```

### 2. Memoization Strategy Pattern

**Intelligent Component Memoization:**
```typescript
/**
 * Strategic memoization for performance optimization
 */

// Higher-order component for memoization
export const withMemoization = <P extends object>(
  Component: React.ComponentType<P>,
  arePropsEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, arePropsEqual);
};

// Custom comparison for complex props
const orderCardPropsEqual = (prevProps: OrderCardProps, nextProps: OrderCardProps) => {
  // Only re-render if essential order data changes
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.created_at === nextProps.order.created_at &&
    prevProps.nextStatus === nextProps.nextStatus &&
    prevProps.selected === nextProps.selected &&
    JSON.stringify(prevProps.order.items) === JSON.stringify(nextProps.order.items)
  );
};

export const OptimizedOrderCard = withMemoization(OrderCard, orderCardPropsEqual);
```

## 🎯 Error Handling Architecture

### Comprehensive Error Boundary Pattern

**Error Handling Strategy:**
```typescript
/**
 * Comprehensive error handling with recovery strategies
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class KDSErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<any> },
  ErrorBoundaryState
> {
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with full context
    offlineStorage.log('Component error boundary triggered', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    this.setState({
      error,
      errorInfo
    });

    // Send error to monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send to error reporting service
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          userId: localStorage.getItem('userId') || 'anonymous'
        })
      });
    } catch (reportingError) {
      // Fail silently for error reporting
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return <Fallback 
          error={this.state.error}
          retry={this.handleRetry}
          reload={this.handleReload}
        />;
      }

      return (
        <div className="error-boundary-fallback">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          
          {this.state.retryCount < this.maxRetries && (
            <button onClick={this.handleRetry}>
              Try again ({this.maxRetries - this.state.retryCount} attempts left)
            </button>
          )}
          
          <button onClick={this.handleReload}>
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 🎯 Summary

The architectural patterns implemented in the KDS module provide:

### ✅ **Scalability**:
- Modular component architecture
- Service-oriented design
- Event-driven communication
- Efficient state management

### ✅ **Performance**:
- Dual-layer caching strategy
- Virtual scrolling capability
- Strategic memoization
- Optimized bundle splitting

### ✅ **Maintainability**:
- Clear separation of concerns
- Type-safe implementations
- Comprehensive error handling
- Consistent patterns across components

### ✅ **Reliability**:
- Automatic reconnection logic
- Message queuing for offline scenarios
- Comprehensive error boundaries
- Graceful degradation strategies

### ✅ **Developer Experience**:
- Custom hooks for business logic
- Reusable component compositions
- Comprehensive TypeScript types
- Clear architectural boundaries

These patterns establish a solid foundation for the KDS module's continued evolution and serve as a reference implementation for other modules in the system. The architecture supports both current requirements and future enhancements while maintaining high performance and developer productivity.