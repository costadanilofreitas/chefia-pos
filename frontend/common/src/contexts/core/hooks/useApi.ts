import { useState, useCallback, useMemo } from 'react';

/**
 * Função para obter o token de autenticação do localStorage
 */
const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

/**
 * Tipos para opções da API
 */
type ApiOptions = {
  headers?: Record<string, string>;
};

/**
 * Tipos para resposta da API
 */
type ApiResponse<T = any> = {
  success: boolean;
  data: T;
};

/**
 * Hook para fazer chamadas de API reais usando fetch
 * @param baseUrl URL base da API
 * @param options Opções adicionais, como headers
 * @returns Objeto com métodos para interagir com a API
 */
export const useApi = (baseUrl: string = '', options: ApiOptions = {}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  // Estabilizar opções para evitar re-criações desnecessárias
  const stableOptions = useMemo(() => options, [JSON.stringify(options)]);

  const makeRequest = useCallback(
    async <T>(
      method: 'GET' | 'POST' | 'PUT' | 'DELETE',
      endpoint: string,
      body?: any,
      params: Record<string, any> = {}
    ): Promise<ApiResponse<T>> => {
      setLoading(true);
      setError(null);

      try {
        const queryString =
          method === 'GET' && Object.keys(params).length
            ? '?' + new URLSearchParams(params).toString()
            : '';

        const url = `${baseUrl}${endpoint}${queryString}`;
        
        // Preparar headers com autenticação
        const authToken = getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...stableOptions.headers,
        };
        
        // Adicionar token de autenticação se disponível
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const fetchOptions: RequestInit = {
          method,
          headers,
          body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const errorText = await response.text();
          
          // Tratamento especial para erro 401 (Unauthorized)
          if (response.status === 401) {
            // Limpar token inválido
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            
            // Redirecionar para login se não estiver já na página de login
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/cashier')) {
              console.log('🔒 Token inválido, redirecionando para login...');
              window.location.href = '/pos/1/cashier';
            }
          }
          
          throw new Error(
            `Erro ${response.status}: ${response.statusText} - ${errorText}`
          );
        }

        const responseData = await response.json();
        const finalResponse: ApiResponse<T> = {
          success: true,
          data: responseData,
        };

        setData(finalResponse);
        return finalResponse;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, stableOptions.headers]
  );

  // Método para requisição GET
  const get = useCallback(
    <T = any>(endpoint: string, params: Record<string, any> = {}) =>
      makeRequest<T>('GET', endpoint, null, params),
    [makeRequest]
  );

  // Método para requisição POST
  const post = useCallback(
    <T = any>(endpoint: string, body: any = {}) =>
      makeRequest<T>('POST', endpoint, body),
    [makeRequest]
  );

  // Método para requisição PUT
  const put = useCallback(
    <T = any>(endpoint: string, body: any = {}) =>
      makeRequest<T>('PUT', endpoint, body),
    [makeRequest]
  );

  // Método para requisição DELETE
  const del = useCallback(
    <T = any>(endpoint: string) => makeRequest<T>('DELETE', endpoint),
    [makeRequest]
  );

  return {
    loading,
    error,
    data,
    get,
    post,
    put,
    delete: del,
  };
};
