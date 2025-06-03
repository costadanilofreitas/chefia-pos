import { createContext, useContext, useState, useCallback } from 'react';
import { useApi } from './useApi';
import { useWebSocket } from './useWebSocket';

// Create a context for the core functionality
const CoreContext = createContext(null);

/**
 * Provider component for the core context
 */
export const CoreProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const api = useApi();
  const ws = useWebSocket();

  // Fetch system information
  const fetchSystemInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/system/info');
      setSystemInfo(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch system information');
      console.error('Error fetching system information:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Check system status
  const checkSystemStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/system/status');
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to check system status');
      console.error('Error checking system status:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Subscribe to system events
  const subscribeToSystemEvents = useCallback((callback) => {
    return ws.subscribe('system', callback);
  }, [ws]);

  const contextValue = {
    isLoading,
    error,
    systemInfo,
    fetchSystemInfo,
    checkSystemStatus,
    subscribeToSystemEvents
  };

  return (
    <CoreContext.Provider value={contextValue}>
      {children}
    </CoreContext.Provider>
  );
};

/**
 * Hook for accessing the core context
 * @returns {Object} Core context with methods for system information and status
 */
export const useCore = () => {
  const context = useContext(CoreContext);
  
  if (!context) {
    throw new Error('useCore must be used within a CoreProvider');
  }
  
  return context;
};

export default useCore;
