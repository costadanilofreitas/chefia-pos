/**
 * Hooks React para o sistema Chefia POS
 * Inclui hooks especializados para operação offline
 */

// Hooks de armazenamento offline
export { useOfflineOrders } from './useOfflineOrders';
export { useOfflineProducts } from './useOfflineProducts';
export { useOfflineSync } from './useOfflineSync';

// Re-export dos hooks de utilitários
export { useOfflineStorage } from '../utils/offline-storage';
export { useDataCompression } from '../utils/data-compression';
export { useServiceWorker } from '../utils/service-worker-registration';