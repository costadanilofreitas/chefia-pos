// Types for stored data
interface StoredOrder {
  id?: number;
  terminalId: string;
  timestamp: string;
  status: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
  customerId?: string;
}

interface StoredProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

interface StoredCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface StoredConfig {
  key: string;
  value: unknown;
}

interface SyncQueueItem {
  id?: number;
  type: string;
  operation: string;
  data: unknown;
  timestamp: string;
  retries: number;
  maxRetries: number;
  synced: boolean;
  syncedAt?: string;
}

interface StorageLogEntry {
  id?: number;
  level: string;
  message: string;
  context?: unknown;
  timestamp: string;
}

interface BackupData {
  version: number;
  timestamp: string;
  data: {
    orders?: StoredOrder[];
    products?: StoredProduct[];
    customers?: StoredCustomer[];
    config?: StoredConfig[];
    queue?: SyncQueueItem[];
    logs?: StorageLogEntry[];
  };
}

type StorableData = StoredOrder | StoredProduct | StoredCustomer | StoredConfig | SyncQueueItem | StorageLogEntry;
type StorableDataArray = StoredOrder[] | StoredProduct[] | StoredCustomer[] | StoredConfig[] | SyncQueueItem[] | StorageLogEntry[];

// IndexedDB wrapper for offline data storage
class OfflineStorage {
  private dbName = 'pos-modern-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Object stores
  private stores = {
    orders: 'orders',
    products: 'products',
    customers: 'customers',
    config: 'config',
    queue: 'sync-queue',
    logs: 'logs'
  };

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Orders store
    if (!db.objectStoreNames.contains(this.stores.orders)) {
      const ordersStore = db.createObjectStore(this.stores.orders, { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      ordersStore.createIndex('terminalId', 'terminalId', { unique: false });
      ordersStore.createIndex('timestamp', 'timestamp', { unique: false });
      ordersStore.createIndex('status', 'status', { unique: false });
    }

    // Products store
    if (!db.objectStoreNames.contains(this.stores.products)) {
      const productsStore = db.createObjectStore(this.stores.products, { 
        keyPath: 'id' 
      });
      productsStore.createIndex('category', 'category', { unique: false });
      productsStore.createIndex('available', 'available', { unique: false });
    }

    // Customers store
    if (!db.objectStoreNames.contains(this.stores.customers)) {
      const customersStore = db.createObjectStore(this.stores.customers, { 
        keyPath: 'id' 
      });
      customersStore.createIndex('email', 'email', { unique: true });
      customersStore.createIndex('phone', 'phone', { unique: false });
      customersStore.createIndex('tier', 'tier', { unique: false });
    }

    // Config store
    if (!db.objectStoreNames.contains(this.stores.config)) {
      db.createObjectStore(this.stores.config, { keyPath: 'key' });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(this.stores.queue)) {
      const queueStore = db.createObjectStore(this.stores.queue, { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      queueStore.createIndex('type', 'type', { unique: false });
      queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      queueStore.createIndex('synced', 'synced', { unique: false });
    }

    // Logs store
    if (!db.objectStoreNames.contains(this.stores.logs)) {
      const logsStore = db.createObjectStore(this.stores.logs, { 
        keyPath: 'id', 
        autoIncrement: true 
      });
      logsStore.createIndex('level', 'level', { unique: false });
      logsStore.createIndex('timestamp', 'timestamp', { unique: false });
    }
  }

  // Generic CRUD operations
  async add(storeName: string, data: StorableData): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add({
        ...(data as object),
        timestamp: new Date().toISOString(),
        offline: true
      });

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName: string, id: number | string): Promise<unknown> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName: string): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName: string, data: StorableData | StorableDataArray): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({
        ...(data as object),
        updatedAt: new Date().toISOString()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: number | string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for orders
  async saveOrder(order: StoredOrder): Promise<number> {
    const orderId = await this.add(this.stores.orders, order);
    
    // Add to sync queue if offline
    if (!navigator.onLine) {
      await this.addToSyncQueue('order', 'create', order);
    }
    
    return orderId;
  }

  async getOrdersByTerminal(terminalId: string): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.orders], 'readonly');
      const store = transaction.objectStore(this.stores.orders);
      const index = store.index('terminalId');
      const request = index.getAll(terminalId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for products
  async cacheProducts(products: Array<unknown>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.stores.products], 'readwrite');
    const store = transaction.objectStore(this.stores.products);

    // Clear existing products
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new products
    for (const product of products) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.add(product);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }
  }

  async getAvailableProducts(): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.products], 'readonly');
      const store = transaction.objectStore(this.stores.products);
      const index = store.index('available');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync queue management
  async addToSyncQueue(type: string, operation: string, data: unknown): Promise<void> {
    const queueItem: SyncQueueItem = {
      type,
      operation,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0,
      maxRetries: 3
    };
    await this.add(this.stores.queue, queueItem);
  }

  async getPendingSyncItems(): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores.queue], 'readonly');
      const store = transaction.objectStore(this.stores.queue);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(queueId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const item = await this.get(this.stores.queue, queueId) as SyncQueueItem;
    if (item) {
      item.synced = true;
      item.syncedAt = new Date().toISOString();
      await this.update(this.stores.queue, item);
    }
  }

  // Configuration management
  async saveConfig(key: string, value: unknown): Promise<void> {
    await this.update(this.stores.config, { key, value });
  }

  async getConfig(key: string): Promise<unknown> {
    const config = await this.get(this.stores.config, key) as StoredConfig;
    return config?.value;
  }

  // Logging
  async log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): Promise<void> {
    const logEntry: StorageLogEntry = {
      level,
      message,
      context: data ? { data, userAgent: navigator.userAgent, url: window.location.href } : undefined,
      timestamp: new Date().toISOString()
    };
    await this.add(this.stores.logs, logEntry);

    // Keep only last 1000 logs
    const logs = await this.getAll(this.stores.logs);
    if (logs.length > 1000) {
      const oldLogs = logs.slice(0, logs.length - 1000);
      for (const log of oldLogs) {
        await this.delete(this.stores.logs, (log as StorageLogEntry).id);
      }
    }
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    // Remove old orders (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.getAll(this.stores.orders);
    for (const order of orders) {
      if (new Date((order as StoredOrder).timestamp) < thirtyDaysAgo) {
        await this.delete(this.stores.orders, (order as StoredOrder).id);
      }
    }

    // Remove synced queue items older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const queueItems = await this.getAll(this.stores.queue);
    for (const item of queueItems) {
      const queueItem = item as SyncQueueItem;
      if (queueItem.synced && new Date(queueItem.timestamp) < sevenDaysAgo) {
        await this.delete(this.stores.queue, queueItem.id);
      }
    }
  }

  // Export data for backup
  async exportData(): Promise<unknown> {
    const data: unknown = {};
    
    for (const storeName of Object.values(this.stores)) {
      data[storeName] = await this.getAll(storeName);
    }
    
    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      data
    };
  }

  // Import data from backup
  async importData(backup: BackupData): Promise<void> {
    if (!backup.data) throw new Error('Invalid backup format');

    for (const [storeName, items] of Object.entries(backup.data)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          await this.update(storeName, item as StorableData);
        }
      }
    }
  }
}

// Export types for external use
export type { StorageLogEntry };

// Singleton instance
export const offlineStorage = new OfflineStorage();

