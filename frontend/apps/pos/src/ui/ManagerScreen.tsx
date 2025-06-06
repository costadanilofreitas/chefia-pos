import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  TrendingUp,
  AttachMoney,
  ShoppingCart,
  Schedule,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface Employee {
  id: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin: string;
  email: string;
}

interface ReportConfig {
  type: string;
  period: string;
  format: string;
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
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    todaySales: 2450.80,
    todayOrders: 45,
    averageTicket: 54.46,
    openCashiers: 3
  });

  // Estados para funcionários
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: 'João Silva',
      role: UserRole.CASHIER,
      status: 'active',
      lastLogin: 'Hoje, 08:30',
      email: 'joao@exemplo.com'
    },
    {
      id: '2',
      name: 'Maria Santos',
      role: UserRole.WAITER,
      status: 'active',
      lastLogin: 'Hoje, 09:15',
      email: 'maria@exemplo.com'
    }
  ]);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    role: UserRole.CASHIER,
    status: 'active' as 'active' | 'inactive'
  });

  // Estados para relatórios
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'sales',
    period: 'today',
    format: 'pdf'
  });
  const [generatingReport, setGeneratingReport] = useState(false);

  // Estados para configurações
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configType, setConfigType] = useState('');

  // Estados para notificações
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  useEffect(() => {
    // Verificar se o usuário tem permissão de gerente
    if (!user || user.role !== UserRole.MANAGER || !hasPermission(Permission.MANAGER_ACCESS)) {
      navigate(`/pos/${terminalId || '1'}`);
      return;
    }

    // Carregar dados iniciais
    loadDashboardData();
  }, [user, hasPermission, navigate, terminalId]);

  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    try {
      // Simular carregamento de dados do dashboard
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simular dados dinâmicos
      const randomSales = 2000 + Math.random() * 1000;
      const randomOrders = 30 + Math.floor(Math.random() * 30);
      
      setDashboardData({
        todaySales: randomSales,
        todayOrders: randomOrders,
        averageTicket: randomSales / randomOrders,
        openCashiers: 2 + Math.floor(Math.random() * 3)
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      showSnackbar('Erro ao carregar dados do dashboard', 'error');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Funções para funcionários
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      name: '',
      email: '',
      role: UserRole.CASHIER,
      status: 'active'
    });
    setEmployeeDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      status: employee.status
    });
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingEmployee) {
        // Editar funcionário existente
        setEmployees(prev => prev.map(emp => 
          emp.id === editingEmployee.id 
            ? { ...emp, ...employeeForm }
            : emp
        ));
        showSnackbar('Funcionário atualizado com sucesso!', 'success');
      } else {
        // Adicionar novo funcionário
        const newEmployee: Employee = {
          id: Date.now().toString(),
          ...employeeForm,
          lastLogin: 'Nunca'
        };
        setEmployees(prev => [...prev, newEmployee]);
        showSnackbar('Funcionário adicionado com sucesso!', 'success');
      }
      
      setEmployeeDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar funcionário', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funções para relatórios
  const handleGenerateReport = async (type: string) => {
    setReportConfig({ ...reportConfig, type });
    setReportDialogOpen(true);
  };

  const handleConfirmGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportName = `relatorio_${reportConfig.type}_${reportConfig.period}.${reportConfig.format}`;
      showSnackbar(`Relatório ${reportName} gerado com sucesso!`, 'success');
      
      setReportDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao gerar relatório', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Funções para configurações
  const handleOpenConfig = (type: string) => {
    setConfigType(type);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSnackbar('Configurações salvas com sucesso!', 'success');
      setConfigDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar configurações', 'error');
    } finally {
      setLoading(false);
    }
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestão Gerencial
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Bem-vindo, {user.name} | Terminal {terminalId}
            </Typography>
          </Box>
          <Tooltip title="Atualizar dados">
            <IconButton onClick={loadDashboardData} disabled={dashboardLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
        {dashboardLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPIs Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AttachMoney color="primary" sx={{ mr: 2, fontSize: 40 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Vendas Hoje
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                          R$ {dashboardData.todaySales.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ShoppingCart color="secondary" sx={{ mr: 2, fontSize: 40 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Pedidos Hoje
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                          {dashboardData.todayOrders}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp color="success" sx={{ mr: 2, fontSize: 40 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Ticket Médio
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                          R$ {dashboardData.averageTicket.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Schedule color="info" sx={{ mr: 2, fontSize: 40 }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Caixas Abertos
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
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
                <Paper sx={{ p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Vendas por Hora
                  </Typography>
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="textSecondary">
                      📊 Gráfico de vendas por hora será implementado aqui
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Top Produtos
                  </Typography>
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="textSecondary">
                      🏆 Lista de produtos mais vendidos
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
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Relatório de Vendas
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Relatório detalhado de vendas por período
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleGenerateReport('sales')}
                  fullWidth
                >
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Relatório de Caixa
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Movimentação de caixa e fechamentos
                </Typography>
                <Button 
                  variant="contained" 
                  color="secondary"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleGenerateReport('cashier')}
                  fullWidth
                >
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Relatório de Produtos
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Análise de produtos mais vendidos
                </Typography>
                <Button 
                  variant="contained" 
                  color="success"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleGenerateReport('products')}
                  fullWidth
                >
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
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddEmployee}
          >
            Adicionar Funcionário
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Função</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Último Login</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={employee.role} 
                      size="small"
                      color={employee.role === UserRole.MANAGER ? 'error' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={employee.status === 'active' ? 'Ativo' : 'Inativo'}
                      size="small"
                      color={employee.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{employee.lastLogin}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
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
                  Configurações básicas do sistema POS
                </Typography>
                <Button 
                  variant="contained"
                  color="primary"
                  onClick={() => handleOpenConfig('general')}
                  fullWidth
                >
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
                <Button 
                  variant="contained"
                  color="warning"
                  onClick={() => handleOpenConfig('security')}
                  fullWidth
                >
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Impressoras
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Configuração de impressoras e recibos
                </Typography>
                <Button 
                  variant="contained"
                  color="info"
                  onClick={() => handleOpenConfig('printers')}
                  fullWidth
                >
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Integrações
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  APIs e integrações externas
                </Typography>
                <Button 
                  variant="contained"
                  color="secondary"
                  onClick={() => handleOpenConfig('integrations')}
                  fullWidth
                >
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dialog para Funcionários */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'Editar Funcionário' : 'Adicionar Funcionário'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nome"
              fullWidth
              variant="outlined"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Função</InputLabel>
              <Select
                value={employeeForm.role}
                label="Função"
                onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value as UserRole })}
              >
                <MenuItem value={UserRole.CASHIER}>Caixa</MenuItem>
                <MenuItem value={UserRole.WAITER}>Garçom</MenuItem>
                <MenuItem value={UserRole.COOK}>Cozinheiro</MenuItem>
                <MenuItem value={UserRole.MANAGER}>Gerente</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={employeeForm.status}
                label="Status"
                onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
              >
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="inactive">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleSaveEmployee} 
            variant="contained"
            disabled={loading || !employeeForm.name || !employeeForm.email}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Relatórios */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gerar Relatório</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={reportConfig.period}
                label="Período"
                onChange={(e) => setReportConfig({ ...reportConfig, period: e.target.value })}
              >
                <MenuItem value="today">Hoje</MenuItem>
                <MenuItem value="week">Esta Semana</MenuItem>
                <MenuItem value="month">Este Mês</MenuItem>
                <MenuItem value="custom">Período Personalizado</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Formato</InputLabel>
              <Select
                value={reportConfig.format}
                label="Formato"
                onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleConfirmGenerateReport} 
            variant="contained"
            disabled={generatingReport}
          >
            {generatingReport ? <CircularProgress size={20} /> : 'Gerar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Configurações */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Configurações - {configType === 'general' ? 'Gerais' : 
                          configType === 'security' ? 'Segurança' :
                          configType === 'printers' ? 'Impressoras' : 'Integrações'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" color="textSecondary">
              Configurações de {configType} serão implementadas aqui.
            </Typography>
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                Esta seção permitirá configurar:
              </Typography>
              <ul>
                {configType === 'general' && (
                  <>
                    <li>Nome do estabelecimento</li>
                    <li>Endereço e dados fiscais</li>
                    <li>Configurações de moeda</li>
                    <li>Fuso horário</li>
                  </>
                )}
                {configType === 'security' && (
                  <>
                    <li>Políticas de senha</li>
                    <li>Backup automático</li>
                    <li>Logs de auditoria</li>
                    <li>Controle de acesso</li>
                  </>
                )}
                {configType === 'printers' && (
                  <>
                    <li>Impressoras de recibo</li>
                    <li>Impressoras de cozinha</li>
                    <li>Layout de impressão</li>
                    <li>Configurações de papel</li>
                  </>
                )}
                {configType === 'integrations' && (
                  <>
                    <li>APIs de pagamento</li>
                    <li>Integração fiscal</li>
                    <li>Delivery partners</li>
                    <li>Sistemas externos</li>
                  </>
                )}
              </ul>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManagerScreen;

