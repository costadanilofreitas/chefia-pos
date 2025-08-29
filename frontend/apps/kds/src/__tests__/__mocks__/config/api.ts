export const API_CONFIG = {
  BASE_URL: 'http://localhost:8001',
  WS_URL: 'ws://localhost:8001',
  ENDPOINTS: {
    ORDERS: '/api/v1/orders',
    PRODUCTS: '/api/v1/products',
    CATEGORIES: '/api/v1/categories',
    KDS: '/api/v1/kds',
    PAYMENTS: '/api/v1/payments'
  },
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};