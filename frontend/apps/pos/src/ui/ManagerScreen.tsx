import React, { useState, useEffect } from 'react';
import { useAuth, UserRole, Permission } from '../hooks/mocks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  TrendingUp,
  AttachMoney,
  ShoppingCart,
  Schedule
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
      id={`manager-tabpanel-${index}`}
      aria-labelledby={`manager-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ManagerScreen: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayOrders: 0,
    averageTicket: 0,
    openCashiers: 0
  });

  useEffect(() => {
    // Verificar se o usuário tem permissão de gerente
    if (!user || user.role !== UserRole.MANAGER || !hasPermission(Permission.MANAGER_ACCESS)) {
      navigate(`/pos/${terminalId || '1'}`);
      return;
    }

    // Carregar dados do dashboard
    loadDashboardData();
  }, [user, hasPermission, navigate, terminalId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simular carregamento de dados do dashboard
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDashboardData({
        todaySales: 2450.80,
        todayOrders: 45,
        averageTicket: 54.46,
        openCashiers: 3
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (!user || user.role !== UserRole.MANAGER) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">
          Acesso negado. Esta área é restrita a gerentes.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(`/pos/${terminalId || '1'}`)}
          sx={{ mt: 2 }}
        >
          Voltar ao POS
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestão Gerencial
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Bem-vindo, {user.name}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="manager tabs">
          <Tab icon={<DashboardIcon />} label="Dashboard" />
          <Tab icon={<ReportsIcon />} label="Relatórios" />
          <Tab icon={<PeopleIcon />} label="Funcionários" />
          <Tab icon={<SettingsIcon />} label="Configurações" />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={currentTab} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPIs Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoney color="primary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Vendas Hoje
                        </Typography>
                        <Typography variant="h5">
                          R$ {dashboardData.todaySales.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ShoppingCart color="secondary" sx={{ mr: 2 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Pedidos Hoje
                        </Typography>
                        <Typography variant="h5">
                          {dashboardData.todayOrders}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp color="success" sx={{ mr: 2 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Ticket Médio
                        </Typography>
                        <Typography variant="h5">
                          R$ {dashboardData.averageTicket.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Schedule color="info" sx={{ mr: 2 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Caixas Abertos
                        </Typography>
                        <Typography variant="h5">
                          {dashboardData.openCashiers}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts Area */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Vendas por Hora
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="textSecondary">
                      Gráfico de vendas por hora será implementado aqui
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Top Produtos
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="textSecondary">
                      Lista de produtos mais vendidos
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </TabPanel>

      {/* Reports Tab */}
      <TabPanel value={currentTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Relatórios Gerenciais
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Relatório de Vendas
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Relatório detalhado de vendas por período
                </Typography>
                <Button variant="contained" color="primary">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Relatório de Caixa
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Movimentação de caixa e fechamentos
                </Typography>
                <Button variant="contained" color="secondary">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Employees Tab */}
      <TabPanel value={currentTab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Gestão de Funcionários
          </Typography>
          <Button variant="contained" color="primary">
            Adicionar Funcionário
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Função</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Último Login</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>João Silva</TableCell>
                <TableCell>Caixa</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell>Hoje, 08:30</TableCell>
                <TableCell>
                  <Button size="small">Editar</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Maria Santos</TableCell>
                <TableCell>Garçom</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell>Hoje, 09:15</TableCell>
                <TableCell>
                  <Button size="small">Editar</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Settings Tab */}
      <TabPanel value={currentTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Configurações do Sistema
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configurações Gerais
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Configurações básicas do sistema
                </Typography>
                <Button variant="outlined">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Backup e Segurança
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Configurações de backup e segurança
                </Typography>
                <Button variant="outlined">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ManagerScreen;

