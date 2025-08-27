import { useState, useCallback } from 'react';
import { 
  ReportData, 
  ReportType, 
  ReportDataType
} from '../types/report';
import {
  CashierOperation,
  CashierSummary,
  OperatorSummary
} from '../types/cashier';
import { ExtendedReportData, validateReportData } from '../types/report-guards';

export const useReport = () => {
  const [loading, setLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);
  
  const generateReport = useCallback(async (type: ReportType | string, cashierData?: CashierSummary) => {
    setLoading(true);
    
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let reportData: ExtendedReportData = {};
    let title = '';
    
    switch(type) {
      case 'summary':
        title = 'Resumo do Caixa';
        reportData = validateReportData('summary', {
          totalSales: cashierData?.currentCashier?.total_sales || 0,
          totalWithdrawals: cashierData?.currentCashier?.total_withdrawals || 0,
          cashInRegister: cashierData?.currentCashier?.current_cash_amount || 0,
          operatorName: cashierData?.currentCashier?.current_operator_name || 'N/A',
          openingAmount: cashierData?.currentCashier?.opening_cash_amount || 0,
          salesCount: cashierData?.operations?.filter((op: CashierOperation) => op.operation_type === 'SALE').length || 0
        });
        break;
        
      case 'cashflow':
        title = 'Fluxo de Caixa';
        reportData = validateReportData('cashflow', {
          openingAmount: cashierData?.currentCashier?.opening_cash_amount || 0,
          currentAmount: cashierData?.currentCashier?.current_cash_amount || 0,
          totalEntries: cashierData?.currentCashier?.total_sales || 0,
          totalExits: cashierData?.currentCashier?.total_withdrawals || 0,
          netFlow: (cashierData?.currentCashier?.total_sales || 0) - (cashierData?.currentCashier?.total_withdrawals || 0)
        });
        break;
        
      case 'sales':
        title = 'Relatório de Vendas';
        reportData = validateReportData('sales', {
          totalSales: cashierData?.operations?.filter((op: CashierOperation) => op.operation_type === 'SALE').length || 0,
          totalAmount: cashierData?.currentCashier?.total_sales || 0,
          averageTicket: cashierData?.currentCashier?.total_sales / 
            (cashierData?.operations?.filter((op: CashierOperation) => op.operation_type === 'SALE').length || 1) || 0,
          operations: cashierData?.operations?.filter((op: CashierOperation) => op.operation_type === 'SALE') || []
        });
        break;
        
      case 'payments':
        title = 'Formas de Pagamento';
        reportData = validateReportData('payments', {
          cash: cashierData?.currentCashier?.total_cash || 0,
          credit: cashierData?.currentCashier?.total_credit || 0,
          debit: cashierData?.currentCashier?.total_debit || 0,
          pix: cashierData?.currentCashier?.total_pix || 0,
          total: (cashierData?.currentCashier?.total_cash || 0) + 
                 (cashierData?.currentCashier?.total_credit || 0) + 
                 (cashierData?.currentCashier?.total_debit || 0) + 
                 (cashierData?.currentCashier?.total_pix || 0)
        });
        break;
        
      case 'operators':
        title = 'Relatório de Operadores';
        reportData = validateReportData('operators', {
          currentOperator: cashierData?.currentCashier?.current_operator_name || 'N/A',
          openedBy: cashierData?.currentCashier?.opened_by_name || 'N/A',
          totalOperators: 1,
          operatorSales: cashierData?.operations?.reduce((acc: Record<string, OperatorSummary>, op: CashierOperation) => {
            if (op.operation_type === 'SALE') {
              const operator = op.operator_name || 'Unknown';
              if (!acc[operator]) acc[operator] = { 
                operatorId: op.operator_id,
                operatorName: operator,
                salesCount: 0, 
                salesTotal: 0,
                withdrawalsCount: 0,
                withdrawalsTotal: 0,
                averageTicket: 0
              };
              acc[operator].salesCount++;
              acc[operator].salesTotal += op.amount || 0;
              acc[operator].averageTicket = acc[operator].salesTotal / acc[operator].salesCount;
            }
            return acc;
          }, {}) || {}
        });
        break;
        
      case 'closure':
        title = 'Fechamento de Caixa';
        reportData = validateReportData('closure', {
          openingDate: cashierData?.currentCashier?.opened_at || new Date(),
          closingDate: new Date(),
          totalSales: cashierData?.currentCashier?.total_sales || 0,
          totalWithdrawals: cashierData?.currentCashier?.total_withdrawals || 0,
          expectedCash: cashierData?.currentCashier?.current_cash_amount || 0,
          physicalCash: 0,
          difference: 0,
          operatorName: cashierData?.currentCashier?.current_operator_name || 'N/A',
          terminalId: cashierData?.currentCashier?.terminal_id || 'N/A'
        });
        break;
    }
    
    const finalReport: ReportData = {
      type: type as ReportType,
      title,
      data: reportData as ReportDataType,
      generatedAt: new Date()
    };
    
    setCurrentReport(finalReport);
    setLoading(false);
    return finalReport;
  
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