import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Collapse, IconButton } from '@mui/material';
import { 
  ErrorOutline, 
  Refresh, 
  ExpandMore, 
  ExpandLess,
  BugReport,
  Home
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  expanded: boolean;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to offline storage
    this.logError(error, errorInfo);

    // Send error to backend if online
    this.reportError(error, errorInfo);
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const { offlineStorage } = await import('../services/OfflineStorage');
      await offlineStorage.log('error', error.message, {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    } catch (logError) {
      console.error('Failed to log error to offline storage:', logError);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    if (!navigator.onLine) return;

    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          retryCount: this.state.retryCount,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          terminalId: this.getTerminalId()
        })
      });
    } catch (reportError) {
      console.error('Failed to report error to backend:', reportError);
    }
  }

  private getTerminalId(): string {
    const path = window.location.pathname;
    const match = path.match(/\/pos\/(\d+)/);
    return match ? match[1] : 'unknown';
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        expanded: false,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // Max retries reached, reload page
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    const terminalId = this.getTerminalId();
    window.location.href = `/pos/${terminalId}`;
  };

  private toggleExpanded = () => {
    this.setState(prevState => ({
      expanded: !prevState.expanded
    }));
  };

  private getErrorSeverity(): 'low' | 'medium' | 'high' {
    const { error } = this.state;
    if (!error) return 'low';

    // Check for critical errors
    if (error.name === 'ChunkLoadError' || 
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading CSS chunk')) {
      return 'medium';
    }

    // Check for network errors
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to load')) {
      return 'medium';
    }

    // Check for critical component errors
    if (error.stack?.includes('PaymentPage') ||
        error.stack?.includes('OrderPage') ||
        error.stack?.includes('CashierPage')) {
      return 'high';
    }

    return 'low';
  }

  private getErrorMessage(): string {
    const { error } = this.state;
    if (!error) return 'Erro desconhecido';

    // User-friendly error messages
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'Falha ao carregar recursos. Isso pode ser devido a uma atualização do sistema.';
    }

    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'Erro de conexão. Verifique sua conexão com a internet.';
    }

    if (error.message.includes('Permission denied')) {
      return 'Permissão negada. Verifique suas credenciais de acesso.';
    }

    return error.message;
  }

  private getRecoveryActions() {
    const severity = this.getErrorSeverity();
    const { retryCount } = this.state;
    const canRetry = retryCount < this.maxRetries;

    const actions = [];

    if (canRetry) {
      actions.push(
        <Button
          key="retry"
          variant="contained"
          color="primary"
          startIcon={<Refresh />}
          onClick={this.handleRetry}
          sx={{ mr: 1, mb: 1 }}
        >
          Tentar Novamente ({this.maxRetries - retryCount} restantes)
        </Button>
      );
    } else {
      actions.push(
        <Button
          key="reload"
          variant="contained"
          color="primary"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
          sx={{ mr: 1, mb: 1 }}
        >
          Recarregar Página
        </Button>
      );
    }

    actions.push(
      <Button
        key="home"
        variant="outlined"
        startIcon={<Home />}
        onClick={this.handleGoHome}
        sx={{ mr: 1, mb: 1 }}
      >
        Voltar ao Início
      </Button>
    );

    if (severity === 'high') {
      actions.push(
        <Button
          key="support"
          variant="outlined"
          color="error"
          startIcon={<BugReport />}
          onClick={() => window.open('/support', '_blank')}
          sx={{ mb: 1 }}
        >
          Contatar Suporte
        </Button>
      );
    }

    return actions;
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const errorMessage = this.getErrorMessage();
      const { error, errorInfo, expanded } = this.state;

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 3,
            backgroundColor: '#f5f5f5'
          }}
        >
          <Box
            sx={{
              maxWidth: 600,
              width: '100%',
              backgroundColor: 'white',
              borderRadius: 2,
              padding: 3,
              boxShadow: 3
            }}
          >
            {/* Error Icon and Title */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <ErrorOutline 
                sx={{ 
                  fontSize: 64, 
                  color: severity === 'high' ? 'error.main' : 
                         severity === 'medium' ? 'warning.main' : 'info.main',
                  mb: 2 
                }} 
              />
              <Typography variant="h4" gutterBottom>
                Oops! Algo deu errado
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {errorMessage}
              </Typography>
            </Box>

            {/* Severity Alert */}
            <Alert 
              severity={severity === 'high' ? 'error' : 
                       severity === 'medium' ? 'warning' : 'info'}
              sx={{ mb: 3 }}
            >
              {severity === 'high' && 'Erro crítico detectado. Recomendamos contatar o suporte.'}
              {severity === 'medium' && 'Erro moderado. Tente recarregar a página.'}
              {severity === 'low' && 'Erro menor. Você pode tentar novamente.'}
            </Alert>

            {/* Recovery Actions */}
            <Box sx={{ mb: 3 }}>
              {this.getRecoveryActions()}
            </Box>

            {/* Technical Details (Expandable) */}
            <Box>
              <Button
                variant="text"
                startIcon={expanded ? <ExpandLess /> : <ExpandMore />}
                onClick={this.toggleExpanded}
                sx={{ mb: 1 }}
              >
                Detalhes Técnicos
              </Button>
              
              <Collapse in={expanded}>
                <Box
                  sx={{
                    backgroundColor: '#f5f5f5',
                    padding: 2,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Error: {error?.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Message: {error?.message}
                  </Typography>
                  {error?.stack && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Stack Trace:
                      </Typography>
                      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {error.stack}
                      </Typography>
                    </>
                  )}
                  {errorInfo?.componentStack && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Component Stack:
                      </Typography>
                      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {errorInfo.componentStack}
                      </Typography>
                    </>
                  )}
                </Box>
              </Collapse>
            </Box>

            {/* Footer Info */}
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Terminal: {this.getTerminalId()} | 
                Tentativas: {this.state.retryCount}/{this.maxRetries} | 
                Timestamp: {new Date().toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

