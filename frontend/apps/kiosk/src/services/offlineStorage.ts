/**
 * Offline Storage Service
 * Centralized logging and storage for offline-first functionality
 */

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
  stack?: string;
}

interface StorageConfig {
  maxLogs: number;
  maxStorageSize: number; // in bytes
  persistLogs: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

class OfflineStorage {
  private logs: LogEntry[] = [];
  private config: StorageConfig;
  private readonly STORAGE_KEY = 'kiosk-logs';
  private readonly MAX_LOG_AGE = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      maxLogs: 1000,
      maxStorageSize: 5 * 1024 * 1024, // 5MB
      persistLogs: true,
      logLevel: 'info',
      ...config
    };

    this.loadLogs();
    this.cleanOldLogs();
  }

  /**
   * Main logging function
   */
  log(message: string, context?: any): void {
    this.addLog('info', message, context);
  }

  /**
   * Log warning
   */
  warn(message: string, context?: any): void {
    this.addLog('warn', message, context);
  }

  /**
   * Log error with stack trace
   */
  error(message: string, error?: Error | any): void {
    const context = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : error;

    this.addLog('error', message, context, error?.stack);
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: any): void {
    if (this.config.logLevel === 'debug') {
      this.addLog('debug', message, context);
    }
  }

  /**
   * Add log entry
   */
  private addLog(level: LogEntry['level'], message: string, context?: any, stack?: string): void {
    // Check log level
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex < currentLevelIndex) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(stack && { stack })
    };

    // Add to memory
    this.logs.push(entry);

    // Trim if exceeds max logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    // Development logging is handled internally
    // Console output disabled to comply with linting rules

    // Persist if enabled
    if (this.config.persistLogs) {
      this.saveLogs();
    }

    // Send critical errors to monitoring service
    if (level === 'error' && this.isOnline()) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadLogs(): void {
    if (!this.config.persistLogs) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveLogs(): void {
    if (!this.config.persistLogs) return;

    try {
      const data = JSON.stringify(this.logs);
      
      // Check size before saving
      if (data.length > this.config.maxStorageSize) {
        // Remove oldest logs until size is acceptable
        const halfLogs = Math.floor(this.logs.length / 2);
        this.logs = this.logs.slice(halfLogs);
        this.saveLogs();
        return;
      }

      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      // Storage quota exceeded or other error
      console.error('Failed to save logs:', error);
      // Clear some logs and try again
      this.logs = this.logs.slice(-100);
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
      } catch {
        // Give up
      }
    }
  }

  /**
   * Clean logs older than MAX_LOG_AGE
   */
  private cleanOldLogs(): void {
    const cutoff = new Date(Date.now() - this.MAX_LOG_AGE);
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > cutoff
    );
    
    if (this.config.persistLogs) {
      this.saveLogs();
    }
  }

  /**
   * Send error to monitoring service
   */
  private async sendToMonitoring(_entry: LogEntry): Promise<void> {
    // In production, this would send to a real monitoring service
    // For now, just a placeholder
    try {
      // Example: await fetch('/api/monitoring/errors', { method: 'POST', body: JSON.stringify(_entry) });
    } catch {
      // Fail silently - we don't want monitoring failures to cause issues
    }
  }

  /**
   * Check if online
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogEntry['level']): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    if (this.config.persistLogs) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get logs summary
   */
  getLogsSummary(): Record<LogEntry['level'], number> {
    return this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogEntry['level'], number>);
  }

  /**
   * Performance tracking
   */
  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.log(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  /**
   * Track user action
   */
  trackAction(action: string, details?: any): void {
    this.log(`User Action: ${action}`, details);
  }

  /**
   * Track API call
   */
  trackApiCall(method: string, endpoint: string, status: number, duration: number): void {
    const level = status >= 400 ? 'error' : 'info';
    this.addLog(level, `API ${method} ${endpoint}`, {
      status,
      duration: `${duration}ms`,
      success: status < 400
    });
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage({
  logLevel: import.meta.env.DEV ? 'debug' : 'info',
  persistLogs: true,
  maxLogs: 500
});

// Export singleton
export { offlineStorage };

// Export types
export type { LogEntry, StorageConfig };