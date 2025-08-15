/**
 * Hook para monitorar status de sincronização e gerenciar operações offline
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../utils/offline-storage';

interface SyncStatus {
  isOnline: boolean;
  pendingOperations: number;
  isAnyObjectOperationInProgress: boolean;
  lastSyncAttempt: Date | null;
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

interface UseOfflineSyncReturn extends SyncStatus {
  forcSync: () => Promise<void>;
  clearCache: () => Promise<void>;
  clearExpiredCache: () => Promise<number>;
  exportData: () => Promise<string>;
  getQueueStatus: () => number;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    pendingOperations: 0,
    isAnyObjectOperationInProgress: false,
    lastSyncAttempt: null,
    storageUsage: { used: 0, available: 0, percentage: 0 }
  });

  // Atualizar status de sincronização
  const updateSyncStatus = useCallback(async () => {
    try {
      const storageUsage = await offlineStorage.getStorageUsage();
      
      setSyncStatus(prev => ({
        ...prev,
        isOnline: offlineStorage.isConnected,
        pendingOperations: offlineStorage.queueSize,
        storageUsage
      }));
    } catch (err) {
      console.error('[useOfflineSync] Erro ao atualizar status:', err);
    }
  }, []);

  // Forçar sincronização manual
  const forcSync = useCallback(async () => {
    if (!offlineStorage.isConnected) {
      throw new Error('Não é possível sincronizar offline');
    }

    setSyncStatus(prev => ({ 
      ...prev, 
      isAnyObjectOperationInProgress: true,
      lastSyncAttempt: new Date()
    }));

    try {
      // O OfflineStorage já possui lógica de sincronização automática
      // Aqui podemos forçar uma verificação
      window.dispatchEvent(new Event('online'));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar processamento
      await updateSyncStatus();
    } catch (err) {
      console.error('[useOfflineSync] Erro na sincronização forçada:', err);
      throw err;
    } finally {
      setSyncStatus(prev => ({ ...prev, isAnyObjectOperationInProgress: false }));
    }
  }, [updateSyncStatus]);

  // Limpar todo o cache
  const clearCache = useCallback(async () => {
    try {
      await offlineStorage.clearCacheByCategory('orders');
      await offlineStorage.clearCacheByCategory('products');
      await offlineStorage.clearCacheByCategory('customers');
      await offlineStorage.clearCacheByCategory('general');
      await updateSyncStatus();
    } catch (err) {
      console.error('[useOfflineSync] Erro ao limpar cache:', err);
      throw err;
    }
  }, [updateSyncStatus]);

  // Limpar cache expirado
  const clearExpiredCache = useCallback(async (): Promise<number> => {
    try {
      const deletedCount = await offlineStorage.clearExpiredCache();
      await updateSyncStatus();
      return deletedCount;
    } catch (err) {
      console.error('[useOfflineSync] Erro ao limpar cache expirado:', err);
      throw err;
    }
  }, [updateSyncStatus]);

  // Exportar dados para backup
  const exportData = useCallback(async (): Promise<string> => {
    try {
      return await offlineStorage.exportData();
    } catch (err) {
      console.error('[useOfflineSync] Erro ao exportar dados:', err);
      throw err;
    }
  }, []);

  // Obter status da fila
  const getQueueStatus = useCallback((): number => {
    return offlineStorage.queueSize;
  }, []);

  // Monitorar mudanças de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ 
        ...prev, 
        isOnline: true,
        lastSyncAttempt: new Date()
      }));
      updateSyncStatus();
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSyncStatus]);

  // Atualizar status periodicamente
  useEffect(() => {
    updateSyncStatus();
    
    const interval = setInterval(updateSyncStatus, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // Monitor de uso de armazenamento
  useEffect(() => {
    const checkStorageUsage = async () => {
      const usage = await offlineStorage.getStorageUsage();
      
      // Alertar se uso de armazenamento estiver alto (>80%)
      if (usage.percentage > 80) {
        console.warn('[useOfflineSync] Uso de armazenamento alto:', usage.percentage.toFixed(1) + '%');
        
        // Auto-limpeza de cache expirado se uso muito alto (>90%)
        if (usage.percentage > 90) {
          const deletedCount = await clearExpiredCache();
          console.log(`[useOfflineSync] Auto-limpeza realizada: ${deletedCount} itens removidos`);
        }
      }
    };

    checkStorageUsage();
    const storageInterval = setInterval(checkStorageUsage, 300000); // A cada 5 minutos
    
    return () => clearInterval(storageInterval);
  }, [clearExpiredCache]);

  return {
    ...syncStatus,
    forcSync,
    clearCache,
    clearExpiredCache,
    exportData,
    getQueueStatus
  };
}