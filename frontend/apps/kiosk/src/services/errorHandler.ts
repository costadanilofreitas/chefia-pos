/**
 * Centralized Error Handler
 * Manages all application errors with proper logging and user feedback
 */

import { offlineStorage } from './offlineStorage';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  PAYMENT = 'PAYMENT',
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Custom error class
export class AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
  details?: any;
  recoverable: boolean;
  userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      code?: string;
      details?: any;
      recoverable?: boolean;
      userMessage?: string;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = options?.code;
    this.details = options?.details;
    this.recoverable = options?.recoverable ?? true;
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Erro de conexão. Verifique sua internet.',
      [ErrorType.API]: 'Erro ao comunicar com o servidor.',
      [ErrorType.VALIDATION]: 'Dados inválidos. Verifique as informações.',
      [ErrorType.AUTH]: 'Erro de autenticação. Faça login novamente.',
      [ErrorType.PAYMENT]: 'Erro no pagamento. Tente outro método.',
      [ErrorType.BUSINESS]: 'Operação não permitida.',
      [ErrorType.SYSTEM]: 'Erro no sistema. Tente novamente.',
      [ErrorType.UNKNOWN]: 'Erro inesperado. Tente novamente.'
    };
    return messages[type];
  }
}

// Error handler class
class ErrorHandler {
  private errorCallbacks: Set<(error: AppError) => void> = new Set();
  private errorQueue: AppError[] = [];
  private maxQueueSize = 50;

  /**
   * Handle any error
   */
  handle(error: Error | AppError | any, context?: string): AppError {
    const appError = this.normalizeError(error);
    
    // Log error
    offlineStorage.error(
      `${context || 'Application'} Error: ${appError.message}`,
      {
        type: appError.type,
        severity: appError.severity,
        code: appError.code,
        details: appError.details,
        stack: appError.stack
      }
    );

    // Add to queue
    this.addToQueue(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Handle critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(appError);
    }

    return appError;
  }

  /**
   * Handle API errors
   */
  handleApiError(
    response: Response | any,
    endpoint: string
  ): AppError {
    let message = 'API Error';
    let code = 'API_ERROR';
    let details: any = { endpoint };

    if (response instanceof Response) {
      message = `API Error: ${response.status} ${response.statusText}`;
      code = `HTTP_${response.status}`;
      details = {
        ...details,
        status: response.status,
        statusText: response.statusText
      };
    } else if (response?.message) {
      message = response.message;
      details = { ...details, ...response };
    }

    const severity = this.getApiErrorSeverity(response?.status);
    const type = this.getApiErrorType(response?.status);

    return this.handle(
      new AppError(message, type, severity, { code, details }),
      'API'
    );
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: Error): AppError {
    return this.handle(
      new AppError(
        'Network connection failed',
        ErrorType.NETWORK,
        ErrorSeverity.HIGH,
        {
          code: 'NETWORK_ERROR',
          details: { originalError: error.message },
          recoverable: true,
          userMessage: 'Sem conexão com a internet. Verifique sua rede.'
        }
      ),
      'Network'
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    field: string,
    message: string,
    value?: any
  ): AppError {
    return this.handle(
      new AppError(
        `Validation failed for ${field}: ${message}`,
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        {
          code: 'VALIDATION_ERROR',
          details: { field, value },
          userMessage: message
        }
      ),
      'Validation'
    );
  }

  /**
   * Handle payment errors
   */
  handlePaymentError(
    message: string,
    paymentMethod?: string,
    details?: any
  ): AppError {
    return this.handle(
      new AppError(
        message,
        ErrorType.PAYMENT,
        ErrorSeverity.HIGH,
        {
          code: 'PAYMENT_ERROR',
          details: { paymentMethod, ...details },
          recoverable: true,
          userMessage: 'Erro no pagamento. Tente outro cartão ou método.'
        }
      ),
      'Payment'
    );
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: any): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        ErrorType.SYSTEM,
        ErrorSeverity.MEDIUM,
        {
          details: { originalError: error.name, stack: error.stack }
        }
      );
    }

    if (typeof error === 'string') {
      return new AppError(error);
    }

    return new AppError(
      'Unknown error occurred',
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      {
        details: error
      }
    );
  }

  /**
   * Get severity based on HTTP status
   */
  private getApiErrorSeverity(status?: number): ErrorSeverity {
    if (!status) return ErrorSeverity.MEDIUM;
    
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 401 || status === 403) return ErrorSeverity.MEDIUM;
    if (status >= 400) return ErrorSeverity.LOW;
    return ErrorSeverity.LOW;
  }

  /**
   * Get error type based on HTTP status
   */
  private getApiErrorType(status?: number): ErrorType {
    if (!status) return ErrorType.API;
    
    if (status === 401 || status === 403) return ErrorType.AUTH;
    if (status >= 500) return ErrorType.SYSTEM;
    if (status >= 400) return ErrorType.VALIDATION;
    return ErrorType.API;
  }

  /**
   * Add error to queue
   */
  private addToQueue(error: AppError): void {
    this.errorQueue.push(error);
    
    // Trim queue if too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
  }

  /**
   * Handle critical errors
   */
  private handleCriticalError(error: AppError): void {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('CRITICAL ERROR:', error);
    }

    // In production, could send to monitoring service
    // Could also trigger app restart or recovery
  }

  /**
   * Register error callback
   */
  onError(callback: (error: AppError) => void): () => void {
    this.errorCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(error: AppError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    });
  }

  /**
   * Get error history
   */
  getErrorHistory(): AppError[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<ErrorType, number> {
    return this.errorQueue.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: AppError): boolean {
    return error.recoverable && error.severity !== ErrorSeverity.CRITICAL;
  }

  /**
   * Create user-friendly error message
   */
  getUserMessage(error: AppError): string {
    return error.userMessage;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(
      event.reason,
      'Unhandled Promise Rejection'
    );
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    errorHandler.handle(
      event.error || event.message,
      'Global Error'
    );
    event.preventDefault();
  });
}

// Export singleton
export { errorHandler };