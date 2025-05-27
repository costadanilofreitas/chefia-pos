import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import KDSDashboard from '../ui/KDSDashboard';
import { kdsService } from '../services/kdsService';

// Mock the services
jest.mock('../services/kdsService', () => ({
  kdsService: {
    getOrders: jest.fn(),
    getStations: jest.fn(),
    updateItemStatus: jest.fn(),
    completeOrder: jest.fn()
  }
}));

describe('KDSDashboard Component', () => {
  // Setup mock data
  const mockStations = [
    { id: 'grill', name: 'Grelha' },
    { id: 'fry', name: 'Fritadeira' },
    { id: 'salad', name: 'Saladas' },
    { id: 'dessert', name: 'Sobremesas' }
  ];
  
  const mockOrders = [
    {
      order_id: 'order1',
      order_number: '001',
      source: 'pos',
      priority: 'high',
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
      items: [
        {
          item_id: 'item1',
          name: 'Hambúrguer',
          quantity: 2,
          status: 'preparing',
          station: 'grill',
          preparation_time: 10
        },
        {
          item_id: 'item2',
          name: 'Batata Frita',
          quantity: 1,
          status: 'preparing',
          station: 'fry',
          preparation_time: 5
        }
      ],
      table_number: '3'
    },
    {
      order_id: 'order2',
      order_number: '002',
      source: 'ifood',
      priority: 'medium',
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60000).toISOString(),
      items: [
        {
          item_id: 'item3',
          name: 'Salada',
          quantity: 1,
          status: 'ready',
          station: 'salad',
          preparation_time: 3
        }
      ],
      customer_name: 'Cliente iFood'
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    kdsService.getOrders.mockResolvedValue(mockOrders);
    kdsService.getStations.mockResolvedValue(mockStations);
    kdsService.updateItemStatus.mockResolvedValue(true);
    kdsService.completeOrder.mockResolvedValue(true);
    
    // Mock timer
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders loading state initially', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    expect(screen.getByText('Carregando pedidos...')).toBeInTheDocument();
  });

  test('loads and displays orders after loading', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(kdsService.getOrders).toHaveBeenCalled();
      expect(kdsService.getStations).toHaveBeenCalled();
      expect(screen.getByText('Kitchen Display System')).toBeInTheDocument();
      expect(screen.getByText('Pedido #001')).toBeInTheDocument();
      expect(screen.getByText('Pedido #002')).toBeInTheDocument();
      expect(screen.getByText('2x Hambúrguer')).toBeInTheDocument();
      expect(screen.getByText('1x Batata Frita')).toBeInTheDocument();
      expect(screen.getByText('1x Salada')).toBeInTheDocument();
    });
  });

  test('filters orders by station', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Grelha')).toBeInTheDocument();
    });

    // Click on Grelha station
    fireEvent.click(screen.getByText('Grelha'));

    await waitFor(() => {
      // Should show order1 (has grill items) but not order2 (no grill items)
      expect(screen.getByText('Pedido #001')).toBeInTheDocument();
      expect(screen.queryByText('Pedido #002')).not.toBeInTheDocument();
    });
  });

  test('updates item status when button is clicked', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Marcar Pronto')[0]).toBeInTheDocument();
    });

    // Click on "Marcar Pronto" button for first item
    fireEvent.click(screen.getAllByText('Marcar Pronto')[0]);

    await waitFor(() => {
      expect(kdsService.updateItemStatus).toHaveBeenCalledWith('order1', 'item1', 'ready');
    });
  });

  test('completes order when complete button is clicked', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Completar Pedido')[0]).toBeInTheDocument();
    });

    // Click on "Completar Pedido" button for first order
    fireEvent.click(screen.getAllByText('Completar Pedido')[0]);

    await waitFor(() => {
      expect(kdsService.completeOrder).toHaveBeenCalledWith('order1');
    });
  });

  test('auto-refreshes orders when enabled', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Atualização Automática')).toBeInTheDocument();
    });

    // Verify auto-refresh is enabled by default
    const autoRefreshSwitch = screen.getByLabelText('Atualização Automática');
    expect(autoRefreshSwitch).toBeChecked();

    // Clear mock calls from initial load
    kdsService.getOrders.mockClear();

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify getOrders was called again
    await waitFor(() => {
      expect(kdsService.getOrders).toHaveBeenCalled();
    });

    // Disable auto-refresh
    fireEvent.click(autoRefreshSwitch);
    
    // Clear mock calls again
    kdsService.getOrders.mockClear();

    // Fast-forward another 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify getOrders was not called
    expect(kdsService.getOrders).not.toHaveBeenCalled();
  });

  test('manually refreshes orders when refresh button is clicked', async () => {
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Atualizar')).toBeInTheDocument();
    });

    // Clear mock calls from initial load
    kdsService.getOrders.mockClear();

    // Click refresh button
    fireEvent.click(screen.getByText('Atualizar'));

    await waitFor(() => {
      expect(kdsService.getOrders).toHaveBeenCalled();
    });
  });

  test('shows empty state when no orders are available', async () => {
    kdsService.getOrders.mockResolvedValue([]);
    
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum pedido pendente')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    kdsService.getOrders.mockRejectedValue(new Error('Failed to fetch orders'));
    
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar pedidos. Tente novamente.')).toBeInTheDocument();
    });
  });

  test('handles item status update errors', async () => {
    kdsService.updateItemStatus.mockRejectedValue(new Error('Failed to update status'));
    
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Marcar Pronto')[0]).toBeInTheDocument();
    });

    // Click on "Marcar Pronto" button for first item
    fireEvent.click(screen.getAllByText('Marcar Pronto')[0]);

    await waitFor(() => {
      expect(screen.getByText('Falha ao atualizar status do item. Tente novamente.')).toBeInTheDocument();
    });
  });

  test('handles order completion errors', async () => {
    kdsService.completeOrder.mockRejectedValue(new Error('Failed to complete order'));
    
    await act(async () => {
      render(<KDSDashboard />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Completar Pedido')[0]).toBeInTheDocument();
    });

    // Click on "Completar Pedido" button for first order
    fireEvent.click(screen.getAllByText('Completar Pedido')[0]);

    await waitFor(() => {
      expect(screen.getByText('Falha ao completar pedido. Tente novamente.')).toBeInTheDocument();
    });
  });
});
