import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductCard from '../../src/ui/ProductCard';
import { Product } from '../../src/services/productService';

describe('ProductCard Component', () => {
  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    description: 'This is a test product description',
    price: 19.99,
    image_url: '/test-image.jpg',
    category_id: 1
  };

  const mockOnAddToCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('This is a test product description')).toBeInTheDocument();
    expect(screen.getByText('R$ 19,99')).toBeInTheDocument();
    expect(screen.getByAltText('Test Product')).toHaveAttribute('src', '/test-image.jpg');
  });

  test('calls onAddToCart when clicked', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const button = screen.getByText('Adicionar');
    fireEvent.click(button);

    expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  test('handles missing image gracefully', () => {
    const productWithoutImage = { ...mockProduct, image_url: '' };
    render(<ProductCard product={productWithoutImage} onAddToCart={mockOnAddToCart} />);

    // When no image URL is provided, a fallback emoji is shown instead
    const fallbackEmoji = screen.getByText('🍔');
    expect(fallbackEmoji).toBeInTheDocument();
  });

  test('formats large prices correctly', () => {
    const expensiveProduct = { ...mockProduct, price: 1234.56 };
    render(<ProductCard product={expensiveProduct} onAddToCart={mockOnAddToCart} />);

    expect(screen.getByText('R$ 1.234,56')).toBeInTheDocument();
  });

  test('displays long product names', () => {
    const longNameProduct = {
      ...mockProduct,
      name: 'This is an extremely long product name that should be truncated to avoid breaking the layout of the card component'
    };
    render(<ProductCard product={longNameProduct} onAddToCart={mockOnAddToCart} />);

    const productName = screen.getByText(longNameProduct.name);
    expect(productName).toBeInTheDocument();
  });

  test('displays long descriptions', () => {
    const longDescProduct = {
      ...mockProduct,
      description: 'This is a very long description that goes on and on and on to test whether the component properly truncates long text to maintain a consistent card height across all products in the grid layout'
    };
    render(<ProductCard product={longDescProduct} onAddToCart={mockOnAddToCart} />);

    const description = screen.getByText(longDescProduct.description);
    expect(description).toBeInTheDocument();
  });

  test('renders add to cart button', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const button = screen.getByText('Adicionar');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('add-to-cart-button');
  });

  test('card is clickable', () => {
    const { container } = render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const card = container.querySelector('.product-card');
    expect(card).toBeInTheDocument();
    
    // Click the card itself
    fireEvent.click(card!);
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
  });
});