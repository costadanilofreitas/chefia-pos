/**
 * Service para integração com APIs de analytics do backend
 */

import { apiInterceptor } from "./ApiInterceptor";
import logger from "./LocalLoggerService";

export interface HourlyStat {
  hour: number;
  sales: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentMethod {
  method: string;
  count: number;
  total: number;
  percentage: number;
}

export interface SalesData {
  total: number;
  count: number;
  average: number;
  growth?: number;
}

export interface CustomersData {
  total: number;
  satisfaction: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface PerformanceData {
  avgOrderTime: number; // em segundos
  avgWaitTime: number; // em minutos
  tablesPerHour: number;
  orderAccuracy: number; // porcentagem
}

export interface DashboardMetrics {
  totalRevenue: number;
  todayOrders: number;
  averageTicket: number;
  openCashiers: number;
  revenue: number; // Compatibilidade com ManagerScreen
  orders: number; // Compatibilidade com ManagerScreen

  // Novas propriedades para o AnalyticsDashboard
  hourlyStats: HourlyStat[];
  topProducts: TopProduct[];
  paymentMethods: PaymentMethod[];
  sales: SalesData;
  customers: CustomersData;
  performance: PerformanceData;
}

export interface RevenueData {
  total: number;
  today: number;
  yesterday: number;
  thisWeek: number;
  thisMonth: number;
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface OrdersData {
  total: number;
  today: number;
  yesterday: number;
  thisWeek: number;
  thisMonth: number;
  averagePerDay: number;
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface CashierStatus {
  openCashiers: number;
  totalCashiers: number;
  cashierDetails: Array<{
    id: string;
    operatorId: string;
    operatorName: string;
    terminalId: string;
    openedAt: string;
    currentBalance: number;
  }>;
}

export interface AnalyticsSummary {
  revenue: RevenueData;
  orders: OrdersData;
  cashiers: CashierStatus;
  lastUpdated: string;
}

class AnalyticsService {
  /**
   * Obtém métricas básicas do dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Buscar dados reais do backend
    const [revenue, orders, cashiers] = await Promise.all([
      this.getRevenueToday(),
      this.getOrdersToday(),
      this.getCashierStatus(),
    ]);

    const averageTicket = orders > 0 ? revenue / orders : 0;

    // Gerar dados simulados para as novas propriedades
    const hourlyStats = this.generateHourlyStats();
    const topProducts = this.generateTopProducts();
    const paymentMethods = this.generatePaymentMethods(revenue);
    const salesData = this.generateSalesData(revenue, orders, averageTicket);
    const customersData = this.generateCustomersData();
    const performanceData = this.generatePerformanceData();

    return {
      totalRevenue: revenue,
      todayOrders: orders,
      averageTicket: averageTicket,
      openCashiers: cashiers,
      revenue: revenue,
      orders: orders,
      hourlyStats,
      topProducts,
      paymentMethods,
      sales: salesData,
      customers: customersData,
      performance: performanceData,
    };
  }

  /**
   * Simula incremento de venda para testes
   * Remove quando integração real estiver completa
   */
  async simulateSale(_amount: number): Promise<void> {
    // TODO: Implementar criação real de venda quando endpoint estiver disponível
    // Por enquanto, apenas registra no console
    // Quando houver endpoint real, fazer:
    // await apiInterceptor.post('/api/v1/orders', { amount, ... });
  }

  /**
   * Gera dados simulados de vendas por hora
   */
  private generateHourlyStats(): HourlyStat[] {
    const stats: HourlyStat[] = [];
    const currentHour = new Date().getHours();

    for (let i = 0; i < 24; i++) {
      const hour = i;
      let sales = 0;
      let orders = 0;

      // Simula padrão realista de vendas por hora
      if (hour >= 6 && hour < 11) {
        // Café da manhã
        sales = Math.random() * 500 + 100;
        orders = Math.floor(Math.random() * 15) + 5;
      } else if (hour >= 11 && hour < 15) {
        // Almoço - pico
        sales = Math.random() * 1500 + 800;
        orders = Math.floor(Math.random() * 30) + 20;
      } else if (hour >= 15 && hour < 18) {
        // Tarde
        sales = Math.random() * 300 + 50;
        orders = Math.floor(Math.random() * 8) + 2;
      } else if (hour >= 18 && hour < 23) {
        // Jantar
        sales = Math.random() * 1200 + 600;
        orders = Math.floor(Math.random() * 25) + 15;
      } else {
        // Madrugada
        sales = Math.random() * 100;
        orders = Math.floor(Math.random() * 3);
      }

      // Se é hora futura, zera os valores
      if (hour > currentHour) {
        sales = 0;
        orders = 0;
      }

      stats.push({ hour, sales, orders });
    }

    return stats;
  }

  /**
   * Gera dados simulados de produtos mais vendidos
   */
  private generateTopProducts(): TopProduct[] {
    const products = [
      "Pizza Margherita",
      "Hambúrguer Clássico",
      "Lasanha Bolonhesa",
      "Salada Caesar",
      "Risotto de Camarão",
      "Salmão Grelhado",
      "Pasta Carbonara",
      "Frango à Parmegiana",
    ];

    return [...products] // Create a shallow copy to use sort
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map((name, index) => ({
        name,
        quantity: Math.floor(Math.random() * 50) + 10 - index * 5,
        revenue: Math.random() * 1000 + 200 - index * 100,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  /**
   * Gera dados simulados de métodos de pagamento
   */
  private generatePaymentMethods(totalRevenue: number): PaymentMethod[] {
    const methods = [
      { method: "Cartão de Crédito", percentage: 45 },
      { method: "PIX", percentage: 30 },
      { method: "Cartão de Débito", percentage: 15 },
      { method: "Dinheiro", percentage: 10 },
    ];

    return methods.map((method) => {
      const total = (totalRevenue * method.percentage) / 100;
      const count = Math.floor(total / 45); // Ticket médio estimado

      return {
        method: method.method,
        count,
        total,
        percentage: method.percentage,
      };
    });
  }

  /**
   * Gera dados simulados de vendas
   */
  private generateSalesData(
    revenue: number,
    orders: number,
    average: number
  ): SalesData {
    return {
      total: revenue,
      count: orders,
      average: average,
      growth: Math.random() * 20 - 5, // Entre -5% e +15%
    };
  }

  /**
   * Gera dados simulados de clientes
   */
  private generateCustomersData(): CustomersData {
    const total = Math.floor(Math.random() * 200) + 50;
    const newCustomers = Math.floor(total * 0.3);

    return {
      total,
      satisfaction: Math.random() * 20 + 80, // Entre 80% e 100%
      newCustomers,
      returningCustomers: total - newCustomers,
    };
  }

  /**
   * Gera dados simulados de performance
   */
  private generatePerformanceData(): PerformanceData {
    return {
      avgOrderTime: Math.random() * 600 + 300, // 5-15 minutos em segundos
      avgWaitTime: Math.random() * 10 + 5, // 5-15 minutos
      tablesPerHour: Math.random() * 3 + 2, // 2-5 mesas por hora
      orderAccuracy: Math.random() * 10 + 90, // 90-100%
    };
  }

  /**
   * Exporta métricas em formato CSV ou JSON
   */
  async exportMetrics(format: "csv" | "json"): Promise<Blob> {
    const metrics = await this.getDashboardMetrics();
    let content: string;
    let mimeType: string;

    if (format === "csv") {
      // Gera CSV com dados principais
      const csvRows = [
        "Métrica,Valor",
        `Receita Total,${metrics.totalRevenue}`,
        `Pedidos Hoje,${metrics.todayOrders}`,
        `Ticket Médio,${metrics.averageTicket}`,
        `Caixas Abertos,${metrics.openCashiers}`,
        `Satisfação Clientes,${metrics.customers.satisfaction}%`,
        `Tempo Médio Pedido,${Math.floor(metrics.performance.avgOrderTime / 60)} min`,
        `Precisão Pedidos,${metrics.performance.orderAccuracy}%`,
      ];

      // Adiciona produtos mais vendidos
      csvRows.push("", "Produtos Mais Vendidos");
      csvRows.push("Produto,Quantidade,Receita");
      metrics.topProducts.forEach((product) => {
        csvRows.push(
          `${product.name},${product.quantity},${product.revenue.toFixed(2)}`
        );
      });

      // Adiciona métodos de pagamento
      csvRows.push("", "Métodos de Pagamento");
      csvRows.push("Método,Quantidade,Total,Porcentagem");
      metrics.paymentMethods.forEach((method) => {
        csvRows.push(
          `${method.method},${method.count},${method.total.toFixed(2)},${method.percentage}%`
        );
      });

      content = csvRows.join("\n");
      mimeType = "text/csv;charset=utf-8;";
    } else {
      // Gera JSON
      content = JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          metrics,
        },
        null,
        2
      );
      mimeType = "application/json;charset=utf-8;";
    }

    return new Blob([content], { type: mimeType });
  }

  /**
   * Força atualização das métricas
   */
  async refreshMetrics(): Promise<DashboardMetrics> {
    // Limpa cache se houver
    return this.getDashboardMetrics();
  }

  /**
   * Obtém receita do dia
   */
  private async getRevenueToday(): Promise<number> {
    try {
      const response = await apiInterceptor.get<{ total: number }>(
        "/api/v1/analytics/revenue/today"
      );
      return response.data.total || 0;
    } catch (error) {
      await logger.warn(
        "Failed to get revenue today",
        { error },
        "AnalyticsService"
      );
      return 0;
    }
  }

  /**
   * Obtém número de pedidos do dia
   */
  private async getOrdersToday(): Promise<number> {
    try {
      const response = await apiInterceptor.get<{ count: number }>(
        "/api/v1/analytics/orders/today"
      );
      return response.data.count || 0;
    } catch (error) {
      await logger.warn(
        "Failed to get orders today",
        { error },
        "AnalyticsService"
      );
      return 0;
    }
  }

  /**
   * Obtém status dos caixas
   */
  private async getCashierStatus(): Promise<number> {
    try {
      const response = await apiInterceptor.get("/api/v1/cashier/current");
      return Array.isArray(response.data) ? response.data.length : 0;
    } catch (error) {
      await logger.warn(
        "Failed to get cashier status",
        { error },
        "AnalyticsService"
      );
      return 0;
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
