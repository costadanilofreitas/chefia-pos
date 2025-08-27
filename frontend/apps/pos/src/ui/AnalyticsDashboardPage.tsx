/**
 * Dashboard de Analytics em tempo real
 */

import React, { useEffect, useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { cn } from '../utils/cn';
import logger from '../services/LocalLoggerService';

// Componente de métrica individual
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  growth?: number;
  icon: React.ReactNode;
  color?: string;
  loading?: boolean;
}> = ({ title, value, growth, icon, color = 'blue', loading }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-500 border-blue-200 bg-blue-50',
    green: 'bg-green-500 text-green-500 border-green-200 bg-green-50',
    purple: 'bg-purple-500 text-purple-500 border-purple-200 bg-purple-50',
    orange: 'bg-orange-500 text-orange-500 border-orange-200 bg-orange-50',
    red: 'bg-red-500 text-red-500 border-red-200 bg-red-50'
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  const [bgColor, textColor, borderColor, lightBg] = colors.split(' ');

  return (
    <div className={cn(
      'relative p-6 rounded-xl border-2 transition-all duration-200',
      `${borderColor} ${lightBg}`,
      'hover:shadow-lg hover:scale-[1.02]'
    )}>
      {loading && (
        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          
          {growth !== undefined && (
            <div className="flex items-center mt-2">
              <svg 
                className={cn('w-4 h-4 mr-1', growth >= 0 ? 'text-green-500' : 'text-red-500')}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={growth >= 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
                />
              </svg>
              <span className={cn('text-sm font-medium', growth >= 0 ? 'text-green-500' : 'text-red-500')}>
                {Math.abs(growth)}%
              </span>
            </div>
          )}
        </div>
        
        <div className={cn('p-3 rounded-lg', bgColor, 'bg-opacity-10')}>
          <div className={textColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

// Gráfico de barras simples
const BarChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  title: string;
  color?: string;
}> = ({ data, title, color = 'blue' }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={`${title}-item-${item.label}-${index}`} className="flex items-center">
            <span className="text-sm text-gray-600 w-20 truncate">{item.label}</span>
            <div className="flex-1 mx-3">
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    (() => {
                      const colorMap: Record<string, string> = {
                        'blue': 'bg-blue-500',
                        'green': 'bg-green-500',
                        'purple': 'bg-purple-500'
                      };
                      return colorMap[color] || 'bg-gray-500';
                    })()
                  )}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-900 w-16 text-right">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal do Dashboard
const AnalyticsDashboardPage: React.FC = () => {
  const { metrics, lastUpdated, refreshMetrics, formatCurrency, formatPercentage, loading, error } = useAnalytics(true, 30000);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Simula dados para o gráfico de vendas por hora
  const hourlyData = metrics?.hourlyStats?.slice(0, 12).map(stat => ({
    label: `${stat.hour}h`,
    value: Math.round(stat.sales)
  })) || [];

  // Simula dados para produtos mais vendidos
  const topProductsData = metrics?.topProducts?.slice(0, 5).map(product => ({
    label: product.name,
    value: product.quantity
  })) || [];

  // Simula dados para métodos de pagamento
  // const paymentMethodsData = metrics?.paymentMethods?.map(method => ({
  //   label: method.method,
  //   value: method.count
  // })) || [];  // TODO: usar quando implementar gráfico de métodos de pagamento

  // Função para exportar dados
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const analyticsService = (await import('../services/AnalyticsService')).default;
      const blob = await analyticsService.exportMetrics(format);
      
      // Cria link para download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      setShowExportMenu(false);
    } catch (error) {
      // eslint-disable-next-line no-secrets/no-secrets
      await logger.error('Failed to export analytics data', { format, error }, 'AnalyticsDashboardPage');
    }
  };

  // Auto refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMetrics();
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Set interval only once on mount

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Erro ao carregar analytics</h2>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={refreshMetrics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-600 mt-1">
                Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Seletor de período */}
            <div className="flex bg-white rounded-lg border-2 border-gray-200 p-1">
              {(['day', 'week', 'month'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    selectedPeriod === period 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {(() => {
                    if (period === 'day') return 'Hoje';
                    if (period === 'week') return 'Semana';
                    return 'Mês';
                  })()}
                </button>
              ))}
            </div>
            
            {/* Botão de refresh */}
            <button
              onClick={refreshMetrics}
              disabled={loading}
              className={cn(
                'p-3 rounded-lg bg-white border-2 border-gray-200',
                'hover:bg-gray-50 transition-colors',
                loading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <svg 
                className={cn('w-5 h-5 text-gray-700', loading && 'animate-spin')}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Menu de exportação */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-3 rounded-lg bg-white border-2 border-gray-200 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border-2 border-gray-200 z-10">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Exportar JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Vendas Total"
          value={metrics ? formatCurrency(metrics.sales?.total || 0) : 'R$ 0,00'}
          growth={metrics?.sales?.growth}
          color="green"
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        
        <MetricCard
          title="Pedidos"
          value={metrics?.sales?.count || 0}
          growth={11.2}
          color="blue"
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />
        
        <MetricCard
          title="Ticket Médio"
          value={metrics ? formatCurrency(metrics.sales?.average || 0) : 'R$ 0,00'}
          growth={5.8}
          color="purple"
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
        
        <MetricCard
          title="Satisfação"
          value={metrics ? formatPercentage(metrics.customers?.satisfaction || 0) : '0%'}
          growth={3.2}
          color="orange"
          loading={loading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Gráficos e tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendas por hora */}
        <div className="lg:col-span-2">
          <BarChart 
            data={hourlyData} 
            title="Vendas por Hora" 
            color="blue"
          />
        </div>
        
        {/* Top produtos */}
        <div>
          <BarChart 
            data={topProductsData} 
            title="Produtos Mais Vendidos" 
            color="green"
          />
        </div>
        
        {/* Métodos de pagamento */}
        <div>
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Métodos de Pagamento</h3>
            <div className="space-y-3">
              {metrics?.paymentMethods?.map((method, index) => (
                <div key={`payment-${method.method}-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={cn(
                      'w-3 h-3 rounded-full mr-3',
                      (() => {
                        const colorMap = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                        return colorMap[index] || 'bg-orange-500';
                      })()
                    )} />
                    <span className="text-sm text-gray-700">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(method.total)}</p>
                    <p className="text-xs text-gray-500">{method.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Performance */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Performance Operacional</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Tempo Médio Pedido</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.performance?.avgOrderTime ? `${Math.floor(metrics.performance.avgOrderTime / 60)}min` : '0min'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Tempo de Espera</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.performance?.avgWaitTime || 0}min
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Mesas/Hora</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.performance?.tablesPerHour?.toFixed(1) || '0.0'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Precisão Pedidos</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.performance?.orderAccuracy?.toFixed(1) || '0.0'}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;