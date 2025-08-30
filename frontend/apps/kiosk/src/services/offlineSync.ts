/**
 * Offline synchronization service
 * Handles data persistence and sync when connection is restored
 */

import { offlineStorage } from './offlineStorage';
import { errorHandler } from './errorHandler';

// IndexedDB configuration
const DB_NAME = 'KioskDB';
const DB_VERSION = 1;

// Object stores
const STORES = {
  PENDING_ORDERS: 'pending_orders',
  PRODUCTS_CACHE: 'products_cache',
  CATEGORIES_CACHE: 'categories_cache',
  SYNC_QUEUE: 'sync_queue'
} as const;

export interface PendingOrder {
  id: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
  lastError?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'order' | 'update' | 'delete';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineSync {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncInterval: number | null = null;

  constructor() {
    this.initializeDB();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDB(): Promise<void> {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        errorHandler.handle(
          new Error('Failed to open IndexedDB'),
          'OfflineSync.initializeDB'
        );
      };

      request.onsuccess = () => {
        this.db = request.result;
        offlineStorage.log('IndexedDB initialized');
        
        // Sync if online
        if (this.isOnline) {
          this.syncAll();
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create pending orders store
        if (!db.objectStoreNames.contains(STORES.PENDING_ORDERS)) {
          const orderStore = db.createObjectStore(STORES.PENDING_ORDERS, { 
            keyPath: 'id' 
          });
          orderStore.createIndex('timestamp', 'timestamp');
          orderStore.createIndex('status', 'status');
        }

        // Create products cache store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS_CACHE)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS_CACHE, { 
            keyPath: 'id' 
          });
          productStore.createIndex('category_id', 'category_id');
          productStore.createIndex('updated_at', 'updated_at');
        }

        // Create categories cache store
        if (!db.objectStoreNames.contains(STORES.CATEGORIES_CACHE)) {
          db.createObjectStore(STORES.CATEGORIES_CACHE, { 
            keyPath: 'id' 
          });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
            keyPath: 'id' 
          });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('type', 'type');
        }
      };
    } catch (error) {
      errorHandler.handle(error, 'OfflineSync.initializeDB');
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      offlineStorage.log('Connection restored');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      offlineStorage.log('Connection lost');
    });

    // Listen for visibility change to sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.syncAll();
      }
    });
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds if online
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncAll();
      }
    }, 30000);
  }

  /**
   * Stop periodic sync
   */
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Save order for offline sync
   */
  public async saveOrder(orderData: any): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingOrder: PendingOrder = {
      id: orderId,
      data: orderData,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    };

    const transaction = this.db.transaction([STORES.PENDING_ORDERS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_ORDERS);
    
    await this.promisifyRequest(store.add(pendingOrder));
    
    offlineStorage.log('Order saved for offline sync', { orderId });

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncOrder(orderId);
    }

    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-orders');
    }

    return orderId;
  }

  /**
   * Sync specific order
   */
  private async syncOrder(orderId: string): Promise<boolean> {
    if (!this.db || !this.isOnline) {
      return false;
    }

    try {
      const transaction = this.db.transaction([STORES.PENDING_ORDERS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_ORDERS);
      
      const order = await this.promisifyRequest<PendingOrder>(store.get(orderId));
      
      if (!order || order.status === 'synced') {
        return true;
      }

      // Update status to syncing
      order.status = 'syncing';
      await this.promisifyRequest(store.put(order));

      // Send to server
      const response = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order.data)
      });

      if (response.ok) {
        // Mark as synced
        order.status = 'synced';
        await this.promisifyRequest(store.put(order));
        
        offlineStorage.log('Order synced successfully', { orderId });
        return true;
      } else {
        throw new Error(`Sync failed with status ${response.status}`);
      }
    } catch (error) {
      // Handle sync failure
      const transaction = this.db.transaction([STORES.PENDING_ORDERS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_ORDERS);
      
      const order = await this.promisifyRequest<PendingOrder>(store.get(orderId));
      
      if (order) {
        order.status = 'failed';
        order.retries += 1;
        order.lastError = error instanceof Error ? error.message : 'Unknown error';
        await this.promisifyRequest(store.put(order));
      }
      
      offlineStorage.log('Order sync failed', { orderId, error });
      return false;
    }
  }

  /**
   * Sync all pending orders
   */
  public async syncAll(): Promise<void> {
    if (!this.db || !this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    offlineStorage.log('Starting sync all');

    try {
      // Sync pending orders
      const transaction = this.db.transaction([STORES.PENDING_ORDERS], 'readonly');
      const store = transaction.objectStore(STORES.PENDING_ORDERS);
      const index = store.index('status');
      
      const pendingOrders = await this.promisifyRequest<PendingOrder[]>(
        index.getAll('pending')
      );

      offlineStorage.log(`Found ${pendingOrders.length} pending orders`);

      for (const order of pendingOrders) {
        if (order.retries < 3) {
          await this.syncOrder(order.id);
        }
      }

      // Sync queue items
      await this.processSyncQueue();

    } catch (error) {
      errorHandler.handle(error, 'OfflineSync.syncAll');
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    
    const items = await this.promisifyRequest<SyncQueueItem[]>(store.getAll());

    for (const item of items) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: item.method !== 'DELETE' ? JSON.stringify(item.data) : null
        });

        if (response.ok) {
          // Remove from queue
          await this.promisifyRequest(store.delete(item.id));
          offlineStorage.log('Sync queue item processed', { id: item.id });
        }
      } catch {
        // Increment retries
        item.retries += 1;
        if (item.retries >= 3) {
          // Remove after max retries
          await this.promisifyRequest(store.delete(item.id));
        } else {
          await this.promisifyRequest(store.put(item));
        }
      }
    }
  }

  /**
   * Cache products for offline use
   */
  public async cacheProducts(products: any[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.PRODUCTS_CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS_CACHE);

    for (const product of products) {
      await this.promisifyRequest(store.put({
        ...product,
        cached_at: Date.now()
      }));
    }

    offlineStorage.log(`Cached ${products.length} products`);
  }

  /**
   * Get cached products
   */
  public async getCachedProducts(): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([STORES.PRODUCTS_CACHE], 'readonly');
    const store = transaction.objectStore(STORES.PRODUCTS_CACHE);
    
    return this.promisifyRequest(store.getAll());
  }

  /**
   * Cache categories for offline use
   */
  public async cacheCategories(categories: any[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.CATEGORIES_CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CATEGORIES_CACHE);

    for (const category of categories) {
      await this.promisifyRequest(store.put({
        ...category,
        cached_at: Date.now()
      }));
    }

    offlineStorage.log(`Cached ${categories.length} categories`);
  }

  /**
   * Get cached categories
   */
  public async getCachedCategories(): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([STORES.CATEGORIES_CACHE], 'readonly');
    const store = transaction.objectStore(STORES.CATEGORIES_CACHE);
    
    return this.promisifyRequest(store.getAll());
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    if (!this.db) return;

    const stores = [
      STORES.PRODUCTS_CACHE,
      STORES.CATEGORIES_CACHE
    ];

    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await this.promisifyRequest(store.clear());
    }

    offlineStorage.log('Cache cleared');
  }

  /**
   * Get sync status
   */
  public async getSyncStatus(): Promise<{
    pendingOrders: number;
    syncQueueItems: number;
    lastSync: number | null;
    isOnline: boolean;
  }> {
    if (!this.db) {
      return {
        pendingOrders: 0,
        syncQueueItems: 0,
        lastSync: null,
        isOnline: this.isOnline
      };
    }

    const pendingTx = this.db.transaction([STORES.PENDING_ORDERS], 'readonly');
    const pendingStore = pendingTx.objectStore(STORES.PENDING_ORDERS);
    const pendingIndex = pendingStore.index('status');
    const pendingCount = await this.promisifyRequest<number>(
      pendingIndex.count('pending')
    );

    const queueTx = this.db.transaction([STORES.SYNC_QUEUE], 'readonly');
    const queueStore = queueTx.objectStore(STORES.SYNC_QUEUE);
    const queueCount = await this.promisifyRequest<number>(queueStore.count());

    return {
      pendingOrders: pendingCount,
      syncQueueItems: queueCount,
      lastSync: Date.now(),
      isOnline: this.isOnline
    };
  }

  /**
   * Helper to promisify IndexedDB requests
   */
  private promisifyRequest<T = any>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const offlineSync = new OfflineSync();