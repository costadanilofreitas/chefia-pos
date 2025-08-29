import { apiService } from './api';
import { isProduction } from '@/utils/env';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type LogSource = 'waiter' | 'pos' | 'kds' | 'kiosk' | 'system';

interface LogEntry {
  id?: string;
  timestamp?: string;
  level: LogLevel;
  source: LogSource;
  module: string;
  message: string;
  details?: Record<string, unknown>;
  user_id?: string;
  session_id?: string;
  tags?: string[];
}

class LoggerService {
  private static instance: LoggerService;
  private sessionId: string;
  private deviceId: string;
  private logQueue: LogEntry[] = [];
  private isProcessingQueue = false;
  private queueInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceId = this.getOrCreateDeviceId();
    
    // Process queue periodically
    this.queueInterval = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);
  }
  
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }
  
  destroy(): void {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
  }
  
  private generateSessionId(): string {
    return `waiter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getOrCreateDeviceId(): string {
    try {
      let deviceId = localStorage.getItem('waiter-device-id');
      if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('waiter-device-id', deviceId);
      }
      return deviceId;
    } catch {
      return `device-${Date.now()}`;
    }
  }
  
  private createLogEntry(
    level: LogLevel,
    message: string,
    module: string,
    details?: Record<string, unknown>,
    tags?: string[]
  ): LogEntry {
    const userId = this.getCurrentUserId();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source: 'waiter',
      module,
      message,
      details: {
        ...details,
        deviceId: this.deviceId
      },
      session_id: this.sessionId,
      tags: tags || []
    };
    
    if (userId) {
      entry.user_id = userId;
    }
    
    return entry;
  }
  
  private getCurrentUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }
  
  private async sendLog(entry: LogEntry): Promise<boolean> {
    try {
      await apiService.post('/logs', entry);
      return true;
    } catch {
      this.logQueue.push(entry);
      return false;
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.logQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    const queue = [...this.logQueue];
    this.logQueue = [];
    
    for (const entry of queue) {
      const sent = await this.sendLog(entry);
      if (!sent) {
        this.logQueue.push(entry);
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  debug(message: string, module: string = 'General', details?: Record<string, unknown>): void {
    if (isProduction()) return;
    const entry = this.createLogEntry('debug', message, module, details);
    this.sendLog(entry);
  }
  
  info(message: string, module: string = 'General', details?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', message, module, details);
    this.sendLog(entry);
  }
  
  warn(message: string, module: string = 'General', details?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warning', message, module, details);
    this.sendLog(entry);
  }
  
  error(message: string, errorOrModule?: Error | unknown | string, moduleParam?: string): void {
    let module = 'General';
    let error: Error | unknown = undefined;
    
    if (typeof errorOrModule === 'string') {
      module = errorOrModule;
    } else {
      error = errorOrModule;
      if (moduleParam) {
        module = moduleParam;
      }
    }
    
    const details: Record<string, unknown> = {};
    
    if (error instanceof Error) {
      details['error'] = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    } else if (error) {
      details['error'] = error;
    }
    
    const entry = this.createLogEntry('error', message, module, details);
    this.sendLog(entry);
  }
  
  critical(message: string, errorOrModule?: Error | unknown | string, moduleParam?: string): void {
    let module = 'General';
    let error: Error | unknown = undefined;
    
    if (typeof errorOrModule === 'string') {
      module = errorOrModule;
    } else {
      error = errorOrModule;
      if (moduleParam) {
        module = moduleParam;
      }
    }
    
    const details: Record<string, unknown> = {};
    
    if (error instanceof Error) {
      details['error'] = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    } else if (error) {
      details['error'] = error;
    }
    
    const entry = this.createLogEntry('critical', message, module, details);
    
    this.sendLog(entry).then(sent => {
      if (!sent) {
        apiService.post('/logs', entry).catch(() => {
          try {
            const criticalLogs = JSON.parse(localStorage.getItem('waiter-critical-logs') || '[]') as LogEntry[];
            criticalLogs.push(entry);
            localStorage.setItem('waiter-critical-logs', JSON.stringify(criticalLogs.slice(-10)));
          } catch {
            // Silent fail
          }
        });
      }
    });
  }
  
  logTableEvent(event: string, tableId: number, details?: Record<string, unknown>): void {
    this.info(`Table ${event}`, 'TableManagement', {
      tableId,
      event,
      ...details
    });
  }
  
  logOrderEvent(event: string, orderId: number, details?: Record<string, unknown>): void {
    this.info(`Order ${event}`, 'OrderManagement', {
      orderId,
      event,
      ...details
    });
  }
  
  logPerformance(operation: string, duration: number, details?: Record<string, unknown>): void {
    const message = `Performance: ${operation}`;
    const performanceDetails = {
      operation,
      duration,
      ...details
    };
    
    if (duration > 3000) {
      this.warn(message, 'Performance', performanceDetails);
    } else {
      this.info(message, 'Performance', performanceDetails);
    }
  }
}

export const logger = LoggerService.getInstance();
export type { LogEntry, LoggerService };