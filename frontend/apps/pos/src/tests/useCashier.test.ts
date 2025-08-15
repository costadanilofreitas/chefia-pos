import { renderHook } from '@testing-library/react';
import { useCashier } from '../hooks/mocks/useCashier';

describe('useCashier Hook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.currentCashier).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.openCashier).toBe('function');
    expect(typeof result.current.closeCashier).toBe('function');
    expect(typeof result.current.registerWithdrawal).toBe('function');
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

  it('should have currentCashier property', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.currentCashier).toBeDefined();
  });

  it('should have registerWithdrawal function', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.registerWithdrawal).toBeDefined();
    expect(typeof result.current.registerWithdrawal).toBe('function');
  });
});

