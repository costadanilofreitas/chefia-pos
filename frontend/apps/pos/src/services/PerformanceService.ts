/**
 * Serviço de otimização de performance com cache e lazy loading
 */

import eventBus from "../utils/EventBus";
import logger from "./LocalLoggerService";

// Configuração de cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  hits: number;
  lastAccess: number;
}

// Métricas de performance
interface PerformanceMetrics {
  cacheHitRate: number;
  avgLoadTime: number;
  memoryUsage: number;
  lazyLoadedComponents: number;
  prefetchedResources: number;
}

// Configuração de prefetch
interface PrefetchConfig {
  enabled: boolean;
  maxConcurrent: number;
  priority: "high" | "low" | "auto";
  patterns: string[];
}

class PerformanceService {
  private readonly eventBus = eventBus;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly loadingPromises = new Map<string, Promise<unknown>>();
  private readonly metrics: PerformanceMetrics = {
    cacheHitRate: 0,
    avgLoadTime: 0,
    memoryUsage: 0,
    lazyLoadedComponents: 0,
    prefetchedResources: 0,
  };

  // Configurações
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minuto

  // Estado
  private currentCacheSize = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private observer: IntersectionObserver | null = null;
  private performanceObserver: PerformanceObserver | null = null;

  // Prefetch
  private readonly prefetchConfig: PrefetchConfig = {
    enabled: true,
    maxConcurrent: 3,
    priority: "auto",
    patterns: ["/api/products", "/api/categories", "/api/customers/frequent"],
  };

  constructor() {
    this.init();
  }

  /**
   * Inicializa o serviço
   */
  private init() {
    this.setupIntersectionObserver();
    this.setupPerformanceObserver();
    this.startCleanupTimer();
    this.setupPrefetch();
  }

  /**
   * Configura Intersection Observer para lazy loading
   */
  private setupIntersectionObserver() {
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const lazyLoad = element.dataset.lazyLoad;

              if (lazyLoad) {
                this.loadLazyComponent(lazyLoad, element);
                this.observer?.unobserve(element);
              }
            }
          });
        },
        {
          rootMargin: "50px",
          threshold: 0.01,
        }
      );
    }
  }

  /**
   * Configura Performance Observer para métricas
   */
  private setupPerformanceObserver() {
    if ("PerformanceObserver" in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            this.updateNavigationMetrics(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === "resource") {
            this.updateResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });

      this.performanceObserver.observe({
        entryTypes: ["navigation", "resource", "measure"],
      });
    }
  }

  /**
   * Inicia timer de limpeza de cache
   */
  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Configura prefetch inteligente
   */
  private setupPrefetch() {
    if (!this.prefetchConfig.enabled) return;

    // Prefetch baseado em padrões de uso
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        this.prefetchResources();
      });
    } else {
      setTimeout(() => {
        this.prefetchResources();
      }, 1000);
    }

    // Prefetch baseado em hover
    document.addEventListener("mouseover", this.handleHoverPrefetch.bind(this));
  }

  /**
   * Cache com estratégias inteligentes
   */
  async cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      force?: boolean;
      prefetch?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = performance.now();

    // Verifica cache
    if (!options.force) {
      const cached = this.getFromCache<T>(key);
      if (cached !== null) {
        this.updateMetrics("cache-hit", performance.now() - startTime);
        return cached;
      }
    }

    // Verifica se já está carregando
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key) as Promise<T>;
    }

    // Faz o fetch
    const promise = fetcher()
      .then((data) => {
        this.setCache(key, data, options.ttl || this.DEFAULT_TTL);
        this.updateMetrics("cache-miss", performance.now() - startTime);
        return data;
      })
      .finally(() => {
        this.loadingPromises.delete(key);
      });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Obtém item do cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Verifica TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentCacheSize -= entry.size;
      return null;
    }

    // Atualiza métricas
    entry.hits++;
    entry.lastAccess = Date.now();

    return entry.data as T;
  }

  /**
   * Armazena no cache
   */
  private setCache<T>(key: string, data: T, ttl: number) {
    const size = this.estimateSize(data);

    // Verifica limite de tamanho
    if (size > this.MAX_CACHE_SIZE) {
      return;
    }

    // Libera espaço se necessário
    while (this.currentCacheSize + size > this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    // Armazena
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      size,
      hits: 0,
      lastAccess: Date.now(),
    };

    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  /**
   * Estima tamanho do objeto
   */
  private estimateSize(obj: unknown): number {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  /**
   * Remove item menos usado recentemente (LRU)
   */
  private evictLRU() {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.cache.delete(oldestKey);
        this.currentCacheSize -= entry.size;
      }
    }
  }

  /**
   * Limpa cache expirado
   */
  private cleanupCache() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
        this.currentCacheSize -= entry.size;
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Lazy loading de componentes
   */
  lazyLoad(componentPath: string): Promise<unknown> {
    return this.cachedFetch(
      `component:${componentPath}`,
      () => import(componentPath),
      { ttl: Infinity } // Componentes não expiram
    ).then((module) => {
      this.metrics.lazyLoadedComponents++;
      this.eventBus.emit("performance:component-loaded", componentPath);
      return module;
    });
  }

  /**
   * Carrega componente lazy
   */
  private async loadLazyComponent(componentPath: string, element: HTMLElement) {
    try {
      // Mostra placeholder
      element.classList.add("loading");

      // Carrega componente
      const module = (await this.lazyLoad(componentPath)) as {
        default?: React.ComponentType;
      };

      // Renderiza componente
      if (module.default) {
        // React component
        const React = await import("react");
        const ReactDOM = await import("react-dom/client");
        const Component = module.default;

        const root = ReactDOM.createRoot(element);
        root.render(React.createElement(Component));
      }

      element.classList.remove("loading");
    } catch (error) {
      void logger.error(
        `Failed to load lazy component: ${componentPath}`,
        { error, componentPath },
        "PerformanceService"
      );
      element.classList.add("error");
    }
  }

  /**
   * Observa elemento para lazy loading
   */
  observe(element: HTMLElement) {
    if (this.observer && element.dataset.lazyLoad) {
      this.observer.observe(element);
    }
  }

  /**
   * Prefetch de recursos
   */
  private async prefetchResources() {
    if (!this.prefetchConfig.enabled) return;

    const queue = [...this.prefetchConfig.patterns];
    const concurrent = this.prefetchConfig.maxConcurrent;

    // Processa em lotes
    while (queue.length > 0) {
      const batch = queue.splice(0, concurrent);

      await Promise.all(
        batch.map((pattern) => {
          return this.prefetchResource(pattern);
        })
      );
    }
  }

  /**
   * Prefetch de um recurso
   */
  private async prefetchResource(url: string) {
    try {
      // Usa API de prefetch se disponível
      if ("link" in document.createElement("link")) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url;
        document.head.appendChild(link);
      } else {
        // Fallback: fetch e cache
        await this.cachedFetch(
          `prefetch:${url}`,
          () => fetch(url).then((r) => r.json()),
          { ttl: 10 * 60 * 1000 } // 10 minutos
        );
      }

      this.metrics.prefetchedResources++;
    } catch (error) {
      // Prefetch failures are non-critical
      void logger.debug(
        `Failed to prefetch ${url}`,
        { error, url },
        "PerformanceService"
      );
    }
  }

  /**
   * Prefetch baseado em hover
   */
  private handleHoverPrefetch(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const link = target.closest("a[data-prefetch]") as HTMLAnchorElement;

    if (link && !link.dataset.prefetched) {
      const url = link.href;
      link.dataset.prefetched = "true";

      // Aguarda um pouco para evitar prefetch desnecessário
      setTimeout(() => {
        if (link.matches(":hover")) {
          this.prefetchResource(url);
        }
      }, 200);
    }
  }

  /**
   * Atualiza métricas de navegação
   */
  private updateNavigationMetrics(entry: PerformanceNavigationTiming) {
    const loadTime = entry.loadEventEnd - entry.fetchStart;

    // Atualiza média
    if (this.metrics.avgLoadTime === 0) {
      this.metrics.avgLoadTime = loadTime;
    } else {
      this.metrics.avgLoadTime = (this.metrics.avgLoadTime + loadTime) / 2;
    }

    this.eventBus.emit("performance:navigation", {
      loadTime,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.fetchStart,
      domInteractive: entry.domInteractive - entry.fetchStart,
    });
  }

  /**
   * Atualiza métricas de recursos
   */
  private updateResourceMetrics(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;

    this.eventBus.emit("performance:resource", {
      name: entry.name,
      duration,
      size: entry.transferSize,
      cached: entry.transferSize === 0,
    });
  }

  /**
   * Atualiza métricas gerais
   */
  private updateMetrics(_type: "cache-hit" | "cache-miss", _loadTime: number) {
    // Calcula taxa de acerto do cache
    const totalHits = Array.from(this.cache.values()).reduce(
      (sum, e) => sum + e.hits,
      0
    );
    const totalRequests = this.cache.size + totalHits;
    this.metrics.cacheHitRate =
      totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    // Atualiza memória
    if ("memory" in performance) {
      const memory = (
        performance as unknown as {
          memory: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      this.metrics.memoryUsage =
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }

    this.eventBus.emit("performance:metrics", this.metrics);
  }

  /**
   * Otimiza imagens
   */
  optimizeImage(
    url: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: "webp" | "jpg" | "png";
    } = {}
  ): string {
    // Se suporta WebP
    const supportsWebP = document
      .createElement("canvas")
      .toDataURL("image/webp")
      .startsWith("data:image/webp");

    // Constrói URL otimizada
    const params = new URLSearchParams();
    if (options.width) params.set("w", options.width.toString());
    if (options.height) params.set("h", options.height.toString());
    if (options.quality) params.set("q", options.quality.toString());
    if (options.format || supportsWebP)
      params.set("fmt", options.format || "webp");

    return `${url}?${params.toString()}`;
  }

  /**
   * Debounce para otimização
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle para otimização
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Obtém métricas atuais
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpa o cache
   */
  clearCache() {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton
const performanceService = new PerformanceService();
export default performanceService;
