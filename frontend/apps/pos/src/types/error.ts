/**
 * Tipo base para erros da aplicação
 */
export interface AppError extends Error {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}

/**
 * Erro de API/HTTP
 */
export interface ApiError extends AppError {
  statusCode: number;
  endpoint?: string;
  method?: string;
  response?: {
    data?: {
      detail?: string;
      message?: string;
      error?: string;
    };
    status: number;
    statusText: string;
  };
}

/**
 * Tipo para erros HTTP do Axios
 */
export interface AxiosErrorResponse {
  response?: {
    data?: {
      detail?: string;
      message?: string;
      error?: string;
    };
    status?: number;
    statusText?: string;
  };
  message?: string;
}

/**
 * Erro de validação
 */
export interface ValidationError extends AppError {
  field?: string;
  value?: unknown;
  constraints?: Record<string, string>;
}

/**
 * Erro de negócio
 */
export interface BusinessError extends AppError {
  code: string;
  context?: Record<string, unknown>;
}

/**
 * Helper para extrair mensagem de erro de qualquer tipo
 */
export function getErrorMessage(error: Error | ApiError | ValidationError | BusinessError | unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Erro desconhecido';
}

/**
 * Helper para extrair mensagem de erro da resposta da API
 */
export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosErrorResponse;
  
  if (axiosError?.response?.data?.detail) {
    return axiosError.response.data.detail;
  }
  
  if (axiosError?.response?.data?.message) {
    return axiosError.response.data.message;
  }
  
  if (axiosError?.response?.data?.error) {
    return axiosError.response.data.error;
  }
  
  if (axiosError?.message) {
    return axiosError.message;
  }
  
  return getErrorMessage(error);
}

/**
 * Type guard para verificar se é um Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard para verificar se é um ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'statusCode' in error;
}

/**
 * Type guard para verificar se é um ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof Error && 'field' in error;
}

/**
 * Converte qualquer erro para AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    return error as AppError;
  }
  
  return {
    name: 'AppError',
    message: getErrorMessage(error)
  } as AppError;
}