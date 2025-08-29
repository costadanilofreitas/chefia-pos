import { websocketService } from './websocket';
import { ApiService } from './api';
import type { WebSocketMessageData } from '../types';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type LogSource = 'kds' | 'pos' | 'waiter' | 'kiosk' | 'system';

interface LogEntry {
  id?: string;
  timestamp?: string; // ISO string for backend compatibility
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
}

class LoggerService {
  private static instance: LoggerService;
  private sessionId: string;
  private deviceId: string;
  private logQueue: LogEntry[] = [];
  private isProcessingQueue = false;
  
  private constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceId = this.getOrCreateDeviceId();
    
    // Process queue when connection is restored
    websocketService.on('connected', () => {
      this.processQueue();
    });
    
    // Process queue periodically
    setInterval(() => {
      if (this.logQueue.length > 0) {
        this.processQueue();
      }
    }, 5000); // Every 5 seconds
  }
  
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }
  
  private generateSessionId(): string {
    return `kds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('kds-device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('kds-device-id', deviceId);
    }
    return deviceId;
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
      source: 'kds',
      module,
      message,
      details: {
        ...details,
        deviceId: this.deviceId
      },
      session_id: this.sessionId,
      tags: tags || []
    };
    
    // Only add user_id if it exists
    if (userId) {
      entry.user_id = userId;
    }
    
    return entry;
  }
  
  private getCurrentUserId(): string | undefined {
    // Get from auth context or localStorage
    return localStorage.getItem('userId') || undefined;
  }
  
  private async sendLog(entry: LogEntry): Promise<boolean> {
    try {
      // Try WebSocket first (faster for local)
      if (websocketService.isConnected()) {
        // Convert LogEntry to WebSocketMessageData format
        const messageData: WebSocketMessageData = { ...entry };
        return websocketService.send({
          type: 'log',
          data: messageData,
          timestamp: Date.now()
        });
      }
      
      // Fallback to HTTP API
      await ApiService.post('/logs', entry);
      return true;
    } catch {
      // Add to queue if failed
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
        // Put back in queue if failed
        this.logQueue.push(entry);
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  // Public logging methods
  debug(message: string, module: string = 'General', details?: Record<string, unknown>): void {
    // Use import.meta.env for Vite projects
    if (import.meta.env.PROD) return;
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
    
    // Handle overloaded parameters
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
    
    // Handle overloaded parameters
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
    
    // Critical logs should try harder to be sent
    this.sendLog(entry).then(sent => {
      if (!sent) {
        // Try HTTP as backup for critical errors
        ApiService.post('/logs', entry).catch(() => {
          // Last resort - save to localStorage
          const criticalLogs = JSON.parse(localStorage.getItem('kds-critical-logs') || '[]') as LogEntry[];
          criticalLogs.push(entry);
          localStorage.setItem('kds-critical-logs', JSON.stringify(criticalLogs.slice(-10))); // Keep last 10
        });
      }
    });
  }
  
  // Structured logging for specific events
  logOrderEvent(event: 'received' | 'started' | 'completed' | 'cancelled', orderId: string | number, details?: Record<string, unknown>): void {
    this.info(`Order ${event}`, 'OrderManagement', {
      orderId: orderId.toString(),
      event,
      ...details
    });
  }
  
  logStationEvent(event: string, station: string, details?: Record<string, unknown>): void {
    this.info(`Station ${event}`, 'StationManagement', {
      station,
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
  
  // Metrics logging
  logMetric(metric: string, value: number, unit?: string, tags?: string[]): void {
    const entry = this.createLogEntry('info', 'Metric recorded', 'Metrics', {
      metric,
      value,
      unit,
      timestamp: Date.now()
    }, tags);
    this.sendLog(entry);
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();

// Export type for use in other files
export type { LogEntry, LoggerService };