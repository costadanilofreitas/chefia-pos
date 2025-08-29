# KDS Type System Documentation

## 🎯 Overview

This document provides comprehensive documentation for the new TypeScript type system implemented in the KDS module. The type system ensures runtime safety, improves developer experience, and provides robust data validation for all KDS operations.

## 📊 Type System Architecture

### Core Type Categories

```typescript
// Type hierarchy overview
├── API Types              // Communication with backend
├── WebSocket Types        // Real-time communication
├── Storage Types          // Offline storage and caching
├── Event Types           // Event system management
├── Database Types        // IndexedDB record types
├── UI Types              // Component prop interfaces
└── Utility Types         // Helper and guard types
```

## 🔌 API Communication Types

### Base API Response Structure
```typescript
/**
 * Standard API response wrapper
 * @template T - The data type expected in the response
 */
export interface ApiResponse<T = unknown> {
  /** Response data payload */
  data: T;
  /** HTTP status code */
  status: number;
  /** Optional response message */
  message?: string;
}

/**
 * API error structure for consistent error handling
 */
export interface ApiError {
  /** Error message for display */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
  /** HTTP status code */
  status?: number;
  /** Additional error context */
  details?: Record<string, unknown>;
}
```

### Usage Example:
```typescript
// Typed API call
const fetchOrders = async (): Promise<ApiResponse<Order[]>> => {
  try {
    const response = await fetch('/api/kds/orders');
    const data: ApiResponse<Order[]> = await response.json();
    return data;
  } catch (error) {
    throw new ApiError({
      message: 'Failed to fetch orders',
      status: 500,
      details: { originalError: error }
    });
  }
};
```

## 📡 WebSocket Communication Types

### Message Structure
```typescript
/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage {
  /** Message type identifier */
  type: string;
  /** Message payload data */
  data?: WebSocketMessageData | null;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Generic WebSocket data payload
 */
export interface WebSocketMessageData {
  [key: string]: unknown;
}
```

### Order Update Messages
```typescript
/**
 * Order update data from WebSocket
 * Handles all order-related real-time updates
 */
export interface OrderUpdateData {
  /** Order identifier */
  id: string | number;
  /** Current order status */
  status?: string;
  /** Order items array */
  items?: Array<{
    id: string | number;
    name: string;
    quantity: number;
    status?: string;
    notes?: string;
  }>;
  /** Order creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
  /** Associated table number */
  table_number?: number;
  /** Customer name */
  customer_name?: string;
  /** Order priority level */
  priority?: 'low' | 'normal' | 'high';
}
```

### Station Update Messages
```typescript
/**
 * Station update data from WebSocket
 * Handles station status and capacity changes
 */
export interface StationUpdateData {
  /** Station identifier */
  station: string;
  /** Update urgency level */
  type?: 'urgent' | 'normal';
  /** Associated order ID if applicable */
  orderId?: string;
  /** Additional station data */
  [key: string]: unknown;
}
```

### Reconnection Information
```typescript
/**
 * WebSocket reconnection status information
 */
export interface ReconnectInfo {
  /** Current reconnection attempt number */
  attempt: number;
  /** Maximum allowed reconnection attempts */
  maxAttempts: number;
  /** Delay until next reconnection attempt (ms) */
  delay: number;
}
```

### WebSocket Event Handlers
```typescript
/**
 * Generic event handler function type
 * @template T - Expected event data type
 */
export type EventHandler<T = unknown> = (data?: T) => void;

/**
 * Event handler registry map
 */
export type EventHandlerMap = Map<string, EventHandler[]>;
```

## 💾 Storage and Caching Types

### Cache Entry Structure
```typescript
/**
 * Cache entry with TTL support
 * @template T - Cached data type
 */
export interface CacheEntry<T> {
  /** Cached data payload */
  data: T;
  /** Cache entry creation timestamp */
  timestamp: number;
  /** Time-to-live in milliseconds (optional) */
  ttl?: number;
}
```

### Storage Item Interface
```typescript
/**
 * Generic storage item structure
 */
export interface StorageItem {
  /** Unique identifier */
  id: string;
  /** Stored data payload */
  data: unknown;
  /** Storage timestamp */
  timestamp: number;
  /** Optional TTL */
  ttl?: number;
}
```

### Database Record Types
```typescript
/**
 * Base database record interface
 * All database entities extend this structure
 */
export interface DBRecord {
  /** Record identifier */
  id: string | number;
  /** Record timestamp */
  timestamp?: number;
  /** Sync status with server */
  synced?: boolean;
  /** Additional properties */
  [key: string]: unknown;
}
```

### Specialized Database Records
```typescript
/**
 * Order database record
 * Extends Order with database metadata
 */
export type OrderDBRecord = Order & {
  timestamp?: number;
  synced?: boolean;
};

/**
 * Station database record
 * Extends Station with database metadata
 */
export type StationDBRecord = Station & {
  timestamp?: number;
  synced?: boolean;
};

/**
 * Settings database record
 */
export interface SettingsDBRecord extends DBRecord {
  /** Setting key identifier */
  key: string;
  /** Setting value */
  value: unknown;
}
```

## 🗂️ Logging and Monitoring Types

### Log Entry Structure
```typescript
/**
 * Log entry for offline storage and debugging
 */
export interface LogEntry {
  /** Log timestamp */
  timestamp: number;
  /** Log severity level */
  level: 'info' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
  /** Optional log data payload */
  data?: unknown;
  /** Optional context information */
  context?: string;
}
```

### Usage Example:
```typescript
// Structured logging
await offlineStorage.log('Order status updated', {
  orderId: '123',
  oldStatus: 'pending',
  newStatus: 'preparing',
  station: 'kitchen-1'
});
```

## 🌐 Browser Compatibility Types

### Audio Context Support
```typescript
/**
 * Extended window interface for audio context support
 */
export interface BrowserWindow extends Window {
  /** Webkit audio context for Safari compatibility */
  webkitAudioContext?: typeof AudioContext;
}

// Usage for cross-browser audio
const audioContext = new (window.AudioContext || 
  (window as BrowserWindow).webkitAudioContext)();
```

## 🛡️ Type Guards and Validation

### Runtime Type Validation
```typescript
/**
 * Type guard for OrderUpdateData validation
 */
export function isOrderUpdateData(data: unknown): data is OrderUpdateData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  // Validate required id field
  if (!('id' in obj)) {
    return false;
  }
  
  const id = obj.id;
  if (typeof id !== 'string' && typeof id !== 'number') {
    return false;
  }
  
  // Validate optional fields if present
  if ('status' in obj && typeof obj.status !== 'string') {
    return false;
  }
  
  if ('priority' in obj) {
    const validPriorities = ['low', 'normal', 'high'];
    if (!validPriorities.includes(obj.priority as string)) {
      return false;
    }
  }
  
  // Validate items array if present
  if ('items' in obj) {
    if (!Array.isArray(obj.items)) {
      return false;
    }
    
    for (const item of obj.items) {
      if (!isValidOrderItem(item)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Type guard for StationUpdateData validation
 */
export function isStationUpdateData(data: unknown): data is StationUpdateData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  // Validate required station field
  if (!('station' in obj) || typeof obj.station !== 'string') {
    return false;
  }
  
  // Validate optional type field
  if ('type' in obj) {
    const validTypes = ['urgent', 'normal'];
    if (!validTypes.includes(obj.type as string)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate individual order item structure
 */
function isValidOrderItem(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  
  const obj = item as Record<string, unknown>;
  
  return (
    ('id' in obj && (typeof obj.id === 'string' || typeof obj.id === 'number')) &&
    ('name' in obj && typeof obj.name === 'string') &&
    ('quantity' in obj && typeof obj.quantity === 'number')
  );
}
```

### Usage in WebSocket Handler:
```typescript
// Safe message handling with type guards
ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    
    if (message.type === 'order.updated' && isOrderUpdateData(message.data)) {
      // TypeScript now knows message.data is OrderUpdateData
      handleOrderUpdate(message.data);
    } else if (message.type === 'station.updated' && isStationUpdateData(message.data)) {
      // TypeScript now knows message.data is StationUpdateData
      handleStationUpdate(message.data);
    } else {
      // Handle unknown message types
      offlineStorage.log('Unknown message type received', {
        type: message.type,
        data: message.data
      });
    }
  } catch (error) {
    offlineStorage.log('Failed to parse WebSocket message', { error, raw: event.data });
  }
};
```

## 🔄 Service Integration Types

### KDS Service Integration
```typescript
// Import actual service types for consistency
import type { Order, Station } from '../services/kdsService';

/**
 * Extended order type for UI components
 * Adds display-specific properties to base Order type
 */
export interface OrderDisplayData extends Order {
  /** Calculated urgency level based on time elapsed */
  urgencyLevel?: 'normal' | 'warning' | 'urgent';
  /** Formatted display time */
  displayTime?: string;
  /** CSS class names for styling */
  className?: string;
}

/**
 * Station with real-time status information
 */
export interface StationDisplayData extends Station {
  /** Current order count in station */
  currentOrderCount?: number;
  /** Station capacity utilization percentage */
  utilizationPercentage?: number;
  /** Whether station has urgent orders */
  hasUrgentOrders?: boolean;
}
```

## 📝 Component Prop Types

### Order Card Props
```typescript
/**
 * Props for OrderCard component
 */
export interface OrderCardProps {
  /** Order data to display */
  order: OrderDisplayData;
  /** Order status change handler */
  onStatusChange: (orderId: string | number, status: string) => void;
  /** Individual item status change handler */
  onItemStatusChange: (orderId: string | number, itemId: string | number, status: string) => void;
  /** Next available status for the order */
  nextStatus: string;
  /** Whether the card is currently selected */
  selected?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### Alert System Props
```typescript
/**
 * Alert data structure
 */
export interface AlertData {
  /** Unique alert identifier */
  id: string;
  /** Alert type determines styling and behavior */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Alert title */
  title: string;
  /** Alert message content */
  message: string;
  /** Auto-dismiss timeout in milliseconds */
  timeout?: number;
  /** Whether alert can be manually dismissed */
  dismissible?: boolean;
  /** Additional alert data */
  data?: Record<string, unknown>;
}

/**
 * Props for AlertSystem component
 */
export interface AlertSystemProps {
  /** Array of active alerts */
  alerts: AlertData[];
  /** Alert dismissal handler */
  onAlertClose: (alertId: string) => void;
  /** Maximum number of visible alerts */
  maxVisible?: number;
  /** Alert positioning */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}
```

## 🎛️ Hook Types

### Custom Hook Return Types
```typescript
/**
 * Return type for useKDSOrders hook
 */
export interface UseKDSOrdersReturn {
  /** Current orders array */
  orders: Order[];
  /** Loading state indicator */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Order statistics */
  stats: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    completed: number;
  };
  /** Load orders function */
  loadOrders: () => Promise<void>;
  /** Update order status */
  updateOrderStatus: (orderId: string | number, status: string) => Promise<void>;
  /** Update individual item status */
  updateItemStatus: (orderId: string | number, itemId: string | number, status: string) => Promise<void>;
  /** Set error state */
  setError: (error: string | null) => void;
}

/**
 * Return type for useKDSWebSocket hook
 */
export interface UseKDSWebSocketReturn {
  /** WebSocket connection status */
  isConnected: boolean;
  /** Connection error message */
  connectionError: string | null;
  /** Join a station for updates */
  joinStation: (stationId: string) => void;
  /** Leave a station */
  leaveStation: (stationId: string) => void;
  /** Mark order as started */
  markOrderStarted: (orderId: string) => void;
  /** Mark order as completed */
  markOrderCompleted: (orderId: string) => void;
  /** Send custom message */
  sendMessage: (type: string, data?: unknown) => boolean;
}

/**
 * Return type for useKDSAlerts hook
 */
export interface UseKDSAlertsReturn {
  /** Active alerts array */
  alerts: AlertData[];
  /** Remove alert by ID */
  removeAlert: (alertId: string) => void;
  /** Clear all alerts */
  clearAlerts: () => void;
  /** Show new order alert */
  newOrder: (orderId: string) => void;
  /** Show urgent order alert */
  urgentOrder: (orderId: string) => void;
  /** Show order ready alert */
  orderReady: (orderId: string) => void;
  /** Show delayed order alert */
  orderDelayed: (orderId: string, minutes: number) => void;
}
```

## 🧪 Testing Types

### Mock Data Types
```typescript
/**
 * Mock order factory function type
 */
export type MockOrderFactory = (overrides?: Partial<Order>) => Order;

/**
 * Mock WebSocket instance type
 */
export interface MockWebSocket {
  close: jest.MockedFunction<() => void>;
  send: jest.MockedFunction<(data: string) => void>;
  addEventListener: jest.MockedFunction<(type: string, listener: EventListener) => void>;
  removeEventListener: jest.MockedFunction<(type: string, listener: EventListener) => void>;
  readyState: number;
  onopen?: ((event: Event) => void) | null;
  onclose?: ((event: CloseEvent) => void) | null;
  onmessage?: ((event: MessageEvent) => void) | null;
  onerror?: ((event: Event) => void) | null;
}

/**
 * Test utilities type
 */
export interface TestUtils {
  createMockOrder: MockOrderFactory;
  createMockWebSocket: () => MockWebSocket;
  mockIndexedDB: () => void;
  flushPromises: () => Promise<void>;
  waitForNextTick: () => Promise<void>;
}
```

## 🔧 Configuration Types

### Service Configuration
```typescript
/**
 * WebSocket service configuration
 */
export interface WebSocketConfig {
  /** WebSocket server URL */
  url?: string;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
}

/**
 * Offline storage configuration
 */
export interface OfflineStorageConfig {
  /** IndexedDB database name */
  dbName?: string;
  /** Database version */
  version?: number;
  /** Object store names */
  stores?: string[];
}

/**
 * API service configuration
 */
export interface APIConfig {
  /** Base API URL */
  baseURL: string;
  /** WebSocket URL */
  wsURL: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Default headers */
  headers?: Record<string, string>;
}
```

## 📊 Performance and Metrics Types

### Performance Monitoring
```typescript
/**
 * Performance metrics data
 */
export interface PerformanceMetrics {
  /** Component render time in milliseconds */
  renderTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Cache hit rate percentage */
  cacheHitRate: number;
  /** Network request count */
  networkRequests: number;
  /** Average response time */
  averageResponseTime: number;
}

/**
 * Bundle analysis information
 */
export interface BundleAnalysis {
  /** Total bundle size in bytes */
  totalSize: number;
  /** Individual chunk sizes */
  chunks: Array<{
    name: string;
    size: number;
    percentage: number;
  }>;
  /** Dependency breakdown */
  dependencies: Record<string, number>;
}
```

## 💡 Usage Examples

### Complete Type-Safe Order Processing
```typescript
// Type-safe order processing example
const processOrderUpdate = async (rawData: unknown): Promise<void> => {
  // Validate incoming data
  if (!isOrderUpdateData(rawData)) {
    await offlineStorage.log('Invalid order update data received', { data: rawData });
    return;
  }

  // TypeScript now knows rawData is OrderUpdateData
  const orderData: OrderUpdateData = rawData;

  // Transform to display format
  const displayOrder: OrderDisplayData = {
    ...orderData,
    urgencyLevel: getUrgencyLevel(orderData.created_at || ''),
    displayTime: formatTime(orderData.created_at || ''),
    className: getOrderClassName(orderData.priority || 'normal')
  };

  // Store with proper typing
  const dbRecord: OrderDBRecord = {
    ...displayOrder,
    timestamp: Date.now(),
    synced: false
  };

  await offlineStorage.saveOrder(dbRecord);

  // Emit typed event
  eventEmitter.emit('order_processed', displayOrder);
};
```

### Type-Safe WebSocket Communication
```typescript
// Type-safe WebSocket message handling
class TypedWebSocketHandler {
  private ws: WebSocket;
  
  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.handleError('Invalid message format', { error, raw: event.data });
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'order.updated':
        if (isOrderUpdateData(message.data)) {
          this.handleOrderUpdate(message.data);
        }
        break;
        
      case 'station.updated':
        if (isStationUpdateData(message.data)) {
          this.handleStationUpdate(message.data);
        }
        break;
        
      default:
        this.handleUnknownMessage(message);
    }
  }

  private handleOrderUpdate(data: OrderUpdateData): void {
    // TypeScript knows exact type here
    offlineStorage.log('Order updated', {
      orderId: data.id,
      status: data.status,
      items: data.items?.length || 0
    });
  }

  private handleStationUpdate(data: StationUpdateData): void {
    // TypeScript knows exact type here
    if (data.type === 'urgent') {
      alertSystem.urgentOrder(data.orderId || '');
    }
  }
}
```

## 🎯 Best Practices

### 1. Type Safety Guidelines
- **Always use type guards** for external data validation
- **Prefer specific types** over `unknown` or `any`
- **Use generic types** for reusable components
- **Implement proper error boundaries** with typed errors

### 2. Performance Considerations
- **Memoize type guards** for frequently called validations
- **Use type assertions sparingly** and only when certain
- **Prefer interfaces over types** for extensibility
- **Use const assertions** for immutable data structures

### 3. Maintenance Guidelines
- **Keep types close to usage** - colocate when possible
- **Document complex types** with JSDoc comments
- **Version type changes** carefully to avoid breaking changes
- **Use discriminated unions** for variant types

## 🔄 Future Enhancements

### Planned Type System Improvements:
1. **Schema validation** with runtime type checking library
2. **Automatic type generation** from OpenAPI specifications
3. **Enhanced error types** with stack trace information
4. **Performance monitoring types** for detailed metrics
5. **Internationalization types** for multi-language support

The comprehensive type system ensures type safety, improves developer productivity, and provides robust runtime validation for all KDS operations. This foundation supports the module's evolution toward production-ready reliability and maintainability.