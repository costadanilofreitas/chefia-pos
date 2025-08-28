/**
 * Utilitários para monitoramento e análise de performance
 */

interface PerformanceMetrics {
  renderTime: number;
  apiCallTime: number;
  totalLoadTime: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private timers: Map<string, number> = new Map();

  /**
   * Inicia um timer de performance
   */
  startTimer(key: string): void {
    this.timers.set(key, performance.now());
  }

  /**
   * Para um timer e retorna o tempo decorrido
   */
  endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (!startTime) {
      console.warn(`Timer '${key}' não foi iniciado`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    this.timers.delete(key);
    
    return duration;
  }

  /**
   * Registra uma métrica de performance
   */
  recordMetric(page: string, metric: Partial<PerformanceMetrics>): void {
    const existing = this.metrics.get(page) || {
      renderTime: 0,
      apiCallTime: 0,
      totalLoadTime: 0,
    };
    
    this.metrics.set(page, {
      ...existing,
      ...metric,
      memoryUsage: this.getMemoryUsage(),
    });
  }

  /**
   * Obtém o uso de memória (se disponível)
   */
  private getMemoryUsage(): number | undefined {
    // @ts-ignore - performance.memory está disponível no Chrome
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize / 1048576; // Converter para MB
    }
    return undefined;
  }

  /**
   * Obtém todas as métricas registradas
   */
  getMetrics(): Map<string, PerformanceMetrics> {
    return this.metrics;
  }

  /**
   * Limpa todas as métricas
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Imprime relatório de performance no console
   */
  printReport(): void {
    console.group('📊 Relatório de Performance');
    
    this.metrics.forEach((metrics, page) => {
      console.group(`📄 ${page}`);
      console.log(`⏱️ Tempo de Renderização: ${metrics.renderTime.toFixed(2)}ms`);
      console.log(`🌐 Tempo de API: ${metrics.apiCallTime.toFixed(2)}ms`);
      console.log(`⏳ Tempo Total: ${metrics.totalLoadTime.toFixed(2)}ms`);
      
      if (metrics.memoryUsage !== undefined) {
        console.log(`💾 Uso de Memória: ${metrics.memoryUsage.toFixed(2)}MB`);
      }
      
      // Análise de performance
      if (metrics.totalLoadTime > 1000) {
        console.warn('⚠️ Tempo de carregamento alto! Considere otimizações.');
      } else if (metrics.totalLoadTime < 100) {
        console.info('✅ Performance excelente!');
      } else {
        console.info('👍 Performance adequada.');
      }
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }

  /**
   * Monitora requisições fetch
   */
  monitorFetch(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0] as string;
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log apenas requisições lentas (> 200ms)
        if (duration > 200) {
          console.warn(`🐢 Requisição lenta: ${url} - ${duration.toFixed(2)}ms`);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error(`❌ Erro na requisição: ${url} - ${duration.toFixed(2)}ms`);
        throw error;
      }
    };
  }

  /**
   * Hook para monitorar performance de componentes React
   */
  useComponentPerformance(componentName: string) {
    const startTime = performance.now();
    
    return {
      recordRender: () => {
        const renderTime = performance.now() - startTime;
        this.recordMetric(componentName, { renderTime });
        
        if (renderTime > 16) { // Mais que 1 frame (60fps)
          console.warn(`⚠️ Render lento em ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  }
}

// Singleton global
export const performanceMonitor = new PerformanceMonitor();

// Auto-inicializar monitoramento de fetch em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.monitorFetch();
  
  // Expor globalmente para debug
  // @ts-ignore
  window.performanceMonitor = performanceMonitor;
  
  console.log('🚀 Performance Monitor ativo. Use window.performanceMonitor.printReport() para ver métricas.');
}