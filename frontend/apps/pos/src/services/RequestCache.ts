/**
 * Request Cache Service
 * Sistema de cache singleton para prevenir múltiplas requisições duplicadas
 * 
 * IMPORTANTE: Este cache é usado para prevenir requisições duplicadas causadas por:
 * - Re-renders de componentes
 * - Múltiplas montagens
 * - Race conditions
 * 
 * O cache real dos dados está no backend (Python/FastAPI)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface CacheConfig {
  ttl: number; // Time to live em millisegundos
  dedupWindow: number; // Janela de deduplicação em ms
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxCacheSize = 50; // Limitar a 50 entradas no cache
  private maxMemoryMB = 10; // Limitar a 10MB de memória
  
  // Configuração otimizada para POS LOCAL (latência ~0ms)
  private defaultConfig: CacheConfig = {
    ttl: 2000, // 2 segundos padrão (apenas para deduplicação)
    dedupWindow: 100 // 100ms para deduplicação
  };
  
  // TTLs específicos por tipo de dados (em ms)
  private readonly TTL_CONFIG: Record<string, number> = {
    // Cache curtíssimo - apenas deduplicação
    '/orders': 500,           // 0.5s - crítico estar atualizado
    '/cashier': 500,          // 0.5s - estado em tempo real
    '/business-day': 500,     // 0.5s - estado crítico
    '/fiscal': 500,           // 0.5s - documentos fiscais
    '/tables': 1000,          // 1s - estado das mesas
    
    // Cache curto - dados mudam pouco
    '/products': 5000,        // 5s - produtos raramente mudam
    '/categories': 5000,      // 5s - categorias estáveis
    '/customers': 5000,       // 5s - dados de clientes
    '/employees': 10000,      // 10s - funcionários estáveis
    
    // Cache médio - dados mais estáveis
    '/config': 30000,         // 30s - configurações
    '/layouts': 30000,        // 30s - layouts de mesa
    
    // Apenas deduplicação (100ms)
    'default': 100            // Fallback mínimo
  };
  
  constructor() {
    // Iniciar limpeza automática a cada 10 segundos
    this.startAutoCleanup();
  }

  /**
   * Executa uma requisição com cache e deduplicação
   * Se uma requisição idêntica estiver em andamento, retorna a mesma promise
   * Se o cache estiver válido, retorna os dados do cache
   */
  async execute<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: Partial<CacheConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultConfig, ...options };
    
    // Se há uma requisição pendente, retornar ela
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }
    
    // Verificar cache válido
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached, config.ttl)) {
      return cached.data;
    }
    
    // Criar nova requisição com deduplicação
    const promise = this.createDedupedRequest(key, fetcher, config);
    this.pendingRequests.set(key, promise);
    
    try {
      const data = await promise;
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      // Garantir que não excedemos limites de memória
      this.enforceMemoryLimits();
      return data;
    } finally {
      // Limpar requisição pendente após um pequeno delay
      // para capturar requisições duplicadas muito próximas
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, config.dedupWindow);
    }
  }

  /**
   * Cria uma requisição com deduplicação
   * Previne múltiplas requisições idênticas em um curto período
   */
  private async createDedupedRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    // Aguardar um pequeno delay para capturar requisições duplicadas
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verificar novamente se não há requisição pendente
    const pending = this.pendingRequests.get(key);
    if (pending && pending !== this.pendingRequests.get(key)) {
      return pending;
    }
    
    // Executar a requisição
    return fetcher();
  }

  /**
   * Verifica se o cache ainda é válido
   */
  private isCacheValid(entry: CacheEntry<any>, ttl: number): boolean {
    return Date.now() - entry.timestamp < ttl;
  }

  /**
   * Invalida o cache para uma chave específica
   */
  invalidate(key: string) {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalida todo o cache que corresponde a um padrão
   */
  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pendingRequests.keys()) {
      if (regex.test(key)) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const memoryUsageMB = this.estimateMemoryUsage();
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      pendingRequests: this.pendingRequests.size,
      memoryUsageMB: memoryUsageMB.toFixed(2),
      maxMemoryMB: this.maxMemoryMB,
      memoryUsagePercent: ((memoryUsageMB / this.maxMemoryMB) * 100).toFixed(1),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: this.getTTLForKey(key),
        expired: Date.now() - entry.timestamp > this.getTTLForKey(key),
        hasData: !!entry.data
      }))
    };
  }

  /**
   * Pré-carrega dados no cache
   */
  preload<T>(key: string, data: T) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.enforceMemoryLimits();
  }

  /**
   * Inicia limpeza automática de entradas expiradas
   */
  private startAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Limpar cache expirado a cada 10 segundos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 10000);
  }

  /**
   * Limpa entradas expiradas do cache
   */
  private cleanupExpiredEntries() {
    const now = Date.now();
    let entriesRemoved = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Determinar TTL baseado na chave
      const ttl = this.getTTLForKey(key);
      
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
        entriesRemoved++;
      }
    }
    
    if (entriesRemoved > 0) {
      // Log apenas em desenvolvimento
      if (import.meta.env.DEV) {
        console.debug(`Cache cleanup: removed ${entriesRemoved} expired entries`);
      }
    }
  }

  /**
   * Obtém o TTL apropriado para uma chave
   */
  private getTTLForKey(key: string): number {
    // Procurar por padrão correspondente no TTL_CONFIG
    for (const [pattern, ttl] of Object.entries(this.TTL_CONFIG)) {
      if (key.includes(pattern)) {
        return ttl;
      }
    }
    return this.TTL_CONFIG.default || 100;
  }

  /**
   * Garante que o cache não exceda limites de memória
   */
  private enforceMemoryLimits() {
    // Limitar número de entradas
    if (this.cache.size > this.maxCacheSize) {
      // Remover entradas mais antigas primeiro (FIFO)
      const entriesToRemove = this.cache.size - this.maxCacheSize;
      const keys = Array.from(this.cache.keys());
      
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(keys[i]);
      }
    }
    
    // Estimar uso de memória (simplificado)
    const estimatedMemoryMB = this.estimateMemoryUsage();
    if (estimatedMemoryMB > this.maxMemoryMB) {
      // Limpar 50% do cache se exceder limite de memória
      const keysToRemove = Math.floor(this.cache.size / 2);
      const keys = Array.from(this.cache.keys());
      
      for (let i = 0; i < keysToRemove; i++) {
        this.cache.delete(keys[i]);
      }
      
      if (import.meta.env.DEV) {
        console.warn(`Cache memory limit exceeded (${estimatedMemoryMB}MB). Cleared ${keysToRemove} entries.`);
      }
    }
  }

  /**
   * Estima uso de memória do cache em MB
   */
  private estimateMemoryUsage(): number {
    let totalBytes = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Estimar tamanho da chave
      totalBytes += key.length * 2; // 2 bytes por caractere
      
      // Estimar tamanho dos dados (simplificado)
      try {
        const dataStr = JSON.stringify(entry.data);
        totalBytes += dataStr.length * 2;
      } catch {
        // Se não conseguir serializar, assumir 1KB
        totalBytes += 1024;
      }
    }
    
    return totalBytes / (1024 * 1024); // Converter para MB
  }

  /**
   * Destrói o cache e limpa intervalos
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
export const requestCache = new RequestCache();

// Hook helper para React
export function useCachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: Partial<CacheConfig>
): () => Promise<T> {
  return () => requestCache.execute(key, fetcher, options);
}

export default requestCache;