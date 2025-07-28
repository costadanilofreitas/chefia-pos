import { renderHook } from '@testing-library/react';
import { useCashier } from '../hooks/mocks/useCashier';

describe('useCashier Hook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.currentCashier).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.openCashier).toBe('function');
    expect(typeof result.current.closeCashier).toBe('function');
    expect(typeof result.current.getCurrentCashier).toBe('function');
    expect(typeof result.current.registerCashOut).toBe('function');
  });

  it('should have open function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.open).toBeDefined();
    expect(typeof result.current.open).toBe('function');
  });

  it('should have close function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.close).toBeDefined();
    expect(typeof result.current.close).toBe('function');
  });

  it('should have currentCashier property', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.currentCashier).toBeDefined();
  });

  it('should have withdraw function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.withdraw).toBeDefined();
    expect(typeof result.current.withdraw).toBe('function');
  });
});

