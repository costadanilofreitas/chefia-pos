import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { API_CONFIG } from "../config/api";

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
  private readonly axiosInstance: AxiosInstance;
  private tokenData: TokenData | null = null;
  private tokenExpirationTime: number = 0;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        "Content-Type": "application/json",
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
        if (config.url?.includes("/api/v1/auth/token")) {
          return config;
        }

        // Check if token is about to expire (5 minutes before)
        const now = Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;

        if (this.tokenData && this.tokenExpirationTime > 0) {
          if (now >= this.tokenExpirationTime - fiveMinutesInMs) {
            await this.refreshToken();
          }
        }

        // Add authorization header if token exists
        if (this.tokenData?.access_token) {
          if (!config.headers) {
            config.headers = new AxiosHeaders();
          }
          config.headers.Authorization = `Bearer ${this.tokenData.access_token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    );
  }

  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 Unauthorized - mas ser muito menos agressivo
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Só tentar refresh se tivermos um token válido
          if (this.tokenData && this.isTokenValid()) {
            await this.refreshToken();

            // Retry original request with new token
            if (this.tokenData?.access_token) {
              if (!originalRequest.headers) {
                originalRequest.headers = new AxiosHeaders();
              }
              originalRequest.headers.Authorization = `Bearer ${this.tokenData.access_token}`;
              return this.axiosInstance(originalRequest);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise !== null) {
      return this.refreshPromise;
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
        throw new Error("No token to verify");
      }

      // Fazer chamada para verificar se o token ainda é válido
      const response = await axios.get("http://localhost:8001/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${this.tokenData.access_token}`,
        },
        timeout: 5000,
      });

      if (response.status === 200) {
        // Atualizar tempo de expiração baseado na resposta do backend
        const now = Date.now();
        this.tokenExpirationTime = now + this.tokenData.expires_in * 1000;
        this.saveTokenToStorage();
        return this.tokenData.access_token;
      } else {
        throw new Error("Token inválido no backend");
      }
    } catch {
      // NÃO limpar token automaticamente - apenas logar o erro
      // Retornar token atual para continuar funcionando
      return this.tokenData?.access_token || "";
    }
  }

  private saveTokenToStorage(): void {
    if (this.tokenData) {
      try {
        const tokenStr = JSON.stringify(this.tokenData);

        // Verificar localStorage antes de salvar
        /*
          auth_token: localStorage.getItem('auth_token') ? 'EXISTS' : 'NULL',
          auth_token_expiration: localStorage.getItem('auth_token_expiration') ? 'EXISTS' : 'NULL'
        });
        */

        localStorage.setItem("auth_token", tokenStr);

        localStorage.setItem(
          "auth_token_expiration",
          this.tokenExpirationTime.toString()
        );

        // Verificar se foi salvo corretamente
        const savedToken = localStorage.getItem("auth_token");

        if (savedToken) {
          // Verificar novamente após um pequeno delay
          setTimeout(() => {}, 100);
        }
      } catch (err) {
        console.error("Failed to save token to storage", err);
      }
    }
  }

  public isTokenValid(): boolean {
    if (!this.tokenData || !this.tokenExpirationTime) {
      return false;
    }
    const now = Date.now();
    return now < this.tokenExpirationTime;
  }

  public clearToken(): void {
    this.tokenData = null;
    this.tokenExpirationTime = 0;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_token_expiration");
  }

  public getTokenExpirationTime(): number {
    return this.tokenExpirationTime;
  }

  public setToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
    const now = Date.now();
    this.tokenExpirationTime = now + tokenData.expires_in * 1000;
    this.saveTokenToStorage();
  }

  public getToken(): TokenData | null {
    return this.tokenData;
  }

  public isAuthenticated(): boolean {
    return this.isTokenValid();
  }

  private loadTokenFromStorage(): void {
    try {
      const tokenStr = localStorage.getItem("auth_token");
      const expirationStr = localStorage.getItem("auth_token_expiration");

      if (tokenStr && expirationStr) {
        const tokenData = JSON.parse(tokenStr) as TokenData;
        const expirationTime = parseInt(expirationStr, 10);

        // Validate expiration time is a valid number
        if (isNaN(expirationTime)) {
          this.clearToken();
          return;
        }

        // Check if token is still valid
        const now = Date.now();
        if (now < expirationTime) {
          this.tokenData = tokenData;
          this.tokenExpirationTime = expirationTime;
          /*
            operator: tokenData.operator_name,
            expiresAt: new Date(expirationTime).toISOString()
          });
          */
        } else {
          this.clearToken();
        }
      }
    } catch {
      this.clearToken();
    }
  }

  // Utility method to make authenticated requests
  public async request<T = unknown>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.request<T>(config);
  }

  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}

// Export singleton instance
export const apiInterceptor = ApiInterceptor.getInstance();
export default apiInterceptor;
