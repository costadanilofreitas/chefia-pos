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

  it('should have openCashier function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.openCashier).toBeDefined();
    expect(typeof result.current.openCashier).toBe('function');
  });

  it('should have closeCashier function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.closeCashier).toBeDefined();
    expect(typeof result.current.closeCashier).toBe('function');
  });

  it('should have getCurrentCashier function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.getCurrentCashier).toBeDefined();
    expect(typeof result.current.getCurrentCashier).toBe('function');
  });

  it('should have registerCashOut function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.registerCashOut).toBeDefined();
    expect(typeof result.current.registerCashOut).toBe('function');
  });
});

