import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import logger, { LogSource } from '../services/LocalLoggerService';

export interface TerminalConfig {
  terminal_id: string;
  store_id: string;
  services: {
    auth?: { url: string; timeout: number };
    orders?: { url: string; timeout: number };
    products?: { url: string; timeout: number };
    cashier?: { url: string; timeout: number };
    reports?: { url: string; timeout: number };
    employees?: { url: string; timeout: number };
    businessDay?: { url: string; timeout: number };
    fiscal?: { url: string; timeout: number };
  };
}

export const useTerminalConfig = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const [config, setConfig] = useState<TerminalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determinar terminal_id: da rota > localStorage > padrão
        const effectiveTerminalId = terminalId || 
                                   localStorage.getItem('terminal_id') || 
                                   '1';
        
        // Tentar carregar configuração do arquivo primeiro
        try {
          const response = await fetch(`/config/pos/${effectiveTerminalId}.json`);
          
          if (response.ok) {
            const configData = await response.json();
            
            // Validar estrutura básica
            if (!configData.terminal_id || !configData.store_id) {
              throw new Error('Configuração inválida: terminal_id e store_id são obrigatórios');
            }
            
            setConfig(configData);
            
            // Salvar terminal_id no localStorage para próximas sessões
            localStorage.setItem('terminal_id', configData.terminal_id);
            return;
          }
        } catch (error) {
          await logger.warn(`Arquivo de configuração não encontrado para terminal ${effectiveTerminalId}, usando configuração padrão`, { error }, 'useTerminalConfig', LogSource.SYSTEM);
        }
        
        // Fallback para configuração padrão se arquivo não existir
        const defaultConfig: TerminalConfig = {
          terminal_id: effectiveTerminalId,
          store_id: 'store-001',
          services: {
            auth: { url: 'http://localhost:8001', timeout: 5000 },
            orders: { url: 'http://localhost:8002', timeout: 5000 },
            products: { url: 'http://localhost:8003', timeout: 5000 },
            cashier: { url: 'http://localhost:8004', timeout: 5000 },
            reports: { url: 'http://localhost:8009', timeout: 5000 },
            employees: { url: 'http://localhost:8011', timeout: 5000 },
            businessDay: { url: 'http://localhost:8004', timeout: 5000 },
            fiscal: { url: 'http://localhost:8005', timeout: 5000 }
          }
        };
        
        setConfig(defaultConfig);
// console.log(`Using default config for terminal: ${defaultConfig.terminal_id}`);
        
      } catch (error) {
        const errorMsg = `Erro ao carregar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        setError(errorMsg);
// console.error(errorMsg, error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [terminalId, setError, setLoading]);

  return {
    config,
    loading,
    error
  };
};

