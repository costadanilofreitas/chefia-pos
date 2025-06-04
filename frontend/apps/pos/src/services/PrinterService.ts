import axios from 'axios';

const API_BASE_URL = '/api/v1/peripherals/printers'; // Base URL for the printer API

const PrinterService = {
  async printReceipt(data: {
    order_id: string;
    cashier_id?: string;
    terminal_id: string;
    operator_name: string;
    items: any[];
    total: number;
    payment_method: string;
    change: number;
    date: Date;
  }) {
    // Lógica para enviar os dados para a impressora
    console.log('Imprimindo recibo:', data);
    // Simulação de sucesso
    return Promise.resolve();
  },

  async printBusinessDayOpeningReceipt({
    business_day_id,
    store_id,
    user_name,
    date,
    notes,
  }: {
    business_day_id: string;
    store_id: string;
    user_name: string;
    date: Date;
    notes: string;
  }): Promise<void> {
    try {
      const receiptData = {
        title: 'Abertura do Dia de Operação',
        business_day_id,
        store_id,
        user_name,
        date: date.toLocaleString(),
        notes,
      };
      await axios.post(`${API_BASE_URL}/default-printer/print-receipt`, { data: receiptData });
    } catch (error) {
      console.error('Error printing opening receipt:', error);
      throw error;
    }
  },

  async printBusinessDayClosingReceipt({
    business_day_id,
    store_id,
    user_name,
    opened_at,
    closed_at,
    total_sales,
    total_orders,
    notes,
  }: {
    business_day_id: string;
    store_id: string;
    user_name: string;
    opened_at: Date;
    closed_at: Date;
    total_sales: number;
    total_orders: number;
    notes: string;
  }): Promise<void> {
    try {
      const receiptData = {
        title: 'Fechamento do Dia de Operação',
        business_day_id,
        store_id,
        user_name,
        opened_at: opened_at.toLocaleString(),
        closed_at: closed_at.toLocaleString(),
        total_sales: total_sales.toFixed(2),
        total_orders,
        notes,
      };
      await axios.post(`${API_BASE_URL}/default-printer/print-receipt`, { data: receiptData });
    } catch (error) {
      console.error('Error printing closing receipt:', error);
      throw error;
    }
  },

  async printOpeningReceipt({
    cashier_id,
    terminal_id,
    user_name,
    opening_balance,
    date,
    notes
  }: {
    cashier_id: string | undefined;
    terminal_id: string;
    user_name: string;
    opening_balance: number;
    date: Date;
    notes: string;
  }): Promise<void> {
    const receiptData = {
      title: 'Comprovante de Abertura de Caixa',
      cashier_id,
      terminal_id,
      user_name,
      opening_balance: `R$ ${opening_balance.toFixed(2)}`,
      date: date.toLocaleString(),
      notes
    };

    try {
      await axios.post(`${API_BASE_URL}/default-printer/print-receipt`, { data: receiptData });
    } catch (error) {
      console.error('Error printing opening receipt:', error);
      throw error;
    }
  },

  async printClosingReceipt({
    cashier_id,
    terminal_id,
    user_name,
    opening_balance,
    closing_balance,
    expected_balance,
    difference,
    cash_sales,
    card_sales,
    pix_sales,
    other_sales,
    cash_in,
    cash_out,
    date,
    notes
  }: {
    cashier_id: string | undefined;
    terminal_id: string;
    user_name: string;
    opening_balance: number | undefined;
    closing_balance: number;
    expected_balance: number | undefined;
    difference: number;
    cash_sales: number | undefined;
    card_sales: number | undefined;
    pix_sales: number | undefined;
    other_sales: number | undefined;
    cash_in: number | undefined;
    cash_out: number | undefined;
    date: Date;
    notes: string;
  }): Promise<void> {
    const receiptData = {
      title: 'Comprovante de Fechamento de Caixa',
      cashier_id,
      terminal_id,
      user_name,
      opening_balance: `R$ ${opening_balance?.toFixed(2) || '0.00'}`,
      closing_balance: `R$ ${closing_balance.toFixed(2)}`,
      expected_balance: `R$ ${expected_balance?.toFixed(2) || '0.00'}`,
      difference: `R$ ${difference.toFixed(2)}`,
      cash_sales: `R$ ${cash_sales?.toFixed(2) || '0.00'}`,
      card_sales: `R$ ${card_sales?.toFixed(2) || '0.00'}`,
      pix_sales: `R$ ${pix_sales?.toFixed(2) || '0.00'}`,
      other_sales: `R$ ${other_sales?.toFixed(2) || '0.00'}`,
      cash_in: `R$ ${cash_in?.toFixed(2) || '0.00'}`,
      cash_out: `R$ ${cash_out?.toFixed(2) || '0.00'}`,
      date: date.toLocaleString(),
      notes
    };

    try {
      await axios.post(`${API_BASE_URL}/default-printer/print-receipt`, { data: receiptData });
    } catch (error) {
      console.error('Error printing closing receipt:', error);
      throw error;
    }
  },

  async printCashWithdrawalReceipt(data: {
    cashier_id: string;
    terminal_id: string;
    user_name: string;
    amount: number;
    reason: string;
    date: Date;
  }): Promise<void> {
    try {
      const response = await fetch('/api/printer/cash-withdrawal-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to print cash withdrawal receipt');
      }
    } catch (error) {
      console.error('Error printing cash withdrawal receipt:', error);
      throw error;
    }
  }
};

export default PrinterService;
