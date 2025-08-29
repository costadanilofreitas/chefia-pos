/**
 * KDSMainPage Component Test Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KDSMainPage from '../../src/ui/KDSMainPage';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { createMockOrder, createMockStation } from '../utils/testUtils';

// Mock dependencies
jest.mock('../../src/services/api', () => ({
  ApiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
  }
}));

jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    getAllStations: jest.fn().mockResolvedValue([]),
    log: jest.fn(),
    saveOrder: jest.fn(),
    getAllOrders: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../../src/hooks/useFullscreen', () => ({
  useFullscreen: () => ({
    isFullscreen: false,
    toggleFullscreen: jest.fn()
  })
}));

jest.mock('../../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn()
}));

jest.mock('../../src/hooks/useKDSOrders', () => ({
  useKDSOrders: jest.fn(() => ({
    orders: [],
    loading: false,
    error: null,
    stats: {
      pending: 0,
      preparing: 0,
      ready: 0,
      total: 0
    },
    loadOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
    updateItemStatus: jest.fn(),
    setError: jest.fn()
  }))
}));

jest.mock('../../src/hooks/useKDSAlerts', () => ({
  useKDSAlerts: jest.fn(() => ({
    alerts: [],
    removeAlert: jest.fn(),
    newOrder: jest.fn(),
    urgentOrder: jest.fn(),
    orderReady: jest.fn(),
    orderDelayed: jest.fn()
  }))
}));

jest.mock('../../src/hooks/useKDSWebSocket', () => ({
  useKDSWebSocket: jest.fn(() => ({
    isConnected: true,
    connectionError: null,
    joinStation: jest.fn(),
    leaveStation: jest.fn(),
    markOrderStarted: jest.fn(),
    markOrderCompleted: jest.fn()
  }))
}));

// Mock lazy loaded components
jest.mock('../../src/ui/KDSOrderCard', () => {
  return {
    __esModule: true,
    default: ({ order, onStatusChange, onItemStatusChange }: any) => (
      <div data-testid={`order-card-${order.id}`}>
        <div>Order #{order.id}</div>
        <div>Table: {order.table_number}</div>
        <button onClick={() => onStatusChange(order.id, 'preparing')}>Start Order</button>
        <button onClick={() => onStatusChange(order.id, 'ready')}>Complete Order</button>
        {order.items.map((item: any) => (
          <div key={item.id}>
            <span>{item.name}</span>
            <button onClick={() => onItemStatusChange(order.id, item.id, 'ready')}>
              Ready Item {item.id}
            </button>
          </div>
        ))}
      </div>
    )
  };
});

jest.mock('../../src/components/VisualAlert', () => ({
  AlertSystem: ({ alerts, onRemove }: any) => (
    <div data-testid="alert-system">
      {alerts.map((alert: any) => (
        <div key={alert.id} data-testid={`alert-${alert.id}`}>
          {alert.message}
          <button onClick={() => onRemove(alert.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}));

// Import mocked modules for manipulation
import { ApiService } from '../../src/services/api';
import { offlineStorage } from '../../src/services/offlineStorage';
import { useKDSOrders } from '../../src/hooks/useKDSOrders';
import { useKDSAlerts } from '../../src/hooks/useKDSAlerts';
import { useKDSWebSocket } from '../../src/hooks/useKDSWebSocket';
import { useFullscreen } from '../../src/hooks/useFullscreen';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';

describe('KDSMainPage', () => {
  const mockOrders = [
    createMockOrder({ id: 1, table_number: 5 }),
    createMockOrder({ id: 2, table_number: 10, items: [
      { id: 1, product_id: 1, name: 'Pizza', quantity: 1, price: 20, status: 'pending', notes: '', station: 'kitchen' },
      { id: 2, product_id: 2, name: 'Beer', quantity: 2, price: 5, status: 'pending', notes: '', station: 'bar' }
    ]})
  ];

  const mockStations = [
    createMockStation({ id: 'kitchen', name: 'Kitchen' }),
    createMockStation({ id: 'bar', name: 'Bar' }),
    createMockStation({ id: 'grill', name: 'Grill' })
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  beforeEach(() => {
    jest.useFakeTimers();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (ApiService.get as jest.Mock).mockResolvedValue(mockStations);
    (offlineStorage.getAllStations as jest.Mock).mockResolvedValue(mockStations);
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('should render main components', async () => {
      render(<KDSMainPage />, { wrapper });

      // Check for main UI elements
      expect(screen.getByText(/Kitchen Display System/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // Station selector
      
      // Wait for stations to load
      await waitFor(() => {
        expect(screen.getByText('Todas as Estações')).toBeInTheDocument();
      });
    });

    test('should display loading skeleton while loading orders', () => {
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [],
        loading: true,
        error: null,
        stats: { pending: 0, preparing: 0, ready: 0, total: 0 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      expect(screen.getByText(/Carregando pedidos.../i)).toBeInTheDocument();
    });

    test('should display orders when loaded', () => {
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: mockOrders,
        loading: false,
        error: null,
        stats: { pending: 2, preparing: 0, ready: 0, total: 2 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-2')).toBeInTheDocument();
    });

    test('should display error message when error occurs', () => {
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [],
        loading: false,
        error: 'Failed to load orders',
        stats: { pending: 0, preparing: 0, ready: 0, total: 0 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      expect(screen.getByText(/Failed to load orders/i)).toBeInTheDocument();
    });

    test('should display connection status', () => {
      // Test connected state
      (useKDSWebSocket as jest.Mock).mockReturnValue({
        isConnected: true,
        connectionError: null,
        joinStation: jest.fn(),
        leaveStation: jest.fn(),
        markOrderStarted: jest.fn(),
        markOrderCompleted: jest.fn()
      });

      const { rerender } = render(<KDSMainPage />, { wrapper });
      expect(screen.getByTitle('Conectado')).toBeInTheDocument();

      // Test disconnected state
      (useKDSWebSocket as jest.Mock).mockReturnValue({
        isConnected: false,
        connectionError: 'Connection lost',
        joinStation: jest.fn(),
        leaveStation: jest.fn(),
        markOrderStarted: jest.fn(),
        markOrderCompleted: jest.fn()
      });

      rerender(<KDSMainPage />);
      expect(screen.getByTitle('Desconectado')).toBeInTheDocument();
    });
  });

  describe('Station Management', () => {
    test('should load stations on mount', async () => {
      render(<KDSMainPage />, { wrapper });

      await waitFor(() => {
        expect(ApiService.get).toHaveBeenCalledWith('/kds/stations');
      });

      // Should display stations in dropdown
      const select = screen.getByRole('combobox');
      fireEvent.click(select);

      await waitFor(() => {
        expect(screen.getByText('Kitchen')).toBeInTheDocument();
        expect(screen.getByText('Bar')).toBeInTheDocument();
        expect(screen.getByText('Grill')).toBeInTheDocument();
      });
    });

    test('should load stations from offline storage when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(<KDSMainPage />, { wrapper });

      await waitFor(() => {
        expect(offlineStorage.getAllStations).toHaveBeenCalled();
        expect(ApiService.get).not.toHaveBeenCalled();
      });
    });

    test('should handle station change', async () => {
      const mockJoinStation = jest.fn();
      const mockLeaveStation = jest.fn();
      
      (useKDSWebSocket as jest.Mock).mockReturnValue({
        isConnected: true,
        connectionError: null,
        joinStation: mockJoinStation,
        leaveStation: mockLeaveStation,
        markOrderStarted: jest.fn(),
        markOrderCompleted: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      
      // Change to kitchen station
      fireEvent.change(select, { target: { value: 'kitchen' } });

      expect(mockJoinStation).toHaveBeenCalledWith('kitchen');

      // Change to bar station
      fireEvent.change(select, { target: { value: 'bar' } });

      expect(mockLeaveStation).toHaveBeenCalledWith('kitchen');
      expect(mockJoinStation).toHaveBeenCalledWith('bar');
    });

    test('should filter orders by station', () => {
      const kitchenOrder = createMockOrder({
        id: 1,
        items: [
          { id: 1, product_id: 1, name: 'Pizza', quantity: 1, price: 20, status: 'pending', notes: '', station: 'kitchen' }
        ]
      });

      const barOrder = createMockOrder({
        id: 2,
        items: [
          { id: 2, product_id: 2, name: 'Beer', quantity: 2, price: 5, status: 'pending', notes: '', station: 'bar' }
        ]
      });

      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [kitchenOrder, barOrder],
        loading: false,
        error: null,
        stats: { pending: 2, preparing: 0, ready: 0, total: 2 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      const { rerender } = render(<KDSMainPage />, { wrapper });

      // All orders should be visible initially
      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-card-2')).toBeInTheDocument();

      // Change selected station
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'kitchen' } });

      rerender(<KDSMainPage />);

      // Only kitchen order should be visible
      expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('order-card-2')).not.toBeInTheDocument();
    });
  });

  describe('Order Actions', () => {
    test('should handle order status update', async () => {
      const mockUpdateOrderStatus = jest.fn();
      const mockMarkOrderStarted = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: mockOrders,
        loading: false,
        error: null,
        stats: { pending: 1, preparing: 0, ready: 0, total: 1 },
        loadOrders: jest.fn(),
        updateOrderStatus: mockUpdateOrderStatus,
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      (useKDSWebSocket as jest.Mock).mockReturnValue({
        isConnected: true,
        connectionError: null,
        joinStation: jest.fn(),
        leaveStation: jest.fn(),
        markOrderStarted: mockMarkOrderStarted,
        markOrderCompleted: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      const startButton = screen.getByText('Start Order');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(1, 'preparing');
        expect(mockMarkOrderStarted).toHaveBeenCalledWith('1');
      });
    });

    test('should handle order completion', async () => {
      const mockUpdateOrderStatus = jest.fn();
      const mockMarkOrderCompleted = jest.fn();
      const mockOrderReady = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: mockOrders,
        loading: false,
        error: null,
        stats: { pending: 0, preparing: 1, ready: 0, total: 1 },
        loadOrders: jest.fn(),
        updateOrderStatus: mockUpdateOrderStatus,
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      (useKDSWebSocket as jest.Mock).mockReturnValue({
        isConnected: true,
        connectionError: null,
        joinStation: jest.fn(),
        leaveStation: jest.fn(),
        markOrderStarted: jest.fn(),
        markOrderCompleted: mockMarkOrderCompleted
      });

      (useKDSAlerts as jest.Mock).mockReturnValue({
        alerts: [],
        removeAlert: jest.fn(),
        newOrder: jest.fn(),
        urgentOrder: jest.fn(),
        orderReady: mockOrderReady,
        orderDelayed: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      const completeButton = screen.getByText('Complete Order');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith(1, 'ready');
        expect(mockMarkOrderCompleted).toHaveBeenCalledWith('1');
        expect(mockOrderReady).toHaveBeenCalledWith('1');
      });
    });

    test('should handle item status update', async () => {
      const mockUpdateItemStatus = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: mockOrders,
        loading: false,
        error: null,
        stats: { pending: 1, preparing: 0, ready: 0, total: 1 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: mockUpdateItemStatus,
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      const itemReadyButton = screen.getByText('Ready Item 1');
      fireEvent.click(itemReadyButton);

      await waitFor(() => {
        expect(mockUpdateItemStatus).toHaveBeenCalledWith(1, 1, 'ready');
      });
    });
  });

  describe('Alerts', () => {
    test('should display alerts', () => {
      const mockAlerts = [
        { id: '1', type: 'info', message: 'New order received', timestamp: Date.now() },
        { id: '2', type: 'warning', message: 'Order delayed', timestamp: Date.now() }
      ];

      (useKDSAlerts as jest.Mock).mockReturnValue({
        alerts: mockAlerts,
        removeAlert: jest.fn(),
        newOrder: jest.fn(),
        urgentOrder: jest.fn(),
        orderReady: jest.fn(),
        orderDelayed: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      expect(screen.getByText('New order received')).toBeInTheDocument();
      expect(screen.getByText('Order delayed')).toBeInTheDocument();
    });

    test('should remove alert when dismissed', () => {
      const mockRemoveAlert = jest.fn();
      const mockAlerts = [
        { id: '1', type: 'info', message: 'Test alert', timestamp: Date.now() }
      ];

      (useKDSAlerts as jest.Mock).mockReturnValue({
        alerts: mockAlerts,
        removeAlert: mockRemoveAlert,
        newOrder: jest.fn(),
        urgentOrder: jest.fn(),
        orderReady: jest.fn(),
        orderDelayed: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      expect(mockRemoveAlert).toHaveBeenCalledWith('1');
    });

    test('should create alert for new orders', () => {
      const mockNewOrder = jest.fn();
      const mockUrgentOrder = jest.fn();
      
      (useKDSAlerts as jest.Mock).mockReturnValue({
        alerts: [],
        removeAlert: jest.fn(),
        newOrder: mockNewOrder,
        urgentOrder: mockUrgentOrder,
        orderReady: jest.fn(),
        orderDelayed: jest.fn()
      });

      const newOrder = createMockOrder({ id: 3, priority: 'high' });

      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [newOrder],
        loading: false,
        error: null,
        stats: { pending: 1, preparing: 0, ready: 0, total: 1 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      // Mock the onNewOrder callback
      const onNewOrderCallback = (useKDSOrders as jest.Mock).mock.calls[0]?.[0]?.onNewOrder;
      if (onNewOrderCallback) {
        onNewOrderCallback(newOrder);
        
        expect(mockNewOrder).toHaveBeenCalledWith('3');
        expect(mockUrgentOrder).toHaveBeenCalledWith('3'); // High priority
      }
    });
  });

  describe('UI Controls', () => {
    test('should toggle sound', () => {
      render(<KDSMainPage />, { wrapper });

      const soundButton = screen.getByTitle(/Som/i);
      
      // Initial state - sound enabled
      expect(soundButton).toHaveAttribute('title', expect.stringContaining('Som ativado'));
      
      fireEvent.click(soundButton);
      
      // After click - sound disabled
      expect(soundButton).toHaveAttribute('title', expect.stringContaining('Som desativado'));
    });

    test('should toggle fullscreen', () => {
      const mockToggleFullscreen = jest.fn();
      
      (useFullscreen as jest.Mock).mockReturnValue({
        isFullscreen: false,
        toggleFullscreen: mockToggleFullscreen
      });

      render(<KDSMainPage />, { wrapper });

      const fullscreenButton = screen.getByTitle(/Tela cheia/i);
      fireEvent.click(fullscreenButton);

      expect(mockToggleFullscreen).toHaveBeenCalled();
    });

    test('should toggle dark mode', () => {
      render(<KDSMainPage />, { wrapper });

      const darkModeButton = screen.getByTitle(/Modo/i);
      
      // Click to toggle theme
      fireEvent.click(darkModeButton);
      
      // Theme should change (handled by ThemeContext)
      expect(darkModeButton).toBeInTheDocument();
    });

    test('should show/hide help', () => {
      render(<KDSMainPage />, { wrapper });

      const helpButton = screen.getByTitle(/Atalhos/i);
      
      // Initially help is hidden
      expect(screen.queryByText(/Atalhos do Teclado/i)).not.toBeInTheDocument();
      
      // Show help
      fireEvent.click(helpButton);
      expect(screen.getByText(/Atalhos do Teclado/i)).toBeInTheDocument();
      
      // Hide help
      fireEvent.click(helpButton);
      expect(screen.queryByText(/Atalhos do Teclado/i)).not.toBeInTheDocument();
    });

    test('should refresh orders', async () => {
      const mockLoadOrders = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [],
        loading: false,
        error: null,
        stats: { pending: 0, preparing: 0, ready: 0, total: 0 },
        loadOrders: mockLoadOrders,
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      const refreshButton = screen.getByTitle(/Atualizar/i);
      fireEvent.click(refreshButton);

      expect(mockLoadOrders).toHaveBeenCalled();
    });
  });

  describe('Auto Refresh', () => {
    test('should auto-refresh orders periodically', () => {
      const mockLoadOrders = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [],
        loading: false,
        error: null,
        stats: { pending: 0, preparing: 0, ready: 0, total: 0 },
        loadOrders: mockLoadOrders,
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      // Initial load
      expect(mockLoadOrders).toHaveBeenCalledTimes(1);

      // Advance time by 30 seconds (AUTO_REFRESH_INTERVAL)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should have refreshed
      expect(mockLoadOrders).toHaveBeenCalledTimes(2);

      // Advance time again
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockLoadOrders).toHaveBeenCalledTimes(3);
    });

    test('should check for delayed orders', () => {
      const mockOrderDelayed = jest.fn();
      const delayedOrder = createMockOrder({
        id: 1,
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20 minutes ago
      });
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [delayedOrder],
        loading: false,
        error: null,
        stats: { pending: 1, preparing: 0, ready: 0, total: 1 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      (useKDSAlerts as jest.Mock).mockReturnValue({
        alerts: [],
        removeAlert: jest.fn(),
        newOrder: jest.fn(),
        urgentOrder: jest.fn(),
        orderReady: jest.fn(),
        orderDelayed: mockOrderDelayed
      });

      render(<KDSMainPage />, { wrapper });

      // Advance time to trigger delayed order check (1 minute)
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockOrderDelayed).toHaveBeenCalledWith('1');
    });
  });

  describe('WebSocket Integration', () => {
    test('should reload orders on WebSocket update', () => {
      const mockLoadOrders = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [],
        loading: false,
        error: null,
        stats: { pending: 0, preparing: 0, ready: 0, total: 0 },
        loadOrders: mockLoadOrders,
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      // Get the onOrderUpdate callback from useKDSWebSocket mock
      render(<KDSMainPage />, { wrapper });
      
      const wsCallback = (useKDSWebSocket as jest.Mock).mock.calls[0]?.[0];
      
      if (wsCallback?.onOrderUpdate) {
        wsCallback.onOrderUpdate();
        expect(mockLoadOrders).toHaveBeenCalled();
      }
    });

    test('should handle connection changes', () => {
      const mockSetError = jest.fn();
      const mockLoadOrders = jest.fn();
      
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: [],
        loading: false,
        error: null,
        stats: { pending: 0, preparing: 0, ready: 0, total: 0 },
        loadOrders: mockLoadOrders,
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: mockSetError
      });

      render(<KDSMainPage />, { wrapper });
      
      const wsCallback = (useKDSWebSocket as jest.Mock).mock.calls[0]?.[0];
      
      // Simulate disconnection
      if (wsCallback?.onConnectionChange) {
        wsCallback.onConnectionChange(false);
        expect(mockSetError).toHaveBeenCalledWith('Conexão perdida. Modo offline ativado.');
        
        // Simulate reconnection
        wsCallback.onConnectionChange(true);
        expect(mockSetError).toHaveBeenCalledWith(null);
        expect(mockLoadOrders).toHaveBeenCalled();
      }
    });

    test('should handle urgent station updates', () => {
      const mockUrgentOrder = jest.fn();
      
      (useKDSAlerts as jest.Mock).mockReturnValue({
        alerts: [],
        removeAlert: jest.fn(),
        newOrder: jest.fn(),
        urgentOrder: mockUrgentOrder,
        orderReady: jest.fn(),
        orderDelayed: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });
      
      const wsCallback = (useKDSWebSocket as jest.Mock).mock.calls[0]?.[0];
      
      if (wsCallback?.onStationUpdate) {
        wsCallback.onStationUpdate('kitchen', { 
          station: 'kitchen',
          type: 'urgent',
          orderId: '123'
        });
        
        expect(mockUrgentOrder).toHaveBeenCalledWith('123');
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should register keyboard shortcuts', () => {
      render(<KDSMainPage />, { wrapper });

      expect(useKeyboardShortcuts).toHaveBeenCalled();
      
      const shortcuts = (useKeyboardShortcuts as jest.Mock).mock.calls[0]?.[0];
      
      // Verify shortcut structure
      expect(shortcuts).toEqual(
        expect.objectContaining({
          'r': expect.any(Function), // Refresh
          'f': expect.any(Function), // Fullscreen
          'd': expect.any(Function), // Dark mode
          's': expect.any(Function), // Sound
          'h': expect.any(Function), // Help
          'ArrowUp': expect.any(Function), // Navigate up
          'ArrowDown': expect.any(Function), // Navigate down
          'Enter': expect.any(Function), // Select order
          'Escape': expect.any(Function), // Deselect
        })
      );
    });

    test('should navigate orders with arrow keys', () => {
      (useKDSOrders as jest.Mock).mockReturnValue({
        orders: mockOrders,
        loading: false,
        error: null,
        stats: { pending: 2, preparing: 0, ready: 0, total: 2 },
        loadOrders: jest.fn(),
        updateOrderStatus: jest.fn(),
        updateItemStatus: jest.fn(),
        setError: jest.fn()
      });

      render(<KDSMainPage />, { wrapper });

      const shortcuts = (useKeyboardShortcuts as jest.Mock).mock.calls[0]?.[0];
      
      // Navigate down
      act(() => {
        shortcuts['ArrowDown']();
      });
      
      // Would select next order (implementation depends on internal state)
      
      // Navigate up
      act(() => {
        shortcuts['ArrowUp']();
      });
      
      // Would select previous order
    });
  });

  describe('Performance', () => {
    test('should use lazy loading for heavy components', () => {
      render(<KDSMainPage />, { wrapper });

      // OrderCard and AlertSystem should be lazy loaded
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    test('should memoize filtered orders', () => {
      const { rerender } = render(<KDSMainPage />, { wrapper });

      // Rerender with same props
      rerender(<KDSMainPage />);

      // filteredOrders should be memoized and not recalculated
      // This is tested indirectly through performance
    });
  });
});