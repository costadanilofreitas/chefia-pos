/**
 * Utilitários comuns para o sistema Chefia POS
 * Exporta todas as funcionalidades de performance e offline
 */

// Sistema de armazenamento offline
export { 
  OfflineStorage, 
  offlineStorage,
  useOfflineStorage 
} from './offline-storage';

// Compressão de dados
export { 
  DataCompressor, 
  dataCompressor, 
  useDataCompression,
  DataAnalyzer 
} from './data-compression';

// Service Worker
export { 
  serviceWorkerManager,
  useServiceWorker 
} from './service-worker-registration';

// Re-export dos hooks especializados
export { useOfflineOrders } from '../hooks/useOfflineOrders';
export { useOfflineProducts } from '../hooks/useOfflineProducts';
export { useOfflineSync } from '../hooks/useOfflineSync';

// Tipos e interfaces
export type { ServiceWorkerEvents } from './service-worker-registration';