import { logger } from './logger';
import type { Table, Order, MenuItem } from '../types';

const DB_NAME = 'WaiterOfflineDB';
const DB_VERSION = 1;

interface OfflineRecord<T> {
  id: string | number;
  data: T;
  timestamp: number;
  synced: boolean;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      logger.info('Offline storage initialized', 'OfflineStorage');
    } catch (error) {
      logger.error('Failed to initialize offline storage', error, 'OfflineStorage');
      throw error;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('tables')) {
          const tableStore = db.createObjectStore('tables', { keyPath: 'id' });
          tableStore.createIndex('synced', 'synced', { unique: false });
          tableStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('table_id', 'data.table_id', { unique: false });
          orderStore.createIndex('synced', 'synced', { unique: false });
          orderStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('menu')) {
          const menuStore = db.createObjectStore('menu', { keyPath: 'id' });
          menuStore.createIndex('category_id', 'data.category_id', { unique: false });
          menuStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionStore = db.createObjectStore('pendingActions', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('type', 'type', { unique: false });
        }

        logger.info('Database schema created/updated', 'OfflineStorage');
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // Table operations
  async saveTable(table: Table): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['tables'], 'readwrite');
    const store = transaction.objectStore('tables');
    
    const record: OfflineRecord<Table> = {
      id: table.id,
      data: table,
      timestamp: Date.now(),
      synced: navigator.onLine
    };

    await this.promisifyRequest(store.put(record));
    logger.debug(`Table ${table.id} saved to offline storage`, 'OfflineStorage');
  }

  async getTables(): Promise<Table[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['tables'], 'readonly');
    const store = transaction.objectStore('tables');
    const records = await this.promisifyRequest<OfflineRecord<Table>[]>(store.getAll());
    
    return records.map(record => record.data);
  }

  async getTable(id: number): Promise<Table | null> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['tables'], 'readonly');
    const store = transaction.objectStore('tables');
    const record = await this.promisifyRequest<OfflineRecord<Table>>(store.get(id));
    
    return record ? record.data : null;
  }

  // Order operations
  async saveOrder(order: Order): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');
    
    const record: OfflineRecord<Order> = {
      id: order.id,
      data: order,
      timestamp: Date.now(),
      synced: navigator.onLine
    };

    await this.promisifyRequest(store.put(record));
    logger.debug(`Order ${order.id} saved to offline storage`, 'OfflineStorage');
  }

  async getOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const records = await this.promisifyRequest<OfflineRecord<Order>[]>(store.getAll());
    
    return records.map(record => record.data);
  }

  async getOrdersByTable(tableId: number): Promise<Order[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const index = store.index('table_id');
    const records = await this.promisifyRequest<OfflineRecord<Order>[]>(
      index.getAll(IDBKeyRange.only(tableId))
    );
    
    return records.map(record => record.data);
  }

  // Menu operations
  async saveMenuItem(item: MenuItem): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['menu'], 'readwrite');
    const store = transaction.objectStore('menu');
    
    const record: OfflineRecord<MenuItem> = {
      id: item.id,
      data: item,
      timestamp: Date.now(),
      synced: true
    };

    await this.promisifyRequest(store.put(record));
  }

  async getMenu(): Promise<MenuItem[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['menu'], 'readonly');
    const store = transaction.objectStore('menu');
    const records = await this.promisifyRequest<OfflineRecord<MenuItem>[]>(store.getAll());
    
    return records.map(record => record.data);
  }

  // Pending actions for sync
  async addPendingAction(action: {
    type: string;
    endpoint: string;
    method: string;
    data: unknown;
  }): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    
    await this.promisifyRequest(store.add({
      ...action,
      timestamp: Date.now()
    }));
    
    logger.info('Pending action added for sync', 'OfflineStorage', { type: action.type });
  }

  async getPendingActions(): Promise<Array<{
    id: number;
    type: string;
    endpoint: string;
    method: string;
    data: unknown;
    timestamp: number;
  }>> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    
    return this.promisifyRequest(store.getAll());
  }

  async removePendingAction(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    
    await this.promisifyRequest(store.delete(id));
  }

  // Clear operations
  async clearTables(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['tables'], 'readwrite');
    const store = transaction.objectStore('tables');
    await this.promisifyRequest(store.clear());
    
    logger.info('Tables cleared from offline storage', 'OfflineStorage');
  }

  async clearOrders(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');
    await this.promisifyRequest(store.clear());
    
    logger.info('Orders cleared from offline storage', 'OfflineStorage');
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['tables', 'orders', 'menu', 'pendingActions'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      await this.promisifyRequest(store.clear());
    }
    
    logger.info('All offline storage cleared', 'OfflineStorage');
  }

  // Sync status
  async markAsSynced(storeName: string, id: string | number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const record = await this.promisifyRequest<OfflineRecord<unknown>>(store.get(id));
    
    if (record) {
      record.synced = true;
      await this.promisifyRequest(store.put(record));
    }
  }

  async getUnsyncedRecords(storeName: string): Promise<unknown[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('synced');
    const records = await this.promisifyRequest<OfflineRecord<unknown>[]>(
      index.getAll(IDBKeyRange.only(false))
    );
    
    return records.map(record => record.data);
  }

  // Helper to promisify IndexedDB requests
  private promisifyRequest<T = unknown>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup old data
  async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const cutoffTime = Date.now() - maxAge;
    const stores = ['tables', 'orders', 'menu'];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    }
    
    logger.info('Old data cleaned up', 'OfflineStorage');
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();

// Initialize on import
if (typeof window !== 'undefined') {
  offlineStorage.init().catch(error => {
    logger.error('Failed to initialize offline storage on import', error, 'OfflineStorage');
  });
}