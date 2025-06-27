import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface TokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  operator_id: string;
  operator_name: string;
  roles: string[];
  permissions: string[];
  require_password_change: boolean;
}

export class ApiInterceptor {
  private static instance: ApiInterceptor;
  private axiosInstance: AxiosInstance;
  private tokenData: TokenData | null = null;
  private tokenExpirationTime: number = 0;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
    this.loadTokenFromStorage();
  }

  public static getInstance(): ApiInterceptor {
    if (!ApiInterceptor.instance) {
      ApiInterceptor.instance = new ApiInterceptor();
    }
    return ApiInterceptor.instance;
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Skip auth for login endpoint
        if (config.url?.includes('/api/v1/auth/auth/login')) {
          return config;
        }

        // Check if token is about to expire (5 minutes before)
        const now = Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (this.tokenData && this.tokenExpirationTime > 0) {
          if (now >= (this.tokenExpirationTime - fiveMinutesInMs)) {
            console.log('Token expiring soon, refreshing...');
            await this.refreshToken();
          }
        }

        // Add authorization header if token exists
        if (this.tokenData?.access_token) {
          config.headers = config.headers || {};
          (config.headers as any)['Authorization'] = `Bearer ${this.tokenData.access_token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            
            // Retry original request with new token
            if (this.tokenData?.access_token) {
              originalRequest.headers = originalRequest.headers || {};
              (originalRequest.headers as any).Authorization = `Bearer ${this.tokenData.access_token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            this.clearToken();
            // Redirect to login or emit event
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public setToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    
    // Calculate expiration time
    const now = Date.now();
    this.tokenExpirationTime = now + (tokenData.expires_in * 1000);
    
    // Save to localStorage
    this.saveTokenToStorage();
    
    console.log('Token set successfully:', {
      operator: tokenData.operator_name,
      roles: tokenData.roles,
      expiresAt: new Date(this.tokenExpirationTime).toISOString()
    });
  }

  public getToken(): TokenData | null {
    return this.tokenData;
  }

  public clearToken(): void {
    this.tokenData = null;
    this.tokenExpirationTime = 0;
    this.refreshPromise = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token_expiration');
    console.log('Token cleared');
  }

  public isTokenValid(): boolean {
    if (!this.tokenData || !this.tokenExpirationTime) {
      return false;
    }
    
    const now = Date.now();
    return now < this.tokenExpirationTime;
  }

  public getTokenExpirationTime(): number {
    return this.tokenExpirationTime;
  }

  private async refreshToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokenData) {
      throw new Error('No token to refresh');
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      // For now, we'll implement a simple re-login approach
      // In a production system, you'd have a refresh token endpoint
      console.log('Token refresh not implemented yet - clearing token');
      this.clearToken();
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      throw new Error('Token refresh not implemented');
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      throw error;
    }
  }

  private saveTokenToStorage(): void {
    if (this.tokenData) {
      localStorage.setItem('auth_token', JSON.stringify(this.tokenData));
      localStorage.setItem('auth_token_expiration', this.tokenExpirationTime.toString());
    }
  }

  private loadTokenFromStorage(): void {
    try {
      const tokenStr = localStorage.getItem('auth_token');
      const expirationStr = localStorage.getItem('auth_token_expiration');
      
      if (tokenStr && expirationStr) {
        const tokenData = JSON.parse(tokenStr) as TokenData;
        const expirationTime = parseInt(expirationStr, 10);
        
        // Check if token is still valid
        const now = Date.now();
        if (now < expirationTime) {
          this.tokenData = tokenData;
          this.tokenExpirationTime = expirationTime;
          console.log('Token loaded from storage:', {
            operator: tokenData.operator_name,
            expiresAt: new Date(expirationTime).toISOString()
          });
        } else {
          console.log('Stored token expired, clearing...');
          this.clearToken();
        }
      }
    } catch (error) {
      console.error('Failed to load token from storage:', error);
      this.clearToken();
    }
  }

  // Utility method to make authenticated requests
  public async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.request<T>(config);
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

// Export singleton instance
export const apiInterceptor = ApiInterceptor.getInstance();
export default apiInterceptor;

