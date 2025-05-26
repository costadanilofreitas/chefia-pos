import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Card from '../common/Card';
import Button from '../common/Button';
import Table from '../common/Table';
import Select from '../common/Select';

/**
 * ReportsPanel component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Object} props.restaurant - Current restaurant information
 * @param {string} [props.className] - Additional CSS class names
 */
const ReportsPanel = ({
  restaurant,
  className = '',
  ...rest
}) => {
  // State for report filters
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(false);
  
  // Mock data for demonstration
  const [salesData] = useState([
    { id: 1, date: '26/05/2025', category: 'Pratos Principais', quantity: 42, revenue: 'R$ 1.680,00' },
    { id: 2, date: '26/05/2025', category: 'Bebidas', quantity: 78, revenue: 'R$ 780,00' },
    { id: 3, date: '26/05/2025', category: 'Sobremesas', quantity: 23, revenue: 'R$ 345,00' },
    { id: 4, date: '26/05/2025', category: 'Entradas', quantity: 18, revenue: 'R$ 270,00' },
    { id: 5, date: '26/05/2025', category: 'Combos', quantity: 12, revenue: 'R$ 600,00' },
  ]);
  
  const [productData] = useState([
    { id: 1, name: 'X-Tudo', category: 'Pratos Principais', quantity: 22, revenue: 'R$ 880,00', avgRating: 4.8 },
    { id: 2, name: 'Refrigerante Cola', category: 'Bebidas', quantity: 45, revenue: 'R$ 225,00', avgRating: 4.5 },
    { id: 3, name: 'Pudim', category: 'Sobremesas', quantity: 15, revenue: 'R$ 150,00', avgRating: 4.9 },
    { id: 4, name: 'Batata Frita', category: 'Entradas', quantity: 18, revenue: 'R$ 180,00', avgRating: 4.7 },
    { id: 5, name: 'Combo Família', category: 'Combos', quantity: 12, revenue: 'R$ 600,00', avgRating: 4.6 },
  ]);

  // Handle report generation
  const handleGenerateReport = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  // Handle report export
  const handleExportReport = () => {
    // In a real implementation, this would generate and download a CSV/PDF file
    alert('Relatório exportado com sucesso!');
  };

  // Define table columns based on report type
  const getColumns = () => {
    switch (reportType) {
      case 'sales':
        return [
          { title: 'Data', dataIndex: 'date', width: '20%' },
          { title: 'Categoria', dataIndex: 'category', width: '30%' },
          { title: 'Quantidade', dataIndex: 'quantity', width: '20%', align: 'right' },
          { title: 'Receita', dataIndex: 'revenue', width: '30%', align: 'right' },
        ];
      case 'products':
        return [
          { title: 'Produto', dataIndex: 'name', width: '25%' },
          { title: 'Categoria', dataIndex: 'category', width: '20%' },
          { title: 'Quantidade', dataIndex: 'quantity', width: '15%', align: 'right' },
          { title: 'Receita', dataIndex: 'revenue', width: '20%', align: 'right' },
          { title: 'Avaliação', dataIndex: 'avgRating', width: '20%', align: 'center',
            render: (rating) => (
              <div style={{ color: tokens.colors.semantic.success }}>
                {rating} ★
              </div>
            )
          },
        ];
      default:
        return [];
    }
  };

  // Get report data based on type
  const getReportData = () => {
    switch (reportType) {
      case 'sales':
        return salesData;
      case 'products':
        return productData;
      default:
        return [];
    }
  };

  // Report type options
  const reportTypeOptions = [
    { value: 'sales', label: 'Vendas por Categoria' },
    { value: 'products', label: 'Desempenho de Produtos' },
    { value: 'customers', label: 'Análise de Clientes' },
    { value: 'payments', label: 'Métodos de Pagamento' },
  ];

  // Date range options
  const dateRangeOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'week', label: 'Esta Semana' },
    { value: 'month', label: 'Este Mês' },
    { value: 'custom', label: 'Personalizado' },
  ];

  // Styles
  const reportsPanelStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
  };

  const sectionTitleStyles = {
    fontSize: tokens.typography.h5.fontSize,
    fontWeight: tokens.typography.h5.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.md,
  };

  const filtersContainerStyles = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  };

  const filterItemStyles = {
    flex: '1 1 200px',
  };

  const actionsContainerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.md,
  };

  const summaryContainerStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  };

  const summaryItemStyles = {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.background.paper,
    borderRadius: tokens.borderRadius.md,
    boxShadow: tokens.shadows.sm,
  };

  const summaryValueStyles = {
    fontSize: tokens.typography.h4.fontSize,
    fontWeight: tokens.typography.h4.fontWeight,
    color: tokens.colors.primary.main,
    marginBottom: tokens.spacing.xs,
  };

  const summaryLabelStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
  };

  // Create class names
  const reportsPanelClass = `pos-reports-panel ${className}`;

  return (
    <div className={reportsPanelClass} style={reportsPanelStyles} {...rest}>
      <div style={sectionTitleStyles}>Relatórios</div>
      
      <Card>
        <div style={filtersContainerStyles}>
          <div style={filterItemStyles}>
            <Select
              label="Tipo de Relatório"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              options={reportTypeOptions}
              fullWidth
              disabled={loading}
            />
          </div>
          
          <div style={filterItemStyles}>
            <Select
              label="Período"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={dateRangeOptions}
              fullWidth
              disabled={loading}
            />
          </div>
          
          <div style={{ ...filterItemStyles, display: 'flex', alignItems: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              loading={loading}
              disabled={loading}
            >
              Gerar Relatório
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div style={summaryContainerStyles}>
          <div style={summaryItemStyles}>
            <div style={summaryValueStyles}>R$ 3.675,00</div>
            <div style={summaryLabelStyles}>Receita Total</div>
          </div>
          
          <div style={summaryItemStyles}>
            <div style={summaryValueStyles}>173</div>
            <div style={summaryLabelStyles}>Itens Vendidos</div>
          </div>
          
          <div style={summaryItemStyles}>
            <div style={summaryValueStyles}>42</div>
            <div style={summaryLabelStyles}>Pedidos</div>
          </div>
          
          <div style={summaryItemStyles}>
            <div style={summaryValueStyles}>R$ 87,50</div>
            <div style={summaryLabelStyles}>Ticket Médio</div>
          </div>
        </div>
        
        {/* Report Table */}
        <Table
          columns={getColumns()}
          data={getReportData()}
          hoverable
          bordered={false}
          striped
        />
        
        <div style={actionsContainerStyles}>
          <div></div>
          <Button
            variant="outlined"
            onClick={handleExportReport}
            disabled={loading}
          >
            Exportar Relatório
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPanel;
