// Import testing-library
import '@testing-library/jest-dom';

// Define test environment global
global.__TEST__ = true;

// Mock import.meta
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        DEV: true,
        PROD: false,
        VITE_API_URL: 'http://localhost:8001',
        VITE_WS_URL: 'ws://localhost:8001',
      }
    }
  },
  writable: true,
  configurable: true
});

// Mock global objects
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
};

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock IndexedDB
const mockObjectStore = {
  add: jest.fn(() => ({ onsuccess: null, onerror: null })),
  put: jest.fn(() => ({ onsuccess: null, onerror: null })),
  get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
  getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
  delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
  clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
  count: jest.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
  index: jest.fn(() => ({
    getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
    count: jest.fn(() => ({ onsuccess: null, onerror: null, result: 0 }))
  })),
  createIndex: jest.fn()
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore),
  oncomplete: null,
  onerror: null,
  onabort: null
};

const mockDB = {
  objectStoreNames: {
    contains: jest.fn(() => false)
  },
  createObjectStore: jest.fn(() => mockObjectStore),
  transaction: jest.fn(() => mockTransaction),
  close: jest.fn(),
  version: 1
};

const mockIndexedDB = {
  open: jest.fn(() => ({
    result: mockDB,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  })),
  deleteDatabase: jest.fn(() => ({
    onsuccess: null,
    onerror: null
  }))
};

// Set up IndexedDB globals
global.indexedDB = mockIndexedDB;
global.IDBDatabase = jest.fn();
global.IDBTransaction = jest.fn();
global.IDBObjectStore = jest.fn();
global.IDBRequest = jest.fn();
global.IDBOpenDBRequest = jest.fn();
global.IDBKeyRange = {
  bound: jest.fn(),
  lowerBound: jest.fn(),
  upperBound: jest.fn(),
  only: jest.fn()
};

// Note: Timer mocks are handled by jest.useFakeTimers() in tests when needed