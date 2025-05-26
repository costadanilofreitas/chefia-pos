import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from './ConfigContext';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  syncNow: () => Promise<boolean>;
  addPendingOperation: (operation: any) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider = ({ children }: SyncProviderProps) => {
  const { isConfigured, serverUrl } = useConfig();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingOperations, setPendingOperations] = useState<number>(0);

  // Monitorar conectividade
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    // Carregar última sincronização
    const loadLastSyncTime = async () => {
      try {
        const lastSync = await AsyncStorage.getItem('lastSyncTime');
        if (lastSync) {
          setLastSyncTime(new Date(lastSync));
        }
      } catch (error) {
        console.error('Erro ao carregar última sincronização:', error);
      }
    };

    // Carregar operações pendentes
    const loadPendingOperations = async () => {
      try {
        const operations = await AsyncStorage.getItem('pendingOperations');
        if (operations) {
          const parsedOperations = JSON.parse(operations);
          setPendingOperations(parsedOperations.length);
        }
      } catch (error) {
        console.error('Erro ao carregar operações pendentes:', error);
      }
    };

    loadLastSyncTime();
    loadPendingOperations();

    return () => {
      unsubscribe();
    };
  }, []);

  // Sincronizar quando voltar online
  useEffect(() => {
    if (isOnline && pendingOperations > 0 && isConfigured) {
      syncNow();
    }
  }, [isOnline, pendingOperations, isConfigured]);

  // Sincronizar dados
  const syncNow = async (): Promise<boolean> => {
    if (!isConfigured || !serverUrl || isSyncing) {
      return false;
    }

    try {
      setIsSyncing(true);

      // Verificar conectividade
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('Sem conexão com a internet');
      }

      // Obter operações pendentes
      const operationsJson = await AsyncStorage.getItem('pendingOperations');
      const operations = operationsJson ? JSON.parse(operationsJson) : [];

      if (operations.length > 0) {
        // TODO: Enviar operações pendentes para o servidor
        // const result = await sendPendingOperations(operations);
        
        // Limpar operações enviadas com sucesso
        await AsyncStorage.setItem('pendingOperations', JSON.stringify([]));
        setPendingOperations(0);
      }

      // TODO: Buscar atualizações do servidor
      // const updates = await fetchServerUpdates(lastSyncTime);
      // await applyServerUpdates(updates);

      // Atualizar hora da última sincronização
      const now = new Date();
      await AsyncStorage.setItem('lastSyncTime', now.toISOString());
      setLastSyncTime(now);

      return true;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Adicionar operação pendente
  const addPendingOperation = async (operation: any): Promise<void> => {
    try {
      const operationsJson = await AsyncStorage.getItem('pendingOperations');
      const operations = operationsJson ? JSON.parse(operationsJson) : [];
      
      operations.push({
        ...operation,
        timestamp: new Date().toISOString(),
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      await AsyncStorage.setItem('pendingOperations', JSON.stringify(operations));
      setPendingOperations(operations.length);
      
      // Tentar sincronizar imediatamente se estiver online
      if (isOnline && isConfigured) {
        syncNow();
      }
    } catch (error) {
      console.error('Erro ao adicionar operação pendente:', error);
      throw error;
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncTime,
        pendingOperations,
        syncNow,
        addPendingOperation,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync deve ser usado dentro de um SyncProvider');
  }
  return context;
};
