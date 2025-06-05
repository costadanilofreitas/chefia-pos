import { offlineStorage } from './OfflineStorage';

interface SyncOperation {
  id: number;
  type: string;
  operation: string;
  data: any;
  timestamp: string;
  retries: number;
  maxRetries: number;
  synced: boolean;
}

class SyncManager {
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeouts: Map<number, NodeJS.Timeout> = new Map();

  constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for visibility change (tab becomes active)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Listen for page unload to save pending operations
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  private handleOnline(): void {
    console.log('[SyncManager] Connection restored');
    this.isOnline = true;
    this.syncPendingOperations();
  }

  private handleOffline(): void {
    console.log('[SyncManager] Connection lost');
    this.isOnline = false;
    this.clearRetryTimeouts();
  }

  private handleVisibilityChange(): void {
    if (!document.hidden && this.isOnline) {
      // Tab became active and we're online, sync immediately
      this.syncPendingOperations();
    }
  }

  private handleBeforeUnload(): void {
    // Cancel any pending operations to avoid issues
    this.clearRetryTimeouts();
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingOperations();
      }
    }, 30000);
  }

  private clearRetryTimeouts(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  // Queue an operation for sync
  async queueOperation(type: string, operation: string, data: any): Promise<void> {
    try {
      await offlineStorage.addToSyncQueue(type, operation, data);
      console.log(`[SyncManager] Queued ${operation} operation for ${type}`);

      // If online, try to sync immediately
      if (this.isOnline) {
        this.syncPendingOperations();
      }
    } catch (error) {
      console.error('[SyncManager] Failed to queue operation:', error);
      throw error;
    }
  }

  // Sync all pending operations
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    console.log('[SyncManager] Starting sync...');

    try {
      const pendingOperations = await offlineStorage.getPendingSyncItems();
      console.log(`[SyncManager] Found ${pendingOperations.length} pending operations`);

      for (const operation of pendingOperations) {
        await this.syncOperation(operation);
      }

      console.log('[SyncManager] Sync completed successfully');
    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOperation(operation: SyncOperation): Promise<void> {
    try {
      const success = await this.executeOperation(operation);
      
      if (success) {
        await offlineStorage.markAsSynced(operation.id);
        console.log(`[SyncManager] Synced ${operation.type} ${operation.operation}`);
      } else {
        await this.handleSyncFailure(operation);
      }
    } catch (error) {
      console.error(`[SyncManager] Failed to sync operation ${operation.id}:`, error);
      await this.handleSyncFailure(operation);
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<boolean> {
    const { type, operation: op, data } = operation;

    try {
      let response: Response;

      switch (type) {
        case 'order':
          response = await this.syncOrder(op, data);
          break;
        case 'customer':
          response = await this.syncCustomer(op, data);
          break;
        case 'payment':
          response = await this.syncPayment(op, data);
          break;
        case 'inventory':
          response = await this.syncInventory(op, data);
          break;
        default:
          console.warn(`[SyncManager] Unknown operation type: ${type}`);
          return false;
      }

      return response.ok;
    } catch (error) {
      console.error(`[SyncManager] Network error during ${type} ${op}:`, error);
      return false;
    }
  }

  private async syncOrder(operation: string, data: any): Promise<Response> {
    switch (operation) {
      case 'create':
        return fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      case 'update':
        return fetch(`/api/orders/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      case 'cancel':
        return fetch(`/api/orders/${data.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: data.reason })
        });
      default:
        throw new Error(`Unknown order operation: ${operation}`);
    }
  }

  private async syncCustomer(operation: string, data: any): Promise<Response> {
    switch (operation) {
      case 'create':
        return fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      case 'update':
        return fetch(`/api/customers/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      case 'loyalty-points':
        return fetch(`/api/customers/${data.customerId}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: data.points, reason: data.reason })
        });
      default:
        throw new Error(`Unknown customer operation: ${operation}`);
    }
  }

  private async syncPayment(operation: string, data: any): Promise<Response> {
    switch (operation) {
      case 'process':
        return fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      case 'refund':
        return fetch(`/api/payments/${data.paymentId}/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: data.amount, reason: data.reason })
        });
      default:
        throw new Error(`Unknown payment operation: ${operation}`);
    }
  }

  private async syncInventory(operation: string, data: any): Promise<Response> {
    switch (operation) {
      case 'update-stock':
        return fetch(`/api/products/${data.productId}/stock`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: data.quantity, reason: data.reason })
        });
      case 'price-update':
        return fetch(`/api/products/${data.productId}/price`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: data.price })
        });
      default:
        throw new Error(`Unknown inventory operation: ${operation}`);
    }
  }

  private async handleSyncFailure(operation: SyncOperation): Promise<void> {
    const updatedOperation = {
      ...operation,
      retries: operation.retries + 1
    };

    if (updatedOperation.retries >= operation.maxRetries) {
      console.error(`[SyncManager] Max retries reached for operation ${operation.id}`);
      
      // Log failed operation
      await offlineStorage.log('error', 'Sync operation failed permanently', {
        operationId: operation.id,
        type: operation.type,
        operation: operation.operation,
        retries: updatedOperation.retries,
        maxRetries: operation.maxRetries
      });

      // Mark as failed (could add a 'failed' status)
      return;
    }

    // Update retry count
    await offlineStorage.update('sync-queue', updatedOperation);

    // Schedule retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, updatedOperation.retries), 30000);
    
    const retryTimeout = setTimeout(() => {
      this.retryTimeouts.delete(operation.id);
      if (this.isOnline) {
        this.syncOperation(updatedOperation);
      }
    }, retryDelay);

    this.retryTimeouts.set(operation.id, retryTimeout);
    
    console.log(`[SyncManager] Scheduled retry for operation ${operation.id} in ${retryDelay}ms`);
  }

  // Force sync specific operation type
  async forceSyncType(type: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot force sync while offline');
    }

    const pendingOperations = await offlineStorage.getPendingSyncItems();
    const typeOperations = pendingOperations.filter(op => op.type === type);

    for (const operation of typeOperations) {
      await this.syncOperation(operation);
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    syncInProgress: boolean;
    pendingCount: number;
    lastSyncTime: string | null;
  }> {
    const pendingOperations = await offlineStorage.getPendingSyncItems();
    const lastSyncTime = await offlineStorage.getConfig('lastSyncTime');

    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingCount: pendingOperations.length,
      lastSyncTime
    };
  }

  // Manual sync trigger
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.syncPendingOperations();
    await offlineStorage.saveConfig('lastSyncTime', new Date().toISOString());
  }

  // Cleanup
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    this.clearRetryTimeouts();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();

