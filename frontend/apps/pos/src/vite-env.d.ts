/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG: string
  readonly VITE_ENABLE_DEBUG_TOOLBAR: string
  readonly VITE_ENABLE_HOT_RELOAD: string
  readonly VITE_ENABLE_MOCK_DATA: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_JWT_EXPIRATION_HOURS: string
  readonly VITE_REFRESH_TOKEN_EXPIRATION_DAYS: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_PAYMENT_GATEWAY_ENV: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_CONSOLE_LOGS: string
  readonly VITE_ENABLE_PWA: string
  readonly VITE_ENABLE_SERVICE_WORKER: string
  readonly VITE_ENABLE_COMPRESSION: string
  readonly VITE_TEST_TIMEOUT: string
  readonly VITE_MOCK_API_DELAY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}