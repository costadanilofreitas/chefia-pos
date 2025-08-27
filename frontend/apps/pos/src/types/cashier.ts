/**
 * Tipos para o sistema de caixa
 * Consolidados de CashierService.ts e outros arquivos
 */

export interface CashierOperator {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface CashierOperation {
  id: string;
  operation_type: 'SALE' | 'WITHDRAWAL' | 'DEPOSIT' | 'ADJUSTMENT' | 'REFUND';
  amount: number;
  payment_method?: 'CASH' | 'CREDIT' | 'DEBIT' | 'PIX' | 'OTHER';
  operator_id: string;
  operator_name: string;
  description?: string;
  created_at: string;
  order_id?: string;
  customer_id?: string;
}

export interface CurrentCashier {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'SUSPENDED';
  opening_cash_amount: number;
  current_cash_amount: number;
  total_sales: number;
  total_withdrawals: number;
  total_deposits: number;
  total_cash: number;
  total_credit: number;
  total_debit: number;
  total_pix: number;
  total_other: number;
  current_operator_id: string;
  current_operator_name: string;
  opened_by_id: string;
  opened_by_name: string;
  opened_at: string;
  closed_at?: string;
  terminal_id?: string;
  business_day_id?: string;
}

export interface CashierSummary {
  currentCashier: CurrentCashier;
  operations: CashierOperation[];
  totals: {
    sales: number;
    withdrawals: number;
    deposits: number;
    adjustments: number;
    refunds: number;
  };
}

export interface CashFlowData {
  openingAmount: number;
  currentAmount: number;
  totalEntries: number;
  totalExits: number;
  netFlow: number;
  movements: Array<{
    type: 'IN' | 'OUT';
    amount: number;
    description: string;
    timestamp: string;
  }>;
}

export interface PaymentMethodSummary {
  cash: number;
  credit: number;
  debit: number;
  pix: number;
  other?: number;
  total: number;
}

export interface OperatorSummary {
  operatorId: string;
  operatorName: string;
  salesCount: number;
  salesTotal: number;
  withdrawalsCount: number;
  withdrawalsTotal: number;
  averageTicket: number;
}

export interface CashierReportData {
  totalSales: number;
  totalWithdrawals: number;
  cashInRegister: number;
  operatorName: string;
  openingAmount: number;
  salesCount: number;
}

export interface CashierCloseData {
  expectedCash: number;
  actualCash: number;
  difference: number;
  observations?: string;
  closedBy: string;
  closedAt: string;
}

// Cashier withdrawal type (moved from common.ts)
export interface CashierWithdrawal {
  amount: number;
  reason: string;
  authorized_by?: string;
  notes?: string;
  operator_id?: string;
}

// Types imported from CashierService.ts
export interface Cashier {
  id: string;
  terminal_id: string;
  operator_id: string;
  operator_name: string;
  business_day_id: string;
  opened_at: string;
  closed_at?: string;
  initial_balance: number;
  current_balance: number;
  final_balance?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  current_operator_id: string;
  current_operator_name: string;
  // Additional fields from CurrentCashier
  opening_cash_amount?: number;
  current_cash_amount?: number;
  total_sales?: number;
  total_withdrawals?: number;
  total_deposits?: number;
  total_cash?: number;
  total_credit?: number;
  total_debit?: number;
  total_pix?: number;
  opened_by_name?: string;
}

export interface CashierOpen {
  operator_id: string;
  terminal_id: string;
  initial_balance: number;
  business_day_id: string;
  notes?: string;
}

export interface CashierClose {
  operator_id: string;
  physical_cash_amount: number;
  notes?: string;
}

export interface TerminalStatus {
  has_open_cashier: boolean;
  cashier?: Cashier;
  cashier_id?: string;
  terminal_id?: string;
  operator_id?: string;
  operator_name?: string;
}