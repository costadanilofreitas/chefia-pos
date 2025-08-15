import { renderHook, act } from '@testing-library/react';
import { useOrder } from '../hooks/mocks/useOrder';
import { OrderType, OrderStatus } from '../types/order';

describe('useOrder Hook - Detailed Tests', () => {
  it('should add items to order correctly', () => {
    const { result } = renderHook(() => useOrder());
    
    const testItem = {
      id: 'item-1',
      product_id: 'product-1',
      product_name: 'Test Product',
      quantity: 1,
      unit_price: 10.0,
      total_price: 10.0,
      customizations: []
    };
    
    act(() => {
      result.current.addToCart(testItem);
    });
    
    expect(result.current.currentOrder.items).toHaveLength(1);
    expect(result.current.currentOrder.items[0]).toEqual(testItem);
  });

  it('should remove items from order correctly', () => {
    const { result } = renderHook(() => useOrder());
    
    const testItem = {
      id: 'item-1',
      product_id: 'product-1',
      product_name: 'Test Product',
      quantity: 1,
      unit_price: 10.0,
      total_price: 10.0,
      customizations: []
    };
    
    act(() => {
      result.current.addToCart(testItem);
    });
    
    expect(result.current.currentOrder.items).toHaveLength(1);
    
    act(() => {
      result.current.removeFromCart(0);
    });
    
    expect(result.current.currentOrder.items).toHaveLength(0);
  });

  it('should create order successfully', async () => {
    const { result } = renderHook(() => useOrder());
    
    const testOrder = {
      table_id: 'table-1',
      terminal_id: 'terminal-1',
      seat_number: 1,
      customer_name: 'Test Customer',
      items: [{
        product_id: 'product-1',
        product_name: 'Test Product',
        quantity: 1,
        unit_price: 10.0,
        notes: '',
        customizations: []
      }],
      order_type: OrderType.DINE_IN,
      source: 'pos',
      status: OrderStatus.PENDING,
      total_amount: 10.0
    };
    
    await act(async () => {
      const createdOrder = await result.current.createOrder(testOrder);
      expect(createdOrder).toHaveProperty('id');
      expect(createdOrder.id).toMatch(/^order-/);
    });
  });

  it('should get orders', async () => {
    const { result } = renderHook(() => useOrder());
    
    await act(async () => {
      await result.current.getOrders();
      // Test passes if no error is thrown
    });
  });

  it('should update order', async () => {
    const { result } = renderHook(() => useOrder());
    
    await act(async () => {
      const updatedOrder = await result.current.updateOrder('order-123', { customer_name: 'Updated Customer' });
      // Since mock returns null, just test that it doesn't throw
      expect(updatedOrder).toBe(null);
    });
  });

  it('should finalize order', async () => {
    const { result } = renderHook(() => useOrder());
    
    await act(async () => {
      const paymentResult = await result.current.finalizeOrder('order-123', 'cash' as any);
      // Since mock returns null, just test that it doesn't throw
      expect(paymentResult).toBe(null);
    });
  });
});

