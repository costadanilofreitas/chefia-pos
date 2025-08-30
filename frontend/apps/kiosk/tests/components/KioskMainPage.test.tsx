import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import KioskMainPage from '../../src/ui/KioskMainPage';
import { productService } from '../../src/services/productService';

// Mock the services
jest.mock('../../src/services/productService', () => ({
  productService: {
    getCategories: jest.fn(() => Promise.resolve([])),
    getProducts: jest.fn(() => Promise.resolve([])),
    getProductsByCategory: jest.fn(() => Promise.resolve([])),
    searchProducts: jest.fn(() => Promise.resolve([]))
  }
}));

describe('KioskMainPage Component', () => {
  // Setup mock data
  const mockCategories = [
    { id: 1, name: 'Lanches' },
    { id: 2, name: 'Bebidas' },
    { id: 3, name: 'Sobremesas' }
  ];
  
  const mockProducts = [
    {
      id: 1,
      name: 'Hambúrguer Clássico',
      description: 'Pão, hambúrguer, queijo, alface, tomate e molho especial',
      price: 25.90,
      image_url: '/images/burger.jpg',
      category_id: 1
    },
    {
      id: 2,
      name: 'Refrigerante Cola',
      description: 'Lata 350ml',
      price: 6.50,
      image_url: '/images/cola.jpg',
      category_id: 2
    },
    {
      id: 3,
      name: 'Milk Shake Chocolate',
      description: 'Milk shake cremoso de chocolate com calda e chantilly',
      price: 15.90,
      image_url: '/images/milkshake.jpg',
      category_id: 3
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (productService.getCategories as jest.Mock).mockResolvedValue(mockCategories);
    (productService.getProducts as jest.Mock).mockResolvedValue(mockProducts);
    (productService.getProductsByCategory as jest.Mock).mockImplementation((categoryId) => {
      return Promise.resolve(mockProducts.filter(p => p.category_id === categoryId));
    });
    (productService.searchProducts as jest.Mock).mockImplementation((term) => {
      return Promise.resolve(mockProducts.filter(p => 
        p.name.toLowerCase().includes(term.toLowerCase()) || 
        p.description.toLowerCase().includes(term.toLowerCase())
      ));
    });
  });

  test('renders loading state initially', () => {
    // Delay the mock responses to capture loading state
    (productService.getCategories as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockCategories), 100))
    );
    (productService.getProducts as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockProducts), 100))
    );

    render(<KioskMainPage />);

    expect(screen.getByText('Carregando produtos...')).toBeInTheDocument();
  });

  test('loads and displays products after loading', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(productService.getCategories).toHaveBeenCalled();
      expect(productService.getProducts).toHaveBeenCalled();
      expect(screen.getByText('Faça seu Pedido')).toBeInTheDocument();
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
      expect(screen.getByText('Refrigerante Cola')).toBeInTheDocument();
      expect(screen.getByText('Milk Shake Chocolate')).toBeInTheDocument();
    });
  });

  test('filters products when category is selected', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bebidas')).toBeInTheDocument();
    });

    // Click on Bebidas category tab
    const bebidasTab = screen.getByRole('tab', { name: /Bebidas/i });
    fireEvent.click(bebidasTab);

    await waitFor(() => {
      expect(productService.getProductsByCategory).toHaveBeenCalledWith(2);
      expect(screen.getByText('Refrigerante Cola')).toBeInTheDocument();
      expect(screen.queryByText('Hambúrguer Clássico')).not.toBeInTheDocument();
    });
  });

  test('searches products when search term is entered', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar produtos...')).toBeInTheDocument();
    });

    // Enter search term
    const searchInput = screen.getByPlaceholderText('Buscar produtos...');
    fireEvent.change(searchInput, { target: { value: 'cola' } });

    // Wait for debounce to complete
    await waitFor(() => {
      expect(productService.searchProducts).toHaveBeenCalledWith('cola');
    }, { timeout: 2000 });

    // Then check for filtered results
    await waitFor(() => {
      expect(screen.getByText('Refrigerante Cola')).toBeInTheDocument();
      // Note: The other products might still be visible during the search
      // as the component shows products while searching
    });
  });

  test('adds product to cart when clicked', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
    });

    // Find the "Adicionar" button for the first product
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);

    // Check if cart counter is updated
    await waitFor(() => {
      expect(screen.getByText('Carrinho (1)')).toBeInTheDocument();
    });

    // Check if total is shown in the cart summary
    await waitFor(() => {
      expect(screen.getByText('Total: R$ 25,90')).toBeInTheDocument();
    });
  });

  test('increases quantity when adding same product multiple times', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
    });

    // Find the "Adicionar" button for the first product and click twice
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);

    // Check if cart counter shows only 1 item type (not quantity)
    await waitFor(() => {
      expect(screen.getByText('Carrinho (1)')).toBeInTheDocument();
    });

    // Check if total is doubled
    await waitFor(() => {
      expect(screen.getByText('Total: R$ 51,80')).toBeInTheDocument();
    });
  });

  test('shows empty state when no products match search', async () => {
    (productService.searchProducts as jest.Mock).mockResolvedValue([]);
    
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar produtos...')).toBeInTheDocument();
    });

    // Enter search term that won't match any products
    const searchInput = screen.getByPlaceholderText('Buscar produtos...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
    }, { timeout: 2000 }); // Increased timeout for debounce
  });

  test('handles API errors gracefully', async () => {
    (productService.getProducts as jest.Mock).mockRejectedValue(new Error('Failed to fetch products'));
    (productService.getCategories as jest.Mock).mockRejectedValue(new Error('Failed to fetch categories'));
    
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar produtos. Por favor, tente novamente.')).toBeInTheDocument();
    });

    // Should show fallback products
    await waitFor(() => {
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
    });
  });

  test('shows cart summary when products are added', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
      expect(screen.getByText('Refrigerante Cola')).toBeInTheDocument();
    });

    // Add two different products to cart
    const addButtons = screen.getAllByText('Adicionar');
    fireEvent.click(addButtons[0]); // Add burger
    fireEvent.click(addButtons[1]); // Add cola

    // Check if cart counter shows 2 items
    await waitFor(() => {
      expect(screen.getByText('Carrinho (2)')).toBeInTheDocument();
    });

    // Check if total is correct
    await waitFor(() => {
      expect(screen.getByText('Total: R$ 32,40')).toBeInTheDocument();
      expect(screen.getByText('Finalizar Pedido')).toBeInTheDocument();
    });
  });

  test('clears search when clear button is clicked', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar produtos...')).toBeInTheDocument();
    });

    // Enter search term
    const searchInput = screen.getByPlaceholderText('Buscar produtos...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'cola' } });

    await waitFor(() => {
      expect(searchInput.value).toBe('cola');
    });

    // Find and click the clear button (assuming it appears when there's text)
    const clearButton = screen.getByLabelText('Limpar busca');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(searchInput.value).toBe('');
      // All products should be shown again
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
      expect(screen.getByText('Refrigerante Cola')).toBeInTheDocument();
      expect(screen.getByText('Milk Shake Chocolate')).toBeInTheDocument();
    });
  });

  test('shows all categories tab correctly', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      // Check if "Todos" tab is present (added by the component)
      expect(screen.getByRole('tab', { name: /Todos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Lanches/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Bebidas/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Sobremesas/i })).toBeInTheDocument();
    });

    // "Todos" tab should be selected by default
    const todosTab = screen.getByRole('tab', { name: /Todos/i });
    expect(todosTab).toHaveAttribute('aria-selected', 'true');
  });
});