import axios from 'axios';

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
  private baseURL = 'http://localhost:8001/api/v1/auth';
  private currentUser: AuthUser | null = null;

  constructor() {
    // Carregar usuário do localStorage se existir
    this.loadUserFromStorage();
  }

  /**
   * Realiza login com credenciais numéricas
   */
  async login(credentials: LoginRequest): Promise<AuthUser> {
    try {
      // Por enquanto, simular o backend até resolver o problema HTTP
      // TODO: Substituir por chamada real quando HTTP estiver funcionando
      const mockResponse = await this.mockLogin(credentials);
      
      const user: AuthUser = {
        operator_id: mockResponse.operator_id,
        operator_name: mockResponse.operator_name,
        roles: mockResponse.roles,
        permissions: mockResponse.permissions,
        access_token: mockResponse.access_token,
        expires_at: new Date(Date.now() + mockResponse.expires_in * 1000)
      };

      this.currentUser = user;
      this.saveUserToStorage(user);
      
      return user;
    } catch (error) {
      console.error('Erro no login:', error);
      throw new Error('Credenciais inválidas');
    }
  }

  /**
   * Mock temporário do login até resolver problema HTTP
   */
  private async mockLogin(credentials: LoginRequest): Promise<LoginResponse> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));

    // Validações básicas (simulando o backend)
    if (!credentials.operator_id || !credentials.password) {
      throw new Error('Operador e senha são obrigatórios');
    }

    if (credentials.password.length !== 6 || !/^\d{6}$/.test(credentials.password)) {
      throw new Error('Senha deve ter exatamente 6 dígitos');
    }

    // Credenciais válidas conhecidas (simulando dados do backend)
    const validCredentials = [
      { operator_id: 'admin', password: '147258', name: 'Admin', roles: ['admin'], permissions: ['read', 'write', 'delete'] },
      { operator_id: 'manager', password: '123456', name: 'Manager', roles: ['manager'], permissions: ['read', 'write'] },
      { operator_id: 'cashier', password: '654321', name: 'Cashier', roles: ['cashier'], permissions: ['read'] }
    ];

    const validUser = validCredentials.find(
      cred => cred.operator_id === credentials.operator_id && cred.password === credentials.password
    );

    if (!validUser) {
      throw new Error('Credenciais inválidas');
    }

    // Gerar token mock (em produção viria do backend)
    const mockToken = `mock_jwt_token_${validUser.operator_id}_${Date.now()}`;

    return {
      access_token: mockToken,
      token_type: 'bearer',
      expires_in: 28800, // 8 horas
      operator_id: validUser.operator_id,
      operator_name: validUser.name,
      roles: validUser.roles,
      permissions: validUser.permissions,
      require_password_change: false
    };
  }

  /**
   * Cria novas credenciais para um operador
   */
  async createCredentials(data: CreateCredentialRequest): Promise<void> {
    try {
      // TODO: Implementar chamada real para o backend
      console.log('Criando credenciais para:', data.operator_id);
      
      // Por enquanto, apenas simular sucesso
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('Erro ao criar credenciais:', error);
      throw new Error('Erro ao criar credenciais');
    }
  }

  /**
   * Realiza logout
   */
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
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
    localStorage.setItem('auth_user', JSON.stringify({
      ...user,
      expires_at: user.expires_at.toISOString()
    }));
    localStorage.setItem('auth_token', user.access_token);
  }

  /**
   * Carrega usuário do localStorage
   */
  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem('auth_user');
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
      console.error('Erro ao carregar usuário do storage:', error);
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
      (error) => Promise.reject(error)
    );

    // Response interceptor - trata erros de autenticação
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          // Redirecionar para login se necessário
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
}

// Instância singleton
export const authService = new AuthService();

// Configurar interceptors do axios
authService.setupAxiosInterceptors();

export default authService;

