import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Card from '../common/Card';
import Button from '../common/Button';
import Table from '../common/Table';

/**
 * Dashboard component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Object} props.restaurant - Current restaurant information
 * @param {string} [props.className] - Additional CSS class names
 */
const Dashboard = ({
  restaurant,
  className = '',
  ...rest
}) => {
  // Mock data for demonstration
  const [salesData] = useState({
    today: { value: 'R$ 3.245,00', count: 42, comparison: '+12%' },
    week: { value: 'R$ 21.876,00', count: 287, comparison: '+8%' },
    month: { value: 'R$ 87.654,00', count: 1243, comparison: '+15%' },
  });

  const [recentOrders] = useState([
    { id: '12345', customer: 'João Silva', items: 3, total: 'R$ 87,50', status: 'Entregue', time: '15:30' },
    { id: '12344', customer: 'Maria Oliveira', items: 5, total: 'R$ 125,90', status: 'Em preparo', time: '15:25' },
    { id: '12343', customer: 'Carlos Santos', items: 2, total: 'R$ 45,00', status: 'Aguardando', time: '15:20' },
    { id: '12342', customer: 'Ana Pereira', items: 4, total: 'R$ 98,70', status: 'Entregue', time: '15:10' },
    { id: '12341', customer: 'Pedro Costa', items: 1, total: 'R$ 32,90', status: 'Entregue', time: '15:00' },
  ]);

  // Table columns definition
  const orderColumns = [
    { title: 'ID', dataIndex: 'id', width: '10%' },
    { title: 'Cliente', dataIndex: 'customer', width: '25%' },
    { title: 'Itens', dataIndex: 'items', width: '10%', align: 'center' },
    { title: 'Total', dataIndex: 'total', width: '15%', align: 'right' },
    { title: 'Status', dataIndex: 'status', width: '20%', 
      render: (status) => {
        let color;
        switch (status) {
          case 'Entregue': color = tokens.colors.semantic.success; break;
          case 'Em preparo': color = tokens.colors.semantic.warning; break;
          default: color = tokens.colors.semantic.info;
        }
        return <span style={{ color }}>{status}</span>;
      }
    },
    { title: 'Hora', dataIndex: 'time', width: '10%', align: 'center' },
    { title: 'Ações', dataIndex: 'actions', width: '10%', align: 'center',
      render: () => (
        <Button variant="text" size="small">
          Ver
        </Button>
      )
    },
  ];

  // Styles
  const dashboardStyles = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
  };

  const welcomeStyles = {
    fontSize: tokens.typography.h4.fontSize,
    fontWeight: tokens.typography.h4.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.md,
  };

  const statsContainerStyles = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  };

  const statCardStyles = {
    padding: tokens.spacing.md,
  };

  const statValueStyles = {
    fontSize: tokens.typography.h3.fontSize,
    fontWeight: tokens.typography.h3.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.xs,
  };

  const statLabelStyles = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
  };

  const statComparisonStyles = (value) => ({
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeightMedium,
    color: value.startsWith('+') ? tokens.colors.semantic.success : tokens.colors.semantic.error,
    marginLeft: tokens.spacing.sm,
  });

  const sectionTitleStyles = {
    fontSize: tokens.typography.h5.fontSize,
    fontWeight: tokens.typography.h5.fontWeight,
    color: tokens.colors.text.primary,
    marginBottom: tokens.spacing.md,
  };

  // Create class names
  const dashboardClass = `pos-dashboard ${className}`;

  return (
    <div className={dashboardClass} style={dashboardStyles} {...rest}>
      <div style={welcomeStyles}>
        Bem-vindo ao {restaurant?.name || 'Restaurante'}
      </div>

      <div style={statsContainerStyles}>
        <Card>
          <div style={statCardStyles}>
            <div style={statValueStyles}>
              {salesData.today.value}
              <span style={statComparisonStyles(salesData.today.comparison)}>
                {salesData.today.comparison}
              </span>
            </div>
            <div style={statLabelStyles}>
              Vendas hoje ({salesData.today.count} pedidos)
            </div>
          </div>
        </Card>

        <Card>
          <div style={statCardStyles}>
            <div style={statValueStyles}>
              {salesData.week.value}
              <span style={statComparisonStyles(salesData.week.comparison)}>
                {salesData.week.comparison}
              </span>
            </div>
            <div style={statLabelStyles}>
              Vendas na semana ({salesData.week.count} pedidos)
            </div>
          </div>
        </Card>

        <Card>
          <div style={statCardStyles}>
            <div style={statValueStyles}>
              {salesData.month.value}
              <span style={statComparisonStyles(salesData.month.comparison)}>
                {salesData.month.comparison}
              </span>
            </div>
            <div style={statLabelStyles}>
              Vendas no mês ({salesData.month.count} pedidos)
            </div>
          </div>
        </Card>
      </div>

      <div>
        <div style={sectionTitleStyles}>Pedidos Recentes</div>
        <Card>
          <Table
            columns={orderColumns}
            data={recentOrders}
            hoverable
            bordered={false}
            striped
          />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
