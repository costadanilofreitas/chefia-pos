import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import WaiterMainPage from '../ui/WaiterMainPage';
import { waiterService } from '../services/waiterService';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { useOrder } from '@common/contexts/order/hooks/useOrder';

// Mock the services and hooks
jest.mock('../services/waiterService', () => ({
  waiterService: {
    getTables: jest.fn(),
    getOrders: jest.fn(),
    getOrdersByTable: jest.fn(),
    createOrder: jest.fn(),
    updateTableStatus: jest.fn(),
    deliverOrderItems: jest.fn(),
    getMenu: jest.fn()
  }
}));

jest.mock('@common/contexts/auth/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('@common/contexts/order/hooks/useOrder', () => ({
  useOrder: jest.fn()
}));

describe('WaiterMainPage Component', () => {
  // Setup mock data
  const mockUser = { id: 'user123', name: 'Test User' };
  const mockTables = [
    { id: 1, number: 1, status: 'available', seats: 4, shape: 'square', x: 100, y: 100 },
    { id: 2, number: 2, status: 'occupied', seats: 2, shape: 'round', x: 250, y: 100 },
    { id: 3, number: 3, status: 'reserved', seats: 6, shape: 'rectangle', x: 400, y: 100 }
  ];
  const mockOrders = [
    {
      id: 1,
      table_id: 2,
      status: 'in_progress',
      items: [
        { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.90, status: 'preparing' },
        { id: 2, name: 'Refrigerante', quantity: 2, price: 6.50, status: 'ready' }
      ],
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    }
  ];
  const mockOrderHooks = {
    createOrder: jest.fn(),
    getOrdersByTable: jest.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useOrder as jest.Mock).mockReturnValue(mockOrderHooks);
    waiterService.getTables.mockResolvedValue(mockTables);
    waiterService.getOrders.mockResolvedValue(mockOrders);
    waiterService.getOrdersByTable.mockResolvedValue(mockOrders);
    waiterService.createOrder.mockResolvedValue({
      id: 2,
      table_id: 1,
      status: 'new',
      items: [],
      created_at: new Date().toISOString()
    });
    waiterService.updateTableStatus.mockResolvedValue(true);
    waiterService.deliverOrderItems.mockResolvedValue(true);
  });

  test('renders loading state initially', async () => {
    await act(async () => {
      render(<WaiterMainPage />);
    });

    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });

  test('loads and displays tables and orders after loading', async () => {
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(waiterService.getTables).toHaveBeenCalled();
      expect(waiterService.getOrders).toHaveBeenCalled();
      expect(screen.getByText('Garçom')).toBeInTheDocument();
      expect(screen.getByText('Layout do Restaurante')).toBeInTheDocument();
      expect(screen.getByText('Pedidos Ativos')).toBeInTheDocument();
    });
  });

  test('switches between tabs when clicked', async () => {
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mesas')).toBeInTheDocument();
      expect(screen.getByText('Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Cardápio')).toBeInTheDocument();
    });

    // Initially should show Tables tab
    expect(screen.getByText('Layout do Restaurante')).toBeInTheDocument();
    
    // Click on Orders tab
    fireEvent.click(screen.getByText('Pedidos'));
    
    await waitFor(() => {
      expect(screen.getByText('Pedidos Ativos')).toBeInTheDocument();
      expect(screen.getByText('Pedido #1')).toBeInTheDocument();
    });
    
    // Click on Menu tab
    fireEvent.click(screen.getByText('Cardápio'));
    
    await waitFor(() => {
      expect(screen.getByText('Visualização do cardápio para consulta rápida')).toBeInTheDocument();
    });
  });

  test('selects table when clicked', async () => {
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Layout do Restaurante')).toBeInTheDocument();
    });

    // Mock the table selection event from TableLayoutEditor
    const tableLayoutEditor = screen.getByText('Layout do Restaurante').closest('.mb-2');
    const mockEvent = new CustomEvent('tableSelect', { detail: { tableId: 2 } });
    act(() => {
      tableLayoutEditor.dispatchEvent(mockEvent);
    });

    await waitFor(() => {
      expect(waiterService.getOrdersByTable).toHaveBeenCalledWith(2);
    });
  });

  test('creates new order when button is clicked', async () => {
    // Mock selected table
    waiterService.getTables.mockImplementation(() => {
      // Simulate table selection in the component
      setTimeout(() => {
        const tableLayoutEditor = screen.getByText('Layout do Restaurante').closest('.mb-2');
        const mockEvent = new CustomEvent('tableSelect', { detail: { tableId: 2 } });
        tableLayoutEditor.dispatchEvent(mockEvent);
      }, 100);
      
      return Promise.resolve(mockTables);
    });
    
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mesa 2')).toBeInTheDocument();
    });

    // Click on new order button
    const newOrderButton = screen.getByText('Novo Pedido');
    fireEvent.click(newOrderButton);

    await waitFor(() => {
      expect(waiterService.createOrder).toHaveBeenCalledWith(2, []);
    });
  });

  test('delivers items when button is clicked', async () => {
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mesas')).toBeInTheDocument();
    });

    // Click on Orders tab
    fireEvent.click(screen.getByText('Pedidos'));
    
    await waitFor(() => {
      expect(screen.getByText('Pedido #1')).toBeInTheDocument();
      expect(screen.getByText('Ver Detalhes')).toBeInTheDocument();
    });
    
    // Click on "Ver Detalhes" button
    fireEvent.click(screen.getByText('Ver Detalhes'));
    
    // Mock order with ready items
    waiterService.getOrders.mockResolvedValue([{
      ...mockOrders[0],
      status: 'ready',
      items: [
        { id: 1, name: 'Hambúrguer', quantity: 2, price: 25.90, status: 'ready' },
        { id: 2, name: 'Refrigerante', quantity: 2, price: 6.50, status: 'ready' }
      ]
    }]);
    
    // Refresh orders
    await act(async () => {
      fireEvent.click(screen.getByText('Pedidos'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Entregar')).toBeInTheDocument();
    });
    
    // Click on "Entregar" button
    fireEvent.click(screen.getByText('Entregar'));
    
    await waitFor(() => {
      expect(waiterService.deliverOrderItems).toHaveBeenCalledWith(1, [1, 2]);
    });
  });

  test('handles API errors gracefully', async () => {
    waiterService.getTables.mockRejectedValue(new Error('Failed to fetch tables'));
    waiterService.getOrders.mockRejectedValue(new Error('Failed to fetch orders'));
    
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar dados. Tente novamente.')).toBeInTheDocument();
    });
  });

  test('updates table status when status is changed', async () => {
    // Mock selected table
    waiterService.getTables.mockImplementation(() => {
      // Simulate table selection in the component
      setTimeout(() => {
        const tableLayoutEditor = screen.getByText('Layout do Restaurante').closest('.mb-2');
        const mockEvent = new CustomEvent('tableSelect', { detail: { tableId: 1 } });
        tableLayoutEditor.dispatchEvent(mockEvent);
      }, 100);
      
      return Promise.resolve(mockTables);
    });
    
    await act(async () => {
      render(<WaiterMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Mesa 1')).toBeInTheDocument();
      expect(screen.getByText('Status: Disponível')).toBeInTheDocument();
    });

    // Mock status update
    const statusUpdateButton = screen.getByText('Atualizar Status');
    fireEvent.click(statusUpdateButton);
    
    // Select "Ocupada" from dropdown
    const statusSelect = screen.getByLabelText('Novo Status:');
    fireEvent.change(statusSelect, { target: { value: 'occupied' } });
    
    // Click confirm
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(waiterService.updateTableStatus).toHaveBeenCalledWith(1, 'occupied');
    });
  });
});
