/**
 * Mock IndexedDB implementation for testing
 */

interface MockStore {
  data: Map<any, any>;
  keyPath?: string;
  indexes: Map<string, { keyPath: string; unique: boolean }>;
}

export class MockIDBObjectStore {
  private store: MockStore;
  name: string;

  constructor(name: string, store: MockStore) {
    this.name = name;
    this.store = store;
  }

  add(value: any): IDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const key = this.store.keyPath ? value[this.store.keyPath] : Date.now();
        if (this.store.data.has(key)) {
          request.error = new Error('Key already exists');
          request.onerror?.(new Event('error'));
        } else {
          this.store.data.set(key, value);
          request.result = key;
          request.onsuccess?.(new Event('success'));
        }
      } catch (error) {
        request.error = error;
        request.onerror?.(new Event('error'));
      }
    }, 0);
    
    return request as any;
  }

  put(value: any): IDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      try {
        const key = this.store.keyPath ? value[this.store.keyPath] : Date.now();
        this.store.data.set(key, value);
        request.result = key;
        request.onsuccess?.(new Event('success'));
      } catch (error) {
        request.error = error;
        request.onerror?.(new Event('error'));
      }
    }, 0);
    
    return request as any;
  }

  get(key: any): IDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      request.result = this.store.data.get(key) || null;
      request.onsuccess?.(new Event('success'));
    }, 0);
    
    return request as any;
  }

  getAll(): IDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      request.result = Array.from(this.store.data.values());
      request.onsuccess?.(new Event('success'));
    }, 0);
    
    return request as any;
  }

  delete(key: any): IDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      this.store.data.delete(key);
      request.onsuccess?.(new Event('success'));
    }, 0);
    
    return request as any;
  }

  clear(): IDBRequest {
    const request = new MockIDBRequest();
    
    setTimeout(() => {
      this.store.data.clear();
      request.onsuccess?.(new Event('success'));
    }, 0);
    
    return request as any;
  }

  openCursor(range?: any, direction?: string): IDBRequest {
    const request = new MockIDBRequest();
    const entries = Array.from(this.store.data.entries());
    let index = direction === 'prev' ? entries.length - 1 : 0;
    
    const createCursor = () => {
      if (index >= 0 && index < entries.length) {
        const [key, value] = entries[index];
        return {
          key,
          value,
          continue: () => {
            index = direction === 'prev' ? index - 1 : index + 1;
            setTimeout(() => {
              request.result = createCursor();
              request.onsuccess?.(new Event('success'));
            }, 0);
          },
          delete: () => {
            this.store.data.delete(key);
          }
        };
      }
      return null;
    };
    
    setTimeout(() => {
      request.result = createCursor();
      request.onsuccess?.(new Event('success'));
    }, 0);
    
    return request as any;
  }

  createIndex(name: string, keyPath: string, options?: { unique?: boolean }): void {
    this.store.indexes.set(name, {
      keyPath,
      unique: options?.unique || false
    });
  }
}

export class MockIDBTransaction {
  private stores: Map<string, MockStore>;
  mode: string;
  
  constructor(stores: Map<string, MockStore>, storeNames: string[], mode: string) {
    this.stores = stores;
    this.mode = mode;
  }

  objectStore(name: string): MockIDBObjectStore {
    const store = this.stores.get(name);
    if (!store) {
      throw new Error(`Object store "${name}" not found`);
    }
    return new MockIDBObjectStore(name, store);
  }
}

export class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: string[];
  private stores: Map<string, MockStore>;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
    this.objectStoreNames = [];
  }

  transaction(storeNames: string | string[], mode: string = 'readonly'): MockIDBTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this.stores, names, mode);
  }

  createObjectStore(name: string, options?: { keyPath?: string }): MockIDBObjectStore {
    const store: MockStore = {
      data: new Map(),
      keyPath: options?.keyPath,
      indexes: new Map()
    };
    this.stores.set(name, store);
    this.objectStoreNames.push(name);
    return new MockIDBObjectStore(name, store);
  }

  close(): void {
    // No-op for mock
  }
}

export class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

export class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;
}

export class MockIndexedDB {
  private databases: Map<string, MockIDBDatabase> = new Map();

  open(name: string, version?: number): MockIDBOpenDBRequest {
    const request = new MockIDBOpenDBRequest();
    
    setTimeout(() => {
      const existingDb = this.databases.get(name);
      const currentVersion = existingDb?.version || 0;
      const targetVersion = version || 1;
      
      if (targetVersion > currentVersion) {
        // Trigger upgrade
        const db = new MockIDBDatabase(name, targetVersion);
        
        if (request.onupgradeneeded) {
          const event = new Event('upgradeneeded') as any;
          event.target = { result: db };
          event.oldVersion = currentVersion;
          event.newVersion = targetVersion;
          request.onupgradeneeded(event);
        }
        
        this.databases.set(name, db);
        request.result = db;
        request.onsuccess?.(new Event('success'));
      } else {
        // Return existing database
        request.result = existingDb || new MockIDBDatabase(name, targetVersion);
        request.onsuccess?.(new Event('success'));
      }
    }, 0);
    
    return request;
  }

  deleteDatabase(name: string): IDBOpenDBRequest {
    const request = new MockIDBOpenDBRequest();
    
    setTimeout(() => {
      this.databases.delete(name);
      request.onsuccess?.(new Event('success'));
    }, 0);
    
    return request as any;
  }
}

// Helper to setup IndexedDB mock in tests
export function setupIndexedDBMock(): {
  mockIndexedDB: MockIndexedDB;
  cleanup: () => void;
} {
  const mockIndexedDB = new MockIndexedDB();
  const originalIndexedDB = global.indexedDB;
  
  (global as any).indexedDB = mockIndexedDB;
  
  return {
    mockIndexedDB,
    cleanup: () => {
      (global as any).indexedDB = originalIndexedDB;
    }
  };
}