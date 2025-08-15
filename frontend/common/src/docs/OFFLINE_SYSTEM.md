# Sistema Offline - Chefia POS

## Visão Geral

O sistema offline do Chefia POS foi desenvolvido para garantir operação contínua mesmo sem conexão com a internet. Utiliza IndexedDB, Service Workers, compressão de dados e sincronização automática.

## Componentes Principais

### 1. OfflineStorage (`utils/offline-storage.ts`)
Sistema de armazenamento local com IndexedDB que oferece:
- Cache inteligente com TTL
- Fila de sincronização automática
- Compressão automática de dados grandes
- Monitoramento de uso de armazenamento

### 2. DataCompressor (`utils/data-compression.ts`)
Sistema de compressão que reduz uso de espaço:
- Compressão automática para dados >500 bytes
- Fallback para algoritmo simples se gzip não estiver disponível
- Análise de eficiência antes de comprimir
- Economia média de 30-70% no tamanho dos dados

### 3. Service Worker (`utils/service-worker.ts`)
Cache avançado de recursos:
- Cache estático para assets da aplicação
- Cache dinâmico para APIs críticas
- Estratégias diferenciadas por tipo de recurso
- Sincronização em background

### 4. Hooks Especializados

#### useOfflineOrders
Gerencia pedidos com suporte offline:
```typescript
const {
  orders,
  loading,
  createOrder,
  updateOrderStatus,
  pendingSync
} = useOfflineOrders();
```

#### useOfflineProducts
Cache otimizado de produtos:
```typescript
const {
  products,
  categories,
  getProductsByCategory,
  searchProducts,
  isConnected
} = useOfflineProducts();
```

#### useOfflineSync
Monitora status de sincronização:
```typescript
const {
  isOnline,
  pendingOperations,
  forcSync,
  clearCache,
  storageUsage
} = useOfflineSync();
```

## Como Usar

### 1. Inicialização do Service Worker
```typescript
import { useServiceWorker } from '@common/utils';

function App() {
  const { register } = useServiceWorker({
    onInstalled: () => console.log('SW instalado'),
    onUpdated: () => console.log('SW atualizado'),
    onOffline: () => console.log('Offline'),
    onOnline: () => console.log('Online')
  });

  useEffect(() => {
    register();
  }, []);
}
```

### 2. Gerenciamento de Pedidos Offline
```typescript
import { useOfflineOrders } from '@common/hooks';

function OrdersPage() {
  const { 
    orders, 
    createOrder, 
    updateOrderStatus, 
    pendingSync 
  } = useOfflineOrders();

  const handleCreateOrder = async (orderData) => {
    try {
      const orderId = await createOrder(orderData);
      console.log('Pedido criado:', orderId);
      // Funciona offline e sincroniza automaticamente
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
    }
  };

  return (
    <div>
      {pendingSync > 0 && (
        <div>📡 {pendingSync} operações pendentes de sincronização</div>
      )}
      {/* Lista de pedidos */}
    </div>
  );
}
```

### 3. Cache de Produtos
```typescript
import { useOfflineProducts } from '@common/hooks';

function ProductsPage() {
  const { 
    products, 
    categories, 
    searchProducts, 
    isConnected 
  } = useOfflineProducts();

  const handleSearch = (query: string) => {
    const results = searchProducts(query);
    // Busca funciona offline usando cache local
    return results;
  };

  return (
    <div>
      {!isConnected && (
        <div>⚠️ Modo offline - dados podem estar desatualizados</div>
      )}
      {/* Interface de produtos */}
    </div>
  );
}
```

### 4. Monitoramento de Sincronização
```typescript
import { useOfflineSync } from '@common/hooks';

function SyncStatus() {
  const {
    isOnline,
    pendingOperations,
    storageUsage,
    forcSync,
    clearExpiredCache
  } = useOfflineSync();

  const handleForceSync = async () => {
    if (isOnline) {
      await forcSync();
    }
  };

  const handleCleanup = async () => {
    const deletedCount = await clearExpiredCache();
    console.log(`${deletedCount} itens expirados removidos`);
  };

  return (
    <div>
      <div>Status: {isOnline ? '🟢 Online' : '🔴 Offline'}</div>
      <div>Pendências: {pendingOperations}</div>
      <div>Armazenamento: {storageUsage.percentage.toFixed(1)}%</div>
      
      {storageUsage.compressionStats && (
        <div>
          Compressão: {storageUsage.compressionStats.compressedItems}/
          {storageUsage.compressionStats.totalItems} itens, 
          {Math.round(storageUsage.compressionStats.totalSavings / 1024)}KB economizados
        </div>
      )}

      <button onClick={handleForceSync} disabled={!isOnline}>
        Sincronizar Agora
      </button>
      <button onClick={handleCleanup}>
        Limpar Cache Expirado
      </button>
    </div>
  );
}
```

## Estratégias de Cache

### APIs
- **Products**: Cache por 30 minutos, atualização automática
- **Orders**: Cache até sincronização, alta prioridade
- **Business Status**: Cache por 30 segundos

### Recursos Estáticos
- **Scripts/CSS**: Cache permanente com versionamento
- **Imagens**: Cache por 24 horas
- **Páginas HTML**: Network-first com fallback offline

## Performance

### Compressão Automática
- Dados >500 bytes são automaticamente comprimidos
- Economia média de 30-70% no espaço de armazenamento
- Algoritmos: gzip (moderno) ou LZ-string simples (fallback)

### Estratégias de Armazenamento
- **Cache pequeno** (<100 bytes): Sem compressão
- **Cache médio** (100-500 bytes): Compressão opcional
- **Cache grande** (>500 bytes): Compressão automática
- **Cache muito grande** (>1MB): Divisão em chunks

### Limpeza Automática
- Cache expirado é removido automaticamente
- Limpeza forçada quando uso >90% do espaço disponível
- Monitoramento contínuo de uso de armazenamento

## Monitoramento

### Métricas Disponíveis
- Número de operações pendentes
- Uso de armazenamento (bytes e percentual)
- Estatísticas de compressão
- Status de conectividade
- Tempo da última sincronização

### Logs e Debug
```typescript
// Habilitar logs detalhados no console
localStorage.setItem('debug-offline', 'true');

// Exportar dados para análise
const data = await offlineStorage.exportData();
console.log('Dados offline:', JSON.parse(data));
```

## Melhores Práticas

### 1. Inicialização
- Registre o Service Worker logo no início da aplicação
- Configure handlers para eventos online/offline
- Implemente feedback visual para status de conectividade

### 2. Operações Críticas
- Sempre permita operação offline para funções essenciais
- Use fallbacks quando APIs não estão disponíveis
- Implemente retry automático para operações falhadas

### 3. UX Offline
- Indique claramente quando está offline
- Mostre número de operações pendentes
- Permita visualização de dados em cache
- Não bloqueie funcionalidades essenciais

### 4. Performance
- Use hooks especializados para cada tipo de dado
- Implemente paginação para listas grandes
- Configure TTL apropriado para cada tipo de cache
- Monitore uso de armazenamento regularmente

## Troubleshooting

### Problemas Comuns

#### Cache não funciona
```typescript
// Verificar se IndexedDB está disponível
if (!window.indexedDB) {
  console.error('IndexedDB não suportado');
}

// Limpar cache corrompido
await offlineStorage.clearCache();
```

#### Sincronização falha
```typescript
// Verificar fila de sincronização
console.log('Fila pendente:', offlineStorage.queueSize);

// Forçar sincronização manual
await useOfflineSync().forcSync();
```

#### Espaço insuficiente
```typescript
// Verificar uso de armazenamento
const usage = await offlineStorage.getStorageUsage();
console.log('Uso:', usage.percentage + '%');

// Limpar dados desnecessários
await offlineStorage.clearExpiredCache();
```

### Reset Completo
```typescript
// Em caso de problemas graves, resetar tudo
await serviceWorkerManager.clearCaches();
await offlineStorage.clearCache();
localStorage.clear();
location.reload();
```