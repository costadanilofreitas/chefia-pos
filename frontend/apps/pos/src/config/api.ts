// Configuração centralizada da API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8001',
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: {
      TOKEN: '/api/v1/auth/token',
      ME: '/api/v1/auth/me',
      VERIFY: '/api/v1/auth/verify',
      LOGOUT: '/api/v1/auth/logout'
    },
    PRODUCTS: {
      LIST: '/api/v1/products',
      CREATE: '/api/v1/products',
      UPDATE: (id: string) => `/api/v1/products/${id}`,
      DELETE: (id: string) => `/api/v1/products/${id}`,
      CATEGORIES: '/api/v1/products/categories'
    },
    ORDERS: {
      LIST: '/api/v1/orders',
      CREATE: '/api/v1/orders',
      UPDATE: (id: string) => `/api/v1/orders/${id}`,
      DELETE: (id: string) => `/api/v1/orders/${id}`,
      FINALIZE: (id: string) => `/api/v1/orders/${id}/finalize`
    },
    CASHIER: {
      STATUS: (terminalId: string) => `/api/v1/cashier/terminal/${terminalId}/status`,
      OPEN: '/api/v1/cashier',
      CLOSE: (cashierId: string) => `/api/v1/cashier/${cashierId}/close`,
      WITHDRAW: (cashierId: string) => `/api/v1/cashier/${cashierId}/withdrawal`
    },
    BUSINESS_DAY: {
      BASE: '/api/v1/business-day',
      OPEN: '/api/v1/business-day',
      CLOSE: '/api/v1/business-day',
      CURRENT: '/api/v1/business-day/current',
      SUMMARY: (id: string) => `/api/v1/business-day/${id}/summary`
    },
    CUSTOMERS: {
      LIST: '/api/v1/customers',
      CREATE: '/api/v1/customers',
      GET: '/api/v1/customers/:id',
      UPDATE: '/api/v1/customers/:id',
      DELETE: '/api/v1/customers/:id',
      SEARCH_PHONE: '/api/v1/customers/search/phone',
      SEARCH_EMAIL: '/api/v1/customers/search/email',
      ADD_POINTS: '/api/v1/customers/:id/loyalty/add-points',
      REDEEM_POINTS: '/api/v1/customers/:id/loyalty/redeem-points'
    },
    DELIVERY: {
      LIST: '/api/v1/delivery',
      CREATE: '/api/v1/delivery',
      GET: '/api/v1/delivery/:id',
      UPDATE: '/api/v1/delivery/:id',
      DELETE: '/api/v1/delivery/:id',
      ASSIGN: '/api/v1/delivery/:id/assign',
      START: '/api/v1/delivery/:id/start',
      COMPLETE: '/api/v1/delivery/:id/complete',
      CANCEL: '/api/v1/delivery/:id/cancel'
    },
    EMPLOYEES: {
      LIST: '/api/v1/employees',
      CREATE: '/api/v1/employees',
      GET: '/api/v1/employees/:id',
      UPDATE: '/api/v1/employees/:id',
      DELETE: '/api/v1/employees/:id',
      ACTIVATE: '/api/v1/employees/:id/activate',
      DEACTIVATE: '/api/v1/employees/:id/deactivate',
      RESET_PASSWORD: '/api/v1/employees/:id/reset-password'
    }
  }
};

// Export para compatibilidade com imports existentes
export const API_ENDPOINTS = API_CONFIG.ENDPOINTS;

// Helper para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper para headers padrão
export const getDefaultHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

// Helper para headers de form data
export const getFormDataHeaders = (): Record<string, string> => {
  return {
    'Accept': 'application/json'
    // Não incluir Content-Type para FormData, o browser define automaticamente
  };
};

