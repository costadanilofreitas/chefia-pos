import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import POSMainPage from '../ui/POSMainPage';
import { posService } from '../services/posService';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';

// Mock the services and hooks
jest.mock('../services/posService', () => ({
  posService: {
    getCurrentCashierSession: jest.fn(),
    openCashierSession: jest.fn(),
    closeCashierSession: jest.fn(),
    getCategories: jest.fn(),
    getProducts: jest.fn(),
    getProductsByCategory: jest.fn(),
    searchProducts: jest.fn(),
    createOrder: jest.fn(),
    processPayment: jest.fn(),
    updateOrderStatus: jest.fn(),
    printReceipt: jest.fn()
  }
}));

jest.mock('@common/contexts/auth/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

describe('POSMainPage Component', () => {
  // Setup mock data
  const mockUser = { id: 'user123', name: 'Test User' };
  const mockCashierSession = {
    id: 'session123',
    terminal_id: 'term001',
    employee_id: 'user123',
    employee_name: 'Test User',
    start_time: '2025-05-27T06:00:00Z',
    starting_amount: 100,
    current_amount: 100,
    status: 'open'
  };
  const mockCategories = [
    { id: 'cat1', name: 'Beverages', sort_order: 1 },
    { id: 'cat2', name: 'Food', sort_order: 2 }
  ];
  const mockProducts = [
    { 
      id: 'prod1', 
      name: 'Coffee', 
      description: 'Hot coffee', 
      price: 5.0, 
      category_id: 'cat1',
      tax_exempt: false
    },
    { 
      id: 'prod2', 
      name: 'Sandwich', 
      description: 'Chicken sandwich', 
      price: 10.0, 
      category_id: 'cat2',
      tax_exempt: false
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    posService.getCurrentCashierSession.mockResolvedValue(null);
    posService.getCategories.mockResolvedValue(mockCategories);
    posService.getProducts.mockResolvedValue(mockProducts);
    posService.getProductsByCategory.mockImplementation((categoryId) => {
      return Promise.resolve(mockProducts.filter(p => p.category_id === categoryId));
    });
  });

  test('renders closed cashier state when no session exists', async () => {
    await act(async () => {
      render(<POSMainPage />);
    });

    expect(screen.getByText('Caixa Fechado')).toBeInTheDocument();
    expect(screen.getByText('Abrir Caixa')).toBeInTheDocument();
  });

  test('opens cashier when button is clicked and form submitted', async () => {
    posService.openCashierSession.mockResolvedValue(mockCashierSession);
    
    await act(async () => {
      render(<POSMainPage />);
    });

    // Click on open cashier button
    fireEvent.click(screen.getByText('Abrir Caixa'));
    
    // Fill the initial amount
    const initialAmountInput = screen.getByLabelText('Valor Inicial (R$)');
    fireEvent.change(initialAmountInput, { target: { value: '100' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Abrir Caixa', { selector: 'button' }));
    
    await waitFor(() => {
      expect(posService.openCashierSession).toHaveBeenCalledWith('user123', 100);
    });
  });

  test('renders main POS interface when cashier is open', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    
    await act(async () => {
      render(<POSMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Terminal de Vendas')).toBeInTheDocument();
      expect(screen.getByText('Fechar Caixa')).toBeInTheDocument();
      expect(screen.getByText('Produtos')).toBeInTheDocument();
      expect(screen.getByText('Carrinho')).toBeInTheDocument();
    });
  });

  test('loads and displays categories and products', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    
    await act(async () => {
      render(<POSMainPage />);
    });

    await waitFor(() => {
      expect(posService.getCategories).toHaveBeenCalled();
      expect(posService.getProducts).toHaveBeenCalled();
      expect(screen.getByText('Beverages')).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
    });
  });

  test('adds product to cart when clicked', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    
    await act(async () => {
      render(<POSMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });

    // Click on a product
    fireEvent.click(screen.getByText('Coffee'));

    await waitFor(() => {
      // Check if product is added to cart
      expect(screen.getByText('R$ 5.00')).toBeInTheDocument();
      // Check if cart total is updated
      expect(screen.getByText('R$ 5.50')).toBeInTheDocument(); // Including 10% tax
    });
  });

  test('creates order when finalizing order button is clicked', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    posService.createOrder.mockResolvedValue({
      id: 'order123',
      order_number: '001',
      items: [],
      subtotal: 5.0,
      tax: 0.5,
      total: 5.5,
      payment_status: 'pending',
      order_status: 'new',
      created_at: '2025-05-27T06:30:00Z',
      updated_at: '2025-05-27T06:30:00Z'
    });
    
    await act(async () => {
      render(<POSMainPage />);
    });

    // Add product to cart
    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Coffee'));

    // Click on finalize order button
    fireEvent.click(screen.getByText('Finalizar Pedido'));

    await waitFor(() => {
      expect(posService.createOrder).toHaveBeenCalled();
      expect(screen.getByText('Pagamento')).toBeInTheDocument();
      expect(screen.getByText('Dinheiro')).toBeInTheDocument();
      expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
      expect(screen.getByText('PIX')).toBeInTheDocument();
    });
  });

  test('processes payment when payment method is selected', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    posService.createOrder.mockResolvedValue({
      id: 'order123',
      order_number: '001',
      items: [],
      subtotal: 5.0,
      tax: 0.5,
      total: 5.5,
      payment_status: 'pending',
      order_status: 'new',
      created_at: '2025-05-27T06:30:00Z',
      updated_at: '2025-05-27T06:30:00Z'
    });
    posService.processPayment.mockResolvedValue({
      id: 'payment123',
      order_id: 'order123',
      amount: 5.5,
      payment_method: 'credit_card',
      status: 'completed',
      created_at: '2025-05-27T06:35:00Z'
    });
    posService.updateOrderStatus.mockResolvedValue(true);
    posService.printReceipt.mockResolvedValue(true);
    
    await act(async () => {
      render(<POSMainPage />);
    });

    // Add product to cart
    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Coffee'));

    // Click on finalize order button
    fireEvent.click(screen.getByText('Finalizar Pedido'));

    await waitFor(() => {
      expect(screen.getByText('Pagamento')).toBeInTheDocument();
    });

    // Select payment method
    fireEvent.click(screen.getByText('Cartão de Crédito'));

    await waitFor(() => {
      expect(posService.processPayment).toHaveBeenCalledWith('order123', {
        amount: 5.5,
        payment_method: 'credit_card'
      });
      expect(posService.updateOrderStatus).toHaveBeenCalledWith('order123', 'in_progress');
      expect(posService.printReceipt).toHaveBeenCalledWith('order123');
    });
  });

  test('closes cashier when close button is clicked', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    posService.closeCashierSession.mockResolvedValue({
      ...mockCashierSession,
      end_time: '2025-05-27T07:00:00Z',
      status: 'closed'
    });
    
    await act(async () => {
      render(<POSMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Fechar Caixa')).toBeInTheDocument();
    });

    // Click on close cashier button
    fireEvent.click(screen.getByText('Fechar Caixa'));

    await waitFor(() => {
      expect(posService.closeCashierSession).toHaveBeenCalledWith('session123', 100);
      expect(screen.getByText('Caixa fechado com sucesso!')).toBeInTheDocument();
    });
  });

  test('handles errors when loading data', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    posService.getCategories.mockRejectedValue(new Error('Failed to load categories'));
    
    await act(async () => {
      render(<POSMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar produtos. Alguns recursos podem estar indisponíveis.')).toBeInTheDocument();
    });
  });

  test('handles search functionality', async () => {
    posService.getCurrentCashierSession.mockResolvedValue(mockCashierSession);
    posService.searchProducts.mockResolvedValue([mockProducts[0]]);
    
    await act(async () => {
      render(<POSMainPage />);
    });

    // Enter search term
    const searchInput = screen.getByPlaceholderText('Buscar produtos...');
    fireEvent.change(searchInput, { target: { value: 'Coffee' } });
    
    // Click search button
    fireEvent.click(screen.getByText('Buscar'));

    await waitFor(() => {
      expect(posService.searchProducts).toHaveBeenCalledWith('Coffee');
      expect(screen.getByText('Coffee')).toBeInTheDocument();
      expect(screen.queryByText('Sandwich')).not.toBeInTheDocument();
    });
  });
});
