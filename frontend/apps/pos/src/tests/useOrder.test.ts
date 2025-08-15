import { renderHook } from '@testing-library/react';
import { useOrder } from '../hooks/mocks/useOrder';

describe('useOrder Hook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.currentOrder).toEqual({ items: [] });
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.addToCart).toBe('function');
    expect(typeof result.current.removeFromCart).toBe('function');
    expect(typeof result.current.createOrder).toBe('function');
    expect(typeof result.current.getOrders).toBe('function');
    expect(typeof result.current.updateOrder).toBe('function');
    expect(typeof result.current.finalizeOrder).toBe('function');
  });

  it('should have addToCart function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.addToCart).toBeDefined();
    expect(typeof result.current.addToCart).toBe('function');
  });

  it('should have removeFromCart function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.removeFromCart).toBeDefined();
    expect(typeof result.current.removeFromCart).toBe('function');
  });

  it('should have createOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.createOrder).toBeDefined();
    expect(typeof result.current.createOrder).toBe('function');
  });

  it('should have getOrders function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.getOrders).toBeDefined();
    expect(typeof result.current.getOrders).toBe('function');
  });

  it('should have updateOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.updateOrder).toBeDefined();
    expect(typeof result.current.updateOrder).toBe('function');
  });

  it('should have finalizeOrder function', () => {
    const { result } = renderHook(() => useOrder());
    
    expect(result.current.finalizeOrder).toBeDefined();
    expect(typeof result.current.finalizeOrder).toBe('function');
  });
});

