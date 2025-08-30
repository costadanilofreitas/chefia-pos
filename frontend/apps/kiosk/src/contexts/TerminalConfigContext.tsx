import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { offlineStorage } from '../services/offlineStorage';

interface TerminalConfig {
  terminalId: number;
  terminalName: string;
  location: string;
  active: boolean;
  ui: {
    welcomeScreen: {
      title: string;
      subtitle: string;
      customMessage?: string;
      backgroundImage?: string;
      overlayOpacity: number;
      autoStartDelay: number;
      showLogo: boolean;
      logoUrl?: string;
    };
    layout: {
      categoriesPosition: "left" | "top" | "right";
      showSearchBar: boolean;
      showCartButton: boolean;
      productGridColumns: number;
      headerBanner?: {
        enabled: boolean;
        text: string;
        backgroundColor?: string;
        textColor?: string;
        icon?: string;
      };
    };
    darkMode: boolean;
    primaryColor: string;
    secondaryColor: string;
    animations: {
      enabled: boolean;
      duration: "fast" | "normal" | "slow";
    };
  };
  features: {
    enableHapticFeedback: boolean;
    enableSoundEffects: boolean;
    enableOfflineMode: boolean;
    enablePWA: boolean;
    enableFullscreen: boolean;
    fullscreenShortcut: string;
  };
  business: {
    currency: string;
    taxRate: number;
    minimumOrderValue: number;
    maximumOrderItems: number;
    allowGuestCheckout: boolean;
    requirePhoneNumber: boolean;
    requireCustomerName: boolean;
  };
  payment: {
    enableCreditCard: boolean;
    enableDebitCard: boolean;
    enablePix: boolean;
    enableCash: boolean;
    enableVoucher: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    offlineFallback: boolean;
  };
}

interface TerminalConfigContextType {
  config: TerminalConfig | null;
  isLoading: boolean;
  error: string | null;
  reloadConfig: () => Promise<void>;
}

const TerminalConfigContext = createContext<TerminalConfigContextType | undefined>(undefined);

interface TerminalConfigProviderProps {
  children: ReactNode;
}

export const TerminalConfigProvider: React.FC<TerminalConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<TerminalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load from localStorage (set by TerminalValidator)
      const storedConfig = localStorage.getItem('kiosk-terminal-config');
      
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        setConfig(parsedConfig);
        
        // Also make it available globally
        (window as unknown as Record<string, unknown>)['KIOSK_TERMINAL_CONFIG'] = parsedConfig;
        
        offlineStorage.log('Terminal config loaded from context', {
          terminalId: parsedConfig.terminalId,
          terminalName: parsedConfig.terminalName
        });
      } else {
        setError('Terminal configuration not found');
        offlineStorage.error('No terminal configuration available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load terminal config';
      setError(errorMessage);
      offlineStorage.error('Failed to load terminal config in context', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const reloadConfig = async () => {
    await loadConfig();
  };

  return (
    <TerminalConfigContext.Provider value={{ config, isLoading, error, reloadConfig }}>
      {children}
    </TerminalConfigContext.Provider>
  );
};

export const useTerminalConfig = () => {
  const context = useContext(TerminalConfigContext);
  if (context === undefined) {
    throw new Error('useTerminalConfig must be used within a TerminalConfigProvider');
  }
  return context;
};

export default TerminalConfigProvider;