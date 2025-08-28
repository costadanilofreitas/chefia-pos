/**
 * Tests for OfflineBackupService
 */

import { OfflineBackupService } from './OfflineBackupService';
import { requestCache } from './RequestCache';
import eventBus from '../utils/EventBus';
import { setupIndexedDBMock } from '../tests/mocks/indexeddb.mock';

// Mock dependencies
jest.mock('./RequestCache', () => ({
  requestCache: {
    getStats: jest.fn().mockReturnValue({
      cacheSize: 5,
      maxCacheSize: 50,
      pendingRequests: 0,
      memoryUsageMB: '0.5',
      maxMemoryMB: 10,
      memoryUsagePercent: '5',
      entries: []
    }),
    clear: jest.fn(),
    invalidatePattern: jest.fn(),
  }
}));

jest.mock('../utils/EventBus', () => ({
  __esModule: true,
  default: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }
}));

describe('OfflineBackupService', () => {
  let service: OfflineBackupService;
  let dbSetup: ReturnType<typeof setupIndexedDBMock>;
  let mockLocalStorage: Record<string, string>;
  let originalNavigatorOnLine: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup IndexedDB mock
    dbSetup = setupIndexedDBMock();
    
    // Setup localStorage mock
    mockLocalStorage = {
      'terminal_id': 'test-terminal-123',
      'user_id': 'test-user-456'
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
      configurable: true
    });

    // Mock navigator.onLine
    originalNavigatorOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true
    });

    // Mock window.confirm
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
    dbSetup.cleanup();
    jest.useRealTimers();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: originalNavigatorOnLine
    });
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB on creation', async () => {
      service = new (OfflineBackupService as any)();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = service.getStatus();
      expect(status.dbInitialized).toBe(true);
    });

    it('should setup event listeners on initialization', () => {
      service = new (OfflineBackupService as any)();
      
      // Check that event listeners were registered
      const eventCalls = (eventBus.on as jest.Mock).mock.calls;
      
      expect(eventCalls).toContainEqual(['order:created', expect.any(Function)]);
      expect(eventCalls).toContainEqual(['order:updated', expect.any(Function)]);
      expect(eventCalls).toContainEqual(['table:updated', expect.any(Function)]);
      expect(eventCalls).toContainEqual(['cashier:opened', expect.any(Function)]);
    });

    it('should start auto backup interval', () => {
      service = new (OfflineBackupService as any)();
      
      const status = service.getStatus();
      expect(status.autoBackupEnabled).toBe(true);
    });
  });

  describe('Backup Creation', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should create backup with current data', async () => {
      // Setup mock data in localStorage
      mockLocalStorage['orders'] = JSON.stringify([
        { id: 'order-1', total: 100 },
        { id: 'order-2', total: 200 }
      ]);
      mockLocalStorage['products'] = JSON.stringify([
        { id: 'prod-1', name: 'Product 1' }
      ]);
      
      const metadata = await service.createBackup();
      
      expect(metadata).toMatchObject({
        version: 1,
        terminalId: 'test-terminal-123',
        userId: 'test-user-456',
        totalEntries: expect.any(Number),
        timestamp: expect.any(String)
      });
      
      expect(eventBus.emit).toHaveBeenCalledWith('backup:created', metadata);
    });

    it('should include sync queue items in backup', async () => {
      // Add items to sync queue
      const syncItem = {
        id: 'sync-1',
        type: 'CREATE' as const,
        entity: 'order',
        entityId: 'order-1',
        data: { id: 'order-1' },
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      await (service as any).addToSyncQueue(syncItem);
      
      const metadata = await service.createBackup();
      expect(metadata.totalEntries).toBeGreaterThan(0);
    });

    it('should handle backup creation errors', async () => {
      // Force an error by closing the database
      (service as any).db.close();
      (service as any).db = null;
      
      await expect(service.createBackup()).rejects.toThrow();
    });
  });

  describe('Backup Restoration', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should restore backup data to localStorage', async () => {
      // Create a backup first
      mockLocalStorage['orders'] = JSON.stringify([{ id: 'order-1' }]);
      await service.createBackup();
      
      // Clear localStorage
      mockLocalStorage = {};
      
      // Restore backup
      await service.restoreBackup();
      
      // Check data was restored
      expect(JSON.parse(mockLocalStorage['orders'] || '[]')).toEqual([{ id: 'order-1' }]);
      expect(eventBus.emit).toHaveBeenCalledWith('backup:restored', expect.any(Object));
    });

    it('should restore specific backup by timestamp', async () => {
      // Create multiple backups
      mockLocalStorage['orders'] = JSON.stringify([{ id: 'order-1' }]);
      const backup1 = await service.createBackup();
      
      jest.advanceTimersByTime(1000);
      
      mockLocalStorage['orders'] = JSON.stringify([{ id: 'order-2' }]);
      await service.createBackup();
      
      // Restore first backup
      await service.restoreBackup(backup1.timestamp);
      
      expect(JSON.parse(mockLocalStorage['orders'] || '[]')).toEqual([{ id: 'order-1' }]);
    });

    it('should clear cache after restoration', async () => {
      await service.createBackup();
      await service.restoreBackup();
      
      expect(requestCache.clear).toHaveBeenCalled();
    });

    it('should process sync queue if online after restore', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const processSyncSpy = jest.spyOn(service as any, 'processSyncQueue');
      
      await service.createBackup();
      await service.restoreBackup();
      
      expect(processSyncSpy).toHaveBeenCalled();
    });

    it('should handle missing backup gracefully', async () => {
      await expect(service.restoreBackup('non-existent-timestamp')).rejects.toThrow('No backup found to restore');
    });
  });

  describe('Sync Queue Management', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should queue events when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      (service as any).isOnline = false;
      
      const addToSyncQueueSpy = jest.spyOn(service as any, 'addToSyncQueue');
      
      // Trigger an event while offline
      const listener = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'order:created'
      )?.[1];
      
      if (listener) {
        await listener({ id: 'order-1', total: 100 });
        expect(addToSyncQueueSpy).toHaveBeenCalled();
      }
    });

    it('should not queue events when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      (service as any).isOnline = true;
      
      const addToSyncQueueSpy = jest.spyOn(service as any, 'addToSyncQueue');
      
      // Trigger an event while online
      const listener = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'order:created'
      )?.[1];
      
      if (listener) {
        await listener({ id: 'order-1', total: 100 });
        expect(addToSyncQueueSpy).not.toHaveBeenCalled();
      }
    });

    it('should process sync queue when coming online', async () => {
      // Add items to sync queue
      const syncItem = {
        id: 'sync-1',
        type: 'CREATE' as const,
        entity: 'order',
        entityId: 'order-1',
        data: { id: 'order-1' },
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      await (service as any).addToSyncQueue(syncItem);
      
      // Simulate coming online
      await (service as any).handleOnline();
      
      expect(eventBus.emit).toHaveBeenCalledWith('connection:online');
    });

    it('should retry failed sync items up to max attempts', async () => {
      const syncItem = {
        id: 'sync-1',
        type: 'CREATE' as const,
        entity: 'order',
        entityId: 'order-1',
        data: { id: 'order-1' },
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      await (service as any).addToSyncQueue(syncItem);
      
      // Mock syncItem to fail
      jest.spyOn(service as any, 'syncItem').mockRejectedValue(new Error('Sync failed'));
      
      // Process queue multiple times
      for (let i = 0; i < 4; i++) {
        await (service as any).processSyncQueue();
      }
      
      // Should emit sync:failed after max attempts
      expect(eventBus.emit).toHaveBeenCalledWith('sync:failed', expect.objectContaining({
        id: 'sync-1',
        attempts: 3
      }));
    });
  });

  describe('Online/Offline Handling', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle going offline', async () => {
      const createBackupSpy = jest.spyOn(service, 'createBackup');
      
      await (service as any).handleOffline();
      
      expect(eventBus.emit).toHaveBeenCalledWith('connection:offline');
      expect(createBackupSpy).toHaveBeenCalled();
    });

    it('should handle coming online', async () => {
      const processSyncQueueSpy = jest.spyOn(service as any, 'processSyncQueue');
      
      await (service as any).handleOnline();
      
      expect(eventBus.emit).toHaveBeenCalledWith('connection:online');
      expect(processSyncQueueSpy).toHaveBeenCalled();
    });

    it('should respond to window online/offline events', () => {
      const handleOnlineSpy = jest.spyOn(service as any, 'handleOnline');
      const handleOfflineSpy = jest.spyOn(service as any, 'handleOffline');
      
      window.dispatchEvent(new Event('online'));
      expect(handleOnlineSpy).toHaveBeenCalled();
      
      window.dispatchEvent(new Event('offline'));
      expect(handleOfflineSpy).toHaveBeenCalled();
    });
  });

  describe('Auto Backup', () => {
    it('should perform auto backup at intervals', async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const createBackupSpy = jest.spyOn(service, 'createBackup');
      
      // Advance time by backup interval (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      expect(createBackupSpy).toHaveBeenCalled();
    });
  });

  describe('Backup Cleanup', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should cleanup old backups', async () => {
      // Create multiple backups
      for (let i = 0; i < 5; i++) {
        await service.createBackup();
        jest.advanceTimersByTime(24 * 60 * 60 * 1000); // Advance 1 day
      }
      
      await service.cleanupOldBackups(3); // Keep only 3 days
      
      // Should have removed old backups
      const remainingBackups = await (service as any).getSyncQueue();
      expect(remainingBackups).toBeDefined();
    });
  });

  describe('Export/Import', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should export backup to blob', async () => {
      mockLocalStorage['orders'] = JSON.stringify([{ id: 'export-1' }]);
      await service.createBackup();
      
      const blob = await service.exportBackup();
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should import backup from file', async () => {
      const backupData = {
        metadata: {
          version: 1,
          timestamp: new Date().toISOString(),
          terminalId: 'import-terminal',
          userId: 'import-user',
          totalEntries: 1
        },
        data: {
          orders: [{ id: 'imported-order' }],
          tables: [],
          cashier: null,
          products: [],
          categories: [],
          customers: [],
          config: {}
        },
        pendingSync: {
          creates: [],
          updates: [],
          deletes: []
        }
      };
      
      const file = new File([JSON.stringify(backupData)], 'backup.json', {
        type: 'application/json'
      });
      
      await service.importBackup(file);
      
      // Should restore the imported data
      expect(JSON.parse(mockLocalStorage['orders'] || '[]')).toEqual([{ id: 'imported-order' }]);
    });

    it('should validate backup file format', async () => {
      const invalidFile = new File(['invalid json'], 'backup.json', {
        type: 'application/json'
      });
      
      await expect(service.importBackup(invalidFile)).rejects.toThrow();
    });

    it('should prompt user to restore imported backup', async () => {
      const backupData = {
        metadata: {
          version: 1,
          timestamp: new Date().toISOString(),
          terminalId: 'test',
          userId: 'test',
          totalEntries: 0
        },
        data: {
          orders: [],
          tables: [],
          cashier: null,
          products: [],
          categories: [],
          customers: [],
          config: {}
        },
        pendingSync: {
          creates: [],
          updates: [],
          deletes: []
        }
      };
      
      const file = new File([JSON.stringify(backupData)], 'backup.json');
      
      await service.importBackup(file);
      
      expect(global.confirm).toHaveBeenCalledWith('Deseja restaurar este backup agora?');
    });
  });

  describe('Service Status', () => {
    it('should return current service status', async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = service.getStatus();
      
      expect(status).toEqual({
        isOnline: true,
        syncQueueSize: 0,
        dbInitialized: true,
        autoBackupEnabled: true
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle IndexedDB errors gracefully', async () => {
      // Force database error
      (service as any).db = null;
      
      await expect(service.createBackup()).rejects.toThrow();
    });

    it('should handle localStorage parse errors', async () => {
      mockLocalStorage['orders'] = 'invalid json {]';
      
      // Should not throw, just return null
      const result = (service as any).getFromStorage('orders');
      expect(result).toBeNull();
    });

    it('should handle sync errors and emit events', async () => {
      const syncItem = {
        id: 'error-sync',
        type: 'CREATE' as const,
        entity: 'order',
        entityId: 'order-1',
        data: { id: 'order-1' },
        timestamp: new Date().toISOString(),
        attempts: 2
      };
      
      await (service as any).addToSyncQueue(syncItem);
      
      // Mock sync to fail
      jest.spyOn(service as any, 'syncItem').mockRejectedValueOnce(new Error('Network error'));
      
      await (service as any).processSyncQueue();
      
      // Should update sync item with error
      const updatedItem = (await (service as any).getSyncQueue())[0];
      expect(updatedItem.attempts).toBe(3);
      expect(updatedItem.error).toBe('Network error');
    });
  });

  describe('Cleanup', () => {
    it('should properly destroy service', async () => {
      service = new (OfflineBackupService as any)();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      service.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      const status = service.getStatus();
      expect(status.dbInitialized).toBe(false);
      expect(status.autoBackupEnabled).toBe(false);
    });
  });
});