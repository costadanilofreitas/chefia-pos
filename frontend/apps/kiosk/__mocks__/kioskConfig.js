// Mock for kiosk config
export const kioskConfig = {
  terminal: {
    id: 'kiosk-001',
    name: 'Kiosk Terminal 1'
  },
  features: {
    enableFullscreen: true,
    enableHapticFeedback: false,
    enableSoundFeedback: false,
    enableIdleTimeout: true,
    idleTimeoutSeconds: 120,
    enablePaymentAnimation: true,
    enableWelcomeScreen: true
  },
  ui: {
    theme: 'light',
    accentColor: '#10b981',
    fontSize: 'medium',
    language: 'pt-BR',
    showPrices: true,
    showDescriptions: true,
    showImages: true,
    maxItemsPerPage: 12
  },
  payment: {
    enabledMethods: ['credit', 'debit', 'pix', 'cash'],
    defaultMethod: 'credit',
    showInstallments: true,
    maxInstallments: 12,
    minInstallmentValue: 50,
    enableTips: false,
    tipOptions: [5, 10, 15]
  },
  printer: {
    enabled: true,
    printerName: 'default',
    paperWidth: 80,
    printCustomerCopy: true,
    printKitchenCopy: true
  },
  api: {
    baseUrl: 'http://localhost:8001',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  debug: {
    enabled: false,
    showDevTools: false,
    logLevel: 'info',
    mockPayments: false,
    bypassAuth: false
  }
};