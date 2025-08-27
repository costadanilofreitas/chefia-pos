/**
 * Tipos para o sistema de relatórios
 */

// Tipos de dados específicos para cada tipo de relatório
export interface SalesReportData {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesByHour: Array<{
    hour: number;
    sales: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    quantity: number;
  }>;
}

export interface InventoryReportData {
  totalItems: number;
  totalValue: number;
  lowStockItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
  }>;
  stockMovements: Array<{
    id: string;
    productName: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    date: string;
  }>;
  categorySummary: Array<{
    category: string;
    items: number;
    value: number;
  }>;
}

export interface FinancialReportData {
  revenue: number;
  expenses: number;
  profit: number;
  pendingPayments: number;
  cashFlow: Array<{
    date: string;
    income: number;
    outcome: number;
    balance: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface CustomerReportData {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalPurchases: number;
    totalSpent: number;
  }>;
  customerRetention: number;
  averageOrderValue: number;
}

export interface EmployeeReportData {
  totalEmployees: number;
  activeEmployees: number;
  salesByEmployee: Array<{
    employeeId: string;
    employeeName: string;
    totalSales: number;
    totalOrders: number;
  }>;
  performanceMetrics: Array<{
    employeeId: string;
    metric: string;
    value: number;
  }>;
}

// Tipo genérico para dados de relatório customizados
export interface CustomReportData {
  [key: string]: unknown;
}

// Union type para todos os tipos de dados de relatório
export type ReportDataType = 
  | SalesReportData 
  | InventoryReportData 
  | FinancialReportData 
  | CustomerReportData
  | EmployeeReportData
  | CustomReportData;

// Enum para tipos de relatório
export enum ReportType {
  SALES = 'sales',
  INVENTORY = 'inventory',
  FINANCIAL = 'financial',
  CUSTOMER = 'customer',
  EMPLOYEE = 'employee',
  CUSTOM = 'custom'
}

// Interface principal para relatório
export interface ReportData {
  type: ReportType;
  title: string;
  data: ReportDataType;
  generatedAt: Date;
  period?: {
    start: Date;
    end: Date;
  };
}

// Parâmetros para geração de relatório
export interface ReportParams {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  employeeId?: string;
  customerId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  format?: 'json' | 'csv' | 'pdf';
}

// Filtros para relatórios
export interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  products?: string[];
  employees?: string[];
  customers?: string[];
  paymentMethods?: string[];
  status?: string[];
}

// Resposta da API de relatórios
export interface ReportResponse {
  success: boolean;
  report?: ReportData;
  error?: string;
  generatedAt: string;
}

// Configuração de relatório agendado
export interface ScheduledReport {
  id: string;
  type: ReportType;
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  params: ReportParams;
  active: boolean;
  lastRun?: Date;
  nextRun?: Date;
}