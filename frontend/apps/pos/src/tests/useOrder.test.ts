import { renderHook } from '@testing-library/react';
import { useOrder } from '../hooks/mocks/useOrder';

describe('useOrder Hook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.currentOrder).toEqual({ items: [] });
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.addItemToOrder).toBe('function');
    expect(typeof result.current.removeItemFromOrder).toBe('function');
    expect(typeof result.current.createOrder).toBe('function');
    expect(typeof result.current.getOrderById).toBe('function');
    expect(typeof result.current.updateOrder).toBe('function');
    expect(typeof result.current.processPayment).toBe('function');
  });

  it('should have addItemToOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.addItemToOrder).toBeDefined();
    expect(typeof result.current.addItemToOrder).toBe('function');
  });

  it('should have removeItemFromOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.removeItemFromOrder).toBeDefined();
    expect(typeof result.current.removeItemFromOrder).toBe('function');
  });

  it('should have createOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.createOrder).toBeDefined();
    expect(typeof result.current.createOrder).toBe('function');
  });

  it('should have getOrderById function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.getOrderById).toBeDefined();
    expect(typeof result.current.getOrderById).toBe('function');
  });

  it('should have updateOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.updateOrder).toBeDefined();
    expect(typeof result.current.updateOrder).toBe('function');
  });

  it('should have processPayment function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.processPayment).toBeDefined();
    expect(typeof result.current.processPayment).toBe('function');
  });
});

