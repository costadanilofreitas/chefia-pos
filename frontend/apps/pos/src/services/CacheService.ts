// Cache Service para armazenar categorias e produtos
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class CacheService {
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };
    this.cache.set(key, item);
// console.log(`🗄️ Cache: Stored ${key} with TTL ${ttl}ms`);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
// console.log(`🗄️ Cache: Miss for ${key}`);
      return null;
    }

    if (Date.now() > item.expiry) {
// console.log(`🗄️ Cache: Expired ${key}, removing`);
      this.cache.delete(key);
      return null;
    }
// console.log(`🗄️ Cache: Hit for ${key}`);
    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
// console.log(`🗄️ Cache: Cleared ${key}`);
    } else {
      this.cache.clear();
// console.log(`🗄️ Cache: Cleared all`);
    }
  }

  // Métodos específicos para produtos e categorias
  setProducts(products: Array<unknown>, ttl?: number): void {
    this.set('products', products, ttl);
  }

  getProducts(): Array<unknown> | null {
    return this.get<unknown[]>('products');
  }

  setCategories(categories: Array<unknown>, ttl?: number): void {
    this.set('categories', categories, ttl);
  }

  getCategories(): Array<unknown> | null {
    return this.get<unknown[]>('categories');
  }

  // Invalidar cache relacionado
  invalidateProductCache(): void {
    this.clear('products');
    this.clear('categories');
// console.log('🗄️ Cache: Invalidated product-related cache');
  }

  // Estatísticas do cache
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Instância singleton
export const cacheService = new CacheService();
export default cacheService;

