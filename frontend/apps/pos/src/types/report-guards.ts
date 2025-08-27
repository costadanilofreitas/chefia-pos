/**
 * Type guards and validation functions for report data
 */

import {
  SalesReportData,
  InventoryReportData,
  FinancialReportData,
  CustomerReportData,
  EmployeeReportData,
  ReportDataType,
  ReportType
} from './report';

/**
 * Type guard to check if data is SalesReportData
 */
export function isSalesReportData(data: ReportDataType): data is SalesReportData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'totalSales' in data &&
    'totalOrders' in data &&
    'averageTicket' in data
  );
}

/**
 * Type guard to check if data is InventoryReportData
 */
export function isInventoryReportData(data: ReportDataType): data is InventoryReportData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'totalItems' in data &&
    'totalValue' in data &&
    'lowStockItems' in data
  );
}

/**
 * Type guard to check if data is FinancialReportData
 */
export function isFinancialReportData(data: ReportDataType): data is FinancialReportData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'revenue' in data &&
    'expenses' in data &&
    'profit' in data
  );
}

/**
 * Type guard to check if data is CustomerReportData
 */
export function isCustomerReportData(data: ReportDataType): data is CustomerReportData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'totalCustomers' in data &&
    'newCustomers' in data &&
    'activeCustomers' in data
  );
}

/**
 * Type guard to check if data is EmployeeReportData
 */
export function isEmployeeReportData(data: ReportDataType): data is EmployeeReportData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'totalEmployees' in data &&
    'activeEmployees' in data &&
    'salesByEmployee' in data
  );
}

/**
 * Interface for custom report data with all possible fields
 */
export interface ExtendedReportData {
  // Summary fields
  totalSales?: number;
  totalWithdrawals?: number;
  cashInRegister?: number;
  operatorName?: string;
  openingAmount?: number;
  salesCount?: number;
  
  // Cashflow fields
  currentAmount?: number;
  totalEntries?: number;
  totalExits?: number;
  netFlow?: number;
  
  // Sales fields
  totalAmount?: number;
  averageTicket?: number;
  operations?: Array<{
    id: string;
    type: string;
    amount: number;
    timestamp?: string;
    operator?: string;
  }>;
  
  // Payment fields
  cash?: number;
  credit?: number;
  debit?: number;
  pix?: number;
  total?: number;
  
  // Operators fields
  currentOperator?: string;
  openedBy?: string;
  totalOperators?: number;
  operatorSales?: Record<string, {
    operatorId: string;
    operatorName: string;
    salesCount: number;
    salesTotal: number;
    withdrawalsCount: number;
    withdrawalsTotal: number;
    averageTicket: number;
  }>;
  
  // Closure fields
  openingDate?: string | Date;
  closingDate?: string | Date;
  expectedCash?: number;
  physicalCash?: number;
  difference?: number;
  terminalId?: string;
  
  // Allow other fields
  [key: string]: unknown;
}

/**
 * Type guard for extended report data
 */
export function isExtendedReportData(data: unknown): data is ExtendedReportData {
  return data !== null && typeof data === 'object';
}

/**
 * Safe getter for report data fields
 */
export function getReportField<T = unknown>(
  data: ReportDataType | undefined | null,
  field: string,
  defaultValue: T
): T {
  if (!data || typeof data !== 'object') {
    return defaultValue;
  }
  
  if (field in data) {
    return (data as Record<string, unknown>)[field] as T;
  }
  
  return defaultValue;
}

/**
 * Convert unknown data to ExtendedReportData
 */
export function toExtendedReportData(data: unknown): ExtendedReportData {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  return data as ExtendedReportData;
}

/**
 * Validate and transform backend report data
 */
export function validateReportData(type: string, data: unknown): ExtendedReportData {
  const baseData = toExtendedReportData(data);
  
  // Add type-specific validations and transformations
  switch (type) {
    case 'summary':
      return {
        ...baseData,
        totalSales: Number(baseData.totalSales || 0),
        totalWithdrawals: Number(baseData.totalWithdrawals || 0),
        cashInRegister: Number(baseData.cashInRegister || 0),
        openingAmount: Number(baseData.openingAmount || 0),
        salesCount: Number(baseData.salesCount || 0),
        operatorName: String(baseData.operatorName || 'N/A')
      };
      
    case 'cashflow':
      return {
        ...baseData,
        openingAmount: Number(baseData.openingAmount || 0),
        currentAmount: Number(baseData.currentAmount || 0),
        totalEntries: Number(baseData.totalEntries || 0),
        totalExits: Number(baseData.totalExits || 0),
        netFlow: Number(baseData.netFlow || 0)
      };
      
    case 'sales':
      return {
        ...baseData,
        totalSales: Number(baseData.totalSales || 0),
        totalAmount: Number(baseData.totalAmount || 0),
        averageTicket: Number(baseData.averageTicket || 0),
        operations: Array.isArray(baseData.operations) ? baseData.operations : []
      };
      
    case 'payments':
      return {
        ...baseData,
        cash: Number(baseData.cash || 0),
        credit: Number(baseData.credit || 0),
        debit: Number(baseData.debit || 0),
        pix: Number(baseData.pix || 0),
        total: Number(baseData.total || 0)
      };
      
    case 'operators':
      return {
        ...baseData,
        currentOperator: String(baseData.currentOperator || 'N/A'),
        openedBy: String(baseData.openedBy || 'N/A'),
        totalOperators: Number(baseData.totalOperators || 0),
        operatorSales: (baseData.operatorSales || {}) as Record<string, {
          operatorId: string;
          operatorName: string;
          salesCount: number;
          salesTotal: number;
          withdrawalsCount: number;
          withdrawalsTotal: number;
          averageTicket: number;
        }>
      };
      
    case 'closure':
      return {
        ...baseData,
        openingDate: baseData.openingDate || new Date(),
        closingDate: baseData.closingDate || new Date(),
        expectedCash: Number(baseData.expectedCash || 0),
        physicalCash: Number(baseData.physicalCash || 0),
        difference: Number(baseData.difference || 0),
        terminalId: String(baseData.terminalId || 'N/A'),
        operatorName: String(baseData.operatorName || 'N/A')
      };
      
    default:
      return baseData;
  }
}