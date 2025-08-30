// Mock for offlineStorage service
export const offlineStorage = {
  log: jest.fn(),
  clearLogs: jest.fn(),
  getLogs: jest.fn(() => []),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  saveData: jest.fn(),
  getData: jest.fn(),
  removeData: jest.fn(),
  clearData: jest.fn(),
  hasData: jest.fn(() => false),
  getAllKeys: jest.fn(() => []),
  // Sync methods
  syncLogs: jest.fn(() => Promise.resolve()),
  // Download logs
  downloadLogs: jest.fn(),
  // Config
  setConfig: jest.fn(),
  getConfig: jest.fn(() => ({
    maxLogs: 1000,
    logLevel: 'info',
    persistLogs: true,
    syncInterval: 30000
  }))
};