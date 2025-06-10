import { usePayment } from '../hooks/usePayment';
import { render, act } from '@testing-library/react';
import { PaymentProvider } from '../PaymentProvider';

// Mock payment gateway
jest.mock('../../../services/paymentGateway', () => ({
  processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'test-transaction-123' }),
  getPaymentMethods: jest.fn().mockResolvedValue([
    { id: 'credit', name: 'Cartão de Crédito', enabled: true },
    { id: 'debit', name: 'Cartão de Débito', enabled: true },
    { id: 'pix', name: 'PIX', enabled: true }
  ]),
  validateCard: jest.fn().mockImplementation((cardNumber) => {
    return cardNumber === '4111111111111111'; // Valid test card
  })
}));

// Test component that uses the hook
const TestComponent = ({ initialAction = null }) => {
  const { 
    processPayment, 
    getAvailablePaymentMethods, 
    validateCardNumber,
    paymentStatus,
    paymentHistory,
    clearPaymentStatus
  } = usePayment();
  
  if (initialAction === 'process') {
    processPayment({
      amount: 100,
      method: 'credit',
      cardDetails: {
        number: '4111111111111111',
        expiry: '12/25',
        cvv: '123',
        name: 'Test User'
      }
    });
  } else if (initialAction === 'getMethods') {
    getAvailablePaymentMethods();
  } else if (initialAction === 'validate') {
    validateCardNumber('4111111111111111');
  } else if (initialAction === 'clear') {
    clearPaymentStatus();
  }
  
  return <div>Test Component</div>;
};

describe('usePayment Hook', () => {
  test('should process payment successfully', async () => {
    const { rerender } = render(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    const { processPayment, paymentStatus } = usePayment();
    
    await act(async () => {
      await processPayment({
        amount: 100,
        method: 'credit',
        cardDetails: {
          number: '4111111111111111',
          expiry: '12/25',
          cvv: '123',
          name: 'Test User'
        }
      });
    });
    
    rerender(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    expect(paymentStatus).toEqual({
      status: 'success',
      message: 'Pagamento processado com sucesso',
      transactionId: 'test-transaction-123'
    });
  });
  
  test('should get available payment methods', async () => {
    render(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    const { getAvailablePaymentMethods } = usePayment();
    
    let methods;
    await act(async () => {
      methods = await getAvailablePaymentMethods();
    });
    
    expect(methods).toEqual([
      { id: 'credit', name: 'Cartão de Crédito', enabled: true },
      { id: 'debit', name: 'Cartão de Débito', enabled: true },
      { id: 'pix', name: 'PIX', enabled: true }
    ]);
  });
  
  test('should validate card number', () => {
    render(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    const { validateCardNumber } = usePayment();
    
    act(() => {
      // Valid card
      const validResult = validateCardNumber('4111111111111111');
      expect(validResult).toBe(true);
      
      // Invalid card
      const invalidResult = validateCardNumber('1234567890123456');
      expect(invalidResult).toBe(false);
    });
  });
  
  test('should clear payment status', async () => {
    const { rerender } = render(
      <PaymentProvider>
        <TestComponent initialAction="process" />
      </PaymentProvider>
    );
    
    // Wait for payment to process
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    rerender(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    const { paymentStatus, clearPaymentStatus } = usePayment();
    
    // Verify payment status is set
    expect(paymentStatus).toBeTruthy();
    
    // Clear payment status
    act(() => {
      clearPaymentStatus();
    });
    
    // Verify payment status is cleared
    expect(usePayment().paymentStatus).toBeNull();
  });
  
  test('should add payment to history after successful payment', async () => {
    render(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    const { processPayment, paymentHistory } = usePayment();
    
    const paymentData = {
      amount: 100,
      method: 'credit',
      cardDetails: {
        number: '4111111111111111',
        expiry: '12/25',
        cvv: '123',
        name: 'Test User'
      }
    };
    
    await act(async () => {
      await processPayment(paymentData);
    });
    
    expect(paymentHistory.length).toBe(1);
    expect(paymentHistory[0].amount).toBe(100);
    expect(paymentHistory[0].method).toBe('credit');
    expect(paymentHistory[0].transactionId).toBe('test-transaction-123');
    expect(paymentHistory[0].timestamp).toBeDefined();
  });
  
  test('should handle payment errors', async () => {
    // Mock payment failure
    const paymentGateway = require('../../../services/paymentGateway');
    paymentGateway.processPayment.mockRejectedValueOnce(new Error('Payment failed'));
    
    const { rerender } = render(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    const { processPayment } = usePayment();
    
    await act(async () => {
      await processPayment({
        amount: 100,
        method: 'credit',
        cardDetails: {
          number: '4111111111111111',
          expiry: '12/25',
          cvv: '123',
          name: 'Test User'
        }
      });
    });
    
    rerender(
      <PaymentProvider>
        <TestComponent />
      </PaymentProvider>
    );
    
    expect(usePayment().paymentStatus).toEqual({
      status: 'error',
      message: 'Erro ao processar pagamento: Payment failed'
    });
  });
});
