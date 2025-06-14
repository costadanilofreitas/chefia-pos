import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../hooks/mocks/useAuth';
import { useCashier } from '../hooks/mocks/useCashier';
import { useOrder } from '../hooks/mocks/useOrder';
import POSPaymentPage from '../ui/POSPaymentPage';
import PrinterService from '../services/PrinterService';

// Mocking hooks and services
jest.mock('../hooks/mocks/useAuth');
jest.mock('../hooks/mocks/useCashier');
jest.mock('../hooks/mocks/useOrder');
jest.mock('../services/PrinterService');

describe('POSPaymentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the payment page with order details', async () => {
    // Mocking hooks
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'cashier', permissions: [] },
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'open' },
    });
    (useOrder as jest.Mock).mockReturnValue({
      getOrderById: jest.fn().mockResolvedValue({
        id: 'order-1',
        total: 100.0,
        items: [
          { id: 'item-1', product_name: 'Product 1', quantity: 1, total_price: 100.0 },
        ],
      }),
      updateOrder: jest.fn(),
      processPayment: jest.fn(),
      loading: false,
    });

    render(
      <BrowserRouter>
        <POSPaymentPage />
      </BrowserRouter>
    );

    // Wait for the order to load
    await waitFor(() => {
      expect(screen.getByText('Resumo do Pedido #order-1')).toBeInTheDocument();
    });

    // Check if the total is displayed
    expect(screen.getByText('Total: R$ 100,00')).toBeInTheDocument();
  });

  it('should handle payment confirmation', async () => {
    const processPaymentMock = jest.fn();
    const updateOrderMock = jest.fn();

    // Mocking hooks
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'cashier', permissions: [] },
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'open' },
    });
    (useOrder as jest.Mock).mockReturnValue({
      getOrderById: jest.fn().mockResolvedValue({
        id: 'order-1',
        total: 100.0,
        items: [
          { id: 'item-1', product_name: 'Product 1', quantity: 1, total_price: 100.0 },
        ],
      }),
      updateOrder: updateOrderMock,
      processPayment: processPaymentMock,
      loading: false,
    });

    render(
      <BrowserRouter>
        <POSPaymentPage />
      </BrowserRouter>
    );

    // Wait for the order to load
    await waitFor(() => {
      expect(screen.getByText('Resumo do Pedido #order-1')).toBeInTheDocument();
    });

    // Simulate payment confirmation
    fireEvent.click(screen.getByText('Confirmar Pagamento'));

    // Wait for the dialog to appear
    await waitFor(() => {
      expect(screen.getByText('Confirmar Pagamento')).toBeInTheDocument();
    });

    // Confirm the payment
    fireEvent.click(screen.getByText('Confirmar'));

    // Wait for the payment to be processed
    await waitFor(() => {
      expect(processPaymentMock).toHaveBeenCalled();
      expect(updateOrderMock).toHaveBeenCalled();
    });
  });

  it('should handle receipt reprint', async () => {
    const printReceiptMock = jest.fn();

    // Mocking hooks and services
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'cashier', permissions: [] },
    });
    (useCashier as jest.Mock).mockReturnValue({
      cashierStatus: { id: '1', status: 'open' },
    });
    (useOrder as jest.Mock).mockReturnValue({
      getOrderById: jest.fn().mockResolvedValue({
        id: 'order-1',
        total: 100.0,
        items: [
          { id: 'item-1', product_name: 'Product 1', quantity: 1, total_price: 100.0 },
        ],
      }),
      updateOrder: jest.fn(),
      processPayment: jest.fn(),
      loading: false,
    });
    (PrinterService.printReceipt as jest.Mock).mockImplementation(printReceiptMock);

    render(
      <BrowserRouter>
        <POSPaymentPage />
      </BrowserRouter>
    );

    // Wait for the order to load
    await waitFor(() => {
      expect(screen.getByText('Resumo do Pedido #order-1')).toBeInTheDocument();
    });

    // Simulate receipt reprint
    fireEvent.click(screen.getByText('Reimprimir Recibo'));

    // Wait for the receipt to be printed
    await waitFor(() => {
      expect(printReceiptMock).toHaveBeenCalled();
    });
  });
});
