import { renderHook, act } from '@testing-library/react';
import { useOrder } from '../hooks/mocks/useOrder';

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
      result.current.addItemToOrder(testItem);
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
      result.current.addItemToOrder(testItem);
    });
    
    expect(result.current.currentOrder.items).toHaveLength(1);
    
    act(() => {
      result.current.removeItemFromOrder('item-1');
    });
    
    expect(result.current.currentOrder.items).toHaveLength(0);
  });

  it('should create order successfully', async () => {
    const { result } = renderHook(() => useOrder());
    
    const testOrder = {
      items: [{
        id: 'item-1',
        product_id: 'product-1',
        product_name: 'Test Product',
        quantity: 1,
        unit_price: 10.0,
        total_price: 10.0,
        customizations: []
      }]
    };
    
    await act(async () => {
      const createdOrder = await result.current.createOrder(testOrder);
      expect(createdOrder).toHaveProperty('id');
      expect(createdOrder.id).toMatch(/^order-/);
    });
  });

  it('should get order by id', async () => {
    const { result } = renderHook(() => useOrder());
    
    await act(async () => {
      const order = await result.current.getOrderById('order-123');
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('total');
      expect(order).toHaveProperty('items');
    });
  });

  it('should update order', async () => {
    const { result } = renderHook(() => useOrder());
    
    await act(async () => {
      const updatedOrder = await result.current.updateOrder('order-123', { total: 50.0 });
      expect(updatedOrder).toHaveProperty('id');
      expect(updatedOrder.total).toBe(50.0);
    });
  });

  it('should process payment', async () => {
    const { result } = renderHook(() => useOrder());
    
    await act(async () => {
      const paymentResult = await result.current.processPayment('order-123', { method: 'cash', amount: 100 });
      expect(paymentResult).toHaveProperty('success');
      expect(paymentResult).toHaveProperty('transaction_id');
    });
  });
});

