import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode
} from 'react';
import { useApi } from './useApi';
import { useWebSocket } from './useWebSocket';

// Tipos auxiliares
type SystemInfo = any; // Substitua por uma interface concreta se tiver estrutura definida
type ErrorType = string | null;

type CoreContextType = {
  isLoading: boolean;
  error: ErrorType;
  systemInfo: SystemInfo;
  fetchSystemInfo: () => Promise<SystemInfo>;
  checkSystemStatus: () => Promise<any>;
  subscribeToSystemEvents: (callback: (data: any) => void) => () => void;
};

// Create a context for the core functionality
const CoreContext = createContext<CoreContextType | undefined>(undefined);

/**
 * Provider component for the core context
 */
export const CoreProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ErrorType>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>(null);
  const { get, post } = useApi();
  const ws = useWebSocket("url");

  // Fetch system information
  const fetchSystemInfo = useCallback(async (): Promise<SystemInfo> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await get('/api/system/info');
      setSystemInfo(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system information');
      console.error('Error fetching system information:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  // Check system status
  const checkSystemStatus = useCallback(async (): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await get('/api/system/status');
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to check system status');
      console.error('Error checking system status:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  // Subscribe to system events
  const subscribeToSystemEvents = useCallback(
    (callback: (data: any) => void): () => void => {
      return ws.subscribe('system', callback);
    },
    [ws]
  );

  const contextValue: CoreContextType = {
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
export const useCore = (): CoreContextType => {
  const context = useContext(CoreContext);

  if (!context) {
    throw new Error('useCore must be used within a CoreProvider');
  }

  return context;
};

export default useCore;
