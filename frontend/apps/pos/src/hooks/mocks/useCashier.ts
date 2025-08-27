import { Cashier, CashierCreate, CashierWithdrawal, TerminalStatus } from '../../services/CashierService';
import { CashierOperation, CashierSummary } from '../../types/cashier';
import { UseCashierReturn } from '../useCashier';

export const useCashier = (): UseCashierReturn => ({
  // Estado
  currentCashier: {
    id: 'test-cashier-1',
    terminal_id: 'test-terminal-1',
    operator_id: 'test-operator',
    operator_name: 'Test Operator',
    business_day_id: 'test-business-day-1',
    opened_at: new Date().toISOString(),
    closed_at: null,
    initial_balance: 100.00,
    current_balance: 150.00,
    final_balance: null,
    status: 'OPEN',
    notes: null,
    current_operator_id: 'test-operator',
    current_operator_name: 'Test Operator',
  } as Cashier,
  terminalStatus: {
    has_open_cashier: true,
    terminal_id: 'test-terminal-1',
    cashier_id: 'test-cashier-1',
    operator_id: 'test-operator',
    operator_name: 'Test Operator',
    opened_at: new Date().toISOString(),
    initial_balance: 100.00,
    current_balance: 150.00,
    business_day_id: 'test-business-day-1',
    status: 'OPEN',
  } as TerminalStatus,
  loading: false,
  error: null,
  operations: [],

  // Ações
  checkTerminalStatus: async (terminalId: string): Promise<TerminalStatus> => {
    return {
      has_open_cashier: true,
      terminal_id: terminalId,
      cashier_id: 'test-cashier-1',
      operator_id: 'test-operator',
      operator_name: 'Test Operator',
      cashier: {
        id: 'test-cashier-1',
        terminal_id: terminalId,
        operator_id: 'test-operator',
        operator_name: 'Test Operator',
        business_day_id: 'test-business-day-1',
        opened_at: new Date().toISOString(),
        initial_balance: 100.00,
        current_balance: 150.00,
        status: 'OPEN',
        current_operator_id: 'test-operator',
        current_operator_name: 'Test Operator',
        opened_by_name: 'Test Operator'
      }
    };
  },
  openCashier: async (cashierData: CashierCreate): Promise<Cashier> => {
    return {
      id: 'test-cashier-1',
      terminal_id: cashierData.terminal_id,
      operator_id: cashierData.operator_id,
      operator_name: 'Test Operator',
      business_day_id: cashierData.business_day_id,
      opened_at: new Date().toISOString(),
      closed_at: null,
      initial_balance: cashierData.opening_balance,
      current_balance: cashierData.opening_balance,
      final_balance: null,
      status: 'OPEN',
      notes: cashierData.notes || null,
      current_operator_id: cashierData.operator_id,
      current_operator_name: 'Test Operator',
    };
  },
  closeCashier: async (physicalCashAmount: number, notes?: string): Promise<Cashier> => {
    return {
      id: 'test-cashier-1',
      terminal_id: 'test-terminal-1',
      operator_id: 'test-operator',
      operator_name: 'Test Operator',
      business_day_id: 'test-business-day-1',
      opened_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
      initial_balance: 100.00,
      current_balance: 150.00,
      final_balance: physicalCashAmount,
      status: 'CLOSED',
      notes: notes || null,
      current_operator_id: 'test-operator',
      current_operator_name: 'Test Operator',
    };
  },
  registerWithdrawal: async (_cashierId: string, withdrawal: CashierWithdrawal): Promise<CashierOperation> => {
    return Promise.resolve({
      id: 'withdrawal-' + Date.now(),
      operation_type: 'WITHDRAWAL',
      amount: withdrawal.amount,
      operator_id: withdrawal.operator_id || 'test-operator',
      operator_name: 'Test Operator',
      description: withdrawal.reason,
      created_at: new Date().toISOString()
    });
  },
  refreshCashier: async (_cashierId: string): Promise<void> => {
    return Promise.resolve();
  },
  clearError: (): void => {
    // Mock implementation
  },
  getSummary: async (): Promise<CashierSummary> => {
    return {
      currentCashier: {
        id: 'test-cashier-1',
        status: 'OPEN',
        opening_cash_amount: 100.00,
        current_cash_amount: 150.00,
        total_sales: 50.00,
        total_withdrawals: 0,
        total_deposits: 0,
        total_cash: 50.00,
        total_credit: 0,
        total_debit: 0,
        total_pix: 0,
        total_other: 0,
        current_operator_id: 'test-operator',
        current_operator_name: 'Test Operator',
        opened_by_id: 'test-operator',
        opened_by_name: 'Test Operator',
        opened_at: new Date().toISOString()
      },
      operations: [],
      totals: {
        sales: 50.00,
        withdrawals: 0.00,
        deposits: 0.00,
        adjustments: 0.00,
        refunds: 0.00
      }
    };
  }
});

export default useCashier;