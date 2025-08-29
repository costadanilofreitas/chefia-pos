/**
 * Environment utility to handle import.meta.env safely
 * This utility provides a centralized way to access environment variables
 * that works both in the browser (Vite) and in tests (Jest)
 */

interface EnvConfig {
  PROD: boolean;
  DEV: boolean;
  VITE_API_URL: string;
  VITE_WS_URL: string;
}

/**
 * Get environment configuration
 * This function safely handles both Vite's import.meta.env and test environments
 */
export function getEnv(): EnvConfig {
  // In test environment, use defaults
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return {
      PROD: false,
      DEV: true,
      VITE_API_URL: 'http://localhost:8001',
      VITE_WS_URL: 'ws://localhost:8001'
    };
  }

  // Use dynamic evaluation to avoid syntax errors in Jest
  let viteEnv: any = null;
  try {
    // @ts-ignore - import.meta is available in Vite
    viteEnv = (0, eval)('import.meta.env');
  } catch {
    // import.meta not available in this environment
  }

  if (viteEnv) {
    return {
      PROD: viteEnv.PROD || false,
      DEV: viteEnv.DEV || true,
      VITE_API_URL: viteEnv.VITE_API_URL || 'http://localhost:8001',
      VITE_WS_URL: viteEnv.VITE_WS_URL || 'ws://localhost:8001'
    };
  }

  // Fallback for other environments
  return {
    PROD: false,
    DEV: true,
    VITE_API_URL: 'http://localhost:8001',
    VITE_WS_URL: 'ws://localhost:8001'
  };
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnv().PROD;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return getEnv().DEV;
}

/**
 * Get the API base URL
 */
export function getApiUrl(): string {
  return getEnv().VITE_API_URL;
}

/**
 * Get the WebSocket URL
 */
export function getWsUrl(): string {
  return getEnv().VITE_WS_URL;
}