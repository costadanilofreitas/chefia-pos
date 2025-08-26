import { offlineStorage } from './OfflineStorage';
import logger, { LogSource } from './LocalLoggerService';

interface SyncOperation {
  id: number;
  type: string;
  operation: string;
  data: unknown;
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

  private async handleOnline(): Promise<void> {
    await logger.info('Conexão restaurada', {}, 'SyncManager', LogSource.SYNC);
    this.isOnline = true;
    this.syncPendingOperations();
  }

  private async handleOffline(): Promise<void> {
    await logger.warn('Conexão perdida', {}, 'SyncManager', LogSource.SYNC);
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
    // Cancel unknown pending operations to avoid issues
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
  async queueOperation(type: string, operation: string, data: unknown): Promise<void> {
    try {
      await offlineStorage.addToSyncQueue(type, operation, data);
      await logger.debug(`Operação ${operation} para ${type} adicionada à fila`, { type, operation }, 'SyncManager', LogSource.SYNC);

      // If online, try to sync immediately
      if (this.isOnline) {
        this.syncPendingOperations();
      }
    } catch (error) {
      await logger.error('Erro ao adicionar operação à fila de sincronização', { type, operation, error }, 'SyncManager', LogSource.SYNC);
      throw error;
    }
  }

  // Sync all pending operations
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      await logger.info('Iniciando sincronização', {}, 'SyncManager', LogSource.SYNC);
      const pendingOperations = await offlineStorage.getPendingSyncItems();
      await logger.info(`${pendingOperations.length} operações pendentes encontradas`, { count: pendingOperations.length }, 'SyncManager', LogSource.SYNC);

      for (const operation of pendingOperations) {
        await this.syncOperation(operation as SyncOperation);
      }
      await logger.info('Sincronização concluída com sucesso', {}, 'SyncManager', LogSource.SYNC);
    } catch (error) {
      await logger.error('Erro durante sincronização', error, 'SyncManager', LogSource.SYNC);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync a single operation
  private async syncOperation(operation: SyncOperation): Promise<void> {
    try {
      let response: Response;
      
      switch (operation.type) {
        case 'customer':
          response = await this.syncCustomer(operation.operation, operation.data);
          break;
        case 'payment':
          response = await this.syncPayment(operation.operation, operation.data);
          break;
        case 'inventory':
          response = await this.syncInventory(operation.operation, operation.data);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      // Mark as synced
      await offlineStorage.markAsSynced(operation.id);
      await logger.debug(`Operação ${operation.id} sincronizada com sucesso`, { operationId: operation.id }, 'SyncManager', LogSource.SYNC);
    } catch (error) {
      await logger.error(`Falha ao sincronizar operação ${operation.id}`, { operationId: operation.id, error }, 'SyncManager', LogSource.SYNC);
      await this.handleSyncFailure(operation);
    }
  }

  private async syncCustomer(operation: string, data: any): Promise<Response> {
    try {
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
    } catch (error) {
      await logger.error('Erro ao sincronizar cliente', { operation, data, error }, 'SyncManager', LogSource.SYNC);
      throw error;
    }
  }

  private async syncPayment(operation: string, data: any): Promise<Response> {
    try {
      await logger.info('Sincronizando operação de pagamento', { operation, amount: data.amount }, 'SyncManager', LogSource.PAYMENT);
      
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
    } catch (error) {
      await logger.critical('Erro crítico ao sincronizar pagamento', { operation, data, error }, 'SyncManager', LogSource.PAYMENT);
      throw error;
    }
  }

  private async syncInventory(operation: string, data: any): Promise<Response> {
    try {
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
    } catch (error) {
      await logger.error('Erro ao sincronizar inventário', { operation, data, error }, 'SyncManager', LogSource.INVENTORY);
      throw error;
    }
  }

  private async handleSyncFailure(operation: SyncOperation): Promise<void> {
    const updatedOperation = {
      ...operation,
      retries: operation.retries + 1
    };

    if (updatedOperation.retries >= operation.maxRetries) {
      await logger.critical('Máximo de tentativas alcançado para operação', {
        operationId: operation.id,
        type: operation.type,
        operation: operation.operation,
        retries: updatedOperation.retries,
        maxRetries: operation.maxRetries
      }, 'SyncManager', LogSource.SYNC);
      
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
    await logger.debug(`Tentativa reagendada para operação ${operation.id} em ${retryDelay}ms`, { operationId: operation.id, retryDelay }, 'SyncManager', LogSource.SYNC);
  }

  // Force sync specific operation type
  async forceSyncType(type: string): Promise<void> {
    try {
      if (!this.isOnline) {
        throw new Error('Cannot force sync while offline');
      }

      await logger.info(`Forçando sincronização para tipo: ${type}`, { type }, 'SyncManager', LogSource.SYNC);
      const pendingOperations = await offlineStorage.getPendingSyncItems();
      const typeOperations = pendingOperations.filter((op: any) => op.type === type);

      for (const operation of typeOperations) {
        await this.syncOperation(operation as SyncOperation);
      }
      await logger.info(`Sincronização forçada concluída para tipo: ${type}`, { type }, 'SyncManager', LogSource.SYNC);
    } catch (error) {
      await logger.error('Erro ao forçar sincronização', { type, error }, 'SyncManager', LogSource.SYNC);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    syncInProgress: boolean;
    pendingCount: number;
    lastSyncTime: string | null;
  }> {
    try {
      const pendingOperations = await offlineStorage.getPendingSyncItems();
      const lastSyncTime = await offlineStorage.getConfig('lastSyncTime');

      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingCount: pendingOperations.length,
        lastSyncTime: lastSyncTime as string | null
      };
    } catch (error) {
      await logger.error('Erro ao obter status de sincronização', error, 'SyncManager', LogSource.SYNC);
      throw error;
    }
  }

  // Manual sync trigger
  async manualSync(): Promise<void> {
    try {
      if (!this.isOnline) {
        throw new Error('Cannot sync while offline');
      }

      await logger.info('Sincronização manual iniciada', {}, 'SyncManager', LogSource.SYNC);
      await this.syncPendingOperations();
      await offlineStorage.saveConfig('lastSyncTime', new Date().toISOString());
      await logger.info('Sincronização manual concluída', {}, 'SyncManager', LogSource.SYNC);
    } catch (error) {
      await logger.error('Erro na sincronização manual', error, 'SyncManager', LogSource.SYNC);
      throw error;
    }
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

