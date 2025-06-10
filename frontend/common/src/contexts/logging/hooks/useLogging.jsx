import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '@common/contexts/core/hooks/useApi';

// Create a context for logging
const LoggingContext = createContext(null);

/**
 * Provider component for the logging context
 */
export const LoggingProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const api = useApi();

  // Fetch logs from the backend
  const fetchLogs = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/logs', { params: filters });
      setLogs(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch logs');
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Add a new log entry
  const addLog = useCallback(async (logData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/logs', logData);
      setLogs(prevLogs => [...prevLogs, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to add log');
      console.error('Error adding log:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Clear logs (with optional filter)
  const clearLogs = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete('/api/logs', { params: filters });
      // Refresh logs after clearing
      fetchLogs();
    } catch (err) {
      setError(err.message || 'Failed to clear logs');
      console.error('Error clearing logs:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api, fetchLogs]);

  // Export logs to file
  const exportLogs = useCallback(async (format = 'json', filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/logs/export/${format}`, { 
        params: filters,
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logs_export_${new Date().toISOString()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (err) {
      setError(err.message || 'Failed to export logs');
      console.error('Error exporting logs:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Log a message directly (convenience method)
  const log = useCallback((level, message, metadata = {}) => {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    addLog(logEntry).catch(err => {
      console.error('Failed to log message:', err);
    });
    
    return logEntry;
  }, [addLog]);

  // Convenience methods for different log levels
  const info = useCallback((message, metadata) => log('info', message, metadata), [log]);
  const warn = useCallback((message, metadata) => log('warn', message, metadata), [log]);
  const error = useCallback((message, metadata) => log('error', message, metadata), [log]);
  const debug = useCallback((message, metadata) => log('debug', message, metadata), [log]);

  // Load logs on mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const contextValue = {
    logs,
    isLoading,
    error,
    fetchLogs,
    addLog,
    clearLogs,
    exportLogs,
    log,
    info,
    warn,
    error: error,
    debug
  };

  return (
    <LoggingContext.Provider value={contextValue}>
      {children}
    </LoggingContext.Provider>
  );
};

/**
 * Hook for accessing the logging context
 * @returns {Object} Logging context with methods for managing logs
 */
export const useLogging = () => {
  const context = useContext(LoggingContext);
  
  if (!context) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  
  return context;
};

export default useLogging;
