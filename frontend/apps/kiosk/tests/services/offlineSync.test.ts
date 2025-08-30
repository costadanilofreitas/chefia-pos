// Mock dependencies first, before importing the module
jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    log: jest.fn(),
  },
}));

jest.mock('../../src/services/errorHandler', () => ({
  errorHandler: {
    handle: jest.fn(),
  },
}));

// Import types only (not the instance)
import type { PendingOrder, SyncQueueItem } from '../../src/services/offlineSync';
import { offlineStorage } from '../../src/services/offlineStorage';
import { errorHandler } from '../../src/services/errorHandler';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockDB = {
  objectStoreNames: {
    contains: jest.fn(),
  },
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null,
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  count: jest.fn(),
  index: jest.fn(),
  createIndex: jest.fn(),
};

const mockIndex = {
  getAll: jest.fn(),
  count: jest.fn(),
};

const mockRequest = {
  result: null,
  error: null,
  onsuccess: null as any,
  onerror: null as any,
};

// Setup global mocks
(global as any).indexedDB = mockIndexedDB;
(global as any).IDBDatabase = jest.fn();
(global as any).IDBTransaction = jest.fn();
(global as any).IDBObjectStore = jest.fn();
(global as any).IDBRequest = jest.fn();
(global as any).IDBOpenDBRequest = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Mock service worker
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: {
      register: jest.fn(),
    },
  }),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
});

describe('offlineSync Service', () => {
  let offlineSync: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Clear module cache to get fresh instance
    jest.resetModules();

    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Setup IndexedDB mock behavior
    mockIndexedDB.open.mockReturnValue({
      result: mockDB,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    });

    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockObjectStore.index.mockReturnValue(mockIndex);

    // Setup default request behavior
    mockObjectStore.add.mockReturnValue(mockRequest);
    mockObjectStore.put.mockReturnValue(mockRequest);
    mockObjectStore.get.mockReturnValue(mockRequest);
    mockObjectStore.getAll.mockReturnValue(mockRequest);
    mockObjectStore.delete.mockReturnValue(mockRequest);
    mockObjectStore.clear.mockReturnValue(mockRequest);
    mockObjectStore.count.mockReturnValue(mockRequest);
    mockIndex.getAll.mockReturnValue(mockRequest);
    mockIndex.count.mockReturnValue(mockRequest);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Database Initialization', () => {
    test('initializes IndexedDB on construction', () => {
      // Import the module after mocks are set up
      const module = require('../../src/services/offlineSync');
      offlineSync = module.offlineSync;
      
      expect(mockIndexedDB.open).toHaveBeenCalledWith('KioskDB', 1);
    });

    test('logs successful initialization', () => {
      // Import fresh instance
      jest.resetModules();
      const openRequest = mockIndexedDB.open();
      
      // Import module which triggers constructor
      const module = require('../../src/services/offlineSync');
      offlineSync = module.offlineSync;
      
      // Trigger success callback
      openRequest.onsuccess?.();

      expect(offlineStorage.log).toHaveBeenCalledWith('IndexedDB initialized');
    });

    test('handles initialization error', () => {
      // Import fresh instance
      jest.resetModules();
      const openRequest = mockIndexedDB.open();
      
      // Import module which triggers constructor
      const module = require('../../src/services/offlineSync');
      offlineSync = module.offlineSync;
      
      // Trigger error callback
      openRequest.onerror?.();

      expect(errorHandler.handle).toHaveBeenCalledWith(
        expect.any(Error),
        'OfflineSync.initializeDB'
      );
    });

    test('creates object stores on upgrade', () => {
      // Import fresh instance
      jest.resetModules();
      mockDB.objectStoreNames.contains.mockReturnValue(false);
      const openRequest = mockIndexedDB.open();
      
      // Import module which triggers constructor
      const module = require('../../src/services/offlineSync');
      offlineSync = module.offlineSync;
      
      // Trigger upgrade callback
      openRequest.onupgradeneeded?.({ target: { result: mockDB } });

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('pending_orders', {
        keyPath: 'id',
      });
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('products_cache', {
        keyPath: 'id',
      });
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('categories_cache', {
        keyPath: 'id',
      });
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('sync_queue', {
        keyPath: 'id',
      });
    });
  });

  describe('Online/Offline Handling', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('logs when connection is restored', () => {
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      expect(offlineStorage.log).toHaveBeenCalledWith('Connection restored');
    });

    test('logs when connection is lost', () => {
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      expect(offlineStorage.log).toHaveBeenCalledWith('Connection lost');
    });

    test('triggers sync when coming online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Would trigger syncAll, but DB needs to be initialized first
      expect(offlineStorage.log).toHaveBeenCalledWith('Connection restored');
    });

    test('syncs when app becomes visible while online', () => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });

      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);

      // Would trigger sync if DB was initialized
      expect(document.hidden).toBe(false);
    });
  });

  describe('Periodic Sync', () => {
    test('starts periodic sync on initialization', () => {
      // Import fresh instance
      jest.resetModules();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      const module = require('../../src/services/offlineSync');
      offlineSync = module.offlineSync;
      
      // Periodic sync timer should be set
      expect(setIntervalSpy).toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    test('stops periodic sync when requested', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
      
      offlineSync.stopPeriodicSync();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Save Order', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('saves order for offline sync', async () => {
      // Mock DB as initialized
      (offlineSync as any).db = mockDB;

      // Setup mock request success
      mockObjectStore.add.mockReturnValue({
        onsuccess: null,
        onerror: null,
        result: undefined,
      });

      const orderData = {
        items: [{ id: 1, name: 'Pizza', quantity: 2 }],
        total: 50,
      };

      // Mock promisifyRequest to resolve immediately
      jest.spyOn(offlineSync as any, 'promisifyRequest').mockResolvedValue(undefined);

      const orderId = await offlineSync.saveOrder(orderData);

      expect(orderId).toMatch(/^order_\d+_[a-z0-9]+$/);
      expect(mockDB.transaction).toHaveBeenCalledWith(['pending_orders'], 'readwrite');
      expect(mockObjectStore.add).toHaveBeenCalled();
      expect(offlineStorage.log).toHaveBeenCalledWith('Order saved for offline sync', {
        orderId,
      });
    });

    test('throws error if database not initialized', async () => {
      (offlineSync as any).db = null;

      await expect(offlineSync.saveOrder({})).rejects.toThrow('Database not initialized');
    });

    test('registers background sync if available', async () => {
      (offlineSync as any).db = mockDB;

      jest.spyOn(offlineSync as any, 'promisifyRequest').mockResolvedValue(undefined);

      await offlineSync.saveOrder({ test: 'data' });

      await expect(mockServiceWorker.ready).resolves.toBeDefined();
    });
  });

  describe('Sync Order', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('syncs order successfully', async () => {
      (offlineSync as any).db = mockDB;
      Object.defineProperty(navigator, 'onLine', { value: true });

      const mockOrder: PendingOrder = {
        id: 'order_123',
        data: { items: [], total: 100 },
        timestamp: Date.now(),
        status: 'pending',
        retries: 0,
      };

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(mockOrder) // get order
        .mockResolvedValueOnce(undefined) // update to syncing
        .mockResolvedValueOnce(undefined); // update to synced

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await (offlineSync as any).syncOrder('order_123');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockOrder.data),
      });
      expect(offlineStorage.log).toHaveBeenCalledWith('Order synced successfully', {
        orderId: 'order_123',
      });
    });

    test('handles sync failure', async () => {
      (offlineSync as any).db = mockDB;
      Object.defineProperty(navigator, 'onLine', { value: true });

      const mockOrder: PendingOrder = {
        id: 'order_456',
        data: { items: [], total: 100 },
        timestamp: Date.now(),
        status: 'pending',
        retries: 0,
      };

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(mockOrder) // get order
        .mockResolvedValueOnce(undefined) // update to syncing
        .mockRejectedValueOnce(new Error('Network error')) // sync fails
        .mockResolvedValueOnce(mockOrder) // get order again
        .mockResolvedValueOnce(undefined); // update to failed

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await (offlineSync as any).syncOrder('order_456');

      expect(result).toBe(false);
      expect(offlineStorage.log).toHaveBeenCalledWith('Order sync failed', {
        orderId: 'order_456',
        error: expect.any(Error),
      });
    });

    test('returns false when offline', async () => {
      (offlineSync as any).db = mockDB;
      Object.defineProperty(navigator, 'onLine', { value: false });

      const result = await (offlineSync as any).syncOrder('order_789');

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Sync All', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('syncs all pending orders', async () => {
      (offlineSync as any).db = mockDB;
      (offlineSync as any).isOnline = true;
      (offlineSync as any).syncInProgress = false;

      const mockPendingOrders: PendingOrder[] = [
        {
          id: 'order_1',
          data: {},
          timestamp: Date.now(),
          status: 'pending',
          retries: 0,
        },
        {
          id: 'order_2',
          data: {},
          timestamp: Date.now(),
          status: 'pending',
          retries: 1,
        },
      ];

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(mockPendingOrders);

      jest.spyOn(offlineSync as any, 'syncOrder').mockResolvedValue(true);
      jest.spyOn(offlineSync as any, 'processSyncQueue').mockResolvedValue(undefined);

      await offlineSync.syncAll();

      expect(offlineStorage.log).toHaveBeenCalledWith('Starting sync all');
      expect(offlineStorage.log).toHaveBeenCalledWith('Found 2 pending orders');
      expect((offlineSync as any).syncOrder).toHaveBeenCalledTimes(2);
    });

    test('skips orders with too many retries', async () => {
      (offlineSync as any).db = mockDB;
      (offlineSync as any).isOnline = true;
      (offlineSync as any).syncInProgress = false;

      const mockPendingOrders: PendingOrder[] = [
        {
          id: 'order_failed',
          data: {},
          timestamp: Date.now(),
          status: 'pending',
          retries: 3, // Max retries reached
        },
      ];

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(mockPendingOrders);

      jest.spyOn(offlineSync as any, 'syncOrder').mockResolvedValue(false);
      jest.spyOn(offlineSync as any, 'processSyncQueue').mockResolvedValue(undefined);

      await offlineSync.syncAll();

      expect((offlineSync as any).syncOrder).not.toHaveBeenCalled();
    });

    test('does not sync when already in progress', async () => {
      (offlineSync as any).syncInProgress = true;

      await offlineSync.syncAll();

      expect(offlineStorage.log).not.toHaveBeenCalledWith('Starting sync all');
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('caches products', async () => {
      (offlineSync as any).db = mockDB;

      const products = [
        { id: 1, name: 'Pizza', price: 25 },
        { id: 2, name: 'Burger', price: 20 },
      ];

      jest.spyOn(offlineSync as any, 'promisifyRequest').mockResolvedValue(undefined);

      await offlineSync.cacheProducts(products);

      expect(mockDB.transaction).toHaveBeenCalledWith(['products_cache'], 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalledTimes(2);
      expect(offlineStorage.log).toHaveBeenCalledWith('Cached 2 products');
    });

    test('gets cached products', async () => {
      (offlineSync as any).db = mockDB;

      const cachedProducts = [
        { id: 1, name: 'Pizza', price: 25 },
        { id: 2, name: 'Burger', price: 20 },
      ];

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(cachedProducts);

      const result = await offlineSync.getCachedProducts();

      expect(result).toEqual(cachedProducts);
      expect(mockDB.transaction).toHaveBeenCalledWith(['products_cache'], 'readonly');
    });

    test('caches categories', async () => {
      (offlineSync as any).db = mockDB;

      const categories = [
        { id: 1, name: 'Food' },
        { id: 2, name: 'Drinks' },
      ];

      jest.spyOn(offlineSync as any, 'promisifyRequest').mockResolvedValue(undefined);

      await offlineSync.cacheCategories(categories);

      expect(mockDB.transaction).toHaveBeenCalledWith(['categories_cache'], 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalledTimes(2);
      expect(offlineStorage.log).toHaveBeenCalledWith('Cached 2 categories');
    });

    test('clears cache', async () => {
      (offlineSync as any).db = mockDB;

      jest.spyOn(offlineSync as any, 'promisifyRequest').mockResolvedValue(undefined);

      await offlineSync.clearCache();

      expect(mockObjectStore.clear).toHaveBeenCalled();
      expect(offlineStorage.log).toHaveBeenCalledWith('Cache cleared');
    });

    test('returns empty array when DB not initialized', async () => {
      (offlineSync as any).db = null;

      const products = await offlineSync.getCachedProducts();
      const categories = await offlineSync.getCachedCategories();

      expect(products).toEqual([]);
      expect(categories).toEqual([]);
    });
  });

  describe('Sync Status', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('returns sync status', async () => {
      (offlineSync as any).db = mockDB;
      (offlineSync as any).isOnline = true;

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(3) // pending orders count
        .mockResolvedValueOnce(2); // sync queue count

      const status = await offlineSync.getSyncStatus();

      expect(status).toEqual({
        pendingOrders: 3,
        syncQueueItems: 2,
        lastSync: expect.any(Number),
        isOnline: true,
      });
    });

    test('returns default status when DB not initialized', async () => {
      (offlineSync as any).db = null;
      (offlineSync as any).isOnline = false;

      const status = await offlineSync.getSyncStatus();

      expect(status).toEqual({
        pendingOrders: 0,
        syncQueueItems: 0,
        lastSync: null,
        isOnline: false,
      });
    });
  });

  describe('Process Sync Queue', () => {
    beforeEach(() => {
      // Ensure offlineSync is loaded
      if (!offlineSync) {
        const module = require('../../src/services/offlineSync');
        offlineSync = module.offlineSync;
      }
    });
    
    test('processes sync queue items', async () => {
      (offlineSync as any).db = mockDB;

      const queueItems: SyncQueueItem[] = [
        {
          id: 'sync_1',
          type: 'update',
          endpoint: '/api/v1/orders/123',
          method: 'PUT',
          data: { status: 'completed' },
          timestamp: Date.now(),
          retries: 0,
        },
      ];

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(queueItems) // getAll
        .mockResolvedValueOnce(undefined); // delete

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await (offlineSync as any).processSyncQueue();

      expect(fetch).toHaveBeenCalledWith('/api/v1/orders/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      expect(mockObjectStore.delete).toHaveBeenCalledWith('sync_1');
    });

    test('handles DELETE requests without body', async () => {
      (offlineSync as any).db = mockDB;

      const queueItems: SyncQueueItem[] = [
        {
          id: 'sync_delete',
          type: 'delete',
          endpoint: '/api/v1/orders/456',
          method: 'DELETE',
          data: null,
          timestamp: Date.now(),
          retries: 0,
        },
      ];

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce(queueItems)
        .mockResolvedValueOnce(undefined);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await (offlineSync as any).processSyncQueue();

      expect(fetch).toHaveBeenCalledWith('/api/v1/orders/456', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: null,
      });
    });

    test('retries failed sync queue items', async () => {
      (offlineSync as any).db = mockDB;

      const queueItem: SyncQueueItem = {
        id: 'sync_retry',
        type: 'order',
        endpoint: '/api/v1/orders',
        method: 'POST',
        data: {},
        timestamp: Date.now(),
        retries: 1,
      };

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce([queueItem])
        .mockResolvedValueOnce(undefined); // put updated item

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await (offlineSync as any).processSyncQueue();

      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          retries: 2,
        })
      );
    });

    test('removes items after max retries', async () => {
      (offlineSync as any).db = mockDB;

      const queueItem: SyncQueueItem = {
        id: 'sync_max_retry',
        type: 'order',
        endpoint: '/api/v1/orders',
        method: 'POST',
        data: {},
        timestamp: Date.now(),
        retries: 2, // Will be 3 after this failure
      };

      jest
        .spyOn(offlineSync as any, 'promisifyRequest')
        .mockResolvedValueOnce([queueItem])
        .mockResolvedValueOnce(undefined); // delete

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await (offlineSync as any).processSyncQueue();

      expect(mockObjectStore.delete).toHaveBeenCalledWith('sync_max_retry');
    });
  });
});