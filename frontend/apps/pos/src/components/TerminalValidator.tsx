import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import TerminalService from '../services/TerminalService';

interface TerminalValidatorProps {
  children: React.ReactNode;
}

export const TerminalValidator: React.FC<TerminalValidatorProps> = ({ children }) => {
  const { terminalId } = useParams<{ terminalId: string }>();
  
  // Fast synchronous validation - no loading state needed!
  const validTerminals = TerminalService.getAvailableTerminals();
  
  // Check if no terminals are configured at all - critical error
  if (validTerminals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-red-50 dark:bg-red-950">
        <div className="mb-4">
          <svg 
            className="w-24 h-24 text-red-600 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
          Erro Crítico de Configuração
        </h1>
        
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
          Nenhum terminal está configurado no sistema.
        </p>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
          Entre em contato com o administrador do sistema para configurar os terminais.
          Os arquivos de configuração devem estar em config/pos/
        </p>
      </div>
    );
  }
  
  // Verificar se o terminal é válido
  if (!terminalId) {
    // Redirect to first available terminal
    return <Navigate to={`/pos/${validTerminals[0]}`} replace />;
  }

  const isValid = TerminalService.isTerminalConfigured(terminalId);

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50 dark:bg-gray-900">
        {/* Error Icon */}
        <div className="mb-4">
          <svg 
            className="w-20 h-20 text-red-500 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
          Terminal Não Encontrado
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          O terminal {terminalId} não existe ou não está configurado.
        </p>
        
        {/* Alert Box */}
        <div className="mb-6 max-w-lg w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg 
              className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-2 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                clipRule="evenodd" 
              />
            </svg>
            <div className="text-sm text-red-800 dark:text-red-200">
              <p><span className="font-semibold">Terminal solicitado:</span> {terminalId}</p>
              <p><span className="font-semibold">Terminais disponíveis:</span> {validTerminals.join(', ')}</p>
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button 
            onClick={() => window.location.href = '/pos/1'}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            Ir para Terminal 1
          </button>
          
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
          >
            Voltar
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-8 max-w-md">
          Se você acredita que este terminal deveria existir, entre em contato com o administrador do sistema.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default TerminalValidator;

