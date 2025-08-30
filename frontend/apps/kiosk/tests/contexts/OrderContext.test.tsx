import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactNode } from 'react';
import { OrderProvider, useOrder, Order, OrderStatus } from '../../src/contexts/OrderContext';
import { CartItem } from '../../src/contexts/CartContext';

// Mock offlineStorage
jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    log: jest.fn(),
  },
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('OrderContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <OrderProvider>{children}</OrderProvider>
  );

  const mockCartItems: CartItem[] = [
    {
      id: 'item-1',
      productId: 'prod-1',
      name: 'Pizza',
      price: 25,
      quantity: 2,
      subtotal: 50,
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      name: 'Soda',
      price: 5,
      quantity: 1,
      subtotal: 5,
    },
  ];

  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    test('initializes with no current order and empty history', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      expect(result.current.currentOrder).toBeNull();
      expect(result.current.orderHistory).toHaveLength(0);
    });

    test('loads order history from sessionStorage', () => {
      const savedHistory = [
        {
          id: 'order-1',
          orderNumber: 'K001',
          items: [],
          subtotal: 100,
          tax: 10,
          total: 110,
          status: 'completed',
          type: 'dine_in',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:30:00.000Z',
        },
      ];

      sessionStorageMock.setItem('kiosk-order-history', JSON.stringify(savedHistory));

      const { result } = renderHook(() => useOrder(), { wrapper });

      expect(result.current.orderHistory).toHaveLength(1);
      expect(result.current.orderHistory[0].orderNumber).toBe('K001');
      expect(result.current.orderHistory[0].createdAt).toBeInstanceOf(Date);
      expect(result.current.orderHistory[0].updatedAt).toBeInstanceOf(Date);
    });

    test('handles corrupted sessionStorage data gracefully', () => {
      sessionStorageMock.setItem('kiosk-order-history', 'invalid json');

      const { result } = renderHook(() => useOrder(), { wrapper });

      expect(result.current.orderHistory).toHaveLength(0);
    });
  });

  describe('Creating Orders', () => {
    test('creates a new order with draft status', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        const order = result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        
        expect(order.items).toEqual(mockCartItems);
        expect(order.subtotal).toBe(55);
        expect(order.tax).toBe(5.5);
        expect(order.total).toBe(60.5);
        expect(order.status).toBe('draft');
        expect(order.type).toBe('dine_in');
        expect(order.id).toContain('order-');
      });

      expect(result.current.currentOrder).not.toBeNull();
      expect(result.current.currentOrder?.items).toHaveLength(2);
    });

    test('generates unique order IDs', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      let order1: Order;
      let order2: Order;

      act(() => {
        order1 = result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      // Clear current order to create another
      act(() => {
        result.current.clearCurrentOrder();
      });

      act(() => {
        order2 = result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      expect(order1!.id).not.toBe(order2!.id);
    });

    test('sets createdAt and updatedAt timestamps', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      expect(result.current.currentOrder?.createdAt).toBeInstanceOf(Date);
      expect(result.current.currentOrder?.updatedAt).toBeInstanceOf(Date);
      expect(result.current.currentOrder?.createdAt).toEqual(result.current.currentOrder?.updatedAt);
    });
  });

  describe('Updating Orders', () => {
    test('updates current order properties', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const orderId = result.current.currentOrder!.id;

      act(() => {
        result.current.updateOrder(orderId, {
          notes: 'No spicy sauce',
          status: 'pending_payment',
        });
      });

      expect(result.current.currentOrder?.notes).toBe('No spicy sauce');
      expect(result.current.currentOrder?.status).toBe('pending_payment');
    });

    test('updates updatedAt timestamp when order is modified', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const originalUpdatedAt = result.current.currentOrder!.updatedAt;
      const orderId = result.current.currentOrder!.id;

      // Advance time to ensure different timestamp
      jest.advanceTimersByTime(1000);

      act(() => {
        result.current.updateOrder(orderId, { status: 'confirmed' });
      });

      expect(result.current.currentOrder?.updatedAt).not.toEqual(originalUpdatedAt);
    });

    test('updates order in history if it exists', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      // Create and confirm an order to add it to history
      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const orderId = result.current.currentOrder!.id;

      act(() => {
        result.current.setPaymentMethod('credit_card');
      });

      act(async () => {
        await result.current.confirmOrder();
        jest.runAllTimers();
      });

      // Update the order in history
      act(() => {
        result.current.updateOrder(orderId, { notes: 'Updated note' });
      });

      const orderInHistory = result.current.orderHistory.find((o) => o.id === orderId);
      expect(orderInHistory?.notes).toBe('Updated note');
    });
  });

  describe('Order Type Management', () => {
    test('sets order type', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      act(() => {
        result.current.setOrderType('takeout');
      });

      expect(result.current.currentOrder?.type).toBe('takeout');

      act(() => {
        result.current.setOrderType('delivery');
      });

      expect(result.current.currentOrder?.type).toBe('delivery');
    });

    test('does nothing if no current order', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.setOrderType('takeout');
      });

      // Should not throw error
      expect(result.current.currentOrder).toBeNull();
    });
  });

  describe('Payment Method Management', () => {
    test('sets payment method and updates status', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      act(() => {
        result.current.setPaymentMethod('pix');
      });

      expect(result.current.currentOrder?.paymentMethod).toBe('pix');
      expect(result.current.currentOrder?.status).toBe('pending_payment');
    });

    test('supports all payment methods', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      const paymentMethods = ['credit_card', 'debit_card', 'pix', 'cash', 'voucher'] as const;

      paymentMethods.forEach((method) => {
        act(() => {
          result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        });

        act(() => {
          result.current.setPaymentMethod(method);
        });

        expect(result.current.currentOrder?.paymentMethod).toBe(method);

        act(() => {
          result.current.clearCurrentOrder();
        });
      });
    });
  });

  describe('Customer Information', () => {
    test('sets customer name and phone', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      act(() => {
        result.current.setCustomerInfo('John Doe', '+1234567890');
      });

      expect(result.current.currentOrder?.customerName).toBe('John Doe');
      expect(result.current.currentOrder?.customerPhone).toBe('+1234567890');
    });

    test('sets customer name without phone', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      act(() => {
        result.current.setCustomerInfo('Jane Doe');
      });

      expect(result.current.currentOrder?.customerName).toBe('Jane Doe');
      expect(result.current.currentOrder?.customerPhone).toBeUndefined();
    });
  });

  describe('Order Confirmation', () => {
    test('confirms order successfully', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        result.current.setPaymentMethod('credit_card');
      });

      await act(async () => {
        await result.current.confirmOrder();
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.currentOrder?.status).toBe('confirmed');
        expect(result.current.currentOrder?.paymentStatus).toBe('completed');
        expect(result.current.currentOrder?.orderNumber).toBeDefined();
        expect(result.current.currentOrder?.estimatedTime).toBe(15);
      });
    });

    test('adds confirmed order to history', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        result.current.setPaymentMethod('pix');
      });

      await act(async () => {
        await result.current.confirmOrder();
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.orderHistory).toHaveLength(1);
        expect(result.current.orderHistory[0].status).toBe('confirmed');
      });
    });

    test('throws error if no current order', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      await expect(async () => {
        await act(async () => {
          await result.current.confirmOrder();
        });
      }).rejects.toThrow('No current order to confirm');
    });

    test('throws error if no payment method', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.confirmOrder();
        });
      }).rejects.toThrow('Payment method is required');
    });

    test('generates unique order numbers', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      const orderNumbers: string[] = [];

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
          result.current.setPaymentMethod('cash');
        });

        await act(async () => {
          await result.current.confirmOrder();
          jest.runAllTimers();
        });

        await waitFor(() => {
          const orderNumber = result.current.currentOrder?.orderNumber;
          expect(orderNumber).toBeDefined();
          expect(orderNumber).toMatch(/^K\d{3}$/);
          orderNumbers.push(orderNumber!);
        });

        act(() => {
          result.current.clearCurrentOrder();
        });
      }

      // Check that all order numbers are unique (with high probability)
      expect(new Set(orderNumbers).size).toBe(3);
    });
  });

  describe('Order Cancellation', () => {
    test('cancels current order', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const orderId = result.current.currentOrder!.id;

      act(() => {
        result.current.cancelOrder(orderId);
      });

      expect(result.current.currentOrder).toBeNull();
    });

    test('adds cancelled order to history if not draft', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        result.current.setPaymentMethod('credit_card');
      });

      await act(async () => {
        await result.current.confirmOrder();
        jest.runAllTimers();
      });

      const orderId = result.current.currentOrder!.id;

      act(() => {
        result.current.cancelOrder(orderId);
      });

      const cancelledOrder = result.current.orderHistory.find((o) => o.id === orderId);
      expect(cancelledOrder?.status).toBe('cancelled');
    });

    test('does not add draft order to history when cancelled', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const orderId = result.current.currentOrder!.id;
      const initialHistoryLength = result.current.orderHistory.length;

      act(() => {
        result.current.cancelOrder(orderId);
      });

      expect(result.current.orderHistory.length).toBe(initialHistoryLength);
    });
  });

  describe('Order Retrieval', () => {
    test('gets order by ID from current order', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const orderId = result.current.currentOrder!.id;
      const order = result.current.getOrderById(orderId);

      expect(order).toBeDefined();
      expect(order?.id).toBe(orderId);
    });

    test('gets order by ID from history', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        result.current.setPaymentMethod('pix');
      });

      await act(async () => {
        await result.current.confirmOrder();
        jest.runAllTimers();
      });

      const orderId = result.current.currentOrder!.id;

      act(() => {
        result.current.clearCurrentOrder();
      });

      const order = result.current.getOrderById(orderId);
      expect(order).toBeDefined();
      expect(order?.id).toBe(orderId);
    });

    test('returns undefined for non-existent order', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      const order = result.current.getOrderById('non-existent');
      expect(order).toBeUndefined();
    });
  });

  describe('Clear Current Order', () => {
    test('clears current order', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      expect(result.current.currentOrder).not.toBeNull();

      act(() => {
        result.current.clearCurrentOrder();
      });

      expect(result.current.currentOrder).toBeNull();
    });
  });

  describe('Session Storage Persistence', () => {
    test('saves order history to sessionStorage', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        result.current.setPaymentMethod('credit_card');
      });

      await act(async () => {
        await result.current.confirmOrder();
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'kiosk-order-history',
          expect.stringContaining('"status":"confirmed"')
        );
      });
    });

    test('updates sessionStorage when order is modified', () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
      });

      const orderId = result.current.currentOrder!.id;

      // Add to history first
      act(() => {
        result.current.updateOrder(orderId, { status: 'confirmed' });
      });

      // Now update in history
      act(() => {
        result.current.updateOrder(orderId, { notes: 'Updated' });
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('throws error when useOrder is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useOrder());
      }).toThrow('useOrder must be used within an OrderProvider');

      consoleError.mockRestore();
    });

    test('handles payment processing failure', async () => {
      const { result } = renderHook(() => useOrder(), { wrapper });

      act(() => {
        result.current.createOrder(mockCartItems, 55, 5.5, 60.5);
        result.current.setPaymentMethod('credit_card');
      });

      // Mock failure by throwing in the promise
      jest.spyOn(global, 'setTimeout').mockImplementationOnce(() => {
        throw new Error('Payment failed');
      });

      await expect(async () => {
        await act(async () => {
          await result.current.confirmOrder();
        });
      }).rejects.toThrow('Payment failed');

      global.setTimeout.mockRestore();
    });
  });
});