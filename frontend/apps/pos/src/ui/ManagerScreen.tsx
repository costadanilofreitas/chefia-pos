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
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Avatar,
  LinearProgress
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
  Refresh as RefreshIcon,
  LocalShipping as SuppliersIcon,
  Psychology as AIIcon,
  Restaurant as MenuIcon,
  Receipt as DuplicatesIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Lightbulb as SuggestionIcon,
  Analytics as AnalyticsIcon,
  MonetizationOn as MoneyIcon
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

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

interface Supplier {
  id: string;
  name: string;
  category: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  lastOrder: string;
  totalOrders: number;
  averageDeliveryTime: number;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  ingredients: string[];
  allergens: string[];
  available: boolean;
  preparationTime: number;
  calories?: number;
}

interface Campaign {
  id: string;
  name: string;
  type: 'discount' | 'promotion' | 'loyalty';
  status: 'active' | 'inactive' | 'scheduled';
  startDate: string;
  endDate: string;
  target: string;
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

interface Duplicate {
  id: string;
  type: 'receivable' | 'payable';
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  supplier?: string;
  customer?: string;
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

  // Estados para fornecedores
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: '1',
      name: 'Distribuidora Alimentos Ltda',
      category: 'Alimentos',
      contact: 'Carlos Silva',
      email: 'carlos@distribuidora.com',
      phone: '(11) 99999-1234',
      address: 'Rua das Indústrias, 123 - São Paulo',
      status: 'active',
      lastOrder: '2024-01-15',
      totalOrders: 45,
      averageDeliveryTime: 24
    },
    {
      id: '2',
      name: 'Bebidas Premium',
      category: 'Bebidas',
      contact: 'Ana Costa',
      email: 'ana@bebidaspremium.com',
      phone: '(11) 88888-5678',
      address: 'Av. Central, 456 - São Paulo',
      status: 'active',
      lastOrder: '2024-01-12',
      totalOrders: 32,
      averageDeliveryTime: 48
    }
  ]);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Estados para cardápio
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: '1',
      name: 'Hambúrguer Clássico',
      category: 'Hambúrgueres',
      price: 25.90,
      cost: 12.50,
      description: 'Hambúrguer artesanal com carne bovina, alface, tomate e molho especial',
      ingredients: ['Pão brioche', 'Carne bovina 150g', 'Alface', 'Tomate', 'Molho especial'],
      allergens: ['Glúten', 'Lactose'],
      available: true,
      preparationTime: 15,
      calories: 650
    },
    {
      id: '2',
      name: 'Pizza Margherita',
      category: 'Pizzas',
      price: 35.00,
      cost: 15.00,
      description: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
      ingredients: ['Massa de pizza', 'Molho de tomate', 'Mussarela', 'Manjericão'],
      allergens: ['Glúten', 'Lactose'],
      available: true,
      preparationTime: 20,
      calories: 850
    }
  ]);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // Estados para campanhas IA
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Promoção Fim de Semana',
      type: 'discount',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-01-31',
      target: 'Clientes frequentes',
      performance: {
        impressions: 1250,
        clicks: 89,
        conversions: 23,
        revenue: 1450.80
      }
    },
    {
      id: '2',
      name: 'Fidelidade Premium',
      type: 'loyalty',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      target: 'Todos os clientes',
      performance: {
        impressions: 3500,
        clicks: 245,
        conversions: 67,
        revenue: 3250.90
      }
    }
  ]);

  // Estados para duplicatas
  const [duplicates, setDuplicates] = useState<Duplicate[]>([
    {
      id: '1',
      type: 'payable',
      description: 'Fornecimento de alimentos - Janeiro',
      amount: 2500.00,
      dueDate: '2024-01-25',
      status: 'pending',
      supplier: 'Distribuidora Alimentos Ltda'
    },
    {
      id: '2',
      type: 'receivable',
      description: 'Evento corporativo - Empresa XYZ',
      amount: 1800.00,
      dueDate: '2024-01-20',
      status: 'paid',
      customer: 'Empresa XYZ'
    }
  ]);

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
  const handleEmployeeSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingEmployee) {
        setEmployees(prev => prev.map(emp => 
          emp.id === editingEmployee.id 
            ? { ...emp, ...employeeForm }
            : emp
        ));
        showSnackbar('Funcionário atualizado com sucesso!', 'success');
      } else {
        const newEmployee: Employee = {
          id: Date.now().toString(),
          ...employeeForm,
          lastLogin: 'Nunca'
        };
        setEmployees(prev => [...prev, newEmployee]);
        showSnackbar('Funcionário adicionado com sucesso!', 'success');
      }

      setEmployeeDialogOpen(false);
      setEditingEmployee(null);
      setEmployeeForm({ name: '', email: '', role: UserRole.CASHIER, status: 'active' });
    } catch (error) {
      showSnackbar('Erro ao salvar funcionário', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funções para fornecedores
  const handleSupplierSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSnackbar('Fornecedor salvo com sucesso!', 'success');
      setSupplierDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar fornecedor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funções para cardápio
  const handleMenuItemSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSnackbar('Item do cardápio salvo com sucesso!', 'success');
      setMenuDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar item do cardápio', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funções para relatórios
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSnackbar(`Relatório ${reportConfig.type} gerado em ${reportConfig.format.toUpperCase()}!`, 'success');
      setReportDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao gerar relatório', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Funções para configurações
  const handleConfigSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSnackbar('Configuração salva com sucesso!', 'success');
      setConfigDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar configuração', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar Dashboard
  const renderDashboard = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Dashboard Gerencial</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          disabled={dashboardLoading}
        >
          {dashboardLoading ? <CircularProgress size={20} /> : 'Atualizar'}
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AttachMoney sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Vendas Hoje
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(dashboardData.todaySales)}
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
              <Box display="flex" alignItems="center">
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Ticket Médio
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(dashboardData.averageTicket)}
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
                    {dashboardData.openCashiers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {dashboardLoading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );

  // Renderizar Fornecedores
  const renderSuppliers = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestão de Fornecedores</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingSupplier(null);
            setSupplierDialogOpen(true);
          }}
        >
          Novo Fornecedor
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Contato</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Último Pedido</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {supplier.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {supplier.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{supplier.category}</TableCell>
                <TableCell>{supplier.contact}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell>
                  <Chip 
                    label={supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                    color={supplier.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(supplier.lastOrder).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setEditingSupplier(supplier);
                      setSupplierDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Renderizar IA e Campanhas
  const renderAI = () => (
    <Box>
      <Typography variant="h5" mb={3}>Inteligência Artificial - Campanhas e Sugestões</Typography>
      
      <Grid container spacing={3}>
        {/* Campanhas Ativas */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Campanhas Ativas</Typography>
                <Button variant="outlined" startIcon={<AddIcon />}>
                  Nova Campanha
                </Button>
              </Box>
              
              {campaigns.map((campaign) => (
                <Box key={campaign.id} mb={2} p={2} border={1} borderColor="grey.300" borderRadius={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {campaign.name}
                    </Typography>
                    <Chip 
                      label={campaign.status}
                      color={campaign.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" mb={1}>
                    {campaign.target} • {campaign.startDate} - {campaign.endDate}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="textSecondary">Impressões</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {campaign.performance.impressions.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="textSecondary">Cliques</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {campaign.performance.clicks}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="textSecondary">Conversões</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {campaign.performance.conversions}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="textSecondary">Receita</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(campaign.performance.revenue)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Sugestões IA */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Sugestões da IA</Typography>
              
              <List>
                <ListItem>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <SuggestionIcon />
                  </Avatar>
                  <ListItemText
                    primary="Promoção Sugerida"
                    secondary="Desconto de 15% em pizzas às terças-feiras pode aumentar vendas em 23%"
                  />
                </ListItem>
                
                <ListItem>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <AnalyticsIcon />
                  </Avatar>
                  <ListItemText
                    primary="Otimização de Estoque"
                    secondary="Reduzir pedido de refrigerantes em 20% baseado no consumo atual"
                  />
                </ListItem>
                
                <ListItem>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <CampaignIcon />
                  </Avatar>
                  <ListItemText
                    primary="Campanha Personalizada"
                    secondary="Enviar cupons para clientes inativos há mais de 30 dias"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Renderizar Gestão de Cardápio
  const renderMenu = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestão de Cardápio</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingMenuItem(null);
            setMenuDialogOpen(true);
          }}
        >
          Novo Item
        </Button>
      </Box>

      <Grid container spacing={2}>
        {menuItems.map((item) => (
          <Grid item xs={12} md={6} lg={4} key={item.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">{item.name}</Typography>
                  <Switch checked={item.available} />
                </Box>
                
                <Typography variant="body2" color="textSecondary" mb={1}>
                  {item.category}
                </Typography>
                
                <Typography variant="body2" mb={2}>
                  {item.description}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">
                    <strong>Preço:</strong> {formatCurrency(item.price)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Custo:</strong> {formatCurrency(item.cost)}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2">
                    <strong>Preparo:</strong> {item.preparationTime}min
                  </Typography>
                  <Typography variant="body2">
                    <strong>Calorias:</strong> {item.calories}
                  </Typography>
                </Box>
                
                <Box display="flex" gap={1} mb={2}>
                  {item.allergens.map((allergen) => (
                    <Chip key={allergen} label={allergen} size="small" color="warning" />
                  ))}
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setEditingMenuItem(item);
                      setMenuDialogOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    Margem: {(((item.price - item.cost) / item.price) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Renderizar Duplicatas
  const renderDuplicates = () => (
    <Box>
      <Typography variant="h5" mb={3}>Gestão de Duplicatas</Typography>
      
      <Grid container spacing={3}>
        {/* Contas a Pagar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2} color="error.main">
                Contas a Pagar
              </Typography>
              
              {duplicates.filter(d => d.type === 'payable').map((duplicate) => (
                <Box key={duplicate.id} mb={2} p={2} border={1} borderColor="error.light" borderRadius={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {duplicate.description}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {duplicate.supplier}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                    <Typography variant="h6" color="error.main">
                      {formatCurrency(duplicate.amount)}
                    </Typography>
                    <Box>
                      <Typography variant="caption" display="block">
                        Vencimento: {new Date(duplicate.dueDate).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        label={duplicate.status === 'pending' ? 'Pendente' : 
                               duplicate.status === 'paid' ? 'Pago' : 'Vencido'}
                        color={duplicate.status === 'pending' ? 'warning' : 
                               duplicate.status === 'paid' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Contas a Receber */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2} color="success.main">
                Contas a Receber
              </Typography>
              
              {duplicates.filter(d => d.type === 'receivable').map((duplicate) => (
                <Box key={duplicate.id} mb={2} p={2} border={1} borderColor="success.light" borderRadius={1}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {duplicate.description}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {duplicate.customer}
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(duplicate.amount)}
                    </Typography>
                    <Box>
                      <Typography variant="caption" display="block">
                        Vencimento: {new Date(duplicate.dueDate).toLocaleDateString()}
                      </Typography>
                      <Chip 
                        label={duplicate.status === 'pending' ? 'Pendente' : 
                               duplicate.status === 'paid' ? 'Recebido' : 'Vencido'}
                        color={duplicate.status === 'pending' ? 'warning' : 
                               duplicate.status === 'paid' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Resumo Financeiro */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Resumo Financeiro</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="error.main">
                  {formatCurrency(duplicates.filter(d => d.type === 'payable' && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0))}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total a Pagar
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {formatCurrency(duplicates.filter(d => d.type === 'receivable' && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0))}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total a Receber
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {formatCurrency(
                    duplicates.filter(d => d.type === 'receivable' && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0) -
                    duplicates.filter(d => d.type === 'payable' && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0)
                  )}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Saldo Projetado
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  // Renderizar Funcionários
  const renderEmployees = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestão de Funcionários</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingEmployee(null);
            setEmployeeForm({ name: '', email: '', role: UserRole.CASHIER, status: 'active' });
            setEmployeeDialogOpen(true);
          }}
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
              <TableCell>Ações</TableCell>
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
                    color="primary"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={employee.status === 'active' ? 'Ativo' : 'Inativo'}
                    color={employee.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{employee.lastLogin}</TableCell>
                <TableCell>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setEditingEmployee(employee);
                      setEmployeeForm({
                        name: employee.name,
                        email: employee.email,
                        role: employee.role,
                        status: employee.status
                      });
                      setEmployeeDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Renderizar Relatórios
  const renderReports = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Relatórios Gerenciais</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => setReportDialogOpen(true)}
        >
          Gerar Relatório
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vendas
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Relatórios de vendas por período, produto e funcionário
              </Typography>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => {
                  setReportConfig({ ...reportConfig, type: 'sales' });
                  setReportDialogOpen(true);
                }}
              >
                Gerar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estoque
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Controle de estoque, entradas e saídas
              </Typography>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => {
                  setReportConfig({ ...reportConfig, type: 'inventory' });
                  setReportDialogOpen(true);
                }}
              >
                Gerar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financeiro
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Fluxo de caixa, contas a pagar e receber
              </Typography>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => {
                  setReportConfig({ ...reportConfig, type: 'financial' });
                  setReportDialogOpen(true);
                }}
              >
                Gerar
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Renderizar Configurações
  const renderSettings = () => (
    <Box>
      <Typography variant="h5" mb={3}>Configurações do Sistema</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Geral
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Configurações gerais do sistema
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                onClick={() => {
                  setConfigType('general');
                  setConfigDialogOpen(true);
                }}
              >
                Configurar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Segurança
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Configurações de segurança e acesso
              </Typography>
              <Button 
                variant="contained" 
                fullWidth
                onClick={() => {
                  setConfigType('security');
                  setConfigDialogOpen(true);
                }}
              >
                Configurar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
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
                fullWidth
                onClick={() => {
                  setConfigType('printers');
                  setConfigDialogOpen(true);
                }}
              >
                Configurar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
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
                fullWidth
                onClick={() => {
                  setConfigType('integrations');
                  setConfigDialogOpen(true);
                }}
              >
                Configurar
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  if (!user || user.role !== UserRole.MANAGER) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="error">
          Acesso negado. Apenas gerentes podem acessar esta área.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Painel Gerencial - Terminal {terminalId}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/pos/${terminalId}/main`)}
        >
          Voltar ao POS
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" />
          <Tab icon={<SuppliersIcon />} label="Fornecedores" />
          <Tab icon={<AIIcon />} label="IA & Campanhas" />
          <Tab icon={<MenuIcon />} label="Cardápio" />
          <Tab icon={<DuplicatesIcon />} label="Duplicatas" />
          <Tab icon={<PeopleIcon />} label="Funcionários" />
          <Tab icon={<ReportsIcon />} label="Relatórios" />
          <Tab icon={<SettingsIcon />} label="Configurações" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {renderDashboard()}
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          {renderSuppliers()}
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          {renderAI()}
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          {renderMenu()}
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          {renderDuplicates()}
        </TabPanel>
        <TabPanel value={currentTab} index={5}>
          {renderEmployees()}
        </TabPanel>
        <TabPanel value={currentTab} index={6}>
          {renderReports()}
        </TabPanel>
        <TabPanel value={currentTab} index={7}>
          {renderSettings()}
        </TabPanel>
      </Paper>

      {/* Dialog de Funcionário */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
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
            onClick={handleEmployeeSave} 
            variant="contained"
            disabled={loading || !employeeForm.name || !employeeForm.email}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Fornecedor */}
      <Dialog open={supplierDialogOpen} onClose={() => setSupplierDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Nome da Empresa"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Categoria"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Pessoa de Contato"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Telefone"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Email"
                  type="email"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Endereço"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleSupplierSave} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Item do Cardápio */}
      <Dialog open={menuDialogOpen} onClose={() => setMenuDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMenuItem ? 'Editar Item' : 'Novo Item do Cardápio'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Nome do Item"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Categoria"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Descrição"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  margin="dense"
                  label="Preço de Venda"
                  type="number"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  margin="dense"
                  label="Custo"
                  type="number"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  margin="dense"
                  label="Tempo de Preparo (min)"
                  type="number"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Ingredientes (separados por vírgula)"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Alérgenos (separados por vírgula)"
                  fullWidth
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleMenuItemSave} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Relatório */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gerar Relatório</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tipo de Relatório</InputLabel>
              <Select
                value={reportConfig.type}
                label="Tipo de Relatório"
                onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value })}
              >
                <MenuItem value="sales">Vendas</MenuItem>
                <MenuItem value="inventory">Estoque</MenuItem>
                <MenuItem value="financial">Financeiro</MenuItem>
                <MenuItem value="employees">Funcionários</MenuItem>
              </Select>
            </FormControl>
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
                <MenuItem value="quarter">Este Trimestre</MenuItem>
                <MenuItem value="year">Este Ano</MenuItem>
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
            onClick={handleGenerateReport} 
            variant="contained"
            disabled={generatingReport}
          >
            {generatingReport ? <CircularProgress size={20} /> : 'Gerar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Configuração */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configurações - {configType === 'general' ? 'Geral' : 
                           configType === 'security' ? 'Segurança' :
                           configType === 'printers' ? 'Impressoras' : 'Integrações'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Configurações específicas para {configType === 'general' ? 'o sistema geral' : 
                                             configType === 'security' ? 'segurança e acesso' :
                                             configType === 'printers' ? 'impressoras e recibos' : 'APIs e integrações externas'}
            </Alert>
            <TextField
              margin="dense"
              label="Configuração"
              fullWidth
              variant="outlined"
              placeholder="Digite a configuração..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleConfigSave} 
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

