import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Define log entry type
export interface LogEntry {
  id?: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date | string;
  module?: string;
  details?: any;
}

// Define context type
interface LoggingContextType {
  logs: LogEntry[];
  log: (message: string, module?: string, details?: any) => void;
  info: (message: string, module?: string, details?: any) => void;
  warn: (message: string, module?: string, details?: any) => void;
  error: (message: string, module?: string, details?: any) => void;
  getLogs: () => LogEntry[];
  clearLogs: () => void;
}

// Create context with default values
const LoggingContext = createContext<LoggingContextType | null>(null);

// Props for the provider component
interface LoggingProviderProps {
  children: React.ReactNode;
  maxLogs?: number;
}

/**
 * Provider component for logging functionality
 */
export const LoggingProvider: React.FC<LoggingProviderProps> = ({ 
  children, 
  maxLogs = 1000 
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('app_logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }, []);

  // Save logs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }, [logs]);

  // Add a new log entry
  const addLogEntry = useCallback((level: LogEntry['level'], message: string, module?: string, details?: any) => {
    const newLog: LogEntry = {
      level,
      message,
      module,
      details,
      timestamp: new Date()
    };

    // Format console output
    const formattedMessage = module 
      ? `[${level.toUpperCase()}] [${module}] ${message}`
      : `[${level.toUpperCase()}] ${message}`;

    // Log to console based on level
    switch (level) {
      case 'log':
        console.log(formattedMessage, details);
        break;
      case 'info':
        console.info(formattedMessage, details);
        break;
      case 'warn':
        console.warn(formattedMessage, details);
        break;
      case 'error':
        console.error(formattedMessage, details);
        break;
    }

    // Update logs state, keeping only the most recent logs
    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs];
      return updatedLogs.slice(0, maxLogs);
    });

    return newLog;
  }, [maxLogs]);

  // Convenience methods for different log levels
  const log = useCallback((message: string, module?: string, details?: any) => 
    addLogEntry('log', message, module, details), [addLogEntry]);
  
  const info = useCallback((message: string, module?: string, details?: any) => 
    addLogEntry('info', message, module, details), [addLogEntry]);
  
  const warn = useCallback((message: string, module?: string, details?: any) => 
    addLogEntry('warn', message, module, details), [addLogEntry]);
  
  const error = useCallback((message: string, module?: string, details?: any) => 
    addLogEntry('error', message, module, details), [addLogEntry]);

  // Get all logs
  const getLogs = useCallback(() => logs, [logs]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.setItem('app_logs', '[]');
  }, []);

  // Context value
  const contextValue: LoggingContextType = {
    logs,
    log,
    info,
    warn,
    error,
    getLogs,
    clearLogs
  };

  return (
    <LoggingContext.Provider value={contextValue}>
      {children}
    </LoggingContext.Provider>
  );
};

/**
 * Hook for accessing the logging context
 * @returns Logging context with methods for managing logs
 */
export const useLogging = (): LoggingContextType => {
  const context = useContext(LoggingContext);
  
  if (!context) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  
  return context;
};

export default useLogging;
