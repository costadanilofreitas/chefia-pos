import { useState, useCallback } from 'react';

/**
 * Hook para fazer chamadas de API
 * @param baseUrl URL base da API
 * @param options Opções adicionais
 * @returns Objeto com métodos para interagir com a API
 */
export const useApi = (baseUrl: string = '', options: any = {}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  // Método para fazer requisições GET
  const get = useCallback(async (endpoint: string, params: Record<string, any> = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Construir query string
      const queryString = Object.keys(params).length 
        ? '?' + new URLSearchParams(params).toString() 
        : '';
      
      // Implementação simulada - em produção, isso seria uma chamada fetch real
      console.log(`Simulando GET para: ${baseUrl}${endpoint}${queryString}`);
      
      // Simular resposta
      const mockResponse = { success: true, data: { message: 'Dados simulados' } };
      
      setData(mockResponse);
      setLoading(false);
      return mockResponse;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [baseUrl]);

  // Método para fazer requisições POST
  const post = useCallback(async (endpoint: string, body: any = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Implementação simulada - em produção, isso seria uma chamada fetch real
      console.log(`Simulando POST para: ${baseUrl}${endpoint}`);
      console.log('Corpo da requisição:', body);
      
      // Simular resposta
      const mockResponse = { success: true, data: { id: 123, ...body } };
      
      setData(mockResponse);
      setLoading(false);
      return mockResponse;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [baseUrl]);

  // Método para fazer requisições PUT
  const put = useCallback(async (endpoint: string, body: any = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Implementação simulada - em produção, isso seria uma chamada fetch real
      console.log(`Simulando PUT para: ${baseUrl}${endpoint}`);
      console.log('Corpo da requisição:', body);
      
      // Simular resposta
      const mockResponse = { success: true, data: { updated: true, ...body } };
      
      setData(mockResponse);
      setLoading(false);
      return mockResponse;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [baseUrl]);

  // Método para fazer requisições DELETE
  const del = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Implementação simulada - em produção, isso seria uma chamada fetch real
      console.log(`Simulando DELETE para: ${baseUrl}${endpoint}`);
      
      // Simular resposta
      const mockResponse = { success: true, data: { deleted: true } };
      
      setData(mockResponse);
      setLoading(false);
      return mockResponse;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [baseUrl]);

  return {
    loading,
    error,
    data,
    get,
    post,
    put,
    delete: del
  };
};
