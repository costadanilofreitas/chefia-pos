import { useLogging } from '../hooks/useLogging';
import { render, act } from '@testing-library/react';
import { LoggingProvider } from '../LoggingProvider';

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

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  localStorage.clear();
});

// Test component that uses the hook
const TestComponent = ({ initialAction = null }) => {
  const { log, error, warn, info, getLogs, clearLogs } = useLogging();
  
  if (initialAction === 'log') {
    log('Test log message');
  } else if (initialAction === 'error') {
    error('Test error message');
  } else if (initialAction === 'warn') {
    warn('Test warning message');
  } else if (initialAction === 'info') {
    info('Test info message');
  } else if (initialAction === 'clear') {
    clearLogs();
  } else if (initialAction === 'get') {
    const logs = getLogs();
    console.log(`Retrieved ${logs.length} logs`);
  }
  
  return <div>Test Component</div>;
};

describe('useLogging Hook', () => {
  test('should log messages with correct level', () => {
    render(
      <LoggingProvider>
        <TestComponent />
      </LoggingProvider>
    );
    
    const { log, error, warn, info } = useLogging();
    
    act(() => {
      log('Test log message');
      error('Test error message');
      warn('Test warning message');
      info('Test info message');
    });
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test log message'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Test warning message'));
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
  });
  
  test('should store logs in localStorage', () => {
    render(
      <LoggingProvider>
        <TestComponent initialAction="log" />
      </LoggingProvider>
    );
    
    expect(localStorage.setItem).toHaveBeenCalled();
    
    const storedLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
    expect(storedLogs.length).toBeGreaterThan(0);
    expect(storedLogs[0].message).toBe('Test log message');
    expect(storedLogs[0].level).toBe('log');
  });
  
  test('should retrieve logs with getLogs', () => {
    render(
      <LoggingProvider>
        <TestComponent initialAction="log" />
      </LoggingProvider>
    );
    
    const { getLogs } = useLogging();
    
    act(() => {
      const logs = getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toBe('Test log message');
      expect(logs[0].level).toBe('log');
    });
  });
  
  test('should clear logs with clearLogs', () => {
    render(
      <LoggingProvider>
        <TestComponent initialAction="log" />
      </LoggingProvider>
    );
    
    const { clearLogs, getLogs } = useLogging();
    
    act(() => {
      clearLogs();
      const logs = getLogs();
      expect(logs.length).toBe(0);
    });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('app_logs', '[]');
  });
  
  test('should include timestamp and module in log entries', () => {
    render(
      <LoggingProvider>
        <TestComponent />
      </LoggingProvider>
    );
    
    const { log } = useLogging();
    
    act(() => {
      log('Test message', 'TestModule');
    });
    
    const { getLogs } = useLogging();
    const logs = getLogs();
    
    expect(logs[0].timestamp).toBeDefined();
    expect(logs[0].module).toBe('TestModule');
    expect(logs[0].message).toBe('Test message');
  });
  
  test('should limit log storage to maximum size', () => {
    render(
      <LoggingProvider maxLogs={5}>
        <TestComponent />
      </LoggingProvider>
    );
    
    const { log, getLogs } = useLogging();
    
    act(() => {
      // Add more than maxLogs entries
      for (let i = 0; i < 10; i++) {
        log(`Message ${i}`);
      }
    });
    
    const logs = getLogs();
    expect(logs.length).toBe(5);
    expect(logs[0].message).toBe('Message 5');
    expect(logs[4].message).toBe('Message 9');
  });
  
  test('should handle objects and arrays in log messages', () => {
    render(
      <LoggingProvider>
        <TestComponent />
      </LoggingProvider>
    );
    
    const { log } = useLogging();
    const testObject = { name: 'Test', value: 123 };
    const testArray = [1, 2, 3];
    
    act(() => {
      log('Object log', 'TestModule', testObject);
      log('Array log', 'TestModule', testArray);
    });
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Object log'),
      expect.objectContaining({ name: 'Test', value: 123 })
    );
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Array log'),
      expect.arrayContaining([1, 2, 3])
    );
  });
});
