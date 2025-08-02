import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Restaurant as RestaurantIcon,
  Assessment as ReportsIcon,
  TrendingUp,
  ShoppingCart,
  Schedule,
  AttachMoney
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ManagerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const [currentTab, setCurrentTab] = useState(0);

  // Hook para analytics (substitui dados mock)
  const { 
    metrics: dashboardData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refreshMetrics,
    formatCurrency
  } = useAnalytics(true, 30000); // Auto-refresh a cada 30 segundos

  useEffect(() => {
    // Verificar se o terminal é válido
    if (!terminalId || isNaN(Number(terminalId))) {
      navigate('/');
      return;
    }
  }, [terminalId, navigate]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Renderizar Dashboard
  const renderDashboard = () => (
    <Box>
      <Typography variant="h5" mb={3}>Dashboard Gerencial</Typography>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AttachMoney sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Faturamento Hoje
                  </Typography>
                  <Typography variant="h5">
                    {analyticsLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      formatCurrency(dashboardData?.revenue || 0)
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ShoppingCart sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pedidos Hoje
                  </Typography>
                  <Typography variant="h5">
                    {analyticsLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      dashboardData?.orders || 0
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Ticket Médio
                  </Typography>
                  <Typography variant="h5">
                    {analyticsLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      formatCurrency(dashboardData?.averageTicket || 0)
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Schedule sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Caixas Abertos
                  </Typography>
                  <Typography variant="h5">
                    {analyticsLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      dashboardData?.openCashiers || 0
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controles do Dashboard */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button 
          variant="outlined" 
          onClick={refreshMetrics}
          disabled={analyticsLoading}
          startIcon={analyticsLoading ? <CircularProgress size={16} /> : undefined}
        >
          {analyticsLoading ? 'Atualizando...' : 'Atualizar Métricas'}
        </Button>
      </Box>

      {/* Exibir erro se houver */}
      {analyticsError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Erro ao carregar analytics: {analyticsError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vendas por Hora
              </Typography>
              <Box height={200} display="flex" alignItems="center" justifyContent="center">
                <Typography color="textSecondary">
                  Gráfico de vendas por hora (em desenvolvimento)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Produtos Mais Vendidos
              </Typography>
              <Box height={200} display="flex" alignItems="center" justifyContent="center">
                <Typography color="textSecondary">
                  Lista de produtos mais vendidos (em desenvolvimento)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Renderizar Funcionários (simplificado)
  const renderEmployees = () => (
    <Box>
      <Typography variant="h5" mb={3}>Gestão de Funcionários</Typography>
      <Alert severity="info">
        Módulo de funcionários em desenvolvimento. 
        Integração com backend implementada mas interface sendo refinada.
      </Alert>
    </Box>
  );

  // Renderizar Produtos (simplificado)
  const renderProducts = () => (
    <Box>
      <Typography variant="h5" mb={3}>Gestão de Produtos</Typography>
      <Alert severity="info">
        Módulo de produtos em desenvolvimento.
        Sistema avançado de categorias, ingredientes e combos sendo implementado.
      </Alert>
    </Box>
  );

  // Renderizar Relatórios (simplificado)
  const renderReports = () => (
    <Box>
      <Typography variant="h5" mb={3}>Relatórios</Typography>
      <Alert severity="info">
        Módulo de relatórios em desenvolvimento.
        Integração com analytics implementada.
      </Alert>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" />
          <Tab icon={<PeopleIcon />} label="Funcionários" />
          <Tab icon={<RestaurantIcon />} label="Produtos" />
          <Tab icon={<ReportsIcon />} label="Relatórios" />
        </Tabs>
      </Paper>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={currentTab} index={0}>
          {renderDashboard()}
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          {renderEmployees()}
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          {renderProducts()}
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          {renderReports()}
        </TabPanel>
      </Box>
    </Box>
  );
};

export default ManagerScreen;

