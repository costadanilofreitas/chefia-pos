/**
 * WebSocket Logger Service
 * Sistema de logging via WebSocket/EventBus em tempo real
 * 
 * MELHORIAS vs HTTP:
 * - Zero requisições HTTP duplicadas
 * - Streaming contínuo de logs
 * - Menor latência
 * - Menor uso de recursos
 * - Reconexão automática
 */

import { buildApiUrl } from '../config/api';
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
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

class WebSocketLoggerService {
  private config: LogConfig = {
    enableConsole: process.env.NODE_ENV === 'development',
    enableRemote: true,
    enableLocal: true,
    minLevel: LogLevel.INFO,
    maxLocalLogs: 10000,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  };

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageQueue: LogEntry[] = [];
  private maxQueueSize = 1000;

  constructor() {
    // Inicializar conexão WebSocket
    if (this.config.enableRemote) {
      this.connect();
    }

    // Capturar erros globais apenas em produção
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
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

    // Enviar logs pendentes ao fechar a página
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Conectar ao WebSocket
   */
  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      // Construir URL WebSocket baseado na URL da API
      const wsUrl = buildApiUrl('/ws/logs')
        .replace('http://', 'ws://')
        .replace('https://', 'wss://');

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Enviar autenticação se disponível
        const token = localStorage.getItem('token');
        const terminalId = localStorage.getItem('terminal_id');
        
        if (token) {
          this.ws?.send(JSON.stringify({
            type: 'auth',
            token,
            terminal_id: terminalId
          }));
        }

        // Enviar logs enfileirados
        this.flushQueue();

        if (this.config.enableConsole) {
          console.info('[WebSocket Logger] Conectado ao servidor');
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Processar confirmações ou comandos do servidor
          if (data.type === 'ack' && this.config.enableConsole) {
            console.debug('[WebSocket Logger] Log confirmado:', data.id);
          }
        } catch (error) {
          console.error('[WebSocket Logger] Erro ao processar mensagem:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket Logger] Erro na conexão:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;

        // Tentar reconectar
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (this.config.enableConsole) {
          console.warn('[WebSocket Logger] Máximo de tentativas de reconexão atingido');
        }
      };
    } catch (error) {
      console.error('[WebSocket Logger] Erro ao criar conexão:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Agendar reconexão
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Máximo de 30 segundos
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.config.enableConsole) {
        console.info(`[WebSocket Logger] Tentando reconectar (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      }
      this.connect();
    }, delay);
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
   * Log principal via WebSocket
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

    // Enviar via WebSocket se conectado
    if (this.config.enableRemote) {
      this.sendViaWebSocket(logEntry);
    }

    // Salvar localmente para logs importantes
    if (this.config.enableLocal && (level === LogLevel.ERROR || level === LogLevel.CRITICAL)) {
      await this.saveLocal(logEntry);
    }
  }

  /**
   * Enviar log via WebSocket
   */
  private sendViaWebSocket(logEntry: LogEntry) {
    // Se conectado, enviar imediatamente
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'log',
          data: logEntry
        }));
      } catch (error) {
        console.error('[WebSocket Logger] Erro ao enviar log:', error);
        this.enqueueLog(logEntry);
      }
    } else {
      // Se não conectado, enfileirar
      this.enqueueLog(logEntry);
      
      // Tentar conectar se não estiver conectando
      if (!this.isConnecting && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.connect();
      }
    }
  }

  /**
   * Enfileirar log para envio posterior
   */
  private enqueueLog(logEntry: LogEntry) {
    this.messageQueue.push(logEntry);
    
    // Limitar tamanho da fila
    if (this.messageQueue.length > this.maxQueueSize) {
      // Remover logs mais antigos, mantendo os críticos
      const criticalLogs = this.messageQueue.filter(
        log => log.level === LogLevel.CRITICAL || log.level === LogLevel.ERROR
      );
      const otherLogs = this.messageQueue.filter(
        log => log.level !== LogLevel.CRITICAL && log.level !== LogLevel.ERROR
      );
      
      // Manter metade dos logs críticos e metade dos outros
      this.messageQueue = [
        ...criticalLogs.slice(-this.maxQueueSize / 2),
        ...otherLogs.slice(-this.maxQueueSize / 2)
      ];
    }
  }

  /**
   * Enviar logs enfileirados
   */
  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const logEntry of queue) {
      try {
        this.ws.send(JSON.stringify({
          type: 'log',
          data: logEntry
        }));
      } catch (error) {
        console.error('[WebSocket Logger] Erro ao enviar log da fila:', error);
        // Re-enfileirar em caso de erro
        this.messageQueue.push(logEntry);
        break;
      }
    }
  }

  /**
   * Forçar envio de todos os logs pendentes
   */
  async flush() {
    this.flushQueue();
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
   * Desconectar WebSocket
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Obter estatísticas do logger
   */
  getStats() {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      queueSize: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      config: this.config
    };
  }

  /**
   * Limpar fila de mensagens
   */
  clearQueue() {
    this.messageQueue = [];
  }

  /**
   * Destruir logger
   */
  destroy() {
    this.disconnect();
    this.clearQueue();
  }
}

// Singleton instance
export const wsLogger = new WebSocketLoggerService();

// Exportar também com o nome anterior para compatibilidade
export default wsLogger;