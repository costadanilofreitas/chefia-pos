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
        if (config.url?.includes('/api/v1/auth/token')) {
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

  public setToken(tokenData: TokenData | string): void {
    // Handle both TokenData object and raw token string
    if (typeof tokenData === 'string') {
      // If it's just a token string, create minimal TokenData
      this.tokenData = {
        access_token: tokenData,
        token_type: 'bearer',
        expires_in: 1800, // 30 minutes default
        operator_id: 'unknown',
        operator_name: 'Unknown User',
        roles: [],
        permissions: [],
        require_password_change: false
      };
    } else {
      this.tokenData = tokenData;
    }
    
    // Calculate expiration time safely
    const now = Date.now();
    const expiresInMs = (this.tokenData.expires_in || 1800) * 1000; // Default 30 minutes
    this.tokenExpirationTime = now + expiresInMs;
    
    // Save to localStorage
    this.saveTokenToStorage();
    
    console.log('Token set successfully:', {
      operator: this.tokenData.operator_name,
      roles: this.tokenData.roles,
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
      // Implementar verificação de token via backend
      if (!this.tokenData?.access_token) {
        throw new Error('No token to verify');
      }

      console.log('🔄 Verificando token com backend...');
      
      // Fazer chamada para verificar se o token ainda é válido
      const response = await axios.get('http://localhost:8001/api/v1/auth/verify', {
        headers: {
          'Authorization': `Bearer ${this.tokenData.access_token}`
        },
        timeout: 5000
      });

      if (response.status === 200) {
        console.log('✅ Token ainda válido no backend');
        // Atualizar tempo de expiração baseado na resposta do backend
        const now = Date.now();
        this.tokenExpirationTime = now + (this.tokenData.expires_in * 1000);
        this.saveTokenToStorage();
        return this.tokenData.access_token;
      } else {
        throw new Error('Token inválido no backend');
      }
    } catch (error) {
      console.error('❌ Verificação de token falhou:', error);
      this.clearToken();
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
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
        
        // Validate expiration time is a valid number
        if (isNaN(expirationTime)) {
          console.log('Invalid expiration time in storage, clearing...');
          this.clearToken();
          return;
        }
        
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

