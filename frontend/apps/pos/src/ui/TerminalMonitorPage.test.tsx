/**
 * Tests for TerminalMonitorPage Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TerminalMonitorPage from './TerminalMonitorPage';
import realtimeSync from '../services/RealtimeSyncService';
import { requestCache } from '../services/RequestCache';
import { apiInterceptor } from '../services/ApiInterceptor';
import eventBus from '../utils/EventBus';

// Mock dependencies
jest.mock('../services/RealtimeSyncService', () => ({
  __esModule: true,
  default: {
    connected: true,
  }
}));

jest.mock('../services/RequestCache', () => ({
  requestCache: {
    getStats: jest.fn().mockReturnValue({
      cacheSize: 10,
      maxCacheSize: 50,
      pendingRequests: 2,
      memoryUsageMB: '2.5',
      maxMemoryMB: 10,
      memoryUsagePercent: '25',
      entries: [
        {
          key: '/api/orders',
          age: 5000,
          ttl: 10000,
          expired: false,
          hasData: true
        },
        {
          key: '/api/products',
          age: 15000,
          ttl: 10000,
          expired: true,
          hasData: true
        }
      ]
    }),
    clear: jest.fn(),
    invalidate: jest.fn(),
    invalidatePattern: jest.fn(),
  }
}));

jest.mock('../services/ApiInterceptor', () => ({
  apiInterceptor: {
    get: jest.fn()
  }
}));

jest.mock('../utils/EventBus', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  }
}));

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiMonitor: () => <div>Monitor Icon</div>,
  FiWifi: () => <div>Wifi Icon</div>,
  FiWifiOff: () => <div>WifiOff Icon</div>,
  FiUser: () => <div>User Icon</div>,
  FiClock: () => <div>Clock Icon</div>,
  FiActivity: () => <div>Activity Icon</div>,
  FiRefreshCw: () => <div>Refresh Icon</div>,
}));

describe('TerminalMonitorPage', () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup localStorage mock
    mockLocalStorage = {
      'terminal_id': 'test-terminal-123',
      'user_id': 'test-user-456'
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
      },
      writable: true,
      configurable: true
    });

    // Setup default API response
    (apiInterceptor.get as jest.Mock).mockResolvedValue({
      data: {
        connected_terminals: {
          'terminal-1': 'user-1',
          'terminal-2': 'user-2'
        },
        total_connections: 2,
        queued_messages: {}
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the page title and header', () => {
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('Monitor de Terminais')).toBeInTheDocument();
      expect(screen.getByText('Monitor Icon')).toBeInTheDocument();
    });

    it('should display connection status when connected', () => {
      (realtimeSync as any).connected = true;
      
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('Conectado ao servidor de sincronização')).toBeInTheDocument();
      expect(screen.getByText('Wifi Icon')).toBeInTheDocument();
    });

    it('should display connection status when disconnected', () => {
      (realtimeSync as any).connected = false;
      
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('Desconectado')).toBeInTheDocument();
      expect(screen.getByText('WifiOff Icon')).toBeInTheDocument();
    });

    it('should display current terminal ID', () => {
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('Terminal ID:')).toBeInTheDocument();
      expect(screen.getByText('test-terminal-123')).toBeInTheDocument();
    });

    it('should display auto-refresh checkbox', () => {
      render(<TerminalMonitorPage />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Auto-refresh')).toBeInTheDocument();
    });

    it('should display refresh button', () => {
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('Refresh Icon')).toBeInTheDocument();
    });
  });

  describe('Terminal List', () => {
    it('should display connected terminals', async () => {
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('terminal-1')).toBeInTheDocument();
        expect(screen.getByText('terminal-2')).toBeInTheDocument();
      });
    });

    it('should show online count', async () => {
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('2 online')).toBeInTheDocument();
      });
    });

    it('should mark current terminal', async () => {
      mockLocalStorage['terminal_id'] = 'terminal-1';
      
      (apiInterceptor.get as jest.Mock).mockResolvedValue({
        data: {
          connected_terminals: {
            'terminal-1': 'user-1',
            'terminal-2': 'user-2'
          },
          total_connections: 2,
          queued_messages: {}
        }
      });
      
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('terminal-1 (Este Terminal)')).toBeInTheDocument();
      });
    });

    it('should display message when no terminals connected', async () => {
      (apiInterceptor.get as jest.Mock).mockResolvedValue({
        data: {
          connected_terminals: {},
          total_connections: 0,
          queued_messages: {}
        }
      });
      
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Nenhum terminal conectado')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Statistics', () => {
    it('should display cache statistics', () => {
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('Estatísticas de Cache')).toBeInTheDocument();
      expect(screen.getByText('10/50')).toBeInTheDocument(); // Cache entries
      expect(screen.getByText('2.5MB (25%)')).toBeInTheDocument(); // Memory usage
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending requests
      expect(screen.getByText('10MB')).toBeInTheDocument(); // Memory limit
    });

    it('should display cache entries', () => {
      render(<TerminalMonitorPage />);
      
      expect(screen.getByText('/api/orders')).toBeInTheDocument();
      expect(screen.getByText('/api/products')).toBeInTheDocument();
    });

    it('should show memory usage progress bar', () => {
      render(<TerminalMonitorPage />);
      
      const progressBar = document.querySelector('.bg-blue-500');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '25%' });
    });

    it('should clear cache when button clicked', () => {
      render(<TerminalMonitorPage />);
      
      const clearButton = screen.getByText('Limpar Cache');
      fireEvent.click(clearButton);
      
      expect(requestCache.clear).toHaveBeenCalled();
    });
  });

  describe('Auto Refresh', () => {
    it('should auto refresh when enabled', () => {
      render(<TerminalMonitorPage />);
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(apiInterceptor.get).toHaveBeenCalledTimes(2); // Initial + 1 refresh
      expect(requestCache.getStats).toHaveBeenCalledTimes(2);
    });

    it('should stop auto refresh when disabled', () => {
      render(<TerminalMonitorPage />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // Should only have initial call
      expect(apiInterceptor.get).toHaveBeenCalledTimes(1);
    });

    it('should resume auto refresh when re-enabled', () => {
      render(<TerminalMonitorPage />);
      
      const checkbox = screen.getByRole('checkbox');
      
      // Disable
      fireEvent.click(checkbox);
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Re-enable
      fireEvent.click(checkbox);
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(apiInterceptor.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Manual Refresh', () => {
    it('should refresh data when refresh button clicked', async () => {
      render(<TerminalMonitorPage />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      
      await waitFor(() => {
        expect(apiInterceptor.get).toHaveBeenCalledTimes(1);
      });
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(apiInterceptor.get).toHaveBeenCalledTimes(2);
        expect(requestCache.getStats).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable refresh button while loading', async () => {
      (apiInterceptor.get as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 1000))
      );
      
      render(<TerminalMonitorPage />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(refreshButton).toBeDisabled();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle sync:connected event', () => {
      render(<TerminalMonitorPage />);
      
      const connectedHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:connected'
      )?.[1];
      
      act(() => {
        connectedHandler?.();
      });
      
      expect(screen.getByText('Conectado ao servidor de sincronização')).toBeInTheDocument();
    });

    it('should handle sync:disconnected event', () => {
      render(<TerminalMonitorPage />);
      
      const disconnectedHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:disconnected'
      )?.[1];
      
      act(() => {
        disconnectedHandler?.();
      });
      
      expect(screen.getByText('Desconectado')).toBeInTheDocument();
    });

    it('should handle terminal connected event', async () => {
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('terminal-1')).toBeInTheDocument();
      });
      
      const terminalConnectedHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:terminal:connected'
      )?.[1];
      
      act(() => {
        terminalConnectedHandler?.({ terminal_id: 'terminal-3', user_id: 'user-3' });
      });
      
      expect(screen.getByText('terminal-3')).toBeInTheDocument();
    });

    it('should handle terminal disconnected event', async () => {
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('terminal-1')).toBeInTheDocument();
      });
      
      const terminalDisconnectedHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:terminal:disconnected'
      )?.[1];
      
      act(() => {
        terminalDisconnectedHandler?.({ terminal_id: 'terminal-1' });
      });
      
      // Terminal should still be in list but marked as offline
      expect(screen.getByText('terminal-1')).toBeInTheDocument();
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = render(<TerminalMonitorPage />);
      
      unmount();
      
      expect(eventBus.off).toHaveBeenCalledWith('sync:connected', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:disconnected', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:terminal:connected', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:terminal:disconnected', expect.any(Function));
    });
  });

  describe('Sync Queue Status', () => {
    it('should display queued messages when present', async () => {
      (apiInterceptor.get as jest.Mock).mockResolvedValue({
        data: {
          connected_terminals: {},
          total_connections: 0,
          queued_messages: {
            'terminal-1': 5,
            'terminal-2': 3
          }
        }
      });
      
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Mensagens em Fila')).toBeInTheDocument();
        expect(screen.getByText('terminal-1')).toBeInTheDocument();
        expect(screen.getByText('5 msgs')).toBeInTheDocument();
        expect(screen.getByText('terminal-2')).toBeInTheDocument();
        expect(screen.getByText('3 msgs')).toBeInTheDocument();
      });
    });

    it('should not display queue section when empty', async () => {
      (apiInterceptor.get as jest.Mock).mockResolvedValue({
        data: {
          connected_terminals: {},
          total_connections: 0,
          queued_messages: {}
        }
      });
      
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Mensagens em Fila')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (apiInterceptor.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<TerminalMonitorPage />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch sync status:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Formatting', () => {
    it('should format time correctly', () => {
      render(<TerminalMonitorPage />);
      
      // Time formatting is internal, but we can check if Clock icons are rendered
      const clockIcons = screen.getAllByText('Clock Icon');
      expect(clockIcons.length).toBeGreaterThan(0);
    });

    it('should format age of cache entries', () => {
      render(<TerminalMonitorPage />);
      
      // Check for formatted ages (5s, 15s based on mock data)
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('15s')).toBeInTheDocument();
    });
  });
});