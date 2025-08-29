/**
 * Offline Storage Service Test Suite
 */

import { OfflineStorage } from '../offlineStorage';
import { 
  setupMockIndexedDB, 
  cleanupMocks,
  createMockOrder,
  createMockStation,
  waitFor
} from '../../__tests__/utils/testUtils';
import { OrderDBRecord, StationDBRecord, LogEntry } from '../../types';

describe('OfflineStorage', () => {
  let storage: OfflineStorage;

  beforeEach(async () => {
    setupMockIndexedDB();
    storage = new OfflineStorage({
      dbName: 'test-db',
      version: 1,
      stores: ['orders', 'stations', 'settings', 'logs']
    });
    await storage.init();
  });

  afterEach(() => {
    cleanupMocks();
  });

  describe('Initialization', () => {
    test('should initialize IndexedDB successfully', async () => {
      expect(storage.isInitialized()).toBe(true);
    });

    test('should create required object stores', async () => {
      // Re-initialize to trigger upgrade
      const newStorage = new OfflineStorage({
        dbName: 'test-db-2',
        version: 1
      });
      
      await newStorage.init();
      expect(newStorage.isInitialized()).toBe(true);
    });

    test('should handle initialization failure', async () => {
      // Mock indexedDB.open to fail
      const originalOpen = indexedDB.open;
      indexedDB.open = jest.fn(() => {
        const request = {
          onerror: null as any,
          onsuccess: null as any,
          onupgradeneeded: null as any,
          error: new Error('Failed to open DB'),
          result: null
        } as IDBOpenDBRequest;
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror(new Event('error'));
          }
        }, 0);
        
        return request;
      });

      const failStorage = new OfflineStorage();
      await expect(failStorage.init()).rejects.toThrow('Failed to open IndexedDB');
      
      indexedDB.open = originalOpen;
    });
  });

  describe('Generic Storage Operations', () => {
    test('should set and get data', async () => {
      const testData = { id: 'test-1', name: 'Test Item', value: 123 };
      
      await storage.set('settings', 'test-key', testData);
      const retrieved = await storage.get('settings', 'test-key');
      
      expect(retrieved).toEqual(testData);
    });

    test('should set data with TTL', async () => {
      jest.useFakeTimers();
      
      const testData = { id: 'test-1', name: 'Test Item' };
      const ttl = 1000; // 1 second
      
      await storage.set('settings', 'test-key', testData, ttl);
      
      // Data should be available immediately
      let retrieved = await storage.get('settings', 'test-key');
      expect(retrieved).toEqual(testData);
      
      // Data should expire after TTL
      jest.advanceTimersByTime(ttl + 1);
      retrieved = await storage.get('settings', 'test-key');
      expect(retrieved).toBeNull();
      
      jest.useRealTimers();
    });

    test('should update memory cache on set', async () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      
      await storage.set('settings', 'test-key', testData);
      expect(storage.getMemoryCacheSize()).toBe(1);
      
      // Should retrieve from memory cache
      const retrieved = await storage.get('settings', 'test-key');
      expect(retrieved).toEqual(testData);
    });

    test('should delete data', async () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      
      await storage.set('settings', 'test-key', testData);
      await storage.delete('settings', 'test-key');
      
      const retrieved = await storage.get('settings', 'test-key');
      expect(retrieved).toBeNull();
      expect(storage.getMemoryCacheSize()).toBe(0);
    });

    test('should get all data from store', async () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' }
      ];
      
      for (const item of items) {
        await storage.set('settings', item.id, item);
      }
      
      const allItems = await storage.getAll('settings');
      expect(allItems).toHaveLength(3);
      expect(allItems).toEqual(expect.arrayContaining(items));
    });

    test('should clear specific store', async () => {
      await storage.set('settings', 'key1', { value: 1 });
      await storage.set('settings', 'key2', { value: 2 });
      await storage.set('orders', 'order1', { id: 1 });
      
      await storage.clear('settings');
      
      const settings = await storage.getAll('settings');
      const orders = await storage.getAll('orders');
      
      expect(settings).toHaveLength(0);
      expect(orders).toHaveLength(1);
    });

    test('should clear all stores', async () => {
      await storage.set('settings', 'key1', { value: 1 });
      await storage.set('orders', 'order1', { id: 1 });
      await storage.set('stations', 'station1', { id: 'kitchen' });
      
      await storage.clear();
      
      const settings = await storage.getAll('settings');
      const orders = await storage.getAll('orders');
      const stations = await storage.getAll('stations');
      
      expect(settings).toHaveLength(0);
      expect(orders).toHaveLength(0);
      expect(stations).toHaveLength(0);
      expect(storage.getMemoryCacheSize()).toBe(0);
    });

    test('should handle operations when db is not initialized', async () => {
      const uninitializedStorage = new OfflineStorage();
      
      await uninitializedStorage.set('settings', 'key', { value: 1 });
      const retrieved = await uninitializedStorage.get('settings', 'key');
      
      expect(retrieved).toBeNull();
    });

    test('should handle storage errors gracefully', async () => {
      // Force an error by mocking transaction
      const originalTransaction = storage['db']!.transaction;
      storage['db']!.transaction = jest.fn(() => {
        throw new Error('Transaction failed');
      });
      
      await expect(storage.set('settings', 'key', { value: 1 }))
        .rejects.toThrow('Failed to store data');
      
      storage['db']!.transaction = originalTransaction;
    });
  });

  describe('Order-specific Methods', () => {
    test('should save and retrieve order', async () => {
      const order = createMockOrder({ id: 123 }) as OrderDBRecord;
      
      await storage.saveOrder(order);
      const retrieved = await storage.getOrder(123);
      
      expect(retrieved).toEqual(order);
    });

    test('should get order by string or number id', async () => {
      const order = createMockOrder({ id: 456 }) as OrderDBRecord;
      
      await storage.saveOrder(order);
      
      const byNumber = await storage.getOrder(456);
      const byString = await storage.getOrder('456');
      
      expect(byNumber).toEqual(order);
      expect(byString).toEqual(order);
    });

    test('should get all orders', async () => {
      const orders = [
        createMockOrder({ id: 1 }) as OrderDBRecord,
        createMockOrder({ id: 2 }) as OrderDBRecord,
        createMockOrder({ id: 3 }) as OrderDBRecord
      ];
      
      for (const order of orders) {
        await storage.saveOrder(order);
      }
      
      const allOrders = await storage.getAllOrders();
      expect(allOrders).toHaveLength(3);
    });

    test('should get orders by status', async () => {
      const orders = [
        createMockOrder({ id: 1, status: 'pending' }) as OrderDBRecord,
        createMockOrder({ id: 2, status: 'preparing' }) as OrderDBRecord,
        createMockOrder({ id: 3, status: 'pending' }) as OrderDBRecord,
        createMockOrder({ id: 4, status: 'ready' }) as OrderDBRecord
      ];
      
      for (const order of orders) {
        await storage.saveOrder(order);
      }
      
      const pendingOrders = await storage.getOrdersByStatus('pending');
      expect(pendingOrders).toHaveLength(2);
      expect(pendingOrders.every(o => o.status === 'pending')).toBe(true);
    });

    test('should handle order TTL expiration', async () => {
      jest.useFakeTimers();
      
      const order = createMockOrder({ id: 999 }) as OrderDBRecord;
      await storage.saveOrder(order); // Uses TTL_ONE_HOUR by default
      
      // Order should be available within TTL
      let retrieved = await storage.getOrder(999);
      expect(retrieved).toEqual(order);
      
      // Advance time past TTL (1 hour)
      jest.advanceTimersByTime(3600001);
      retrieved = await storage.getOrder(999);
      expect(retrieved).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('Station-specific Methods', () => {
    test('should save and retrieve stations', async () => {
      const station = createMockStation({ id: 'kitchen' }) as StationDBRecord;
      
      await storage.saveStation(station);
      const stations = await storage.getAllStations();
      
      expect(stations).toHaveLength(1);
      expect(stations[0]).toEqual(station);
    });

    test('should handle multiple stations', async () => {
      const stations = [
        createMockStation({ id: 'kitchen' }) as StationDBRecord,
        createMockStation({ id: 'bar' }) as StationDBRecord,
        createMockStation({ id: 'grill' }) as StationDBRecord
      ];
      
      for (const station of stations) {
        await storage.saveStation(station);
      }
      
      const allStations = await storage.getAllStations();
      expect(allStations).toHaveLength(3);
    });
  });

  describe('Settings Methods', () => {
    test('should save and retrieve settings', async () => {
      await storage.saveSetting('theme', 'dark');
      await storage.saveSetting('sound', true);
      await storage.saveSetting('station', 'kitchen');
      
      const theme = await storage.getSetting('theme');
      const sound = await storage.getSetting('sound');
      const station = await storage.getSetting('station');
      
      expect(theme).toBe('dark');
      expect(sound).toBe(true);
      expect(station).toBe('kitchen');
    });

    test('should return null for non-existent setting', async () => {
      const setting = await storage.getSetting('nonexistent');
      expect(setting).toBeNull();
    });

    test('should update existing setting', async () => {
      await storage.saveSetting('volume', 50);
      expect(await storage.getSetting('volume')).toBe(50);
      
      await storage.saveSetting('volume', 75);
      expect(await storage.getSetting('volume')).toBe(75);
    });
  });

  describe('Logging Methods', () => {
    test('should log messages', async () => {
      await storage.log('Test message', { extra: 'data' });
      
      const logs = await storage.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].data).toEqual({ extra: 'data' });
      expect(logs[0].level).toBe('info');
    });

    test('should retrieve logs in reverse chronological order', async () => {
      await storage.log('First message');
      await waitFor(10);
      await storage.log('Second message');
      await waitFor(10);
      await storage.log('Third message');
      
      const logs = await storage.getLogs();
      expect(logs[0].message).toBe('Third message');
      expect(logs[1].message).toBe('Second message');
      expect(logs[2].message).toBe('First message');
    });

    test('should limit number of logs returned', async () => {
      for (let i = 0; i < 10; i++) {
        await storage.log(`Message ${i}`);
      }
      
      const logs = await storage.getLogs(5);
      expect(logs).toHaveLength(5);
    });

    test('should use default log limit', async () => {
      for (let i = 0; i < 150; i++) {
        await storage.log(`Message ${i}`);
      }
      
      const logs = await storage.getLogs();
      expect(logs).toHaveLength(100); // DEFAULT_LOG_LIMIT
    });
  });

  describe('Sync Methods', () => {
    test('should get unsynced data', async () => {
      const order1 = createMockOrder({ id: 1 }) as OrderDBRecord;
      const order2 = createMockOrder({ id: 2 }) as OrderDBRecord;
      order2.synced = true;
      
      const station1 = createMockStation({ id: 'kitchen' }) as StationDBRecord;
      station1.synced = false;
      
      await storage.saveOrder(order1);
      await storage.saveOrder(order2);
      await storage.saveStation(station1);
      
      const unsynced = await storage.getUnsyncedData();
      expect(unsynced).toHaveLength(2); // order1 and station1
      expect(unsynced.some(item => item.data.id === 1)).toBe(true);
      expect(unsynced.some(item => item.data.id === 'kitchen')).toBe(true);
    });

    test('should mark data as synced', async () => {
      const order = createMockOrder({ id: 1 }) as OrderDBRecord;
      order.synced = false;
      
      await storage.saveOrder(order);
      let unsynced = await storage.getUnsyncedData();
      expect(unsynced).toHaveLength(1);
      
      await storage.markAsSynced('orders', '1');
      unsynced = await storage.getUnsyncedData();
      expect(unsynced).toHaveLength(0);
    });

    test('should handle marking non-existent data as synced', async () => {
      // Should not throw
      await expect(storage.markAsSynced('orders', 'nonexistent'))
        .resolves.not.toThrow();
    });
  });

  describe('Memory Cache Management', () => {
    test('should track memory cache size', async () => {
      expect(storage.getMemoryCacheSize()).toBe(0);
      
      await storage.set('settings', 'key1', { value: 1 });
      expect(storage.getMemoryCacheSize()).toBe(1);
      
      await storage.set('settings', 'key2', { value: 2 });
      expect(storage.getMemoryCacheSize()).toBe(2);
      
      await storage.delete('settings', 'key1');
      expect(storage.getMemoryCacheSize()).toBe(1);
    });

    test('should clear memory cache', async () => {
      await storage.set('settings', 'key1', { value: 1 });
      await storage.set('settings', 'key2', { value: 2 });
      expect(storage.getMemoryCacheSize()).toBe(2);
      
      storage.clearMemoryCache();
      expect(storage.getMemoryCacheSize()).toBe(0);
      
      // Data should still be in IndexedDB
      const retrieved = await storage.get('settings', 'key1');
      expect(retrieved).toEqual({ value: 1 });
    });

    test('should use memory cache for repeated gets', async () => {
      const testData = { id: 'test-1', name: 'Test Item' };
      await storage.set('settings', 'test-key', testData);
      
      // First get - from IndexedDB
      const first = await storage.get('settings', 'test-key');
      expect(first).toEqual(testData);
      
      // Mock IndexedDB transaction to verify cache is used
      const originalTransaction = storage['db']!.transaction;
      storage['db']!.transaction = jest.fn(() => {
        throw new Error('Should use cache');
      });
      
      // Second get - should use memory cache
      const second = await storage.get('settings', 'test-key');
      expect(second).toEqual(testData);
      
      storage['db']!.transaction = originalTransaction;
    });

    test('should invalidate expired cache entries', async () => {
      jest.useFakeTimers();
      
      const testData = { id: 'test-1', name: 'Test Item' };
      await storage.set('settings', 'test-key', testData, 1000); // 1 second TTL
      
      // First get - valid
      let retrieved = await storage.get('settings', 'test-key');
      expect(retrieved).toEqual(testData);
      expect(storage.getMemoryCacheSize()).toBe(1);
      
      // Advance time past TTL
      jest.advanceTimersByTime(1001);
      
      // Get should return null and remove from cache
      retrieved = await storage.get('settings', 'test-key');
      expect(retrieved).toBeNull();
      expect(storage.getMemoryCacheSize()).toBe(0);
      
      jest.useRealTimers();
    });
  });

  describe('Utility Methods', () => {
    test('isInitialized should return correct state', () => {
      expect(storage.isInitialized()).toBe(true);
      
      const uninitializedStorage = new OfflineStorage();
      expect(uninitializedStorage.isInitialized()).toBe(false);
    });

    test('should handle cache key creation', () => {
      // Test internal method through usage
      storage.set('orders', '123', { id: 123 });
      storage.set('stations', 'kitchen', { id: 'kitchen' });
      
      expect(storage.getMemoryCacheSize()).toBe(2);
      // Cache keys are created as 'store:key' internally
    });

    test('should validate cache entries correctly', async () => {
      jest.useFakeTimers();
      
      // Entry without TTL - always valid
      await storage.set('settings', 'permanent', { value: 'forever' });
      let retrieved = await storage.get('settings', 'permanent');
      expect(retrieved).toEqual({ value: 'forever' });
      
      // Entry with TTL - valid within time
      await storage.set('settings', 'temporary', { value: 'temp' }, 1000);
      retrieved = await storage.get('settings', 'temporary');
      expect(retrieved).toEqual({ value: 'temp' });
      
      // Advance time
      jest.advanceTimersByTime(500);
      retrieved = await storage.get('settings', 'temporary');
      expect(retrieved).toEqual({ value: 'temp' }); // Still valid
      
      jest.advanceTimersByTime(501);
      retrieved = await storage.get('settings', 'temporary');
      expect(retrieved).toBeNull(); // Expired
      
      jest.useRealTimers();
    });
  });
});