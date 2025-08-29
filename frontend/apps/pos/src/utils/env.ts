/**
 * Environment utilities that work in both Vite and Jest environments
 */

// Check if we're in a test environment
export const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

// Check if we're in development
export const isDev = (() => {
  if (isTest) return true; // Treat test as dev for debugging purposes
  try {
    // @ts-ignore - import.meta is Vite-specific
    return import.meta?.env?.DEV || false;
  } catch {
    return false;
  }
})();

// Check if we're in production
export const isProd = !isDev && !isTest;

// Get environment variables
export const getEnv = (key: string, defaultValue: string = ''): string => {
  if (isTest) {
    // In test environment, return defaults
    const testDefaults: Record<string, string> = {
      'VITE_API_URL': 'http://localhost:8001',
      'VITE_WS_URL': 'ws://localhost:8001',
      'VITE_RESTAURANT_ID': '1',
      'VITE_STORE_ID': '1',
    };
    return testDefaults[key] || defaultValue;
  }
  
  try {
    // @ts-ignore - import.meta is Vite-specific
    return import.meta?.env?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Export environment values
export const env = {
  isDev,
  isProd,
  isTest,
  apiUrl: getEnv('VITE_API_URL', 'http://localhost:8001'),
  wsUrl: getEnv('VITE_WS_URL', 'ws://localhost:8001'),
  restaurantId: getEnv('VITE_RESTAURANT_ID', '1'),
  storeId: getEnv('VITE_STORE_ID', '1'),
};