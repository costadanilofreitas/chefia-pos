
export type CashierTypeStatus = 'closed' | 'opening' | 'open' | 'closing';

export type CashierStatus = {
  id: string;
  status: CashierTypeStatus;
  opening_balance: number;
  expected_balance: number;
  cash_sales: number;
  card_sales: number;
  pix_sales: number;
  other_sales: number;
  cash_in: number;
  cash_out: number;
};

export interface CashMovementData {
  id: string;
  reason: string;
  performed_by: string;
  type: 'entry' | 'exit';
  amount: number;
  description?: string;
  timestamp?: Date;
}

export interface OpenCashierData {
  terminal_id: string;
  notes?: string;
  business_day_id?: string;
  opening_balance?: number;
}

export interface CloseCashierData {
  id: string;
  closing_balance: number;
  notes?: string;
}

export interface SaleData {
  id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  timestamp: Date;
}
