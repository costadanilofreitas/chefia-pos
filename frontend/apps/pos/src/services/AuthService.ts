import axios from "axios";
import { API_CONFIG, buildApiUrl } from "../config/api";
import logger, { LogSource } from "./LocalLoggerService";

// Interfaces para o sistema de autenticação
export interface LoginRequest {
  operator_id: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  operator_id: string;
  operator_name: string;
  roles: string[];
  permissions: string[];
  require_password_change: boolean;
}

export interface CreateCredentialRequest {
  operator_id: string;
  password: string;
}

export interface AuthUser {
  operator_id: string;
  operator_name: string;
  roles: string[];
  permissions: string[];
  access_token: string;
  expires_at: Date;
}

class AuthService {
  private currentUser: AuthUser | null = null;

  constructor() {
    // Carregar usuário do localStorage se existir
    this.loadUserFromStorage();
    // Configurar interceptors do axios
    this.setupAxiosInterceptors();
  }

  /**
   * Realiza login com credenciais
   */
  async login(credentials: LoginRequest): Promise<AuthUser> {
    try {
      await logger.info(
        "Tentativa de login",
        { operator_id: credentials.operator_id },
        "AuthService",
        LogSource.SECURITY
      );

      // Fazer chamada real para o backend de autenticação
      const formData = new FormData();
      formData.append("username", credentials.operator_id);
      formData.append("password", credentials.password);

      const response = await axios.post(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.TOKEN),
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const loginResponse = response.data;

      // Buscar informações do usuário
      const userResponse = await axios.get(
        buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME),
        {
          headers: {
            Authorization: `Bearer ${loginResponse.access_token}`,
          },
        }
      );

      const userData = userResponse.data;

      const user: AuthUser = {
        operator_id: userData.username,
        operator_name: userData.full_name,
        roles: [userData.role],
        permissions: userData.permissions,
        access_token: loginResponse.access_token,
        expires_at: new Date(Date.now() + loginResponse.expires_in * 1000),
      };

      this.currentUser = user;
      this.saveUserToStorage(user);

      await logger.info(
        "Login realizado com sucesso",
        {
          operator_id: user.operator_id,
          operator_name: user.operator_name,
          roles: user.roles,
        },
        "AuthService",
        LogSource.SECURITY
      );

      return user;
    } catch (error) {
      await logger.critical(
        "Erro ao realizar login",
        { operator_id: credentials.operator_id, error },
        "AuthService",
        LogSource.SECURITY
      );
      throw error;
    }
  }

  /**
   * Cria novas credenciais para um operador
   */
  async createCredentials(data: CreateCredentialRequest): Promise<void> {
    try {
      await logger.info(
        "Criando credenciais para operador",
        { operator_id: data.operator_id },
        "AuthService",
        LogSource.SECURITY
      );

      // Implementar chamada real para o backend
      const response = await fetch(buildApiUrl("/api/v1/auth/credentials"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      await logger.info(
        "Credenciais criadas com sucesso",
        { operator_id: data.operator_id },
        "AuthService",
        LogSource.SECURITY
      );
    } catch (error) {
      await logger.critical(
        "Erro ao criar credenciais",
        { operator_id: data.operator_id, error },
        "AuthService",
        LogSource.SECURITY
      );
      throw error;
    }
  }

  /**
   * Realiza logout
   */
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Verificar se o token não expirou
    return new Date() < this.currentUser.expires_at;
  }

  /**
   * Retorna o usuário atual
   */
  getCurrentUser(): AuthUser | null {
    if (!this.isAuthenticated()) {
      this.logout();
      return null;
    }
    return this.currentUser;
  }

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Verifica se o usuário tem um role específico
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles.includes(role) || false;
  }

  /**
   * Retorna o token de acesso atual
   */
  getAccessToken(): string | null {
    const user = this.getCurrentUser();
    return user?.access_token || null;
  }

  /**
   * Salva usuário no localStorage
   */
  private saveUserToStorage(user: AuthUser): void {
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        ...user,
        expires_at: user.expires_at.toISOString(),
      })
    );
    localStorage.setItem("auth_token", user.access_token);
  }

  /**
   * Carrega usuário do localStorage
   */
  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem("auth_user");
      if (userData) {
        const user = JSON.parse(userData);
        user.expires_at = new Date(user.expires_at);

        if (new Date() < user.expires_at) {
          this.currentUser = user;
        } else {
          // Token expirado, limpar storage
          this.logout();
        }
      }
    } catch (error) {
      logger
        .error(
          "Erro ao carregar usuário do storage",
          error,
          "AuthService",
          LogSource.SECURITY
        )
        .catch(console.error);
      this.logout();
    }
  }

  /**
   * Interceptor para adicionar token nas requisições
   */
  setupAxiosInterceptors(): void {
    // Request interceptor - adiciona token
    axios.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        let normalizedError: Error;
        if (error instanceof Error) {
          normalizedError = error;
        } else if (typeof error === "string") {
          normalizedError = new Error(error);
        } else {
          normalizedError = new Error(JSON.stringify(error));
        }
        return Promise.reject(normalizedError);
      }
    );

    // Response interceptor - trata erros de autenticação
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          // Redirecionar para login se necessário
          window.location.href = "/login";
        }
        let normalizedError: Error;
        if (error instanceof Error) {
          normalizedError = error;
        } else if (typeof error === "string") {
          normalizedError = new Error(error);
        } else {
          normalizedError = new Error(JSON.stringify(error));
        }
        return Promise.reject(normalizedError);
      }
    );
  }
}

// Instância singleton
export const authService = new AuthService();

export default authService;
