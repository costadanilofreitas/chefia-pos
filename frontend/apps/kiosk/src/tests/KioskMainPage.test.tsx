import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import KioskMainPage from '../ui/KioskMainPage';
import { productService } from '../services/productService';

// Mock the services
jest.mock('../services/productService', () => ({
  productService: {
    getCategories: jest.fn(),
    getProducts: jest.fn(),
    getProductsByCategory: jest.fn(),
    searchProducts: jest.fn()
  }
}));

describe('KioskMainPage Component', () => {
  // Setup mock data
  const mockCategories = [
    { id: 1, name: 'Todos' },
    { id: 2, name: 'Lanches' },
    { id: 3, name: 'Bebidas' },
    { id: 4, name: 'Sobremesas' }
  ];
  
  const mockProducts = [
    {
      id: 1,
      name: 'Hambúrguer Clássico',
      description: 'Pão, hambúrguer, queijo, alface, tomate e molho especial',
      price: 25.90,
      image_url: '/images/burger.jpg',
      category_id: 2
    },
    {
      id: 2,
      name: 'Refrigerante Cola',
      description: 'Lata 350ml',
      price: 6.50,
      image_url: '/images/cola.jpg',
      category_id: 3
    },
    {
      id: 3,
      name: 'Milk Shake Chocolate',
      description: 'Milk shake cremoso de chocolate com calda e chantilly',
      price: 15.90,
      image_url: '/images/milkshake.jpg',
      category_id: 4
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    productService.getCategories.mockResolvedValue(mockCategories);
    productService.getProducts.mockResolvedValue(mockProducts);
    productService.getProductsByCategory.mockImplementation((categoryId) => {
      return Promise.resolve(mockProducts.filter(p => p.category_id === categoryId));
    });
    productService.searchProducts.mockImplementation((term) => {
      return Promise.resolve(mockProducts.filter(p => 
        p.name.toLowerCase().includes(term.toLowerCase()) || 
        p.description.toLowerCase().includes(term.toLowerCase())
      ));
    });
  });

  test('renders loading state initially', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

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

    // Click on Bebidas category
    fireEvent.click(screen.getByText('Bebidas'));

    await waitFor(() => {
      expect(productService.getProductsByCategory).toHaveBeenCalledWith(3);
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

    await waitFor(() => {
      expect(productService.searchProducts).toHaveBeenCalledWith('cola');
      expect(screen.getByText('Refrigerante Cola')).toBeInTheDocument();
      expect(screen.queryByText('Hambúrguer Clássico')).not.toBeInTheDocument();
      expect(screen.queryByText('Milk Shake Chocolate')).not.toBeInTheDocument();
    });
  });

  test('adds product to cart when clicked', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
    });

    // Find the product card and click on it
    const productCard = screen.getByText('Hambúrguer Clássico').closest('.product-card');
    fireEvent.click(productCard);

    // Check if product is added to cart
    await waitFor(() => {
      expect(screen.getByText('Carrinho (1)')).toBeInTheDocument();
      expect(screen.getByText('Total: R$ 25.90')).toBeInTheDocument();
    });
  });

  test('increases quantity when adding same product multiple times', async () => {
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Hambúrguer Clássico')).toBeInTheDocument();
    });

    // Find the product card and click on it twice
    const productCard = screen.getByText('Hambúrguer Clássico').closest('.product-card');
    fireEvent.click(productCard);
    fireEvent.click(productCard);

    // Check if product quantity is increased
    await waitFor(() => {
      expect(screen.getByText('Carrinho (1)')).toBeInTheDocument();
      expect(screen.getByText('Total: R$ 51.80')).toBeInTheDocument();
    });
  });

  test('shows empty state when no products match search', async () => {
    productService.searchProducts.mockResolvedValue([]);
    
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
    });
  });

  test('handles API errors gracefully', async () => {
    productService.getCategories.mockRejectedValue(new Error('Failed to fetch categories'));
    productService.getProducts.mockRejectedValue(new Error('Failed to fetch products'));
    
    await act(async () => {
      render(<KioskMainPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar produtos. Por favor, tente novamente.')).toBeInTheDocument();
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
    const burgerCard = screen.getByText('Hambúrguer Clássico').closest('.product-card');
    const colaCard = screen.getByText('Refrigerante Cola').closest('.product-card');
    
    fireEvent.click(burgerCard);
    fireEvent.click(colaCard);

    // Check if cart summary is shown with correct total
    await waitFor(() => {
      expect(screen.getByText('Carrinho (2)')).toBeInTheDocument();
      expect(screen.getByText('Total: R$ 32.40')).toBeInTheDocument();
      expect(screen.getByText('Finalizar Pedido')).toBeInTheDocument();
    });
  });
});
