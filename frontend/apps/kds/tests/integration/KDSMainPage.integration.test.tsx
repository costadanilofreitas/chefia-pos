import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import KDSMainPage from '../../src/ui/KDSMainPage';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { ApiService } from '../../src/services/api';
import { offlineStorage } from '../../src/services/offlineStorage';
import { websocketService } from '../../src/services/websocket';
import { audioService } from '../../src/services/audioService';
import { logger } from '../../src/services/logger';
import { createMockOrder, createMockStation, MockWebSocket } from '../utils/testUtils';

// Mock all dependencies
jest.mock('../../src/services/api');
jest.mock('../../src/services/offlineStorage');
jest.mock('../../src/services/websocket');
jest.mock('../../src/services/audioService');
jest.mock('../../src/services/logger');

// Mock lazy loaded components
jest.mock('../../src/ui/OrderCard', () => {
  return {
    __esModule: true,
    default: ({ order, onStatusChange, onItemStatusChange, nextStatus }: any) => (
      <div data-testid={`order-card-${order.id}`}>
        <h3>Pedido #{order.id}</h3>
        <span>{order.priority}</span>
        <span>{order.status}</span>
        <button onClick={() => onStatusChange(order.id, nextStatus)}>
          {nextStatus === 'preparing' ? 'Iniciar Preparo' : 'Marcar como Pronto'}
        </button>
        {order.items?.map((item: any) => (
          <div key={item.id}>
            <span>{item.name}</span>
            <button onClick={() => onItemStatusChange(order.id, item.id, nextStatus)}>
              Marcar Item
            </button>
          </div>
        ))}
      </div>
    )
  };
});

jest.mock('../../src/components/VisualAlert', () => ({
  AlertSystem: ({ alerts, onAlertClose }: any) => (
    <div data-testid="alert-system">
      {alerts.map((alert: any) => (
        <div key={alert.id} data-testid={`alert-${alert.id}`}>
          <span>{alert.message}</span>
          <button onClick={() => onAlertClose(alert.id)}>Close</button>
        </div>
      ))}
    </div>
  )
}));

describe('KDSMainPage Integration Tests', () => {
  const mockOrders = [
    createMockOrder({ 
      id: 1, 
      status: 'pending',
      priority: 'normal',
      table_number: 5,
      items: [
        { item_id: 1, name: 'Burger', status: 'pending', station: 'kitchen', quantity: 1, price: 25 },
        { item_id: 2, name: 'Fries', status: 'pending', station: 'kitchen', quantity: 1, price: 10 }
      ]
    }),
    createMockOrder({ 
      id: 2, 
      status: 'preparing',
      priority: 'high',
      table_number: 3,
      items: [
        { item_id: 3, name: 'Salad', status: 'preparing', station: 'kitchen', quantity: 1, price: 15 }
      ]
    })
  ];

  const mockStations = [
    createMockStation({ id: 'kitchen', name: 'Kitchen' }),
    createMockStation({ id: 'bar', name: 'Bar' }),
    createMockStation({ id: 'grill', name: 'Grill' })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mocks
    (ApiService.get as jest.Mock).mockImplementation((endpoint) => {
      if (endpoint === '/kds/orders') return Promise.resolve(mockOrders);
      if (endpoint === '/kds/stations') return Promise.resolve(mockStations);
      if (endpoint.startsWith('/kds/stations/')) {
        const station = endpoint.split('/').pop();
        return Promise.resolve(mockOrders.filter(o => 
          o.items.some(i => i.station === station)
        ));
      }
      return Promise.resolve([]);
    });

    (ApiService.put as jest.Mock).mockResolvedValue({});
    
    (offlineStorage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);
    (offlineStorage.getAllStations as jest.Mock).mockResolvedValue(mockStations);
    (offlineStorage.saveOrder as jest.Mock).mockResolvedValue(undefined);
    (offlineStorage.init as jest.Mock).mockResolvedValue(undefined);
    
    (websocketService.isConnected as jest.Mock).mockReturnValue(true);
    (websocketService.on as jest.Mock).mockImplementation(() => {});
    (websocketService.send as jest.Mock).mockReturnValue(true);
    
    (audioService.playSound as jest.Mock).mockImplementation(() => {});
    
    (logger.error as jest.Mock).mockImplementation(() => {});
    (logger.info as jest.Mock).mockImplementation(() => {});
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock document fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null
    });
    document.documentElement.requestFullscreen = jest.fn();
    document.exitFullscreen = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should render main components', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Kitchen Display')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Station selector
        expect(screen.getByText('Online')).toBeInTheDocument(); // Connection status
      });
    });

    it('should load orders and stations on mount', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(ApiService.get).toHaveBeenCalledWith('/kds/orders');
        expect(ApiService.get).toHaveBeenCalledWith('/kds/stations');
      });
    });

    it('should display orders after loading', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('order-card-2')).toBeInTheDocument();
      });
    });

    it('should display statistics', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Total: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Pendente: 1/)).toBeInTheDocument();
        expect(screen.getByText(/Preparando: 1/)).toBeInTheDocument();
      });
    });
  });

  describe('Station Filtering', () => {
    it('should filter orders by station', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      const stationSelector = await screen.findByRole('combobox');
      
      // Select kitchen station
      fireEvent.change(stationSelector, { target: { value: 'kitchen' } });

      await waitFor(() => {
        expect(ApiService.get).toHaveBeenCalledWith('/kds/stations/kitchen/orders');
      });
    });

    it('should join WebSocket room when selecting station', async () => {
      const joinStation = jest.fn();
      const leaveStation = jest.fn();
      
      // Mock WebSocket hooks
      jest.spyOn(require('../../src/hooks/useKDSWebSocket'), 'useKDSWebSocket')
        .mockReturnValue({
          isConnected: true,
          joinStation,
          leaveStation,
          markOrderStarted: jest.fn(),
          markOrderCompleted: jest.fn()
        });

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      const stationSelector = await screen.findByRole('combobox');
      
      fireEvent.change(stationSelector, { target: { value: 'kitchen' } });

      await waitFor(() => {
        expect(joinStation).toHaveBeenCalledWith('kitchen');
      });
    });
  });

  describe('Order Actions', () => {
    it('should update order status', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      const startButton = within(screen.getByTestId('order-card-1'))
        .getByText('Iniciar Preparo');
      
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(ApiService.put).toHaveBeenCalledWith(
          '/kds/orders/1/status',
          { status: 'preparing' }
        );
      });
    });

    it('should update item status', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      const itemButtons = within(screen.getByTestId('order-card-1'))
        .getAllByText('Marcar Item');
      
      fireEvent.click(itemButtons[0]);

      await waitFor(() => {
        expect(ApiService.put).toHaveBeenCalledWith(
          '/kds/orders/1/items/1/status',
          { status: 'preparing' }
        );
      });
    });

    it('should show alert when order is completed', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-2')).toBeInTheDocument();
      });

      const completeButton = within(screen.getByTestId('order-card-2'))
        .getByText('Marcar como Pronto');
      
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(audioService.playSound).toHaveBeenCalledWith('success');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should refresh orders on WebSocket message', async () => {
      let wsCallback: Function;
      (websocketService.on as jest.Mock).mockImplementation((event, callback) => {
        if (event === 'order_update') {
          wsCallback = callback;
        }
      });

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      // Clear previous calls
      (ApiService.get as jest.Mock).mockClear();

      // Simulate WebSocket message
      if (wsCallback!) {
        wsCallback({ orderId: 3, status: 'pending' });
      }

      await waitFor(() => {
        expect(ApiService.get).toHaveBeenCalledWith('/kds/orders');
      });
    });

    it('should show alert for new urgent orders', async () => {
      const newOrder = createMockOrder({ 
        id: 3, 
        priority: 'urgent',
        status: 'pending' 
      });

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      // Update mock to include new order
      (ApiService.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/kds/orders') {
          return Promise.resolve([...mockOrders, newOrder]);
        }
        return Promise.resolve(mockStations);
      });

      // Trigger refresh
      const refreshButton = screen.getByLabelText('Atualizar pedidos');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(audioService.playSound).toHaveBeenCalledWith('urgentOrder');
      });
    });
  });

  describe('Offline Mode', () => {
    it('should show offline indicator', async () => {
      (navigator as any).onLine = false;
      (websocketService.isConnected as jest.Mock).mockReturnValue(false);

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
        expect(screen.getByText(/Sistema offline/)).toBeInTheDocument();
      });
    });

    it('should load from cache when offline', async () => {
      (navigator as any).onLine = false;

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(offlineStorage.getAllOrders).toHaveBeenCalled();
        expect(offlineStorage.getAllStations).toHaveBeenCalled();
      });

      // Should still display orders from cache
      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
    });

    it('should save changes locally when offline', async () => {
      (navigator as any).onLine = false;

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      const startButton = within(screen.getByTestId('order-card-1'))
        .getByText('Iniciar Preparo');
      
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(offlineStorage.saveOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            status: 'preparing',
            synced: false
          })
        );
      });
    });
  });

  describe('User Interface Controls', () => {
    it('should toggle fullscreen mode', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      const fullscreenButton = await screen.findByLabelText('Entrar em tela cheia');
      fireEvent.click(fullscreenButton);

      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should toggle sound', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      const soundButton = await screen.findByLabelText('Desativar som');
      fireEvent.click(soundButton);

      // Should change icon/label
      await waitFor(() => {
        expect(screen.getByLabelText('Ativar som')).toBeInTheDocument();
      });

      // New alerts should not play sound
      const newOrder = createMockOrder({ id: 3, priority: 'urgent' });
      (ApiService.get as jest.Mock).mockResolvedValue([...mockOrders, newOrder]);
      
      const refreshButton = screen.getByLabelText('Atualizar pedidos');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        // Sound should not be called after toggling off
        const lastCallIndex = (audioService.playSound as jest.Mock).mock.calls.length;
        expect(lastCallIndex).toBe(0);
      });
    });

    it('should toggle dark mode', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      const themeButton = await screen.findByLabelText(/Mudar para modo/);
      fireEvent.click(themeButton);

      // Should toggle theme classes
      await waitFor(() => {
        const mainContainer = screen.getByText('Kitchen Display').closest('div');
        expect(mainContainer).toHaveClass('dark:bg-gray-900');
      });
    });

    it('should show keyboard shortcuts help', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      const helpButton = await screen.findByLabelText('Mostrar atalhos do teclado');
      fireEvent.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText('Atalhos do Teclado')).toBeInTheDocument();
        expect(screen.getByText('Navegar pedidos')).toBeInTheDocument();
      });

      // Close help modal
      const closeButton = screen.getByRole('button', { name: 'Fechar' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Atalhos do Teclado')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate orders with arrow keys', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      // Simulate arrow down key
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Should highlight second order
      await waitFor(() => {
        const orderCard2 = screen.getByTestId('order-card-2').parentElement;
        expect(orderCard2).toHaveClass('ring-2');
      });
    });

    it('should refresh with R key', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      (ApiService.get as jest.Mock).mockClear();

      // Press R key
      fireEvent.keyDown(document, { key: 'r' });

      await waitFor(() => {
        expect(ApiService.get).toHaveBeenCalledWith('/kds/orders');
      });
    });

    it('should toggle fullscreen with F key', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      // Press F key
      fireEvent.keyDown(document, { key: 'f' });

      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });
  });

  describe('Auto-refresh', () => {
    it('should auto-refresh orders periodically', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      (ApiService.get as jest.Mock).mockClear();

      // Advance timer by 30 seconds
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(ApiService.get).toHaveBeenCalledWith('/kds/orders');
      });
    });

    it('should check for delayed orders', async () => {
      const delayedOrder = createMockOrder({
        id: 3,
        status: 'pending',
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20 minutes ago
      });

      (ApiService.get as jest.Mock).mockResolvedValue([...mockOrders, delayedOrder]);

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-3')).toBeInTheDocument();
      });

      // Advance timer to trigger delayed order check
      jest.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(audioService.playSound).toHaveBeenCalledWith('warning');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on load failure', async () => {
      (ApiService.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      (offlineStorage.getAllOrders as jest.Mock).mockResolvedValue([]);

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Não foi possível carregar/)).toBeInTheDocument();
      });
    });

    it('should fallback to cache on error', async () => {
      (ApiService.get as jest.Mock).mockRejectedValue(new Error('API error'));

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(offlineStorage.getAllOrders).toHaveBeenCalled();
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });
    });

    it('should log errors', async () => {
      const error = new Error('Test error');
      (ApiService.get as jest.Mock).mockRejectedValue(error);

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Error loading orders',
          error,
          expect.any(String)
        );
      });
    });
  });

  describe('Performance', () => {
    it('should handle large number of orders', async () => {
      const manyOrders = Array.from({ length: 100 }, (_, i) => 
        createMockOrder({ id: i + 1, status: 'pending' })
      );
      
      (ApiService.get as jest.Mock).mockImplementation((endpoint) => {
        if (endpoint === '/kds/orders') return Promise.resolve(manyOrders);
        return Promise.resolve(mockStations);
      });

      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      // Should render without performance issues
      const orderCards = screen.getAllByTestId(/order-card-/);
      expect(orderCards.length).toBe(100);
    });

    it('should debounce rapid refresh requests', async () => {
      render(
        <ThemeProvider>
          <KDSMainPage />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-card-1')).toBeInTheDocument();
      });

      (ApiService.get as jest.Mock).mockClear();

      const refreshButton = screen.getByLabelText('Atualizar pedidos');
      
      // Click refresh multiple times rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        // Should not make 10 API calls
        expect(ApiService.get).toHaveBeenCalledTimes(2); // Orders and stations
      });
    });
  });
});