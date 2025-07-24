import { useState, useCallback, useMemo } from 'react';

import { ApiInterceptor } from '../../../../../apps/pos/src/services/ApiInterceptor';

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
 * Hook para fazer chamadas de API usando ApiInterceptor
 * @param baseUrl URL base da API
 * @param options Opções adicionais, como headers
 * @returns Objeto com métodos para interagir com a API
 */
export const useApi = (baseUrl: string = '', options: ApiOptions = {}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  // Usar ApiInterceptor singleton
  const apiInterceptor = ApiInterceptor.getInstance();
  const axiosInstance = apiInterceptor.getAxiosInstance();

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
        console.log(`🌐 API Request: ${method} ${baseUrl}${endpoint}`);
        
        // Usar axios instance do ApiInterceptor que já tem interceptors configurados
        let response;
        const fullUrl = `${baseUrl}${endpoint}`;
        
        switch (method) {
          case 'GET':
            response = await axiosInstance.get(fullUrl, { params });
            break;
          case 'POST':
            response = await axiosInstance.post(fullUrl, body);
            break;
          case 'PUT':
            response = await axiosInstance.put(fullUrl, body);
            break;
          case 'DELETE':
            response = await axiosInstance.delete(fullUrl);
            break;
          default:
            throw new Error(`Método HTTP não suportado: ${method}`);
        }

        console.log(`✅ API Response: ${method} ${fullUrl} - Status: ${response.status}`);
        
        const finalResponse: ApiResponse<T> = {
          success: true,
          data: response.data,
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
