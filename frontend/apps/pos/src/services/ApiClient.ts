// src/services/ApiClient.ts
import { TerminalConfig } from '../hooks/useTerminalConfig';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'gerente' | 'caixa' | 'garcom' | 'cozinheiro';
  disabled: boolean;
  permissions: string[];
}

// Mock data for offline mode
const mockData = {
  cashier: {
    open: {
      id: 'cashier-001',
      operator_id: 'user-001',
      business_day_id: 'day-001',
      terminal_id: '1',
      initial_amount: 100,
      current_amount: 100,
      status: 'open' as const,
      opened_at: new Date().toISOString()
    },
    status: {
      id: 'cashier-001',
      status: 'open' as const,
      current_amount: 100,
      transactions_count: 0
    }
  },
  businessDay: {
    current: {
      id: 'day-001',
      store_id: 'store-001',
      date: new Date().toISOString().split('T')[0],
      status: 'open' as const,
      opened_at: new Date().toISOString()
    }
  },
  auth: {
    login: {
      access_token: 'mock-token-123',
      token_type: 'bearer' as const,
      expires_in: 3600
    },
    user: {
      id: 'user-001',
      username: 'admin',
      full_name: 'Administrador',
      role: 'gerente' as const,
      disabled: false,
      permissions: ['MANAGER_ACCESS', 'CASHIER_ACCESS', 'ORDERS_ACCESS']
    }
  }
};

export class ApiClient {
  private config: TerminalConfig;
  private isOfflineMode: boolean = false;
  
  constructor(config: TerminalConfig) {
    this.config = config;
  }

  private async request(
    service: keyof TerminalConfig['services'], 
    endpoint: string, 
    options?: RequestInit
  ) {
    const serviceConfig = this.config.services[service];
    if (!serviceConfig) {
      throw new Error(`Service ${service} not configured`);
    }

    const url = `${serviceConfig.url}/api/v1/${service}${endpoint}`;
    const token = localStorage.getItem('auth_token');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), serviceConfig.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options?.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Se for erro de conectividade (503, 500, etc.), ativar modo offline
        if (response.status >= 500) {
          console.warn(`Service ${service} unavailable (${response.status}), switching to offline mode`);
          this.isOfflineMode = true;
          return this.getMockResponse(service, endpoint, options?.method || 'GET');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Se chegou aqui, o serviço está online
      this.isOfflineMode = false;
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Se for erro de rede/timeout, usar modo offline
      if (error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.includes('fetch') ||
        error.message.includes('Failed to fetch')
      )) {
        console.warn(`Service ${service} unreachable, using offline mode:`, error.message);
        this.isOfflineMode = true;
        return this.getMockResponse(service, endpoint, options?.method || 'GET');
      }
      
      throw error;
    }
  }

  private getMockResponse(service: string, endpoint: string, method: string) {
    console.log(`🔄 Mock response for ${method} ${service}${endpoint}`);
    
    // Simular delay de rede
    return new Promise(resolve => {
      setTimeout(() => {
        switch (service) {
          case 'cashier':
            if (method === 'POST' && endpoint === '/') {
              resolve(mockData.cashier.open);
            } else if (endpoint.includes('/status')) {
              resolve(mockData.cashier.status);
            }
            break;
          case 'businessDay':
            if (endpoint === '/current') {
              resolve(mockData.businessDay.current);
            }
            break;
          case 'auth':
            if (endpoint === '/token') {
              resolve(mockData.auth.login);
            } else if (endpoint === '/me') {
              resolve(mockData.auth.user);
            }
            break;
          default:
            resolve({ success: true, data: null });
        }
      }, 200); // Simular 200ms de delay
    });
  }

  // Auth methods
  auth = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      
      return this.request('auth', '/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
    },
    
    getMe: (): Promise<User> => this.request('auth', '/me'),
    
    verifyPermission: (permission: string): Promise<{ has_permission: boolean; permission: string }> =>
      this.request('auth', `/verify-permission/${permission}`)
  };

  // Cashier methods
  cashier = {
    open: (data: { initial_amount: number; business_day_id: string; terminal_id: string }) =>
      this.request('cashier', '/', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    close: (cashierId: string, data: { final_amount: number; notes?: string }) =>
      this.request('cashier', `/${cashierId}/close`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    
    withdraw: (cashierId: string, data: { amount: number; reason: string; authorized_by?: string }) =>
      this.request('cashier', `/${cashierId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    getStatus: (cashierId: string) =>
      this.request('cashier', `/${cashierId}/status`)
  };

  // Products methods
  products = {
    getAll: (filters?: { category?: string; search?: string; is_combo?: boolean }) => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.is_combo !== undefined) params.append('is_combo', filters.is_combo.toString());
      
      return this.request('products', `/?${params.toString()}`);
    },
    
    getById: (productId: string) =>
      this.request('products', `/${productId}`),
    
    getCategories: () =>
      this.request('products', '/categories')
  };

  // Orders methods
  orders = {
    create: (data: any) =>
      this.request('orders', '/', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    getById: (orderId: string) =>
      this.request('orders', `/${orderId}`),
    
    getAll: (filters?: { status?: string; table_id?: string; from_date?: string; to_date?: string }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.table_id) params.append('table_id', filters.table_id);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      
      return this.request('orders', `/?${params.toString()}`);
    }
  };

  // Business Day methods
  businessDay = {
    open: (data: { store_id: string; date: string }) =>
      this.request('businessDay', '/', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    close: (dayId: string) =>
      this.request('businessDay', `/${dayId}/close`, {
        method: 'PUT'
      }),
    
    getCurrent: () =>
      this.request('businessDay', '/current')
  };

  // Fiscal methods
  fiscal = {
    emit: (data: { order_id: string; type: string; environment: string }) =>
      this.request('fiscal', '/emit', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    cancel: (data: { document_id: string; reason: string }) =>
      this.request('fiscal', '/cancel', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  };

  // Utility methods
  isOnline = () => !this.isOfflineMode;
  isOffline = () => this.isOfflineMode;
}

export const createApiClient = (config: TerminalConfig) => new ApiClient(config);

