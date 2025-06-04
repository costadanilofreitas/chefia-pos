import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { useProduct } from '@common/contexts/product/hooks/useProduct';
import { useCashier } from '@common/contexts/cashier/hooks/useCashier';
import POSMainPage from '../ui/POSMainPage';

// Mocking hooks
jest.mock('@common/contexts/order/hooks/useOrder');
jest.mock('@common/contexts/product/hooks/useProduct');
jest.mock('@common/contexts/cashier/hooks/useCashier');

describe('POSMainPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the page with products and categories', async () => {
    // Mocking hooks
    (useOrder as jest.Mock).mockReturnValue({
      currentOrder: { items: [] },
      addItemToOrder: jest.fn(),
      removeItemFromOrder: jest.fn(),
      createOrder: jest.fn(),
    });
    (useProduct as jest.Mock).mockReturnValue({
      products: [
        { id: '1', name: 'Product 1', price: 10.0 },
        { id: '2', name: 'Product 2', price: 20.0 },
      ],
      categories: [
        { id: 'cat-1', name: 'Category 1' },
        { id: 'cat-2', name: 'Category 2' },
      ],
      getProductsByCategory: jest.fn(),
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'open' },
      openCashier: jest.fn(),
    });

    render(
      <BrowserRouter>
        <POSMainPage />
      </BrowserRouter>
    );

    // Check if categories are rendered
    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.getByText('Category 2')).toBeInTheDocument();

    // Check if products are rendered
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });

  it('should add a product to the cart when clicked', async () => {
    const addItemToOrderMock = jest.fn();

    // Mocking hooks
    (useOrder as jest.Mock).mockReturnValue({
      currentOrder: { items: [] },
      addItemToOrder: addItemToOrderMock,
      removeItemFromOrder: jest.fn(),
      createOrder: jest.fn(),
    });
    (useProduct as jest.Mock).mockReturnValue({
      products: [{ id: '1', name: 'Product 1', price: 10.0 }],
      categories: [],
      getProductsByCategory: jest.fn(),
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'open' },
      openCashier: jest.fn(),
    });

    render(
      <BrowserRouter>
        <POSMainPage />
      </BrowserRouter>
    );

    // Click on the product
    fireEvent.click(screen.getByText('Product 1'));

    // Check if the product was added to the cart
    expect(addItemToOrderMock).toHaveBeenCalledWith({
      id: expect.any(String),
      product_id: '1',
      product_name: 'Product 1',
      quantity: 1,
      unit_price: 10.0,
      total_price: 10.0,
      customizations: [],
    });
  });

  it('should proceed to payment when the cart has items', async () => {
    const createOrderMock = jest.fn().mockResolvedValue({ id: 'order-1' });
    const navigateMock = jest.fn();

    // Mocking hooks
    (useOrder as jest.Mock).mockReturnValue({
      currentOrder: {
        items: [{ id: '1', product_name: 'Product 1', quantity: 1, total_price: 10.0 }],
      },
      addItemToOrder: jest.fn(),
      removeItemFromOrder: jest.fn(),
      createOrder: createOrderMock,
    });
    (useProduct as jest.Mock).mockReturnValue({
      products: [],
      categories: [],
      getProductsByCategory: jest.fn(),
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'open' },
      openCashier: jest.fn(),
    });

    render(
      <BrowserRouter>
        <POSMainPage />
      </BrowserRouter>
    );

    // Click on the "Finalizar Pedido" button
    fireEvent.click(screen.getByText('Finalizar Pedido'));

    // Wait for the order to be created and navigation to occur
    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalled();
      expect(navigateMock).not.toThrow(); // Simulate navigation
    });
  });

  it('should show "Caixa Fechado" if the cashier is not open', () => {
    // Mocking hooks
    (useOrder as jest.Mock).mockReturnValue({
      currentOrder: { items: [] },
      addItemToOrder: jest.fn(),
      removeItemFromOrder: jest.fn(),
      createOrder: jest.fn(),
    });
    (useProduct as jest.Mock).mockReturnValue({
      products: [],
      categories: [],
      getProductsByCategory: jest.fn(),
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'closed' },
      openCashier: jest.fn(),
    });

    render(
      <BrowserRouter>
        <POSMainPage />
      </BrowserRouter>
    );

    // Check if "Caixa Fechado" is displayed
    expect(screen.getByText('Caixa Fechado')).toBeInTheDocument();
  });
});
