/**
 * Environment variables utility
 * Provides a safe way to access environment variables with defaults
 */

declare global {
  interface Window {
    env?: Record<string, string>;
  }
}

// Safe access to import.meta.env with fallbacks
const getEnv = () => {
  // For Vite environment - check if we're in a browser with import.meta
  try {
    // Direct access to import.meta.env for Vite
    const metaEnv = import.meta?.env;
    if (metaEnv) {
      return metaEnv;
    }
  } catch {
    // import.meta not available
  }
  
  // For test environment
  if (typeof process !== 'undefined' && process.env) {
    return {
      VITE_API_URL: process.env['VITE_API_URL'],
      VITE_WS_URL: process.env['VITE_WS_URL'],
      VITE_APP_NAME: process.env['VITE_APP_NAME'],
      VITE_ENV: process.env['VITE_ENV'],
      MODE: process.env['NODE_ENV'] || 'development',
      DEV: process.env['NODE_ENV'] === 'development',
      PROD: process.env['NODE_ENV'] === 'production',
      SSR: false
    };
  }
  
  // Fallback for other environments
  return {
    MODE: 'development',
    DEV: true,
    PROD: false,
    SSR: false,
    VITE_API_URL: undefined,
    VITE_WS_URL: undefined,
    VITE_APP_NAME: undefined,
    VITE_ENV: undefined
  };
};

const env = getEnv();

// Export environment configuration
export const ENV = {
  API_URL: env.VITE_API_URL || 'http://localhost:8001/api/v1',
  WS_URL: env.VITE_WS_URL || 'ws://localhost:8001/ws',
  APP_NAME: env.VITE_APP_NAME || 'Kiosk',
  ENV: env.VITE_ENV || 'development',
  IS_DEV: env.DEV,
  IS_PROD: env.PROD,
  IS_TEST: env.MODE === 'test' || env.VITE_ENV === 'test'
};

export default ENV;