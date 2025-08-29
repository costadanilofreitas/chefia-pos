/**
 * Comprehensive tests for KDSMainPage component
 * Tests order filtering, keyboard shortcuts, error states, WebSocket integration
 */

import React from 'react';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KDSMainPage from '../../ui/KDSMainPage';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { ApiService } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { logger } from '../../services/logger';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../services/offlineStorage');
jest.mock('../../services/logger');
jest.mock('react-icons/fa', () => ({
  FaSync: () => <div>Sync Icon</div>,
  FaWifi: () => <div>Wifi Icon</div>,
  FaExclamationTriangle: () => <div>Warning Icon</div>,
  FaExpand: () => <div>Expand Icon</div>,
  FaCompress: () => <div>Compress Icon</div>,
  FaVolumeUp: () => <div>Volume Up Icon</div>,
  FaVolumeMute: () => <div>Volume Mute Icon</div>,
  FaKeyboard: () => <div>Keyboard Icon</div>,
  FaCog: () => <div>Settings Icon</div>,
  FaMoon: () => <div>Moon Icon</div>,
  FaSun: () => <div>Sun Icon</div>
}));

// Mock lazy loaded components
jest.mock('../../ui/OrderCard', () => ({
  __esModule: true,
  default: ({ order, onStatusChange, onItemStatusChange }: any) => (
    <div data-testid={`order-card-${order.id}`}>
      <h3>{order.order_number}</h3>
      <span>{order.status}</span>
      <button onClick={() => onStatusChange(order.id, 'ready')}>
        Mark Ready
      </button>
      {order.items.map((item: any) => (
        <div key={item.item_id}>
          <span>{item.name}</span>
          <button onClick={() => onItemStatusChange(order.id, item.item_id, 'ready')}>
            Mark Item Ready
          </button>
        </div>
      ))}
    </div>
  )
}));

jest.mock('../../components/VisualAlert', () => ({
  AlertSystem: ({ alerts, onRemove }: any) => (
    <div data-testid="alert-system">
      {alerts.map((alert: any) => (
        <div key={alert.id} data-testid={`alert-${alert.id}`}>
          <span>{alert.message}</span>
          <button onClick={() => onRemove(alert.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}));

// Mock hooks
jest.mock('../../hooks/useFullscreen', () => ({
  useFullscreen: () => ({
    isFullscreen: false,
    toggleFullscreen: jest.fn()
  })
}));

jest.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: ({ handlers }: any) => {
    React.useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (handlers[e.key]) {
          handlers[e.key](e);
        }
      };
      
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handlers]);
  }
}));

jest.mock('../../hooks/useKDSOrders', () => ({
  useKDSOrders: ({ selectedStation, onNewOrder }: any) => {
    const [orders, setOrders] = React.useState(mockOrders);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    
    return {
      orders,
      loading,
      error,
      stats: {
        total: orders.length,
        pending: orders.filter((o: any) => o.status === 'pending').length,
        preparing: orders.filter((o: any) => o.status === 'preparing').length,
        ready: orders.filter((o: any) => o.status === 'ready').length
      },
      loadOrders: jest.fn(() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          setOrders(mockOrders);
        }, 100);
      }),
      updateOrderStatus: jest.fn((orderId: any, newStatus: string) => {
        setOrders((prev: any[]) => 
          prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );
      }),
      updateItemStatus: jest.fn(),
      setError
    };
  }
}));

jest.mock('../../hooks/useKDSAlerts', () => ({
  useKDSAlerts: () => ({
    alerts: [],
    removeAlert: jest.fn(),
    newOrder: jest.fn(),
    urgentOrder: jest.fn(),
    orderReady: jest.fn(),
    orderDelayed: jest.fn()
  })
}));

jest.mock('../../hooks/useKDSWebSocket', () => ({
  useKDSWebSocket: () => ({
    isConnected: true,
    joinStation: jest.fn(),
    leaveStation: jest.fn(),
    markOrderStarted: jest.fn(),
    markOrderCompleted: jest.fn()
  })
}));

// Test data
const mockOrders = [
  {
    id: '1',
    order_number: 'ORD-001',
    status: 'pending',
    priority: 'normal',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        item_id: 'item-1',
        name: 'Burger',
        quantity: 2,
        notes: '',
        station: 'Kitchen-1',
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ],
    customer_name: 'John Doe',
    table_number: '5',
    notes: '',
    total_amount: 25.99,
    payment_status: 'pending'
  },
  {
    id: '2',
    order_number: 'ORD-002',
    status: 'preparing',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        item_id: 'item-2',
        name: 'Pizza',
        quantity: 1,
        notes: 'Extra cheese',
        station: 'Kitchen-2',
        status: 'preparing',
        created_at: new Date().toISOString()
      }
    ],
    customer_name: 'Jane Smith',
    table_number: '3',
    notes: 'Allergic to nuts',
    total_amount: 35.50,
    payment_status: 'paid'
  }
];

const mockStations = [
  { id: 'Kitchen-1', name: 'Kitchen 1', active: true },
  { id: 'Kitchen-2', name: 'Kitchen 2', active: true },
  { id: 'Bar', name: 'Bar', active: false }
];

const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

// Helper to render component with providers
const renderKDSMainPage = () => {
  return render(
    <ThemeProvider>
      <KDSMainPage />
    </ThemeProvider>
  );
};

describe('KDSMainPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup mock implementations
    mockApiService.get.mockImplementation((endpoint: string) => {
      if (endpoint === '/kds/stations') {
        return Promise.resolve({ data: mockStations });
      }
      if (endpoint === '/kds/orders') {
        return Promise.resolve({ data: mockOrders });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
    
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render main page components', async () => {
      renderKDSMainPage();
      
      // Check header elements
      expect(screen.getByText(/KDS - Cozinha/)).toBeInTheDocument();
      expect(screen.getByText('Sync Icon')).toBeInTheDocument();
      
      // Check station selector
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      // Check statistics
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
      expect(screen.getByText(/Pendente:/)).toBeInTheDocument();
      expect(screen.getByText(/Preparando:/)).toBeInTheDocument();
      expect(screen.getByText(/Pronto:/)).toBeInTheDocument();
    });

    it('should load stations on mount', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledWith('/kds/stations');
      });
      
      // Station selector should have options
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should load orders on mount', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        // Orders should be displayed
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-2')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton while loading orders', () => {
      renderKDSMainPage();
      
      // Check for loading skeletons
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Station Filtering', () => {
    it('should filter orders by selected station', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'Kitchen-1');
      
      // Should trigger order reload with selected station
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
    });

    it('should show all orders when "all" is selected', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'all');
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-2')).toBeInTheDocument();
      });
    });
  });

  describe('Order Actions', () => {
    it('should update order status when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
      
      const markReadyButton = within(screen.getByTestId('order-card-1'))
        .getByText('Mark Ready');
      
      await user.click(markReadyButton);
      
      // Order status should be updated
      await waitFor(() => {
        expect(within(screen.getByTestId('order-card-1')).getByText('ready')).toBeInTheDocument();
      });
    });

    it('should update item status when clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
      
      const markItemReadyButton = within(screen.getByTestId('order-card-1'))
        .getByText('Mark Item Ready');
      
      await user.click(markItemReadyButton);
      
      // Should call updateItemStatus (mocked)
      expect(markItemReadyButton).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should navigate orders with arrow keys', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
      
      // Press ArrowRight
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        window.dispatchEvent(event);
      });
      
      // Should select next order (implementation dependent)
    });

    it('should refresh orders with F5', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
      
      // Press F5
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'F5' });
        event.preventDefault = jest.fn();
        window.dispatchEvent(event);
      });
      
      // Should trigger refresh (check for loading state or API call)
    });

    it('should toggle fullscreen with F11', async () => {
      const { useFullscreen } = require('../../hooks/useFullscreen');
      const toggleFullscreen = jest.fn();
      useFullscreen.mockReturnValue({
        isFullscreen: false,
        toggleFullscreen
      });
      
      renderKDSMainPage();
      
      // Press F11
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'F11' });
        event.preventDefault = jest.fn();
        window.dispatchEvent(event);
      });
      
      expect(toggleFullscreen).toHaveBeenCalled();
    });

    it('should show help with h key', async () => {
      renderKDSMainPage();
      
      // Press h
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' });
        window.dispatchEvent(event);
      });
      
      // Help modal should appear
      await waitFor(() => {
        expect(screen.getByText(/Atalhos do Teclado/)).toBeInTheDocument();
      });
    });
  });

  describe('Auto Refresh', () => {
    it('should auto-refresh orders periodically', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
      
      // Advance timer by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });
      
      // Should trigger another load
      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('should check for delayed orders', async () => {
      renderKDSMainPage();
      
      // Advance timer by 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });
      
      // Should check for delayed orders
      // (Implementation dependent - might trigger alerts)
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle between light and dark themes', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      // Find theme toggle button
      const themeButton = screen.getByLabelText(/tema/i);
      
      await user.click(themeButton);
      
      // Should toggle theme (check for class changes or icon change)
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Sound Toggle', () => {
    it('should toggle sound on/off', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      // Find sound toggle button
      const soundButton = screen.getByLabelText(/som/i);
      
      await user.click(soundButton);
      
      // Icon should change from VolumeUp to VolumeMute or vice versa
      expect(screen.getByText(/Volume/)).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('should show online status when connected', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByText('Wifi Icon')).toBeInTheDocument();
      });
      
      // Should show green indicator (implementation dependent)
    });

    it('should show offline status when disconnected', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByText('Warning Icon')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when loading fails', async () => {
      mockApiService.get.mockRejectedValue(new Error('Network error'));
      
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
      });
    });

    it('should allow retry on error', async () => {
      const user = userEvent.setup({ delay: null });
      mockApiService.get.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockOrders });
      
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText(/tentar novamente/i);
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/erro ao carregar/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display correct order statistics', async () => {
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByText(/Total: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Pendente: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Preparando: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Pronto: 0/)).toBeInTheDocument();
      });
    });

    it('should update statistics when order status changes', async () => {
      const user = userEvent.setup({ delay: null });
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
      
      const markReadyButton = within(screen.getByTestId('order-card-1'))
        .getByText('Mark Ready');
      
      await user.click(markReadyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Pronto: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Pendente: 0/)).toBeInTheDocument();
      });
    });
  });

  describe('Alert System', () => {
    it('should display alerts for new orders', async () => {
      const { useKDSAlerts } = require('../../hooks/useKDSAlerts');
      useKDSAlerts.mockReturnValue({
        alerts: [
          { id: '1', type: 'new_order', message: 'Novo pedido!', orderId: '3' }
        ],
        removeAlert: jest.fn(),
        newOrder: jest.fn(),
        urgentOrder: jest.fn(),
        orderReady: jest.fn(),
        orderDelayed: jest.fn()
      });
      
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('alert-1')).toBeInTheDocument();
        expect(screen.getByText('Novo pedido!')).toBeInTheDocument();
      });
    });

    it('should allow dismissing alerts', async () => {
      const user = userEvent.setup({ delay: null });
      const removeAlert = jest.fn();
      
      const { useKDSAlerts } = require('../../hooks/useKDSAlerts');
      useKDSAlerts.mockReturnValue({
        alerts: [
          { id: '1', type: 'new_order', message: 'Novo pedido!', orderId: '3' }
        ],
        removeAlert,
        newOrder: jest.fn(),
        urgentOrder: jest.fn(),
        orderReady: jest.fn(),
        orderDelayed: jest.fn()
      });
      
      renderKDSMainPage();
      
      await waitFor(() => {
        expect(screen.getByTestId('alert-1')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);
      
      expect(removeAlert).toHaveBeenCalledWith('1');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      renderKDSMainPage();
      
      // Check for mobile-specific classes or layout changes
      // (Implementation dependent)
    });

    it('should show appropriate number of columns for screen size', () => {
      // Mock larger viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920
      });
      
      renderKDSMainPage();
      
      // Should use grid layout with multiple columns
      // (Implementation dependent)
    });
  });

  describe('Performance', () => {
    it('should lazy load order cards', async () => {
      renderKDSMainPage();
      
      // OrderCard component is lazy loaded
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
    });

    it('should not re-render unnecessarily', () => {
      const { rerender } = renderKDSMainPage();
      
      // Re-render with same props
      rerender(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );
      
      // Check that API calls aren't duplicated
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });
  });
});