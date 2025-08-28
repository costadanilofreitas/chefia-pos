interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

interface OfflineStorageConfig {
  dbName?: string;
  version?: number;
  stores?: string[];
}

class OfflineStorage {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;
  private stores: string[];
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: OfflineStorageConfig = {}) {
    this.dbName = config.dbName || 'kds-offline-db';
    this.version = config.version || 1;
    this.stores = config.stores || ['orders', 'stations', 'settings', 'logs'];
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        for (const storeName of this.stores) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            
            if (storeName === 'orders') {
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('station', 'station', { unique: false });
            }
          }
        }
      };
    });
  }

  // Generic storage methods
  async set<T>(store: string, key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = ttl 
      ? { data, timestamp: Date.now(), ttl }
      : { data, timestamp: Date.now() };

    // Update memory cache
    this.memoryCache.set(`${store}:${key}`, entry);

    // Persist to IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.put({ id: key, ...entry });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to store data'));
      });
    }
  }

  async get<T>(store: string, key: string): Promise<T | null> {
    const cacheKey = `${store}:${key}`;
    
    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey);
    if (cached) {
      if (!cached.ttl || Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Check IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            const entry: CacheEntry<T> = result.ttl
              ? { data: result.data, timestamp: result.timestamp, ttl: result.ttl }
              : { data: result.data, timestamp: result.timestamp };

            // Check TTL
            if (!entry.ttl || Date.now() - entry.timestamp < entry.ttl) {
              this.memoryCache.set(cacheKey, entry);
              resolve(entry.data);
            } else {
              this.delete(store, key);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(new Error('Failed to retrieve data'));
      });
    }

    return null;
  }

  async getAll<T>(store: string): Promise<T[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const validResults = results
          .filter(item => {
            if (!item.ttl) return true;
            return Date.now() - item.timestamp < item.ttl;
          })
          .map(item => item.data);
        
        resolve(validResults);
      };

      request.onerror = () => reject(new Error('Failed to retrieve all data'));
    });
  }

  async delete(store: string, key: string): Promise<void> {
    const cacheKey = `${store}:${key}`;
    this.memoryCache.delete(cacheKey);

    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete data'));
      });
    }
  }

  async clear(store?: string): Promise<void> {
    if (store) {
      // Clear specific store
      for (const [key] of this.memoryCache) {
        if (key.startsWith(`${store}:`)) {
          this.memoryCache.delete(key);
        }
      }

      if (this.db) {
        return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([store], 'readwrite');
          const objectStore = transaction.objectStore(store);
          const request = objectStore.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error('Failed to clear store'));
        });
      }
    } else {
      // Clear all stores
      this.memoryCache.clear();
      
      for (const storeName of this.stores) {
        await this.clear(storeName);
      }
    }
  }

  // Order-specific methods
  async saveOrder(order: any): Promise<void> {
    await this.set('orders', order.id.toString(), order, 3600000); // 1 hour TTL
  }

  async getOrder(orderId: string | number): Promise<any> {
    return this.get('orders', orderId.toString());
  }

  async getAllOrders(): Promise<any[]> {
    return this.getAll('orders');
  }

  async getOrdersByStatus(status: string): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['orders'], 'readonly');
      const objectStore = transaction.objectStore('orders');
      const index = objectStore.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        const results = request.result || [];
        const validResults = results
          .filter(item => {
            if (!item.ttl) return true;
            return Date.now() - item.timestamp < item.ttl;
          })
          .map(item => item.data);
        
        resolve(validResults);
      };

      request.onerror = () => reject(new Error('Failed to retrieve orders by status'));
    });
  }

  // Station-specific methods
  async saveStation(station: any): Promise<void> {
    await this.set('stations', station.id.toString(), station, 3600000); // 1 hour TTL
  }

  async getAllStations(): Promise<any[]> {
    return this.getAll('stations');
  }

  // Settings methods
  async saveSetting(key: string, value: any): Promise<void> {
    await this.set('settings', key, value);
  }

  async getSetting(key: string): Promise<any> {
    return this.get('settings', key);
  }

  // Logging methods
  async log(message: string, data?: any): Promise<void> {
    const logEntry = {
      id: Date.now().toString(),
      message,
      data,
      timestamp: Date.now()
    };
    
    await this.set('logs', logEntry.id, logEntry, 86400000); // 24 hour TTL
  }

  async getLogs(limit: number = 100): Promise<any[]> {
    const logs = await this.getAll('logs');
    return logs
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Sync methods
  async getUnsyncedData(): Promise<any[]> {
    const unsynced: any[] = [];
    
    for (const store of ['orders', 'stations']) {
      const items = await this.getAll(store);
      const unsyncedItems = items.filter((item: any) => !item.synced);
      unsynced.push(...unsyncedItems.map(item => ({ store, data: item })));
    }
    
    return unsynced;
  }

  async markAsSynced(store: string, id: string): Promise<void> {
    const data = await this.get(store, id);
    if (data) {
      await this.set(store, id, { ...data, synced: true });
    }
  }

  // Utility methods
  getMemoryCacheSize(): number {
    return this.memoryCache.size;
  }

  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  isInitialized(): boolean {
    return this.db !== null;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

// Export class for testing
export { OfflineStorage };