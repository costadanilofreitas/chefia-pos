import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// Mock all the hooks and components
jest.mock('../src/hooks/useAuth', () => ({
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
jest.mock('../src/ui/BusinessDayPage', () => {
  return function MockBusinessDayPage() {
    return <div data-testid="business-day-page">Business Day Page</div>;
  };
});

jest.mock('../src/ui/CashWithdrawalPage', () => {
  return function MockCashWithdrawalPage() {
    return <div data-testid="cash-withdrawal-page">Cash Withdrawal Page</div>;
  };
});

jest.mock('../src/ui/CashierOpeningClosingPage', () => {
  return function MockCashierOpeningClosingPage() {
    return <div data-testid="cashier-page">Cashier Page</div>;
  };
});

jest.mock('../src/ui/MainPage', () => {
  return function MockMainPage() {
    return <div data-testid="main-page">Main Page</div>;
  };
});

jest.mock('../src/ui/PaymentPage', () => {
  return function MockPaymentPage() {
    return <div data-testid="payment-page">Payment Page</div>;
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

