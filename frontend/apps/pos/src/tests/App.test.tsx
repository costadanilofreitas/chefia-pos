import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock all the hooks and components
jest.mock('../hooks/mocks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    hasPermission: jest.fn()
  })
}));

// Mock all UI components to avoid complex rendering
jest.mock('../ui/BusinessDayPage', () => {
  return function MockBusinessDayPage() {
    return <div data-testid="business-day-page">Business Day Page</div>;
  };
});

jest.mock('../ui/CashWithdrawalPage', () => {
  return function MockCashWithdrawalPage() {
    return <div data-testid="cash-withdrawal-page">Cash Withdrawal Page</div>;
  };
});

jest.mock('../ui/CashierOpeningClosingPage', () => {
  return function MockCashierOpeningClosingPage() {
    return <div data-testid="cashier-page">Cashier Page</div>;
  };
});

jest.mock('../ui/POSMainPage', () => {
  return function MockPOSMainPage() {
    return <div data-testid="pos-main-page">POS Main Page</div>;
  };
});

jest.mock('../ui/POSOrderPage', () => {
  return function MockPOSOrderPage() {
    return <div data-testid="pos-order-page">POS Order Page</div>;
  };
});

jest.mock('../ui/POSPaymentPage', () => {
  return function MockPOSPaymentPage() {
    return <div data-testid="pos-payment-page">POS Payment Page</div>;
  };
});

describe('App Component', () => {
  it('should be importable', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pos/1']}>
        <App />
      </MemoryRouter>
    );
    expect(container).toBeInTheDocument();
  });

  it('should handle different routes', () => {
    
    // Test root route
    const { container: container1 } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(container1).toBeInTheDocument();

    // Test pos route
    const { container: container2 } = render(
      <MemoryRouter initialEntries={['/pos/1']}>
        <App />
      </MemoryRouter>
    );
    expect(container2).toBeInTheDocument();
  });
});

