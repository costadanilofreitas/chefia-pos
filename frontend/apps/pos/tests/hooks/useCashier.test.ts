/**
 * Comprehensive Tests for useCashier Hook with Sync Features
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCashier } from '@/hooks/useCashier';
import { cashierService } from '@/services/CashierService';
import { requestCache } from '@/services/RequestCache';
import eventBus from '@/utils/EventBus';
import logger from '@/services/LocalLoggerService';

// Mock dependencies
jest.mock('@/services/CashierService', () => ({
  cashierService: {
    getTerminalStatus: jest.fn(),
    getCashier: jest.fn(),
    openCashier: jest.fn(),
    closeCashier: jest.fn(),
    registerWithdrawal: jest.fn(),
    getCashierOperations: jest.fn(),
  }
}));

jest.mock('@/services/RequestCache', () => ({
  requestCache: {
    execute: jest.fn(),
    invalidate: jest.fn(),
    invalidatePattern: jest.fn(),
  }
}));

jest.mock('@/utils/EventBus', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  }
}));

jest.mock('@/services/LocalLoggerService', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  LogSource: {
    POS: 'POS'
  }
}));

describe('useCashier Hook', () => {
  const mockTerminalStatus = {
    terminal_id: 'terminal-123',
    has_open_cashier: false,
    cashier_id: null,
    business_day_id: 'bd-456',
    last_closed_at: '2024-01-01T09:00:00Z'
  };

  const mockCashier = {
    id: 'cashier-789',
    terminal_id: 'terminal-123',
    business_day_id: 'bd-456',
    operator_id: 'op-111',
    operator_name: 'John Doe',
    current_operator_id: 'op-111',
    current_operator_name: 'John Doe',
    status: 'OPEN' as const,
    initial_balance: 100,
    current_balance: 150,
    total_sales: 50,
    total_withdrawals: 0,
    total_deposits: 0,
    total_cash: 150,
    total_credit: 0,
    total_debit: 0,
    total_pix: 0,
    opened_at: '2024-01-01T10:00:00Z',
    closed_at: null
  };

  const mockOperations = [
    {
      id: 'op-1',
      cashier_id: 'cashier-789',
      operation_type: 'SALE' as const,
      amount: 50,
      payment_method: 'CASH',
      description: 'Order #123',
      created_at: '2024-01-01T10:30:00Z',
      operator_id: 'op-111',
      operator_name: 'John Doe'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (requestCache.execute as jest.Mock).mockImplementation((key, fetcher) => fetcher());
    (cashierService.getTerminalStatus as jest.Mock).mockResolvedValue(mockTerminalStatus);
    (cashierService.getCashier as jest.Mock).mockResolvedValue(mockCashier);
    (cashierService.getCashierOperations as jest.Mock).mockResolvedValue(mockOperations);
  });

  describe('Initial State', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useCashier());
      
      expect(result.current.currentCashier).toBeNull();
      expect(result.current.terminalStatus).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.operations).toEqual([]);
    });

    it('should expose all required functions', () => {
      const { result } = renderHook(() => useCashier());
      
      expect(typeof result.current.checkTerminalStatus).toBe('function');
      expect(typeof result.current.openCashier).toBe('function');
      expect(typeof result.current.closeCashier).toBe('function');
      expect(typeof result.current.registerWithdrawal).toBe('function');
      expect(typeof result.current.refreshCashier).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.getSummary).toBe('function');
    });
  });

  describe('Terminal Status Check', () => {
    it('should check terminal status successfully', async () => {
      const { result } = renderHook(() => useCashier());
      
      let status;
      await act(async () => {
        status = await result.current.checkTerminalStatus('terminal-123');
      });
      
      expect(status).toEqual(mockTerminalStatus);
      expect(result.current.terminalStatus).toEqual(mockTerminalStatus);
      expect(result.current.currentCashier).toBeNull();
    });

    it('should load cashier data if terminal has open cashier', async () => {
      const statusWithCashier = {
        ...mockTerminalStatus,
        has_open_cashier: true,
        cashier_id: 'cashier-789'
      };
      
      (cashierService.getTerminalStatus as jest.Mock).mockResolvedValue(statusWithCashier);
      
      const { result } = renderHook(() => useCashier());
      
      await act(async () => {
        await result.current.checkTerminalStatus('terminal-123');
      });
      
      expect(result.current.terminalStatus).toEqual(statusWithCashier);
      expect(result.current.currentCashier).toEqual(mockCashier);
    });

    it('should use cache for terminal status', async () => {
      const { result } = renderHook(() => useCashier());
      
      await act(async () => {
        await result.current.checkTerminalStatus('terminal-123');
      });
      
      expect(requestCache.execute).toHaveBeenCalledWith(
        'terminal-status-terminal-123',
        expect.any(Function),
        { ttl: 10000 }
      );
    });

    it('should handle terminal status error', async () => {
      (cashierService.getTerminalStatus as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useCashier());
      
      await expect(
        act(async () => {
          await result.current.checkTerminalStatus('terminal-123');
        })
      ).rejects.toThrow('Network error');
      
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Opening Cashier', () => {
    it('should open cashier successfully', async () => {
      (cashierService.openCashier as jest.Mock).mockResolvedValue(mockCashier);
      (cashierService.getTerminalStatus as jest.Mock).mockResolvedValue({
        ...mockTerminalStatus,
        has_open_cashier: true,
        cashier_id: 'cashier-789'
      });
      
      const { result } = renderHook(() => useCashier());
      
      const cashierData = {
        terminal_id: 'terminal-123',
        business_day_id: 'bd-456',
        operator_id: 'op-111',
        initial_balance: 100
      };
      
      let newCashier;
      await act(async () => {
        newCashier = await result.current.openCashier(cashierData);
      });
      
      expect(newCashier).toEqual(mockCashier);
      expect(result.current.currentCashier).toEqual(mockCashier);
      expect(result.current.terminalStatus?.has_open_cashier).toBe(true);
    });

    it('should handle open cashier error', async () => {
      (cashierService.openCashier as jest.Mock).mockRejectedValue(new Error('Already open'));
      
      const { result } = renderHook(() => useCashier());
      
      await expect(
        act(async () => {
          await result.current.openCashier({
            terminal_id: 'terminal-123',
            business_day_id: 'bd-456',
            operator_id: 'op-111',
            initial_balance: 100
          });
        })
      ).rejects.toThrow('Already open');
      
      expect(result.current.error).toBe('Already open');
    });
  });

  describe('Closing Cashier', () => {
    it('should close cashier successfully', async () => {
      const closedCashier = {
        ...mockCashier,
        status: 'CLOSED' as const,
        closed_at: '2024-01-01T18:00:00Z'
      };
      
      (cashierService.closeCashier as jest.Mock).mockResolvedValue(closedCashier);
      (cashierService.getTerminalStatus as jest.Mock).mockResolvedValue({
        ...mockTerminalStatus,
        has_open_cashier: false,
        cashier_id: null
      });
      
      const { result } = renderHook(() => useCashier());
      
      // Set current cashier first
      await act(async () => {
        result.current.currentCashier = mockCashier;
      });
      
      let closed;
      await act(async () => {
        closed = await result.current.closeCashier(150, 'End of day');
      });
      
      expect(closed).toEqual(closedCashier);
      expect(result.current.currentCashier).toEqual(closedCashier);
      expect(cashierService.closeCashier).toHaveBeenCalledWith('cashier-789', {
        operator_id: 'op-111',
        physical_cash_amount: 150,
        notes: 'End of day'
      });
    });

    it('should handle close without active cashier', async () => {
      const { result } = renderHook(() => useCashier());
      
      await expect(
        act(async () => {
          await result.current.closeCashier(100);
        })
      ).rejects.toThrow('Nenhum caixa ativo para fechar');
      
      expect(result.current.error).toBe('Nenhum caixa ativo para fechar');
    });
  });

  describe('Withdrawal Registration', () => {
    it('should register withdrawal successfully', async () => {
      const withdrawalResult = {
        id: 'op-2',
        cashier_id: 'cashier-789',
        operation_type: 'WITHDRAWAL' as const,
        amount: 50,
        payment_method: 'CASH',
        description: 'Cash withdrawal',
        created_at: '2024-01-01T14:00:00Z',
        operator_id: 'op-111',
        operator_name: 'John Doe'
      };
      
      (cashierService.registerWithdrawal as jest.Mock).mockResolvedValue(withdrawalResult);
      
      const { result } = renderHook(() => useCashier());
      
      const withdrawal = {
        amount: 50,
        reason: 'Cash withdrawal',
        operator_id: 'op-111'
      };
      
      let operation;
      await act(async () => {
        operation = await result.current.registerWithdrawal('cashier-789', withdrawal);
      });
      
      expect(operation).toEqual(withdrawalResult);
      expect(requestCache.invalidate).toHaveBeenCalledWith('cashier-cashier-789');
    });
  });

  describe('Cashier Refresh', () => {
    it('should refresh cashier data', async () => {
      const { result } = renderHook(() => useCashier());
      
      await act(async () => {
        await result.current.refreshCashier('cashier-789');
      });
      
      expect(requestCache.invalidate).toHaveBeenCalledWith('cashier-cashier-789');
      expect(requestCache.invalidate).toHaveBeenCalledWith('terminal-status-terminal-123');
      expect(result.current.currentCashier).toEqual(mockCashier);
    });

    it('should handle refresh error gracefully', async () => {
      (cashierService.getCashier as jest.Mock).mockRejectedValue(new Error('Refresh failed'));
      
      const { result } = renderHook(() => useCashier());
      
      await act(async () => {
        await result.current.refreshCashier('cashier-789');
      });
      
      expect(logger.error).toHaveBeenCalledWith(
        'Erro ao atualizar caixa',
        expect.objectContaining({ cashierId: 'cashier-789' }),
        'useCashier',
        'POS'
      );
      
      // Should not set error state for background refresh
      expect(result.current.error).toBeNull();
    });
  });

  describe('Summary Generation', () => {
    it('should generate cashier summary', async () => {
      const { result } = renderHook(() => useCashier());
      
      // Set current cashier
      await act(async () => {
        result.current.currentCashier = mockCashier;
      });
      
      let summary;
      await act(async () => {
        summary = await result.current.getSummary();
      });
      
      expect(summary).toMatchObject({
        currentCashier: expect.objectContaining({
          id: 'cashier-789',
          status: 'OPEN'
        }),
        operations: mockOperations,
        totals: expect.objectContaining({
          sales: 50,
          withdrawals: 0,
          deposits: 0
        })
      });
    });

    it('should handle summary without active cashier', async () => {
      const { result } = renderHook(() => useCashier());
      
      await expect(
        act(async () => {
          await result.current.getSummary();
        })
      ).rejects.toThrow('Nenhum caixa ativo');
      
      expect(result.current.error).toBe('Nenhum caixa ativo');
    });
  });

  describe('Sync Event Handling', () => {
    it('should handle cashier opened sync event', async () => {
      const { result } = renderHook(() => useCashier());
      
      // Set terminal status
      await act(async () => {
        result.current.terminalStatus = mockTerminalStatus;
      });
      
      const openedHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:cashier:create'
      )?.[1];
      
      act(() => {
        openedHandler?.(mockCashier);
      });
      
      expect(result.current.currentCashier).toEqual(mockCashier);
      expect(requestCache.invalidatePattern).toHaveBeenCalledWith('cashier');
      expect(requestCache.invalidatePattern).toHaveBeenCalledWith('terminal-status');
    });

    it('should handle cashier closed sync event', async () => {
      const { result } = renderHook(() => useCashier());
      
      // Set initial state
      await act(async () => {
        result.current.terminalStatus = { ...mockTerminalStatus, has_open_cashier: true };
        result.current.currentCashier = mockCashier;
      });
      
      const closedHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:cashier:update'
      )?.[1];
      
      const closedCashier = { ...mockCashier, status: 'CLOSED' as const };
      
      act(() => {
        closedHandler?.(closedCashier);
      });
      
      expect(result.current.currentCashier).toBeNull();
      expect(result.current.terminalStatus?.has_open_cashier).toBe(false);
    });

    it('should handle cashier operation sync event', async () => {
      const { result } = renderHook(() => useCashier());
      
      await act(async () => {
        result.current.currentCashier = mockCashier;
      });
      
      const operationHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:cashier:operation'
      )?.[1];
      
      const newOperation = {
        id: 'op-3',
        cashier_id: 'cashier-789',
        operation_type: 'SALE' as const,
        amount: 75,
        payment_method: 'PIX'
      };
      
      act(() => {
        operationHandler?.({ cashierId: 'cashier-789', operation: newOperation });
      });
      
      expect(result.current.operations).toContainEqual(newOperation);
    });

    it('should unsubscribe from events on unmount', () => {
      const { unmount } = renderHook(() => useCashier());
      
      unmount();
      
      expect(eventBus.off).toHaveBeenCalledWith('sync:cashier:create', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:cashier:update', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:cashier:operation', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:cashier:withdrawal', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useCashier());
      
      act(() => {
        result.current.error = 'Some error';
      });
      
      expect(result.current.error).toBe('Some error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should manage loading state during operations', async () => {
      const { result } = renderHook(() => useCashier());
      
      expect(result.current.loading).toBe(false);
      
      const promise = act(async () => {
        await result.current.checkTerminalStatus('terminal-123');
      });
      
      // Check loading state is true during operation
      expect(result.current.loading).toBe(true);
      
      await promise;
      
      expect(result.current.loading).toBe(false);
    });
  });
});

