import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Monitor } from 'lucide-react';

interface TerminalConfig {
  terminalId: number;
  terminalName: string;
  stationType: 'hot' | 'cold' | 'bar' | 'prep' | 'all';
  location: string;
  active: boolean;
  display: {
    gridColumns: number;
    autoScroll: boolean;
    scrollInterval: number;
    showTimer: boolean;
    timerWarning: number;
    timerCritical: number;
    fontSize: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark';
  };
  filters: {
    categories: string[];
    priority: 'all' | 'high' | 'normal';
    maxOrders: number;
    hideCompleted: boolean;
    completedTimeout: number;
  };
  alerts: {
    enableSound: boolean;
    soundVolume: number;
    enableFlash: boolean;
    vibrationPattern: number[];
  };
  features: {
    enableBump: boolean;
    enableRecall: boolean;
    enableHold: boolean;
    enableRush: boolean;
    showPreparationSteps: boolean;
    showCustomerInfo: boolean;
  };
}

interface TerminalValidatorProps {
  children: React.ReactNode;
}

/**
 * Validates terminal ID from URL and loads terminal configuration for KDS
 */
export const TerminalValidator: React.FC<TerminalValidatorProps> = ({ children }) => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminalNotFound, setTerminalNotFound] = useState(false);
  const [requestedTerminal, setRequestedTerminal] = useState<string>('');
  
  // List of available KDS terminals (static constant, not dependent on props/state)
  const AVAILABLE_TERMINALS = [1, 2, 3, 4];

  useEffect(() => {
    const validateTerminal = async () => {
      try {
        setIsValidating(true);
        setError(null);
        setTerminalNotFound(false);

        // If no terminal ID in URL, redirect to terminal 1
        if (!terminalId) {
          navigate('/kds/1', { replace: true });
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
          console.log('KDS Terminal not in available list', { terminalId: id });
          return;
        }

        // Store requested terminal for error message
        setRequestedTerminal(id.toString());

        // Try to load terminal configuration
        try {
          const response = await fetch(`/src/config/kds/${id}.json`);
          
          if (!response.ok) {
            // Terminal config doesn't exist
            setTerminalNotFound(true);
            setIsValidating(false);
            console.log('KDS Terminal config not found', { terminalId: id });
            return;
          }
          
          const config: TerminalConfig = await response.json();
          
          // IMPORTANT: Verify the config is for the correct terminal
          if (config.terminalId !== id) {
            console.error('KDS Terminal ID mismatch', { 
              requested: id, 
              received: config.terminalId 
            });
            setTerminalNotFound(true);
            setIsValidating(false);
            return;
          }
          
          // Validate terminal is active
          if (!config.active) {
            setError(`Terminal KDS ${id} está desativado`);
            setIsValidating(false);
            return;
          }

          // Store terminal config in localStorage for quick access
          localStorage.setItem('kds-terminal-config', JSON.stringify(config));
          localStorage.setItem('kds-terminal-id', id.toString());
          
          // Store in window for global access
          (window as unknown as Record<string, unknown>)['KDS_TERMINAL_CONFIG'] = config;
          
          console.log('KDS Terminal validated', { 
            terminalId: id, 
            terminalName: config.terminalName,
            stationType: config.stationType,
            location: config.location 
          });
          
          setIsValidating(false);
        } catch (fetchError) {
          // Error loading config file
          setTerminalNotFound(true);
          setIsValidating(false);
          console.error('Failed to load KDS terminal config', { 
            terminalId: id, 
            error: fetchError 
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao validar terminal KDS';
        setError(errorMessage);
        console.error('KDS Terminal validation failed', { error: errorMessage, terminalId });
        setIsValidating(false);
      }
    };

    validateTerminal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId, navigate]);

  // Show loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
            Validando terminal KDS {requestedTerminal || ''}...
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
              Terminal KDS {requestedTerminal} não encontrado
            </h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              O terminal KDS que você está tentando acessar não existe ou não está configurado.
            </p>
            
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Terminais KDS disponíveis: 1 (Cozinha Quente), 2 (Cozinha Fria), 3 (Bar), 4 (Preparo)
              </p>
              
              <button
                onClick={() => navigate('/kds/1')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-primary-600 hover:bg-primary-700 text-white font-medium 
                         rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] 
                         transition-all duration-200 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-primary-500"
              >
                <Monitor className="w-5 h-5" />
                Ir para Cozinha Quente
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
              Erro ao carregar terminal KDS
            </h3>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              {error}
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/kds/1')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-primary-600 hover:bg-primary-700 text-white font-medium 
                         rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] 
                         transition-all duration-200 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-primary-500"
              >
                <Monitor className="w-5 h-5" />
                Ir para Cozinha Quente
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