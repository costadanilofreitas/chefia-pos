import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Smartphone } from 'lucide-react';

interface TerminalConfig {
  terminalId: number;
  terminalName: string;
  serviceArea: string;
  tableRange: {
    start: number;
    end: number;
  };
  active: boolean;
  ui: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showTableMap: boolean;
    defaultView: 'tables' | 'orders' | 'menu';
    quickActions: string[];
    fontSize: 'small' | 'medium' | 'large';
  };
  features: {
    enableOrdering: boolean;
    enablePayment: boolean;
    enableTableTransfer: boolean;
    enableSplitBill: boolean;
    enableTips: boolean;
    enableReservations: boolean;
    enableCallKitchen: boolean;
    enableCustomerInfo: boolean;
    offlineMode: boolean;
    pushNotifications: boolean;
    hapticFeedback: boolean;
  };
  permissions: {
    canCancelOrders: boolean;
    canModifyOrders: boolean;
    canApplyDiscounts: boolean;
    maxDiscountPercent: number;
    canVoidItems: boolean;
    canTransferTables: boolean;
    canCloseDay: boolean;
  };
  notifications: {
    newOrders: boolean;
    orderReady: boolean;
    paymentRequest: boolean;
    tableCall: boolean;
    kitchenAlert: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

interface TerminalValidatorProps {
  children: React.ReactNode;
}

/**
 * Validates terminal ID from URL and loads terminal configuration for Waiter app
 */
export const TerminalValidator: React.FC<TerminalValidatorProps> = ({ children }) => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminalNotFound, setTerminalNotFound] = useState(false);
  const [requestedTerminal, setRequestedTerminal] = useState<string>('');
  
  // List of available Waiter terminals
  const AVAILABLE_TERMINALS = [1, 2, 3];

  useEffect(() => {
    const validateTerminal = async () => {
      try {
        setIsValidating(true);
        setError(null);
        setTerminalNotFound(false);

        // If no terminal ID in URL, redirect to terminal 1
        if (!terminalId) {
          navigate('/waiter/1', { replace: true });
          return;
        }

        // Validate terminal ID is a number
        const id = parseInt(terminalId, 10);
        if (isNaN(id) || id < 1 || id > 999) {
          setRequestedTerminal(terminalId);
          setTerminalNotFound(true);
          setIsValidating(false);
          return;
        }
        
        // Check if terminal is in the list of available terminals
        if (!AVAILABLE_TERMINALS.includes(id)) {
          setRequestedTerminal(id.toString());
          setTerminalNotFound(true);
          setIsValidating(false);
          console.log('Waiter Terminal not in available list', { terminalId: id });
          return;
        }

        // Store requested terminal for error message
        setRequestedTerminal(id.toString());

        // Try to load terminal configuration
        try {
          const response = await fetch(`/src/config/waiter/${id}.json`);
          
          if (!response.ok) {
            // Terminal config doesn't exist
            setTerminalNotFound(true);
            setIsValidating(false);
            console.log('Waiter Terminal config not found', { terminalId: id });
            return;
          }
          
          const config: TerminalConfig = await response.json();
          
          // IMPORTANT: Verify the config is for the correct terminal
          if (config.terminalId !== id) {
            console.error('Waiter Terminal ID mismatch', { 
              requested: id, 
              received: config.terminalId 
            });
            setTerminalNotFound(true);
            setIsValidating(false);
            return;
          }
          
          // Validate terminal is active
          if (!config.active) {
            setError(`Terminal Garçom ${id} está desativado`);
            setIsValidating(false);
            return;
          }

          // Store terminal config in localStorage for quick access
          localStorage.setItem('waiter-terminal-config', JSON.stringify(config));
          localStorage.setItem('waiter-terminal-id', id.toString());
          
          // Store in window for global access
          (window as unknown as Record<string, unknown>)['WAITER_TERMINAL_CONFIG'] = config;
          
          setTerminalConfig(config);
          console.log('Waiter Terminal validated', { 
            terminalId: id, 
            terminalName: config.terminalName,
            serviceArea: config.serviceArea,
            tableRange: config.tableRange 
          });
          
          setIsValidating(false);
        } catch (fetchError) {
          // Error loading config file
          setTerminalNotFound(true);
          setIsValidating(false);
          console.error('Failed to load Waiter terminal config', { 
            terminalId: id, 
            error: fetchError 
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao validar terminal Garçom';
        setError(errorMessage);
        console.error('Waiter Terminal validation failed', { error: errorMessage, terminalId });
        setIsValidating(false);
      }
    };

    validateTerminal();
  }, [terminalId, navigate]);

  // Show loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
            Validando terminal Garçom {requestedTerminal || ''}...
          </p>
        </div>
      </div>
    );
  }

  // Show terminal not found state
  if (terminalNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Terminal Garçom {requestedTerminal} não encontrado
            </h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              O terminal de garçom que você está tentando acessar não existe ou não está configurado.
            </p>
            
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Terminais disponíveis: 1 (Salão Principal), 2 (Área Externa), 3 (VIP)
              </p>
              
              <button
                onClick={() => navigate('/waiter/1')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-primary-600 hover:bg-primary-700 text-white font-medium 
                         rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] 
                         transition-all duration-200 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-primary-500"
              >
                <Smartphone className="w-5 h-5" />
                Ir para Salão Principal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show generic error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Erro ao carregar terminal Garçom
            </h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              {error}
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/waiter/1')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-primary-600 hover:bg-primary-700 text-white font-medium 
                         rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] 
                         transition-all duration-200 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-primary-500"
              >
                <Smartphone className="w-5 h-5" />
                Ir para Salão Principal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Terminal is valid, render children
  return <>{children}</>;
};

export default TerminalValidator;