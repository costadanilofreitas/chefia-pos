/**
 * Test utilities and helpers for KDS module tests
 * Provides common test setup, mock data, and helper functions
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { Order, Station, OrderItem } from '../../services/kdsService';

// ============================================================================
// Test Providers
// ============================================================================

/**
 * All providers wrapper for testing
 */
export const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

/**
 * Custom render function with providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create a mock order item
 */
export const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => ({
  item_id: `item-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Item',
  quantity: 1,
  notes: '',
  station: 'Kitchen-1',
  status: 'pending',
  created_at: new Date().toISOString(),
  ...overrides
});

/**
 * Create a mock order
 */
export const createMockOrder = (overrides?: Partial<Order>): Order => {
  const id = overrides?.id || Math.random().toString(36).substr(2, 9);
  return {
    id,
    order_number: `ORD-${id}`,
    status: 'pending',
    priority: 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      createMockOrderItem({ station: 'Kitchen-1' }),
      createMockOrderItem({ station: 'Kitchen-2' })
    ],
    customer_name: 'Test Customer',
    table_number: '1',
    notes: '',
    total_amount: 50.00,
    payment_status: 'pending',
    synced: true,
    ...overrides
  };
};

/**
 * Create a mock station
 */
export const createMockStation = (overrides?: Partial<Station>): Station => ({
  id: `station-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Station',
  active: true,
  ...overrides
});

/**
 * Create multiple mock orders with various statuses
 */
export const createMockOrderSet = (count: number = 5): Order[] => {
  const statuses = ['pending', 'preparing', 'ready'];
  const priorities = ['low', 'normal', 'high'];
  
  return Array.from({ length: count }, (_, index) => 
    createMockOrder({
      id: `order-${index + 1}`,
      status: statuses[index % statuses.length],
      priority: priorities[index % priorities.length],
      table_number: `${index + 1}`,
      customer_name: `Customer ${index + 1}`,
      total_amount: 20 + (index * 10)
    })
  );
};

// ============================================================================
// WebSocket Mock Utilities
// ============================================================================

/**
 * Mock WebSocket class for testing
 */
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send = jest.fn();
  close = jest.fn();

  // Test helpers
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  triggerMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { 
        data: typeof data === 'string' ? data : JSON.stringify(data) 
      }));
    }
  }

  triggerError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

/**
 * Setup WebSocket mock for tests
 */
export const setupWebSocketMock = (): MockWebSocket => {
  const mockWs = new MockWebSocket('ws://test');
  (global as any).WebSocket = jest.fn(() => mockWs);
  Object.assign((global as any).WebSocket, {
    CONNECTING: MockWebSocket.CONNECTING,
    OPEN: MockWebSocket.OPEN,
    CLOSING: MockWebSocket.CLOSING,
    CLOSED: MockWebSocket.CLOSED
  });
  return mockWs;
};

// ============================================================================
// Storage Mock Utilities
// ============================================================================

/**
 * Setup localStorage mock with initial data
 */
export const setupLocalStorageMock = (initialData: Record<string, string> = {}) => {
  const store: Record<string, string> = { ...initialData };
  
  const localStorageMock = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  return localStorageMock;
};

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Wait for async operations with timeout
 */
export const waitForAsync = (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Advance timers and flush promises
 */
export const advanceTimersAndFlush = async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await waitForAsync(0);
};

// ============================================================================
// Event Utilities
// ============================================================================

/**
 * Simulate keyboard event
 */
export const simulateKeyPress = (key: string, options: Partial<KeyboardEventInit> = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  window.dispatchEvent(event);
  return event;
};

/**
 * Simulate network status change
 */
export const simulateNetworkChange = (online: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: online
  });
  
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
};

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert order statistics match expected values
 */
export const assertOrderStats = (
  stats: { total: number; pending: number; preparing: number; ready: number },
  expected: { total: number; pending: number; preparing: number; ready: number }
) => {
  expect(stats.total).toBe(expected.total);
  expect(stats.pending).toBe(expected.pending);
  expect(stats.preparing).toBe(expected.preparing);
  expect(stats.ready).toBe(expected.ready);
};

/**
 * Assert WebSocket message was sent with expected data
 */
export const assertWebSocketMessage = (
  mockSend: jest.Mock,
  expectedType: string,
  expectedData?: any
) => {
  expect(mockSend).toHaveBeenCalled();
  const lastCall = mockSend.mock.calls[mockSend.mock.calls.length - 1];
  const message = JSON.parse(lastCall[0]);
  
  expect(message.type).toBe(expectedType);
  if (expectedData) {
    expect(message.data).toMatchObject(expectedData);
  }
};

// ============================================================================
// Mock API Responses
// ============================================================================

/**
 * Setup mock API responses
 */
export const setupMockApiResponses = (apiService: any) => {
  const mockResponses = {
    '/kds/orders': { data: createMockOrderSet(5) },
    '/kds/stations': { 
      data: [
        createMockStation({ id: 'Kitchen-1', name: 'Kitchen 1' }),
        createMockStation({ id: 'Kitchen-2', name: 'Kitchen 2' }),
        createMockStation({ id: 'Bar', name: 'Bar' })
      ]
    },
    '/logs': { success: true }
  };

  apiService.get.mockImplementation((endpoint: string) => {
    const response = mockResponses[endpoint as keyof typeof mockResponses];
    return response ? Promise.resolve(response) : Promise.reject(new Error('Not found'));
  });

  apiService.post.mockImplementation((endpoint: string, data: any) => {
    if (endpoint === '/logs') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve({ data });
  });

  apiService.put.mockImplementation((endpoint: string, data: any) => {
    return Promise.resolve({ data });
  });

  apiService.patch.mockImplementation((endpoint: string, data: any) => {
    return Promise.resolve({ data });
  });

  return mockResponses;
};

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Measure render time of a component
 */
export const measureRenderTime = async (
  renderFn: () => void
): Promise<number> => {
  const start = performance.now();
  renderFn();
  await waitForAsync(0);
  const end = performance.now();
  return end - start;
};

/**
 * Assert component renders within performance budget
 */
export const assertRenderPerformance = async (
  renderFn: () => void,
  maxMs: number = 100
) => {
  const renderTime = await measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxMs);
};

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Clean up all mocks and timers
 */
export const cleanupTests = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
};

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Debug helper to log component tree
 */
export const debugComponentTree = (container: HTMLElement) => {
  const tree = container.innerHTML
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return tree;
};

/**
 * Wait for element to appear with custom timeout
 */
export const waitForElement = async (
  selector: string,
  container: HTMLElement = document.body,
  timeout: number = 3000
): Promise<Element | null> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = container.querySelector(selector);
    if (element) return element;
    await waitForAsync(100);
  }
  
  return null;
};

// Export all utilities
export default {
  // Rendering
  renderWithProviders,
  AllTheProviders,
  
  // Mock data
  createMockOrder,
  createMockOrderItem,
  createMockStation,
  createMockOrderSet,
  
  // WebSocket
  MockWebSocket,
  setupWebSocketMock,
  
  // Storage
  setupLocalStorageMock,
  
  // Timers
  waitForAsync,
  advanceTimersAndFlush,
  
  // Events
  simulateKeyPress,
  simulateNetworkChange,
  
  // Assertions
  assertOrderStats,
  assertWebSocketMessage,
  
  // API
  setupMockApiResponses,
  
  // Performance
  measureRenderTime,
  assertRenderPerformance,
  
  // Cleanup
  cleanupTests,
  
  // Debug
  debugComponentTree,
  waitForElement
};