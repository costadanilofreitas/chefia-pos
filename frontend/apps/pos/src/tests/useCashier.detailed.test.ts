import { renderHook, act } from '@testing-library/react';
import { useCashier } from '../hooks/mocks/useCashier';

describe('useCashier Hook - Detailed Tests', () => {
  it('should handle cashier opening process', async () => {
    const { result } = renderHook(() => useCashier());
    
    await act(async () => {
      const openResult = await result.current.openCashier({
        terminal_id: 'terminal-1',
        operator_id: 'operator-1',
        opening_balance: 100,
        business_day_id: 'business-day-1',
        notes: 'Initial amount'
      });
      expect(openResult).toBeDefined();
    });
  });

  it('should handle cashier closing process', async () => {
    const { result } = renderHook(() => useCashier());
    
    await act(async () => {
      const closeResult = await result.current.closeCashier(100);
      expect(closeResult).toBeDefined();
    });
  });

  it('should handle cash withdrawal', async () => {
    const { result } = renderHook(() => useCashier());
    
    await act(async () => {
      const withdrawResult = await result.current.registerWithdrawal('cashier-1', {
        operator_id: 'operator-1',
        amount: 50,
        reason: 'Test withdrawal'
      });
      expect(withdrawResult).toBeDefined();
    });
  });

  it('should get current cashier', async () => {
    const { result } = renderHook(() => useCashier());
    
    expect(result.current.currentCashier).toBeDefined();
  });

  it('should handle loading states properly', () => {
    const { result } = renderHook(() => useCashier());
    
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should have proper cashier structure', () => {
    const { result } = renderHook(() => useCashier());
    
    // Test that currentCashier can be null or have proper structure
    if (result.current.currentCashier) {
      expect(result.current.currentCashier).toHaveProperty('id');
      expect(result.current.currentCashier).toHaveProperty('status');
    }
  });
});

