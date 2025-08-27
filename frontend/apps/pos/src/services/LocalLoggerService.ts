/**
 * Local Logger Service
 * Sistema de logging local integrado com o backend logs_module
 * Para aplicação POS offline-first on-premise
 */

import { apiInterceptor } from './ApiInterceptor';
import { offlineStorage, type StorageLogEntry } from './OfflineStorage';

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
}

class LocalLoggerService {
  private config: LogConfig = {
    enableConsole: process.env.NODE_ENV === 'development',
    enableRemote: true,
    enableLocal: true,
    minLevel: LogLevel.INFO,
    maxLocalLogs: 10000
  };

  private readonly STORAGE_KEY = 'app_logs';
  private pendingLogs: LogEntry[] = [];
  private syncTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Restaurar logs pendentes do storage
    this.loadPendingLogs();
    
    // Sincronizar logs a cada 30 segundos
    setInterval(() => this.syncLogs(), 30000);
    
    // Capturar erros globais
    if (typeof window !== 'undefined') {
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
  }

  /**
   * Configurar o logger
   */
  configure(config: Partial<LogConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log de debug
   */
  async debug(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    await this.log(LogLevel.DEBUG, message, details, module, source);
  }

  /**
   * Log de informação
   */
  async info(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    await this.log(LogLevel.INFO, message, details, module, source);
  }

  /**
   * Log de aviso
   */
  async warn(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
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
    
    await this.log(LogLevel.ERROR, message, details, module, source);
  }

  /**
   * Log crítico
   */
  async critical(message: string, details?: unknown, module: string = 'app', source: LogSource = LogSource.POS) {
    await this.log(LogLevel.CRITICAL, message, details, module, source);
  }

  /**
   * Log principal
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

    // Salvar localmente
    if (this.config.enableLocal) {
      await this.saveLocal(logEntry);
    }

    // Enviar para o backend
    if (this.config.enableRemote) {
      await this.sendToBackend(logEntry);
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
   * Salvar log localmente
   */
  private async saveLocal(logEntry: LogEntry) {
    try {
      // Buscar logs existentes
      const existingLogs = await offlineStorage.getAll('logs') || [];
      
      // Converter e adicionar novo log
      const storageLogEntry = this.toStorageLogEntry(logEntry);
      existingLogs.push(storageLogEntry);
      
      // Limitar quantidade de logs locais
      if (existingLogs.length > this.config.maxLocalLogs) {
        existingLogs.splice(0, existingLogs.length - this.config.maxLocalLogs);
      }
      
      // Salvar no IndexedDB
      await offlineStorage.update('logs', existingLogs as StorageLogEntry[]);
    } catch (error) {
      console.error('Failed to save log locally:', error);
    }
  }

  /**
   * Enviar log para o backend
   */
  private async sendToBackend(logEntry: LogEntry) {
    try {
      // Se offline, adicionar à fila
      if (!navigator.onLine) {
        this.pendingLogs.push(logEntry);
        await this.savePendingLogs();
        return;
      }

      // Enviar para o backend
      await apiInterceptor.post('/api/v1/logs', logEntry);
    } catch {
      // Se falhar, adicionar à fila para retry (erro silenciosamente ignorado para evitar recursao)
      this.pendingLogs.push(logEntry);
      await this.savePendingLogs();
      
      // Agendar sincronização
      if (!this.syncTimeout) {
        this.syncTimeout = setTimeout(() => {
          this.syncLogs();
          this.syncTimeout = null;
        }, 5000);
      }
    }
  }

  /**
   * Sincronizar logs pendentes com o backend
   */
  private async syncLogs() {
    if (!navigator.onLine || this.pendingLogs.length === 0) return;

    const logsToSync = [...this.pendingLogs];
    this.pendingLogs = [];

    for (const log of logsToSync) {
      try {
        await apiInterceptor.post('/api/v1/logs', log);
      } catch {
        // Re-adicionar à fila se falhar (erro silenciosamente ignorado para evitar recursao)
        this.pendingLogs.push(log);
      }
    }

    // Salvar logs que falharam
    if (this.pendingLogs.length > 0) {
      await this.savePendingLogs();
    }
  }

  /**
   * Salvar logs pendentes no storage
   */
  private async savePendingLogs() {
    try {
      const storageLogEntries = this.pendingLogs.map(log => this.toStorageLogEntry(log));
      await offlineStorage.update('pending_logs', storageLogEntries);
    } catch (error) {
      console.error('Failed to save pending logs:', error);
    }
  }

  /**
   * Carregar logs pendentes do storage
   */
  private async loadPendingLogs() {
    try {
      const pending = await offlineStorage.getConfig('pending_logs');
      if (pending && Array.isArray(pending)) {
        this.pendingLogs = pending as LogEntry[];
      }
    } catch (error) {
      console.error('Failed to load pending logs:', error);
    }
  }

  /**
   * Gerar tags baseadas no contexto
   */
  private generateTags(level: LogLevel, source: LogSource, module: string): string[] {
    const tags: string[] = [level, source, module];
    
    // Adicionar tags específicas
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
   * Buscar logs locais
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
   * Limpar logs locais
   */
  async clearLocalLogs(olderThanDays?: number) {
    try {
      if (olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        // const allLogs = await offlineStorage.getAll('logs') || [];
        // const recentLogs = (allLogs as LogEntry[]).filter((log: LogEntry) => 
        //   new Date(log.timestamp!) > cutoffDate
        // );
        
        // Não há método para atualizar todo o store, precisa ser por item
        // TODO: Implementar limpeza completa de logs
        console.warn('Clear logs not fully implemented');
      } else {
        // Não há método para limpar todo o store
        console.warn('Clear all logs not implemented');
      }
    } catch (error) {
      console.error('Failed to clear local logs:', error);
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
}

// Singleton instance
export const logger = new LocalLoggerService();
export default logger;