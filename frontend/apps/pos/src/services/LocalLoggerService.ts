/**
 * Local Logger Service - Versão Híbrida
 * Sistema de logging com WebSocket primário e HTTP como fallback
 * 
 * MELHORIAS:
 * - WebSocket como transporte primário (zero requisições HTTP duplicadas)
 * - HTTP batch como fallback quando WebSocket não disponível
 * - Envio automático a cada 10 segundos (apenas se usando HTTP)
 * - Flush imediato para logs críticos
 * - Fallback local quando offline
 */

import { apiInterceptor } from './ApiInterceptor';
import { offlineStorage, type StorageLogEntry } from './OfflineStorage';
import { wsLogger } from './WebSocketLoggerService';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogSource {
  SYSTEM = 'system',
  USER = 'user',
  API = 'api',
  DATABASE = 'database',
  NETWORK = 'network',
  SECURITY = 'security',
  POS = 'pos',
  PAYMENT = 'payment',
  STOCK = 'stock',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  SUPPLIER = 'supplier',
  FISCAL = 'fiscal',
  UI = 'ui',
  SYNC = 'sync',
  INVENTORY = 'inventory'
}

interface LogEntry {
  id?: string;
  timestamp?: Date;
  level: LogLevel;
  source: LogSource;
  module: string;
  message: string;
  details?: Record<string, unknown>;
  user_id?: string;
  user_name?: string;
  ip_address?: string;
  request_id?: string;
  session_id?: string;
  tags?: string[];
  stack?: string;
}

interface LogConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocal: boolean;
  minLevel: LogLevel;
  maxLocalLogs: number;
  batchSize: number;
  batchIntervalMs: number;
  maxRetries: number;
}

class LocalLoggerService {
  private config: LogConfig = {
    enableConsole: process.env.NODE_ENV === 'development',
    enableRemote: true,
    enableLocal: true,
    minLevel: LogLevel.INFO,
    maxLocalLogs: 10000,
    batchSize: 50, // Enviar logs em lotes de 50 (apenas para HTTP fallback)
    batchIntervalMs: 10000, // Enviar a cada 10 segundos (apenas para HTTP fallback)
    maxRetries: 3
  };
  
  private useWebSocket = true; // Usar WebSocket por padrão

  private logBuffer: LogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private retryCount = 0;

  constructor() {
    // Inicializar timer de batch apenas se não usar WebSocket
    if (!this.useWebSocket) {
      this.startBatchTimer();
    }
    
    // WebSocket logger já captura erros globais, então só fazer se usar HTTP
    if (!this.useWebSocket && typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', {
          reason: event.reason,
          promise: event.promise
        }, 'system', LogSource.SYSTEM);
      });

      window.addEventListener('error', (event) => {
        this.error('Unhandled Error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        }, 'system', LogSource.SYSTEM);
      });
    }

    // Enviar logs pendentes ao fechar a página (apenas para HTTP)
    if (!this.useWebSocket && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Configurar o logger
   */
  configure(config: Partial<LogConfig>) {
    this.config = { ...this.config, ...config };
    
    // Reiniciar timer se intervalo mudou
    if (config.batchIntervalMs) {
      this.stopBatchTimer();
      this.startBatchTimer();
    }
  }

  /**
   * Log de debug
   */
  async debug(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    if (this.useWebSocket) {
      return wsLogger.debug(message, details, module, source);
    }
    await this.log(LogLevel.DEBUG, message, details, module, source);
  }

  /**
   * Log de informação
   */
  async info(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    if (this.useWebSocket) {
      return wsLogger.info(message, details, module, source);
    }
    await this.log(LogLevel.INFO, message, details, module, source);
  }

  /**
   * Log de aviso
   */
  async warn(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    if (this.useWebSocket) {
      return wsLogger.warn(message, details, module, source);
    }
    await this.log(LogLevel.WARNING, message, details, module, source);
  }

  /**
   * Log de erro
   */
  async error(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    // Adicionar stack trace se disponível
    if (details instanceof Error) {
      details = {
        message: details.message,
        stack: details.stack,
        name: details.name
      };
    }
    
    if (this.useWebSocket) {
      return wsLogger.error(message, details, module, source);
    }
    await this.log(LogLevel.ERROR, message, details, module, source);
  }

  /**
   * Log crítico
   */
  async critical(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    if (this.useWebSocket) {
      return wsLogger.critical(message, details, module, source);
    }
    await this.log(LogLevel.CRITICAL, message, details, module, source);
    // Para logs críticos, fazer flush imediato
    this.flush();
  }

  /**
   * Log principal otimizado
   */
  private async log(
    level: LogLevel,
    message: string,
    details?: unknown,
    module: string = 'app',
    source: LogSource = LogSource.POS
  ) {
    // Verificar nível mínimo
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      source,
      module,
      message,
      details: details ? (typeof details === 'object' ? details as Record<string, unknown> : { value: details }) : undefined,
      user_id: localStorage.getItem('user_id') || undefined,
      user_name: localStorage.getItem('user_name') || undefined,
      session_id: localStorage.getItem('session_id') || undefined,
      tags: this.generateTags(level, source, module),
      stack: level === LogLevel.ERROR || level === LogLevel.CRITICAL ? new Error().stack : undefined
    };

    // Console log em desenvolvimento
    if (this.config.enableConsole) {
      this.consoleLog(level, message, details);
    }

    // Adicionar ao buffer ao invés de enviar imediatamente
    this.addToBuffer(logEntry);

    // Salvar localmente para logs importantes
    if (this.config.enableLocal && (level === LogLevel.ERROR || level === LogLevel.CRITICAL)) {
      await this.saveLocal(logEntry);
    }
  }

  /**
   * Adicionar log ao buffer
   */
  private addToBuffer(logEntry: LogEntry) {
    this.logBuffer.push(logEntry);

    // Se atingiu o tamanho do batch, processar imediatamente
    if (this.logBuffer.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Iniciar timer de batch
   */
  private startBatchTimer() {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Parar timer de batch
   */
  private stopBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Processar batch de logs
   */
  private async processBatch() {
    // Evitar processamento concorrente
    if (this.isProcessing || this.logBuffer.length === 0) return;

    this.isProcessing = true;
    const batch = [...this.logBuffer];
    this.logBuffer = [];

    try {
      if (this.config.enableRemote && navigator.onLine) {
        await this.sendBatchToBackend(batch);
        this.retryCount = 0;
      } else {
        // Se offline, salvar localmente
        await this.saveBatchLocal(batch);
      }
    } catch (error) {
      // Em caso de erro, re-adicionar ao buffer para retry
      if (this.retryCount < this.config.maxRetries) {
        this.logBuffer = [...batch, ...this.logBuffer];
        this.retryCount++;
      } else {
        // Se excedeu retries, salvar localmente
        await this.saveBatchLocal(batch);
        this.retryCount = 0;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Enviar batch para o backend
   */
  private async sendBatchToBackend(batch: LogEntry[]) {
    if (batch.length === 0) return;

    // Enviar como batch único
    await apiInterceptor.post('/api/v1/logs/batch', {
      logs: batch,
      client_timestamp: new Date().toISOString(),
      client_id: localStorage.getItem('terminal_id') || 'unknown'
    });
  }

  /**
   * Salvar batch localmente
   */
  private async saveBatchLocal(batch: LogEntry[]) {
    try {
      const existingLogs = await offlineStorage.getAll('logs') || [];
      const storageEntries = batch.map(log => this.toStorageLogEntry(log));
      
      const allLogs = [...existingLogs, ...storageEntries];
      
      // Limitar quantidade de logs locais
      if (allLogs.length > this.config.maxLocalLogs) {
        allLogs.splice(0, allLogs.length - this.config.maxLocalLogs);
      }
      
      await offlineStorage.update('logs', allLogs as StorageLogEntry[]);
    } catch (error) {
      console.error('Failed to save batch locally:', error);
    }
  }

  /**
   * Forçar envio de todos os logs pendentes
   */
  async flush() {
    if (this.useWebSocket) {
      return wsLogger.flush();
    }
    if (this.logBuffer.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Verificar se deve logar baseado no nível
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Log no console
   */
  // eslint-disable-next-line no-console
  private consoleLog(level: LogLevel, message: string, details?: unknown) {
    // Em produção, não fazer console.log
    if (process.env.NODE_ENV === 'production') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, details);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, details);
        break;
      case LogLevel.WARNING:
        console.warn(prefix, message, details);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, message, details);
        break;
    }
  }

  /**
   * Convert LogEntry to StorageLogEntry format
   */
  private toStorageLogEntry(logEntry: LogEntry): StorageLogEntry {
    return {
      level: logEntry.level,
      message: logEntry.message,
      context: logEntry.details,
      timestamp: logEntry.timestamp?.toISOString() || new Date().toISOString()
    };
  }

  /**
   * Salvar log localmente (apenas para logs críticos)
   */
  private async saveLocal(logEntry: LogEntry) {
    try {
      const storageEntry = this.toStorageLogEntry(logEntry);
      await offlineStorage.update(`log_${logEntry.id}`, storageEntry);
    } catch (error) {
      console.error('Failed to save critical log locally:', error);
    }
  }

  /**
   * Gerar tags baseadas no contexto
   */
  private generateTags(level: LogLevel, source: LogSource, module: string): string[] {
    const tags: string[] = [level, source, module];
    
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      tags.push('error-tracking');
    }
    
    if (source === LogSource.PAYMENT) {
      tags.push('financial', 'audit');
    }
    
    if (source === LogSource.SECURITY) {
      tags.push('security-audit');
    }
    
    return tags;
  }

  /**
   * Buscar logs locais (mantido para compatibilidade)
   */
  async getLocalLogs(filters?: {
    level?: LogLevel;
    source?: LogSource;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LogEntry[]> {
    try {
      const allLogs = await offlineStorage.getAll('logs') || [];
      let filteredLogs = allLogs as LogEntry[];

      if (filters) {
        filteredLogs = filteredLogs.filter((log: LogEntry) => {
          if (filters.level && log.level !== filters.level) return false;
          if (filters.source && log.source !== filters.source) return false;
          if (filters.startDate && new Date(log.timestamp!) < filters.startDate) return false;
          if (filters.endDate && new Date(log.timestamp!) > filters.endDate) return false;
          return true;
        });
      }

      // Ordenar por timestamp descendente
      filteredLogs.sort((a: LogEntry, b: LogEntry) => 
        new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
      );

      // Limitar resultados
      if (filters?.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit);
      }

      return filteredLogs;
    } catch (error) {
      console.error('Failed to get local logs:', error);
      return [];
    }
  }

  /**
   * Exportar logs para arquivo
   */
  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.getLocalLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    // CSV format
    const headers = ['timestamp', 'level', 'source', 'module', 'message', 'user_name'];
    const rows = logs.map(log => [
      log.timestamp?.toString() || '',
      log.level,
      log.source,
      log.module,
      log.message,
      log.user_name || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csv;
  }

  /**
   * Obter estatísticas do logger
   */
  getStats() {
    if (this.useWebSocket) {
      return wsLogger.getStats();
    }
    return {
      bufferSize: this.logBuffer.length,
      isProcessing: this.isProcessing,
      retryCount: this.retryCount,
      config: this.config,
      mode: 'http-batch'
    };
  }

  /**
   * Limpar buffer (usar com cuidado)
   */
  clearBuffer() {
    this.logBuffer = [];
  }

  /**
   * Destruir logger (limpar timers)
   */
  destroy() {
    if (this.useWebSocket) {
      wsLogger.destroy();
    } else {
      this.stopBatchTimer();
      this.flush();
    }
  }
}

// Singleton instance
export const logger = new LocalLoggerService();
export default logger;