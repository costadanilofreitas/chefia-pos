/**
 * Offline Backup Service
 * Sistema de backup e restore de estado para operação offline
 * 
 * IMPORTANTE: Este serviço garante que o POS continue funcionando
 * mesmo sem conexão com internet ou servidor
 */

import { requestCache } from './RequestCache';
import eventBus from '../utils/EventBus';
import { confirmAction } from '../utils/notifications';
import { offlineStorage } from './OfflineStorage';

interface BackupMetadata {
  version: number;
  timestamp: string;
  terminalId: string;
  userId: string;
  totalEntries: number;
  checksum?: string;
}

interface BackupData {
  metadata: BackupMetadata;
  data: {
    orders: any[];
    tables: any[];
    cashier: any;
    products: any[];
    categories: any[];
    customers: any[];
    config: any;
  };
  pendingSync: {
    creates: any[];
    updates: any[];
    deletes: any[];
  };
}

interface SyncQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId: string;
  data: any;
  timestamp: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

class OfflineBackupService {
  private readonly DB_NAME = 'POSOfflineDB';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;
  private syncQueue: SyncQueueItem[] = [];
  private isOnline = navigator.onLine;
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private readonly BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_SYNC_ATTEMPTS = 3;
  
  constructor() {
    this.initDatabase();
    this.setupEventListeners();
    this.startAutoBackup();
  }

  /**
   * Inicializa o IndexedDB para armazenamento offline
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => {
        offlineStorage.log('error', 'Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        offlineStorage.log('info', 'IndexedDB initialized for offline storage');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para dados principais
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'timestamp' });
          backupStore.createIndex('terminalId', 'metadata.terminalId', { unique: false });
        }
        
        // Store para fila de sincronização
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('entity', 'entity', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store para estado da aplicação
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Monitorar status de conexão
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Escutar eventos de mudança para backup automático
    const eventsToBackup = [
      'order:created',
      'order:updated',
      'table:updated',
      'cashier:opened',
      'cashier:closed',
      'payment:completed'
    ];
    
    eventsToBackup.forEach(event => {
      eventBus.on(event, (data) => this.queueForSync(event, data));
    });
  }

  /**
   * Inicia backup automático
   */
  private startAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
    
    this.autoBackupInterval = setInterval(() => {
      this.createBackup();
    }, this.BACKUP_INTERVAL);
  }

  /**
   * Cria backup completo do estado atual
   */
  async createBackup(): Promise<BackupMetadata> {
    if (!this.db) {
      await this.initDatabase();
    }
    
    try {
      // Coletar dados do cache e localStorage
      const cacheStats = requestCache.getStats();
      const terminalId = localStorage.getItem('terminal_id') || 'unknown';
      const userId = localStorage.getItem('user_id') || 'unknown';
      
      // Coletar dados principais
      const backupData: BackupData = {
        metadata: {
          version: this.DB_VERSION,
          timestamp: new Date().toISOString(),
          terminalId,
          userId,
          totalEntries: 0
        },
        data: {
          orders: this.getFromStorage('orders') || [],
          tables: this.getFromStorage('tables') || [],
          cashier: this.getFromStorage('current_cashier'),
          products: this.getFromStorage('products') || [],
          categories: this.getFromStorage('categories') || [],
          customers: this.getFromStorage('customers') || [],
          config: this.getFromStorage('app_config') || {}
        },
        pendingSync: {
          creates: [],
          updates: [],
          deletes: []
        }
      };
      
      // Adicionar itens da fila de sincronização
      const syncItems = await this.getSyncQueue();
      syncItems.forEach(item => {
        if (item.type === 'CREATE') {
          backupData.pendingSync.creates.push(item);
        } else if (item.type === 'UPDATE') {
          backupData.pendingSync.updates.push(item);
        } else if (item.type === 'DELETE') {
          backupData.pendingSync.deletes.push(item);
        }
      });
      
      // Calcular total de entradas
      backupData.metadata.totalEntries = 
        backupData.data.orders.length +
        backupData.data.tables.length +
        backupData.data.products.length +
        backupData.data.categories.length +
        backupData.data.customers.length +
        syncItems.length;
      
      // Salvar no IndexedDB
      await this.saveBackup(backupData);
      
      offlineStorage.log('info', `Backup created with ${backupData.metadata.totalEntries} entries`);
      eventBus.emit('backup:created', backupData.metadata);
      
      return backupData.metadata;
    } catch (error) {
      offlineStorage.log('error', 'Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restaura backup específico
   */
  async restoreBackup(timestamp?: string): Promise<void> {
    if (!this.db) {
      await this.initDatabase();
    }
    
    try {
      // Buscar backup mais recente se não especificado
      const backup = timestamp 
        ? await this.getBackup(timestamp)
        : await this.getLatestBackup();
      
      if (!backup) {
        throw new Error('No backup found to restore');
      }
      
      // Restaurar dados no localStorage
      Object.entries(backup.data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          this.saveToStorage(key, value);
        }
      });
      
      // Restaurar fila de sincronização
      if (backup.pendingSync) {
        const allItems = [
          ...backup.pendingSync.creates,
          ...backup.pendingSync.updates,
          ...backup.pendingSync.deletes
        ];
        
        for (const item of allItems) {
          await this.addToSyncQueue(item);
        }
      }
      
      // Invalidar cache para forçar reload
      requestCache.clear();
      
      offlineStorage.log('info', `Backup restored from ${backup.metadata.timestamp}`);
      eventBus.emit('backup:restored', backup.metadata);
      
      // Se online, tentar sincronizar
      if (this.isOnline) {
        this.processSyncQueue();
      }
    } catch (error) {
      offlineStorage.log('error', 'Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * Adiciona item à fila de sincronização
   */
  private async queueForSync(event: string, data: any): Promise<void> {
    // Extrair tipo e entidade do evento
    const [entity, action] = event.split(':');
    let type: SyncQueueItem['type'] = 'UPDATE';
    
    if (action === 'created') type = 'CREATE';
    else if (action === 'deleted') type = 'DELETE';
    
    const queueItem: SyncQueueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      entityId: data.id || data.order_id || 'unknown',
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    
    // Se offline, adicionar à fila
    if (!this.isOnline) {
      await this.addToSyncQueue(queueItem);
      console.debug(`Queued ${type} ${entity} for sync when online`);
    }
  }

  /**
   * Processa fila de sincronização quando online
   */
  private async processSyncQueue(): Promise<void> {
    const items = await this.getSyncQueue();
    
    if (items.length === 0) {
      return;
    }
    
    offlineStorage.log('info', `Processing ${items.length} items in sync queue`);
    
    for (const item of items) {
      try {
        // Tentar sincronizar
        await this.syncItem(item);
        
        // Se sucesso, remover da fila
        await this.removeFromSyncQueue(item.id);
      } catch (error) {
        offlineStorage.log('error', `Failed to sync ${item.entity}:`, error);
        
        // Incrementar tentativas
        item.attempts++;
        item.lastAttempt = new Date().toISOString();
        item.error = error.message;
        
        if (item.attempts >= this.MAX_SYNC_ATTEMPTS) {
          // Mover para fila de erros ou notificar usuário
          eventBus.emit('sync:failed', item);
          await this.removeFromSyncQueue(item.id);
        } else {
          // Atualizar item na fila
          await this.updateSyncQueueItem(item);
        }
      }
    }
  }

  /**
   * Sincroniza item individual
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    // Emitir evento de sincronização
    const eventName = `sync:${item.entity}:${item.type.toLowerCase()}`;
    eventBus.emit(eventName, item.data);
    
    // Aqui você faria a chamada real à API
    // Por exemplo:
    // await api.sync(item.entity, item.type, item.data);
  }

  /**
   * Handlers para mudança de status de conexão
   */
  private async handleOnline(): Promise<void> {
    this.isOnline = true;
    offlineStorage.log('info', 'Connection restored, processing sync queue');
    eventBus.emit('connection:online');
    
    // Processar fila de sincronização
    await this.processSyncQueue();
  }

  private async handleOffline(): Promise<void> {
    this.isOnline = false;
    offlineStorage.log('warn', 'Connection lost, entering offline mode');
    eventBus.emit('connection:offline');
    
    // Criar backup imediato
    await this.createBackup();
  }

  /**
   * Métodos auxiliares para IndexedDB
   */
  private async saveBackup(data: BackupData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');
    
    return new Promise((resolve, reject) => {
      const request = store.add({
        timestamp: data.metadata.timestamp,
        ...data
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getBackup(timestamp: string): Promise<BackupData | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['backups'], 'readonly');
    const store = transaction.objectStore('backups');
    
    return new Promise((resolve, reject) => {
      const request = store.get(timestamp);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getLatestBackup(): Promise<BackupData | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['backups'], 'readonly');
    const store = transaction.objectStore('backups');
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor(null, 'prev');
      
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Métodos auxiliares para localStorage
   */
  private getFromStorage(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private saveToStorage(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      offlineStorage.log('error', `Failed to save ${key} to storage:`, error);
    }
  }

  /**
   * Limpa backups antigos
   */
  async cleanupOldBackups(daysToKeep: number = 7): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();
    
    const transaction = this.db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');
    
    const request = store.openCursor();
    
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (cursor.value.metadata.timestamp < cutoffTimestamp) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }

  /**
   * Exporta backup para arquivo
   */
  async exportBackup(timestamp?: string): Promise<Blob> {
    const backup = timestamp 
      ? await this.getBackup(timestamp)
      : await this.getLatestBackup();
    
    if (!backup) {
      throw new Error('No backup found to export');
    }
    
    const json = JSON.stringify(backup, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Importa backup de arquivo
   */
  async importBackup(file: File): Promise<void> {
    const text = await file.text();
    const backup = JSON.parse(text) as BackupData;
    
    // Validar estrutura do backup
    if (!backup.metadata || !backup.data) {
      throw new Error('Invalid backup file format');
    }
    
    // Salvar backup
    await this.saveBackup(backup);
    
    // Opcionalmente restaurar
    const shouldRestore = confirmAction('Deseja restaurar este backup agora?');
    if (shouldRestore) {
      await this.restoreBackup(backup.metadata.timestamp);
    }
  }

  /**
   * Status do serviço
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncQueueSize: this.syncQueue.length,
      dbInitialized: this.db !== null,
      autoBackupEnabled: this.autoBackupInterval !== null
    };
  }

  /**
   * Destrói o serviço
   */
  destroy() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
  }
}

// Singleton instance
export const offlineBackup = new OfflineBackupService();

export default offlineBackup;