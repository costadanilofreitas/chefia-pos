import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

/**
 * API Client service for making HTTP requests to the backend
 */
export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private authToken: string | null = null;

  /**
   * Create a new API client instance
   * @param baseURL - Base URL for API requests
   * @param config - Additional axios configuration
   */
  constructor(baseURL: string = '/api', config: AxiosRequestConfig = {}) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle offline mode
        if (!navigator.onLine) {
          console.error('Network error: Device is offline');
          return Promise.reject(new Error('Network error: Device is offline'));
        }

        // Handle API errors
        if (error.response) {
          // Server responded with an error status
          const status = error.response.status;
          
          if (status === 401) {
            // Unauthorized - clear auth token and redirect to login
            this.setAuthToken(null);
            window.location.href = '/login';
          }
          
          return Promise.reject(error);
        } else if (error.request) {
          // Request was made but no response received
          console.error('Network error: No response received from server');
          return Promise.reject(new Error('Network error: No response received from server'));
        } else {
          // Error setting up the request
          console.error('Request error:', error.message);
          return Promise.reject(error);
        }
      }
    );
  }

  /**
   * Set the authentication token for subsequent requests
   * @param token - JWT token or null to clear
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get the current authentication token
   * @returns The current auth token or null
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Make a GET request
   * @param url - Endpoint URL (relative to baseURL)
   * @param config - Request configuration
   * @returns Promise with the response data
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  /**
   * Make a POST request
   * @param url - Endpoint URL (relative to baseURL)
   * @param data - Request payload
   * @param config - Request configuration
   * @returns Promise with the response data
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  /**
   * Make a PUT request
   * @param url - Endpoint URL (relative to baseURL)
   * @param data - Request payload
   * @param config - Request configuration
   * @returns Promise with the response data
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  /**
   * Make a PATCH request
   * @param url - Endpoint URL (relative to baseURL)
   * @param data - Request payload
   * @param config - Request configuration
   * @returns Promise with the response data
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  /**
   * Make a DELETE request
   * @param url - Endpoint URL (relative to baseURL)
   * @param config - Request configuration
   * @returns Promise with the response data
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  /**
   * Upload a file
   * @param url - Endpoint URL (relative to baseURL)
   * @param file - File to upload
   * @param fieldName - Form field name for the file
   * @param data - Additional form data
   * @param config - Request configuration
   * @returns Promise with the response data
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    fieldName: string = 'file',
    data: Record<string, any> = {},
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    // Add additional form data
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    return this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    });
  }

  /**
   * Download a file
   * @param url - Endpoint URL (relative to baseURL)
   * @param filename - Name to save the file as
   * @param config - Request configuration
   * @returns Promise that resolves when download is complete
   */
  async downloadFile(
    url: string,
    filename: string,
    config?: AxiosRequestConfig
  ): Promise<boolean> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
        ...config,
      });
      
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}
