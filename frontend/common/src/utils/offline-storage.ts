/**
 * Sistema de armazenamento offline para operação local
 * Otimizado para performance e sincronização quando online
 * Inclui compressão automática de dados
 */

import { dataCompressor } from './data-compression';

interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  version: string;
  checksum?: string;
  compressed?: boolean;
  originalSize?: number;
  compressedSize?: number;
}

interface SyncQueue {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
}

export class OfflineStorage {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;
  private syncQueue: SyncQueue[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor(dbName: string = 'chefia-pos-offline', version: number = 1) {
    this.dbName = dbName;
    this.version = version;
    this.initializeDB();
    this.setupOnlineHandlers();
    this.loadSyncQueue();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para dados principais (produtos, clientes, etc)
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('category', 'category', { unique: false });
        }

        // Store para fila de sincronização
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para configurações
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Store para logs de operação
        if (!db.objectStoreNames.contains('operationLogs')) {
          const logsStore = db.createObjectStore('operationLogs', { keyPath: 'id' });
          logsStore.createIndex('timestamp', 'timestamp', { unique: false });
          logsStore.createIndex('level', 'level', { unique: false });
        }
      };
    });
  }

  private setupOnlineHandlers(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ==================== CACHE OPERATIONS ====================

  async setCache<T>(
    key: string, 
    data: T, 
    category: string = 'general',
    ttl: number = 3600000 // 1 hour default
  ): Promise<void> {
    if (!this.db) await this.initializeDB();

    const originalData = JSON.stringify(data);
    const originalSize = originalData.length;
    let finalData: any = data;
    let compressed = false;
    let compressedSize = originalSize;

    // Comprimir dados se valer a pena (>500 bytes)
    if (originalSize > 500) {
      try {
        const compressedData = await dataCompressor.compressData(data);
        compressedSize = compressedData.length;
        
        // Usar compressão apenas se economizar mais de 10%
        if (compressedSize < originalSize * 0.9) {
          finalData = compressedData;
          compressed = true;
          console.log(`[OfflineStorage] Dados comprimidos: ${originalSize} -> ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% economia)`);
        }
      } catch (error) {
        console.warn('[OfflineStorage] Erro na compressão, usando dados originais:', error);
      }
    }

    const item: StorageItem<T> = {
      data: finalData,
      timestamp: Date.now(),
      version: this.version.toString(),
      checksum: this.generateChecksum(data),
      compressed,
      originalSize,
      compressedSize
    };

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    await store.put({
      id: key,
      category,
      ...item,
      expiresAt: Date.now() + ttl
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise(async (resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = async () => {
        const result = request.result;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Verificar expiração
        if (result.expiresAt && Date.now() > result.expiresAt) {
          this.deleteCache(key); // Limpar cache expirado
          resolve(null);
          return;
        }

        try {
          let finalData = result.data;

          // Descomprimir dados se necessário
          if (result.compressed) {
            finalData = await dataCompressor.decompressData(result.data);
            console.log(`[OfflineStorage] Dados descomprimidos: ${result.compressedSize} -> ${result.originalSize} bytes`);
          }

          resolve(finalData);
        } catch (error) {
          console.error('[OfflineStorage] Erro ao descomprimir dados:', error);
          // Fallback para dados originais se descompressão falhar
          resolve(result.data);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    await store.delete(key);
  }

  async clearCacheByCategory(category: string): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('category');
    
    const request = index.openCursor(IDBKeyRange.only(category));
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  // ==================== SYNC QUEUE OPERATIONS ====================

  async addToSyncQueue(
    action: SyncQueue['action'],
    endpoint: string,
    data: any
  ): Promise<void> {
    const queueItem: SyncQueue = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();

    // Tentar sincronizar imediatamente se online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        this.syncQueue = request.result || [];
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async saveSyncQueue(): Promise<void> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    // Limpar e repovoar
    await store.clear();
    for (const item of this.syncQueue) {
      await store.put(item);
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    console.log(`[OfflineStorage] Processando ${this.syncQueue.length} itens da fila de sincronização`);

    const itemsToProcess = [...this.syncQueue];
    const processedItems: string[] = [];

    for (const item of itemsToProcess) {
      try {
        await this.syncItem(item);
        processedItems.push(item.id);
      } catch (error) {
        console.error(`[OfflineStorage] Erro ao sincronizar item ${item.id}:`, error);
        
        // Incrementar tentativas
        item.retries++;
        
        // Remover da fila se excedeu tentativas (máximo 3)
        if (item.retries >= 3) {
          console.error(`[OfflineStorage] Item ${item.id} removido da fila após 3 tentativas`);
          processedItems.push(item.id);
        }
      }
    }

    // Remover itens processados
    this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item.id));
    await this.saveSyncQueue();

    console.log(`[OfflineStorage] Sincronização concluída. ${processedItems.length} itens processados`);
  }

  private async syncItem(item: SyncQueue): Promise<void> {
    const { action, endpoint, data } = item;
    
    let response: Response;
    
    switch (action) {
      case 'CREATE':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      case 'UPDATE':
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;
        
      case 'DELETE':
        response = await fetch(endpoint, {
          method: 'DELETE'
        });
        break;
        
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  private generateChecksum(data: any): string {
    // Simples hash para verificação de integridade
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  async getStorageUsage(): Promise<{ 
    used: number; 
    available: number; 
    percentage: number;
    compressionStats?: {
      totalItems: number;
      compressedItems: number;
      totalOriginalSize: number;
      totalCompressedSize: number;
      totalSavings: number;
      averageCompressionRatio: number;
    };
  }> {
    let compressionStats;
    
    try {
      compressionStats = await this.getCompressionStats();
    } catch (error) {
      console.warn('[OfflineStorage] Erro ao calcular estatísticas de compressão:', error);
    }

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;
      
      return { used, available, percentage, compressionStats };
    }
    
    return { used: 0, available: 0, percentage: 0, compressionStats };
  }

  private async getCompressionStats() {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise<{
      totalItems: number;
      compressedItems: number;
      totalOriginalSize: number;
      totalCompressedSize: number;
      totalSavings: number;
      averageCompressionRatio: number;
    }>((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result;
        let totalItems = 0;
        let compressedItems = 0;
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;

        for (const item of items) {
          totalItems++;
          if (item.originalSize) {
            totalOriginalSize += item.originalSize;
          }
          if (item.compressedSize) {
            totalCompressedSize += item.compressedSize;
          }
          if (item.compressed) {
            compressedItems++;
          }
        }

        const totalSavings = totalOriginalSize - totalCompressedSize;
        const averageCompressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1;

        resolve({
          totalItems,
          compressedItems,
          totalOriginalSize,
          totalCompressedSize,
          totalSavings,
          averageCompressionRatio
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<number> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    let deletedCount = 0;
    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          if (record.expiresAt && now > record.expiresAt) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== PUBLIC API ====================

  get queueSize(): number {
    return this.syncQueue.length;
  }

  get isConnected(): boolean {
    return this.isOnline;
  }

  async exportData(): Promise<string> {
    const data = {
      cache: await this.getAllCache(),
      syncQueue: this.syncQueue,
      timestamp: Date.now()
    };
    
    return JSON.stringify(data, null, 2);
  }

  private async getAllCache(): Promise<any[]> {
    if (!this.db) await this.initializeDB();

    const transaction = this.db!.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Instância global singleton
export const offlineStorage = new OfflineStorage();

// Hook React para facilitar uso
export function useOfflineStorage() {
  return {
    setCache: offlineStorage.setCache.bind(offlineStorage),
    getCache: offlineStorage.getCache.bind(offlineStorage),
    deleteCache: offlineStorage.deleteCache.bind(offlineStorage),
    addToSyncQueue: offlineStorage.addToSyncQueue.bind(offlineStorage),
    queueSize: offlineStorage.queueSize,
    isConnected: offlineStorage.isConnected,
    getStorageUsage: offlineStorage.getStorageUsage.bind(offlineStorage),
    clearExpiredCache: offlineStorage.clearExpiredCache.bind(offlineStorage)
  };
}