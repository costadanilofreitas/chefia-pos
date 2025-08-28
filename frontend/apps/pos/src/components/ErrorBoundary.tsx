
import { Component, ErrorInfo, ReactNode } from 'react';
import logger, { LogSource } from '../services/LocalLoggerService';
import { showError } from '../utils/notifications';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log crítico para erros capturados pelo ErrorBoundary
    void logger.critical('ErrorBoundary capturou erro crítico', 
      { 
        error: error.toString(), 
        stack: error.stack,
        componentStack: errorInfo.componentStack 
      }, 
      'ErrorBoundary', 
      LogSource.UI
    );
    
    this.setState({
      error,
      errorInfo
    });
  }

  private readonly handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Reload the page to reset the app state
    window.location.reload();
  };

  private readonly handleReportError = async () => {
    const { error, errorInfo } = this.state;
    
    if (error) {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      // Log the error report
      await logger.error(
        'Erro reportado pelo usuário',
        errorReport,
        'ErrorBoundary',
        LogSource.UI
      );
      
      // Show feedback to user
      showError('Erro reportado com sucesso. Obrigado pelo feedback!');
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Error Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Ops! Algo deu errado
                  </h1>
                  <p className="text-white/90 mt-1">
                    Encontramos um erro inesperado
                  </p>
                </div>
              </div>
            </div>

            {/* Error Content */}
            <div className="p-6">
              {/* Error Message */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Mensagem de Erro:
                </h3>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <code className="text-sm text-red-600 dark:text-red-400">
                    {this.state.error?.message || 'Erro desconhecido'}
                  </code>
                </div>
              </div>

              {/* Error Details (Collapsible) */}
              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    Ver detalhes técnicos
                  </summary>
                  <div className="mt-2 bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  Recarregar Página
                </button>
                
                <button
                  onClick={this.handleReportError}
                  className="px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  Reportar Erro
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Dica:</strong> Se o erro persistir, tente limpar o cache do navegador 
                  ou entre em contato com o suporte técnico.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;