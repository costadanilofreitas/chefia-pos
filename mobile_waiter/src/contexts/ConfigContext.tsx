import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface ConfigContextType {
  serverUrl: string;
  restaurantId: string;
  isConfigured: boolean;
  isLoading: boolean;
  setServerConfig: (url: string, restaurantId: string) => Promise<void>;
  resetConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider = ({ children }: ConfigProviderProps) => {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carregar configuração ao iniciar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const storedUrl = await AsyncStorage.getItem('serverUrl');
        const storedRestaurantId = await AsyncStorage.getItem('restaurantId');
        
        if (storedUrl && storedRestaurantId) {
          setServerUrl(storedUrl);
          setRestaurantId(storedRestaurantId);
          setIsConfigured(true);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Salvar configuração
  const setServerConfig = async (url: string, id: string) => {
    try {
      setIsLoading(true);
      
      // Validar URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      
      // Remover barra final se existir
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      
      // Verificar conectividade
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
      }
      
      // TODO: Validar conexão com o servidor
      // const isValid = await validateServerConnection(url, id);
      // if (!isValid) {
      //   throw new Error('Não foi possível conectar ao servidor. Verifique a URL e o ID do restaurante.');
      // }
      
      // Salvar configuração
      await AsyncStorage.setItem('serverUrl', url);
      await AsyncStorage.setItem('restaurantId', id);
      
      setServerUrl(url);
      setRestaurantId(id);
      setIsConfigured(true);
    } catch (error) {
      console.error('Erro ao configurar servidor:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Resetar configuração
  const resetConfig = async () => {
    try {
      setIsLoading(true);
      await AsyncStorage.removeItem('serverUrl');
      await AsyncStorage.removeItem('restaurantId');
      setServerUrl('');
      setRestaurantId('');
      setIsConfigured(false);
    } catch (error) {
      console.error('Erro ao resetar configuração:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        serverUrl,
        restaurantId,
        isConfigured,
        isLoading,
        setServerConfig,
        resetConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig deve ser usado dentro de um ConfigProvider');
  }
  return context;
};
