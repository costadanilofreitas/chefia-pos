/**
 * Comprehensive tests for LoggerService
 * Tests all logging methods, queue management, WebSocket/HTTP fallback
 */

// Mock import.meta globally before importing modules
(global as any).import = {
  meta: {
    env: {
      PROD: false,
      DEV: true,
      VITE_API_URL: 'http://localhost:8001',
      VITE_WS_URL: 'ws://localhost:8001'
    }
  }
};

// Mock dependencies first
jest.mock('../../config/api', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8001',
    WS_URL: 'ws://localhost:8001',
    ENDPOINTS: {
      ORDERS: '/api/v1/orders',
      KDS: '/api/v1/kds'
    }
  }
}));

jest.mock('../../services/websocket');
jest.mock('../../services/api');

// Now import after mocks are set up
import { logger, LoggerService, LogLevel, LogSource } from '../../services/logger';
import { websocketService } from '../../services/websocket';
import { ApiService } from '../../services/api';

describe('LoggerService', () => {
  let loggerInstance: LoggerService;
  const mockWebSocketService = websocketService as jest.Mocked<typeof websocketService>;
  const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset localStorage
    localStorage.clear();
    
    // Get fresh instance
    loggerInstance = LoggerService.getInstance();
    
    // Mock WebSocket default state
    mockWebSocketService.isConnected.mockReturnValue(false);
    mockWebSocketService.send.mockReturnValue(false);
    mockWebSocketService.on = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should always return the same instance', () => {
      const instance1 = LoggerService.getInstance();
      const instance2 = LoggerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Session and Device ID Management', () => {
    it('should generate a unique session ID on instantiation', () => {
      const sessionId = (loggerInstance as any).sessionId;
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^kds-\d+-[a-z0-9]+$/);
    });

    it('should create and persist device ID in localStorage', () => {
      const deviceId = (loggerInstance as any).deviceId;
      expect(deviceId).toBeDefined();
      expect(localStorage.getItem('kds-device-id')).toBe(deviceId);
    });

    it('should reuse existing device ID from localStorage', () => {
      const existingDeviceId = 'device-existing-123';
      localStorage.setItem('kds-device-id', existingDeviceId);
      
      // Create new instance (need to clear singleton for this test)
      jest.resetModules();
      const newLogger = require('../../services/logger').LoggerService.getInstance();
      
      expect((newLogger as any).deviceId).toBe(existingDeviceId);
    });
  });

  describe('Log Entry Creation', () => {
    it('should create log entry with all required fields', () => {
      const createLogEntry = (loggerInstance as any).createLogEntry.bind(loggerInstance);
      const entry = createLogEntry('info', 'Test message', 'TestModule', { key: 'value' }, ['tag1']);

      expect(entry).toMatchObject({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        level: 'info',
        source: 'kds',
        module: 'TestModule',
        message: 'Test message',
        session_id: expect.stringMatching(/^kds-/),
        tags: ['tag1'],
        details: expect.objectContaining({
          key: 'value',
          deviceId: expect.any(String)
        })
      });
    });

    it('should include user_id when available in localStorage', () => {
      localStorage.setItem('userId', 'user123');
      
      const createLogEntry = (loggerInstance as any).createLogEntry.bind(loggerInstance);
      const entry = createLogEntry('info', 'Test', 'Module');
      
      expect(entry.user_id).toBe('user123');
    });

    it('should not include user_id when not available', () => {
      localStorage.removeItem('userId');
      
      const createLogEntry = (loggerInstance as any).createLogEntry.bind(loggerInstance);
      const entry = createLogEntry('info', 'Test', 'Module');
      
      expect(entry.user_id).toBeUndefined();
    });
  });

  describe('Logging Methods', () => {
    beforeEach(() => {
      mockWebSocketService.isConnected.mockReturnValue(true);
      mockWebSocketService.send.mockReturnValue(true);
    });

    describe('debug()', () => {
      it('should not send debug logs in production', () => {
        // Mock production environment
        const originalMeta = (global as any).import;
        (global as any).import = {
          meta: {
            env: {
              PROD: true
            }
          }
        };

        loggerInstance.debug('Debug message', 'Module');
        expect(mockWebSocketService.send).not.toHaveBeenCalled();

        // Restore
        (global as any).import = originalMeta;
      });

      it('should send debug logs in development', () => {
        // Mock development environment
        const originalMeta = (global as any).import;
        (global as any).import = {
          meta: {
            env: {
              PROD: false
            }
          }
        };

        loggerInstance.debug('Debug message', 'Module', { data: 'test' });
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'log',
            data: expect.objectContaining({
              level: 'debug',
              message: 'Debug message',
              module: 'Module'
            })
          })
        );
        
        // Restore
        (global as any).import = originalMeta;
      });
    });

    describe('info()', () => {
      it('should send info logs', () => {
        loggerInstance.info('Info message', 'TestModule', { extra: 'data' });
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'log',
            data: expect.objectContaining({
              level: 'info',
              message: 'Info message',
              module: 'TestModule'
            })
          })
        );
      });
    });

    describe('warn()', () => {
      it('should send warning logs', () => {
        loggerInstance.warn('Warning message', 'WarnModule');
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'log',
            data: expect.objectContaining({
              level: 'warning',
              message: 'Warning message',
              module: 'WarnModule'
            })
          })
        );
      });
    });

    describe('error()', () => {
      it('should handle Error objects', () => {
        const error = new Error('Test error');
        error.stack = 'Error stack trace';
        
        loggerInstance.error('Error occurred', error, 'ErrorModule');
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'log',
            data: expect.objectContaining({
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
            })
          })
        );
      });

      it('should handle module as second parameter', () => {
        loggerInstance.error('Error message', 'ModuleName');
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              module: 'ModuleName'
            })
          })
        );
      });

      it('should handle non-Error objects', () => {
        const customError = { code: 'ERR001', details: 'Custom error' };
        
        loggerInstance.error('Custom error', customError, 'Module');
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              details: expect.objectContaining({
                error: customError
              })
            })
          })
        );
      });
    });

    describe('critical()', () => {
      it('should send critical logs immediately', async () => {
        mockApiService.post = jest.fn().mockResolvedValue({});
        
        loggerInstance.critical('Critical error!', new Error('System failure'));
        
        // Should attempt WebSocket first
        expect(mockWebSocketService.send).toHaveBeenCalled();
        
        // Should not call API if WebSocket succeeds
        await Promise.resolve();
        expect(mockApiService.post).not.toHaveBeenCalled();
      });

      it('should fallback to HTTP API when WebSocket fails', async () => {
        mockWebSocketService.send.mockReturnValue(false);
        mockApiService.post = jest.fn().mockResolvedValue({});
        
        loggerInstance.critical('Critical error!', new Error('System failure'));
        
        await Promise.resolve();
        jest.runAllTimers();
        
        expect(mockApiService.post).toHaveBeenCalledWith(
          '/logs',
          expect.objectContaining({
            level: 'critical',
            message: 'Critical error!'
          })
        );
      });

      it('should save to localStorage when both WebSocket and API fail', async () => {
        mockWebSocketService.send.mockReturnValue(false);
        mockApiService.post = jest.fn().mockRejectedValue(new Error('API Error'));
        
        loggerInstance.critical('Critical error!', new Error('System failure'));
        
        await Promise.resolve();
        jest.runAllTimers();
        
        const criticalLogs = JSON.parse(localStorage.getItem('kds-critical-logs') || '[]');
        expect(criticalLogs).toHaveLength(1);
        expect(criticalLogs[0]).toMatchObject({
          level: 'critical',
          message: 'Critical error!'
        });
      });

      it('should keep only last 10 critical logs in localStorage', async () => {
        mockWebSocketService.send.mockReturnValue(false);
        mockApiService.post = jest.fn().mockRejectedValue(new Error('API Error'));
        
        // Add 15 critical logs
        for (let i = 0; i < 15; i++) {
          loggerInstance.critical(`Critical error ${i}`);
          await Promise.resolve();
          jest.runAllTimers();
        }
        
        const criticalLogs = JSON.parse(localStorage.getItem('kds-critical-logs') || '[]');
        expect(criticalLogs).toHaveLength(10);
        expect(criticalLogs[0].message).toContain('Critical error 5');
        expect(criticalLogs[9].message).toContain('Critical error 14');
      });
    });
  });

  describe('WebSocket/HTTP Fallback', () => {
    it('should use WebSocket when connected', async () => {
      mockWebSocketService.isConnected.mockReturnValue(true);
      mockWebSocketService.send.mockReturnValue(true);
      
      loggerInstance.info('Test message');
      
      expect(mockWebSocketService.send).toHaveBeenCalled();
      expect(mockApiService.post).not.toHaveBeenCalled();
    });

    it('should fallback to HTTP when WebSocket is disconnected', async () => {
      mockWebSocketService.isConnected.mockReturnValue(false);
      mockApiService.post = jest.fn().mockResolvedValue({});
      
      loggerInstance.info('Test message');
      
      await Promise.resolve();
      
      expect(mockWebSocketService.send).not.toHaveBeenCalled();
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/logs',
        expect.objectContaining({
          level: 'info',
          message: 'Test message'
        })
      );
    });

    it('should queue logs when both WebSocket and HTTP fail', async () => {
      mockWebSocketService.isConnected.mockReturnValue(false);
      mockApiService.post = jest.fn().mockRejectedValue(new Error('API Error'));
      
      loggerInstance.info('Test message');
      
      await Promise.resolve();
      
      expect((loggerInstance as any).logQueue).toHaveLength(1);
      expect((loggerInstance as any).logQueue[0]).toMatchObject({
        level: 'info',
        message: 'Test message'
      });
    });
  });

  describe('Queue Management', () => {
    beforeEach(() => {
      mockWebSocketService.isConnected.mockReturnValue(false);
      mockApiService.post = jest.fn().mockRejectedValue(new Error('API Error'));
    });

    it('should process queue when connection is restored', async () => {
      // Add logs to queue
      loggerInstance.info('Message 1');
      loggerInstance.info('Message 2');
      
      await Promise.resolve();
      expect((loggerInstance as any).logQueue).toHaveLength(2);
      
      // Simulate connection restored
      mockWebSocketService.isConnected.mockReturnValue(true);
      mockWebSocketService.send.mockReturnValue(true);
      
      // Trigger queue processing
      await (loggerInstance as any).processQueue();
      
      expect((loggerInstance as any).logQueue).toHaveLength(0);
      expect(mockWebSocketService.send).toHaveBeenCalledTimes(2);
    });

    it('should process queue periodically', () => {
      // Add logs to queue
      loggerInstance.info('Message 1');
      
      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);
      
      // processQueue should have been called
      expect((loggerInstance as any).isProcessingQueue).toBeDefined();
    });

    it('should not process empty queue', async () => {
      const processSpy = jest.spyOn(loggerInstance as any, 'sendLog');
      
      await (loggerInstance as any).processQueue();
      
      expect(processSpy).not.toHaveBeenCalled();
    });

    it('should handle partial queue processing failure', async () => {
      // Add logs to queue
      loggerInstance.info('Message 1');
      loggerInstance.info('Message 2');
      
      await Promise.resolve();
      
      // Make first send succeed, second fail
      mockWebSocketService.isConnected.mockReturnValue(true);
      mockWebSocketService.send
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      
      await (loggerInstance as any).processQueue();
      
      // Only failed message should remain in queue
      expect((loggerInstance as any).logQueue).toHaveLength(1);
      expect((loggerInstance as any).logQueue[0].message).toBe('Message 2');
    });
  });

  describe('Structured Logging', () => {
    beforeEach(() => {
      mockWebSocketService.isConnected.mockReturnValue(true);
      mockWebSocketService.send.mockReturnValue(true);
    });

    describe('logOrderEvent()', () => {
      it('should log order events with proper structure', () => {
        loggerInstance.logOrderEvent('received', '12345', { customer: 'John' });
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              message: 'Order received',
              module: 'OrderManagement',
              details: expect.objectContaining({
                orderId: '12345',
                event: 'received',
                customer: 'John'
              })
            })
          })
        );
      });

      it('should handle numeric order IDs', () => {
        loggerInstance.logOrderEvent('completed', 99);
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              details: expect.objectContaining({
                orderId: '99'
              })
            })
          })
        );
      });
    });

    describe('logStationEvent()', () => {
      it('should log station events with proper structure', () => {
        loggerInstance.logStationEvent('opened', 'Kitchen-1', { staff: 'Alice' });
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              message: 'Station opened',
              module: 'StationManagement',
              details: expect.objectContaining({
                station: 'Kitchen-1',
                event: 'opened',
                staff: 'Alice'
              })
            })
          })
        );
      });
    });

    describe('logPerformance()', () => {
      it('should log performance as info when duration is acceptable', () => {
        loggerInstance.logPerformance('API Call', 1500, { endpoint: '/orders' });
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              level: 'info',
              message: 'Performance: API Call',
              module: 'Performance',
              details: expect.objectContaining({
                operation: 'API Call',
                duration: 1500,
                endpoint: '/orders'
              })
            })
          })
        );
      });

      it('should log performance as warning when duration exceeds threshold', () => {
        loggerInstance.logPerformance('Database Query', 5000, { query: 'SELECT *' });
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              level: 'warning',
              message: 'Performance: Database Query',
              module: 'Performance',
              details: expect.objectContaining({
                duration: 5000
              })
            })
          })
        );
      });
    });

    describe('logMetric()', () => {
      it('should log metrics with all parameters', () => {
        loggerInstance.logMetric('cpu_usage', 75.5, 'percent', ['server', 'production']);
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              message: 'Metric recorded',
              module: 'Metrics',
              details: expect.objectContaining({
                metric: 'cpu_usage',
                value: 75.5,
                unit: 'percent',
                timestamp: expect.any(Number)
              }),
              tags: ['server', 'production']
            })
          })
        );
      });

      it('should log metrics without optional parameters', () => {
        loggerInstance.logMetric('order_count', 42);
        
        expect(mockWebSocketService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              details: expect.objectContaining({
                metric: 'order_count',
                value: 42
              })
            })
          })
        );
      });
    });
  });

  describe('WebSocket Event Integration', () => {
    it('should register connected event listener on instantiation', () => {
      expect(mockWebSocketService.on).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    it('should process queue when WebSocket connects', async () => {
      // Get the connected callback
      const connectedCallback = (mockWebSocketService.on as jest.Mock).mock.calls
        .find(call => call[0] === 'connected')?.[1];
      
      expect(connectedCallback).toBeDefined();
      
      // Add logs to queue
      mockWebSocketService.isConnected.mockReturnValue(false);
      mockApiService.post = jest.fn().mockRejectedValue(new Error());
      
      loggerInstance.info('Queued message');
      await Promise.resolve();
      
      // Simulate connection
      mockWebSocketService.isConnected.mockReturnValue(true);
      mockWebSocketService.send.mockReturnValue(true);
      
      // Trigger connected callback
      connectedCallback();
      await Promise.resolve();
      
      // Queue should be processed
      expect(mockWebSocketService.send).toHaveBeenCalled();
    });
  });
});