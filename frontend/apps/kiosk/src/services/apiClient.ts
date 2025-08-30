/**
 * Enhanced API client with centralized configuration and error handling
 */

import { API_CONFIG, buildUrl, buildUrlWithParams } from '../config/api';
import { errorHandler } from './errorHandler';
import { offlineStorage } from './offlineStorage';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface ApiRequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: RequestCache;
  signal?: AbortSignal;
}

export class ApiClient {
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: Array<(config: RequestInit) => RequestInit> = [];
  private responseInterceptors: Array<(response: Response) => Response> = [];

  constructor() {
    this.defaultHeaders = { ...API_CONFIG.HEADERS };
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: (response: Response) => Response): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = options.params 
      ? buildUrlWithParams(endpoint, options.params)
      : buildUrl(endpoint);

    return this.request<T>(url, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(endpoint: string, body?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint);
    
    return this.request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : null,
      ...options
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint);
    
    return this.request<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : null,
      ...options
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint);
    
    return this.request<T>(url, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint);
    
    return this.request<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : null,
      ...options
    });
  }

  /**
   * Core request method with retry logic and error handling
   */
  private async request<T>(
    url: string, 
    options: RequestInit & ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    const maxRetries = options.retries ?? API_CONFIG.RETRY_ATTEMPTS;
    const timeout = options.timeout ?? API_CONFIG.TIMEOUT;
    
    // Merge headers
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };

    // Build request config
    let config: RequestInit = {
      ...options,
      headers,
      cache: options.cache || 'no-cache',
      credentials: 'same-origin'
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    if (!options.signal) {
      config.signal = controller.signal;
    }

    let lastError: Error | null = null;
    
    // Retry loop
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          offlineStorage.log(`Retrying API call (attempt ${attempt}/${maxRetries})`, { url, method: config.method });
          await this.delay(API_CONFIG.RETRY_DELAY * attempt);
        }

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = interceptor(processedResponse);
        }

        // Track API call
        const duration = performance.now() - startTime;
        offlineStorage.trackApiCall(
          config.method || 'GET',
          url,
          processedResponse.status,
          duration
        );

        // Handle non-OK responses
        if (!processedResponse.ok) {
          const errorData = await this.parseErrorResponse(processedResponse);
          throw errorHandler.handleApiError(
            {
              status: processedResponse.status,
              statusText: processedResponse.statusText,
              message: errorData.message || processedResponse.statusText,
              ...errorData
            },
            url
          );
        }

        // Parse response
        const data = await this.parseResponse<T>(processedResponse);

        return {
          data,
          status: processedResponse.status,
          statusText: processedResponse.statusText,
          headers: processedResponse.headers
        };

      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        // Don't retry on certain errors
        if (
          error.name === 'AbortError' ||
          (error.status && error.status >= 400 && error.status < 500)
        ) {
          break;
        }

        // Log retry attempt
        if (attempt < maxRetries) {
          offlineStorage.warn(`API call failed, will retry`, {
            url,
            method: config.method,
            attempt,
            error: error.message
          });
        }
      }
    }

    // All retries failed
    if (lastError) {
      if (lastError.name === 'AbortError') {
        throw errorHandler.handle(
          new Error(`Request timeout after ${timeout}ms`),
          'API Timeout'
        );
      }
      throw lastError;
    }

    throw errorHandler.handle(
      new Error('Request failed after all retries'),
      'API Request'
    );
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as any;
    }
    
    return null as any;
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return { message: await response.text() };
    } catch {
      return { message: response.statusText };
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const apiClient = new ApiClient();

// Add default interceptors
apiClient.addRequestInterceptor(config => {
  // Log requests in development
  if (import.meta.env.DEV) {
    offlineStorage.debug('API Request', {
      method: config.method,
      headers: config.headers,
      body: config.body
    });
  }
  return config;
});

apiClient.addResponseInterceptor(response => {
  // Log responses in development
  if (import.meta.env.DEV) {
    offlineStorage.debug('API Response', {
      status: response.status,
      statusText: response.statusText
    });
  }
  return response;
});

export default apiClient;