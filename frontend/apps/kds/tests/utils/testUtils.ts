/**
 * Test utilities and helper functions for KDS tests
 */

import { Order, Station, OrderItem } from '../../services/kdsService';
import { WebSocketMessage } from '../../services/websocket';

// Mock data generators
export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: 1,
  table_number: 5,
  customer_name: 'Test Customer',
  status: 'pending',
  priority: 'normal',
  notes: '',
  total_amount: 50.00,
  items: [
    {
      id: 1,
      product_id: 1,
      name: 'Test Item 1',
      quantity: 2,
      price: 15.00,
      status: 'pending',
      notes: '',
      station: 'kitchen'
    },
    {
      id: 2,
      product_id: 2,
      name: 'Test Item 2',
      quantity: 1,
      price: 20.00,
      status: 'pending',
      notes: '',
      station: 'bar'
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockStation = (overrides?: Partial<Station>): Station => ({
  id: 'kitchen',
  name: 'Kitchen',
  type: 'preparation',
  active: true,
  order_count: 5,
  ...overrides
});

export const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => ({
  id: 1,
  product_id: 1,
  name: 'Test Item',
  quantity: 1,
  price: 10.00,
  status: 'pending',
  notes: '',
  station: 'kitchen',
  ...overrides
});

export const createMockWebSocketMessage = (overrides?: Partial<WebSocketMessage>): WebSocketMessage => ({
  type: 'order.created',
  data: null,
  timestamp: Date.now(),
  ...overrides
});

// Async test helpers
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = (): Promise<void> => 
  new Promise(resolve => setImmediate(resolve));

// Mock WebSocket implementation
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helper methods
  mockOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  mockMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  mockError(error?: any): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  mockClose(): void {
    this.close();
  }
}

// Mock IndexedDB implementation
export class MockIndexedDB {
  private databases: Map<string, MockIDBDatabase> = new Map();

  open(name: string, version?: number): IDBOpenDBRequest {
    const request = {
      result: null as any,
      error: null as any,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      readyState: 'pending' as IDBRequestReadyState,
      transaction: null,
      source: null
    } as IDBOpenDBRequest;

    setTimeout(() => {
      const db = new MockIDBDatabase(name, version || 1);
      this.databases.set(name, db);
      request.result = db;
      
      if (request.onupgradeneeded) {
        const event = {
          target: request,
          oldVersion: 0,
          newVersion: version || 1
        } as IDBVersionChangeEvent;
        request.onupgradeneeded(event);
      }
      
      if (request.onsuccess) {
        request.onsuccess(new Event('success'));
      }
    }, 0);

    return request;
  }

  deleteDatabase(name: string): IDBOpenDBRequest {
    this.databases.delete(name);
    return {} as IDBOpenDBRequest;
  }
}

export class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  private stores: Map<string, MockIDBObjectStore> = new Map();

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.objectStoreNames = {
      length: 0,
      contains: (name: string) => this.stores.has(name),
      item: (index: number) => Array.from(this.stores.keys())[index]
    } as DOMStringList;
  }

  createObjectStore(name: string, options?: IDBObjectStoreParameters): MockIDBObjectStore {
    const store = new MockIDBObjectStore(name, options);
    this.stores.set(name, store);
    (this.objectStoreNames as any).length = this.stores.size;
    return store;
  }

  transaction(storeNames: string | string[], mode?: IDBTransactionMode): MockIDBTransaction {
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, stores, mode || 'readonly');
  }

  close(): void {
    // Mock close
  }
}

export class MockIDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  private data: Map<any, any> = new Map();
  private indexes: Map<string, MockIDBIndex> = new Map();

  constructor(name: string, options?: IDBObjectStoreParameters) {
    this.name = name;
    this.keyPath = options?.keyPath || null;
  }

  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): MockIDBIndex {
    const index = new MockIDBIndex(name, keyPath, options);
    this.indexes.set(name, index);
    return index;
  }

  index(name: string): MockIDBIndex {
    return this.indexes.get(name) || new MockIDBIndex(name, name);
  }

  put(value: any, key?: any): IDBRequest {
    const actualKey = key || (this.keyPath && value[this.keyPath as string]) || Date.now();
    this.data.set(actualKey, value);
    return this.createRequest(value);
  }

  get(key: any): IDBRequest {
    const value = this.data.get(key);
    return this.createRequest(value);
  }

  getAll(): IDBRequest {
    const values = Array.from(this.data.values());
    return this.createRequest(values);
  }

  delete(key: any): IDBRequest {
    this.data.delete(key);
    return this.createRequest(undefined);
  }

  clear(): IDBRequest {
    this.data.clear();
    return this.createRequest(undefined);
  }

  private createRequest(result: any): IDBRequest {
    const request = {
      result,
      error: null,
      onsuccess: null as any,
      onerror: null as any,
      readyState: 'done' as IDBRequestReadyState,
      transaction: null,
      source: this
    } as IDBRequest;

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess(new Event('success'));
      }
    }, 0);

    return request;
  }
}

export class MockIDBIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;

  constructor(name: string, keyPath: string | string[], options?: IDBIndexParameters) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = options?.unique || false;
    this.multiEntry = options?.multiEntry || false;
  }

  getAll(query?: any): IDBRequest {
    // Simplified mock - return empty array
    return {
      result: [],
      error: null,
      onsuccess: null as any,
      onerror: null as any,
      readyState: 'done' as IDBRequestReadyState,
      transaction: null,
      source: this
    } as IDBRequest;
  }
}

export class MockIDBTransaction {
  db: MockIDBDatabase;
  mode: IDBTransactionMode;
  private stores: Map<string, MockIDBObjectStore> = new Map();

  constructor(db: MockIDBDatabase, storeNames: string[], mode: IDBTransactionMode) {
    this.db = db;
    this.mode = mode;
    storeNames.forEach(name => {
      this.stores.set(name, db['stores'].get(name) || new MockIDBObjectStore(name));
    });
  }

  objectStore(name: string): MockIDBObjectStore {
    return this.stores.get(name) || new MockIDBObjectStore(name);
  }
}

// Test setup helpers
export const setupMockWebSocket = (): void => {
  (global as any).WebSocket = MockWebSocket;
};

export const setupMockIndexedDB = (): void => {
  (global as any).indexedDB = new MockIndexedDB();
};

// Cleanup helpers
export const cleanupMocks = (): void => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};