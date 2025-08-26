import { useState, useCallback } from 'react';

export interface ReportData {
  type: string;
  title: string;
  data: any;
  generatedAt: Date;
}

export const useReport = () => {
  const [loading, setLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  
  const generateReport = useCallback(async (type: string, data?: any) => {
    setLoading(true);
    
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const reportData: ReportData = {
      type,
      title: '',
      data: {},
      generatedAt: new Date()
    };
    
    switch(type) {
      case 'summary':
        reportData.title = 'Resumo do Caixa';
        reportData.data = {
          totalSales: data?.currentCashier?.total_sales || 0,
          totalWithdrawals: data?.currentCashier?.total_withdrawals || 0,
          cashInRegister: data?.currentCashier?.current_cash_amount || 0,
          operatorName: data?.currentCashier?.current_operator_name || 'N/A',
          openingAmount: data?.currentCashier?.opening_cash_amount || 0,
          salesCount: data?.operations?.filter((op: any) => op.operation_type === 'SALE').length || 0
        };
        break;
        
      case 'cashflow':
        reportData.title = 'Fluxo de Caixa';
        reportData.data = {
          openingAmount: data?.currentCashier?.opening_cash_amount || 0,
          currentAmount: data?.currentCashier?.current_cash_amount || 0,
          totalEntries: data?.currentCashier?.total_sales || 0,
          totalExits: data?.currentCashier?.total_withdrawals || 0,
          netFlow: (data?.currentCashier?.total_sales || 0) - (data?.currentCashier?.total_withdrawals || 0)
        };
        break;
        
      case 'sales':
        reportData.title = 'Relatório de Vendas';
        reportData.data = {
          totalSales: data?.operations?.filter((op: any) => op.operation_type === 'SALE').length || 0,
          totalAmount: data?.currentCashier?.total_sales || 0,
          averageTicket: data?.currentCashier?.total_sales / 
            (data?.operations?.filter((op: any) => op.operation_type === 'SALE').length || 1) || 0,
          operations: data?.operations?.filter((op: any) => op.operation_type === 'SALE') || []
        };
        break;
        
      case 'payments':
        reportData.title = 'Formas de Pagamento';
        reportData.data = {
          cash: data?.currentCashier?.total_cash || 0,
          credit: data?.currentCashier?.total_credit || 0,
          debit: data?.currentCashier?.total_debit || 0,
          pix: data?.currentCashier?.total_pix || 0,
          total: (data?.currentCashier?.total_cash || 0) + 
                 (data?.currentCashier?.total_credit || 0) + 
                 (data?.currentCashier?.total_debit || 0) + 
                 (data?.currentCashier?.total_pix || 0)
        };
        break;
        
      case 'operators':
        reportData.title = 'Relatório de Operadores';
        reportData.data = {
          currentOperator: data?.currentCashier?.current_operator_name || 'N/A',
          openedBy: data?.currentCashier?.opened_by_name || 'N/A',
          totalOperators: 1,
          operatorSales: data?.operations?.reduce((acc: any, op: any) => {
            if (op.operation_type === 'SALE') {
              const operator = op.operator_name || 'Unknown';
              if (!acc[operator]) acc[operator] = { count: 0, total: 0 };
              acc[operator].count++;
              acc[operator].total += op.amount || 0;
            }
            return acc;
          }, {}) || {}
        };
        break;
        
      case 'closure':
        reportData.title = 'Fechamento de Caixa';
        reportData.data = {
          openingDate: data?.currentCashier?.opened_at || new Date(),
          closingDate: new Date(),
          totalSales: data?.currentCashier?.total_sales || 0,
          totalWithdrawals: data?.currentCashier?.total_withdrawals || 0,
          expectedCash: data?.currentCashier?.current_cash_amount || 0,
          physicalCash: 0,
          difference: 0,
          operatorName: data?.currentCashier?.current_operator_name || 'N/A',
          terminalId: data?.currentCashier?.terminal_id || 'N/A'
        };
        break;
    }
    
    setCurrentReport(reportData);
    setLoading(false);
    return reportData;
  
  }, [setLoading]);
  
  const printReport = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);
  
  const clearReport = useCallback(() => {
    setCurrentReport(null);
  }, []);
  
  return {
    generateReport,
    printReport,
    clearReport,
    currentReport,
    loading
  };
};