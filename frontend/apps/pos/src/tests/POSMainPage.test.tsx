import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import POSMainPage from '../ui/POSMainPage';

// Mock hooks directly
jest.mock('../hooks/mocks/useOrder', () => ({
  useOrder: () => ({
    currentOrder: { items: [] },
    addItemToOrder: jest.fn(),
    removeItemFromOrder: jest.fn(),
    createOrder: jest.fn(),
  })
}));

jest.mock('../hooks/mocks/useProduct', () => ({
  useProduct: () => ({
    products: [
      { id: '1', name: 'Product 1', price: 10.0 },
      { id: '2', name: 'Product 2', price: 20.0 },
    ],
    categories: [
      { id: 'cat-1', name: 'Category 1' },
      { id: 'cat-2', name: 'Category 2' },
    ],
    getProductsByCategory: jest.fn(),
  })
}));

jest.mock('../hooks/mocks/useCashier', () => ({
  useCashier: () => ({
    currentCashier: { id: '1', status: 'open' },
    openCashier: jest.fn(),
  })
}));

describe('POSMainPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the page with products and categories', async () => {
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
});
