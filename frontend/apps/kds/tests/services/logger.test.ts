import { LoggerService } from '../../src/services/logger';
import { websocketService } from '../../src/services/websocket';
import { ApiService } from '../../src/services/api';
import { MockWebSocket, setupMockWebSocket } from '../utils/testUtils';

// Mock the websocket service
jest.mock('../../src/services/websocket', () => ({
  websocketService: {
    isConnected: jest.fn(),
    send: jest.fn(),
    on: jest.fn()
  }
}));

// Mock the API service
jest.mock('../../src/services/api', () => ({
  ApiService: {
    post: jest.fn()
  }
}));

describe('Logger Service', () => {
  let logger: LoggerService;
  let mockLocalStorage: { [key: string]: string } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        })
      },
      writable: true
    });

    // Mock import.meta.env
    Object.defineProperty(import.meta, 'env', {
      value: { PROD: false },
      writable: true
    });

    // Get fresh instance for each test
    jest.isolateModules(() => {
      const { LoggerService } = require('../../src/services/logger');
      logger = LoggerService.getInstance();
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = LoggerService.getInstance();
      const instance2 = LoggerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should generate unique session ID', () => {
      const sessionIdPattern = /^kds-\d+-[a-z0-9]{9}$/;
      const logger1 = LoggerService.getInstance();
      
      // Access private sessionId through log entry
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      logger1.info('Test', 'TestModule');
      
      const logCall = (ApiService.post as jest.Mock).mock.calls[0];
      expect(logCall[1].session_id).toMatch(sessionIdPattern);
    });

    it('should create or retrieve device ID from localStorage', () => {
      // First instance - create device ID
      const logger1 = LoggerService.getInstance();
      logger1.info('Test', 'TestModule');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'kds-device-id',
        expect.stringMatching(/^device-\d+-[a-z0-9]{9}$/)
      );
      
      // Second instance - retrieve existing device ID
      mockLocalStorage['kds-device-id'] = 'existing-device-id';
      jest.isolateModules(() => {
        const { LoggerService } = require('../../src/services/logger');
        const logger2 = LoggerService.getInstance();
        
        expect(localStorage.getItem).toHaveBeenCalledWith('kds-device-id');
      });
    });

    it('should setup WebSocket connection listener', () => {
      LoggerService.getInstance();
      
      expect(websocketService.on).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    it('should setup periodic queue processing', () => {
      LoggerService.getInstance();
      
      // Advance timers to trigger interval
      jest.advanceTimersByTime(5000);
      
      // Verify interval is working (would process queue if there were items)
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('Log Entry Creation', () => {
    it('should create properly formatted log entry', async () => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      await logger.info('Test message', 'TestModule', { extra: 'data' });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        level: 'info',
        source: 'kds',
        module: 'TestModule',
        message: 'Test message',
        details: expect.objectContaining({
          extra: 'data',
          deviceId: expect.any(String)
        }),
        session_id: expect.any(String),
        tags: []
      }));
    });

    it('should include user ID when available', async () => {
      mockLocalStorage['userId'] = 'user-123';
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      await logger.info('Test message', 'TestModule');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        user_id: 'user-123'
      }));
    });

    it('should not include user ID when not available', async () => {
      delete mockLocalStorage['userId'];
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      await logger.info('Test message', 'TestModule');
      
      const logCall = (ApiService.post as jest.Mock).mock.calls[0];
      expect(logCall[1].user_id).toBeUndefined();
    });

    it('should merge details with device ID', async () => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      await logger.info('Test', 'Module', { custom: 'value' });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        details: expect.objectContaining({
          custom: 'value',
          deviceId: expect.any(String)
        })
      }));
    });
  });

  describe('Log Levels', () => {
    beforeEach(() => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
    });

    it('should handle debug logs in development', () => {
      (import.meta as any).env.PROD = false;
      
      logger.debug('Debug message', 'DebugModule', { debug: true });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'debug',
        message: 'Debug message'
      }));
    });

    it('should skip debug logs in production', () => {
      (import.meta as any).env.PROD = true;
      
      logger.debug('Debug message', 'DebugModule');
      
      expect(ApiService.post).not.toHaveBeenCalled();
    });

    it('should handle info logs', () => {
      logger.info('Info message', 'InfoModule');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'info',
        message: 'Info message',
        module: 'InfoModule'
      }));
    });

    it('should handle warning logs', () => {
      logger.warn('Warning message', 'WarnModule');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'warning',
        message: 'Warning message'
      }));
    });

    it('should handle error logs with Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      logger.error('Error occurred', error, 'ErrorModule');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'error',
        message: 'Error occurred',
        module: 'ErrorModule',
        details: expect.objectContaining({
          error: {
            message: 'Test error',
            stack: 'Error stack trace',
            name: 'Error'
          }
        })
      }));
    });

    it('should handle error logs with module as second parameter', () => {
      logger.error('Error message', 'ErrorModule');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'error',
        message: 'Error message',
        module: 'ErrorModule'
      }));
    });

    it('should handle error logs with non-Error object', () => {
      const errorData = { code: 'ERR_001', details: 'Something went wrong' };
      
      logger.error('Error occurred', errorData, 'ErrorModule');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        details: expect.objectContaining({
          error: errorData
        })
      }));
    });

    it('should handle critical logs', async () => {
      const error = new Error('Critical error');
      
      logger.critical('Critical failure', error, 'CriticalModule');
      
      // Wait for async critical log handling
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'critical',
        message: 'Critical failure',
        module: 'CriticalModule'
      }));
    });

    it('should fallback to localStorage for critical logs when sending fails', async () => {
      (ApiService.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (websocketService.send as jest.Mock).mockReturnValue(false);
      
      logger.critical('Critical error', 'CriticalModule');
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'kds-critical-logs',
        expect.stringContaining('Critical error')
      );
    });
  });

  describe('Log Sending', () => {
    it('should prefer WebSocket when connected', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(true);
      (websocketService.send as jest.Mock).mockReturnValue(true);
      
      logger.info('Test message', 'Module');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(websocketService.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'log',
        data: expect.objectContaining({
          message: 'Test message'
        })
      }));
      expect(ApiService.post).not.toHaveBeenCalled();
    });

    it('should fallback to HTTP when WebSocket is not connected', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      logger.info('Test message', 'Module');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.any(Object));
      expect(websocketService.send).not.toHaveBeenCalled();
    });

    it('should queue logs when both WebSocket and HTTP fail', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(true);
      (websocketService.send as jest.Mock).mockReturnValue(false);
      
      logger.info('Test message', 'Module');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Log should be queued (internal state, hard to test directly)
      // We can verify by triggering queue processing
      (websocketService.isConnected as jest.Mock).mockReturnValue(true);
      (websocketService.send as jest.Mock).mockReturnValue(true);
      
      // Trigger queue processing
      const connectedCallback = (websocketService.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connected'
      )[1];
      await connectedCallback();
      
      // Should attempt to send queued message
      expect(websocketService.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'log'
      }));
    });
  });

  describe('Queue Processing', () => {
    it('should process queue when WebSocket connects', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockRejectedValue(new Error('Offline'));
      
      // Queue some logs
      logger.info('Message 1', 'Module');
      logger.info('Message 2', 'Module');
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Simulate WebSocket connection
      (websocketService.isConnected as jest.Mock).mockReturnValue(true);
      (websocketService.send as jest.Mock).mockReturnValue(true);
      
      const connectedCallback = (websocketService.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connected'
      )[1];
      await connectedCallback();
      
      // Should send queued messages
      expect(websocketService.send).toHaveBeenCalled();
    });

    it('should process queue periodically', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockRejectedValue(new Error('Offline'));
      
      // Queue a log
      logger.info('Queued message', 'Module');
      
      // Setup successful sending
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      // Advance timers to trigger periodic processing
      jest.advanceTimersByTime(5000);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should attempt to send queued message
      expect(ApiService.post).toHaveBeenCalled();
    });

    it('should re-queue failed messages', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockRejectedValue(new Error('Still offline'));
      
      // Queue a log
      logger.info('Message', 'Module');
      
      // Try to process queue
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Setup successful sending
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      // Try again
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should eventually send the message
      const successfulCalls = (ApiService.post as jest.Mock).mock.calls.filter(
        call => call[1].message === 'Message'
      );
      expect(successfulCalls.length).toBeGreaterThan(0);
    });

    it('should not process empty queue', async () => {
      (ApiService.post as jest.Mock).mockClear();
      
      // Trigger periodic processing with empty queue
      jest.advanceTimersByTime(5000);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(ApiService.post).not.toHaveBeenCalled();
    });
  });

  describe('Structured Logging Methods', () => {
    beforeEach(() => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
    });

    it('should log order events', () => {
      logger.logOrderEvent('received', '123', { station: 'kitchen' });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        message: 'Order received',
        module: 'OrderManagement',
        details: expect.objectContaining({
          orderId: '123',
          event: 'received',
          station: 'kitchen'
        })
      }));
    });

    it('should handle numeric order IDs', () => {
      logger.logOrderEvent('started', 456, { time: '10:30' });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        details: expect.objectContaining({
          orderId: '456'
        })
      }));
    });

    it('should log station events', () => {
      logger.logStationEvent('opened', 'kitchen', { capacity: 10 });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        message: 'Station opened',
        module: 'StationManagement',
        details: expect.objectContaining({
          station: 'kitchen',
          event: 'opened',
          capacity: 10
        })
      }));
    });

    it('should log performance metrics with warning for slow operations', () => {
      logger.logPerformance('Database query', 4000, { query: 'SELECT * FROM orders' });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'warning',
        message: 'Performance: Database query',
        module: 'Performance',
        details: expect.objectContaining({
          operation: 'Database query',
          duration: 4000,
          query: 'SELECT * FROM orders'
        })
      }));
    });

    it('should log performance metrics with info for normal operations', () => {
      logger.logPerformance('API call', 500, { endpoint: '/api/orders' });
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'info',
        message: 'Performance: API call',
        details: expect.objectContaining({
          duration: 500
        })
      }));
    });

    it('should log metrics with tags', () => {
      logger.logMetric('order_processing_time', 1500, 'ms', ['kitchen', 'lunch']);
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        message: 'Metric recorded',
        module: 'Metrics',
        details: expect.objectContaining({
          metric: 'order_processing_time',
          value: 1500,
          unit: 'ms',
          timestamp: expect.any(Number)
        }),
        tags: ['kitchen', 'lunch']
      }));
    });

    it('should log metrics without unit or tags', () => {
      logger.logMetric('active_orders', 15);
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        details: expect.objectContaining({
          metric: 'active_orders',
          value: 15,
          unit: undefined
        }),
        tags: []
      }));
    });
  });

  describe('Critical Log Handling', () => {
    it('should try harder to send critical logs', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(true);
      (websocketService.send as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      logger.critical('System failure');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should try HTTP as backup
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        level: 'critical',
        message: 'System failure'
      }));
    });

    it('should save critical logs to localStorage as last resort', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (websocketService.send as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      logger.critical('Database corruption', 'DatabaseModule');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const savedLogs = localStorage.setItem.mock.calls.find(
        call => call[0] === 'kds-critical-logs'
      );
      
      expect(savedLogs).toBeDefined();
      const logs = JSON.parse(savedLogs[1]);
      expect(logs[0]).toMatchObject({
        level: 'critical',
        message: 'Database corruption'
      });
    });

    it('should limit critical logs in localStorage to last 10', async () => {
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);
      (websocketService.send as jest.Mock).mockReturnValue(false);
      (ApiService.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      // Create existing critical logs
      const existingLogs = Array.from({ length: 12 }, (_, i) => ({
        level: 'critical',
        message: `Old critical log ${i}`
      }));
      mockLocalStorage['kds-critical-logs'] = JSON.stringify(existingLogs);
      
      logger.critical('New critical error');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const savedLogs = localStorage.setItem.mock.calls.find(
        call => call[0] === 'kds-critical-logs'
      );
      
      const logs = JSON.parse(savedLogs[1]);
      expect(logs).toHaveLength(10);
      expect(logs[logs.length - 1].message).toBe('New critical error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined details gracefully', () => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      logger.info('Message', 'Module', undefined);
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        details: expect.objectContaining({
          deviceId: expect.any(String)
        })
      }));
    });

    it('should handle circular references in details', () => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      // Should not throw
      expect(() => {
        logger.info('Message', 'Module', circular);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage, 'Module');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        message: longMessage
      }));
    });

    it('should handle special characters in messages', () => {
      (ApiService.post as jest.Mock).mockResolvedValue({});
      
      const specialMessage = 'Test "quotes" and \'apostrophes\' and \n newlines';
      logger.info(specialMessage, 'Module');
      
      expect(ApiService.post).toHaveBeenCalledWith('/logs', expect.objectContaining({
        message: specialMessage
      }));
    });
  });
});