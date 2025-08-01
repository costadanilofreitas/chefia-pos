// Reescrevendo arquivo limpo com todas as funções corretas
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmployee } from '../hooks/useEmployee';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
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
  Avatar,
  Snackbar,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Restaurant as RestaurantIcon,
  Psychology as AIIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  TrendingUp,
  ShoppingCart,
  Schedule,
  AttachMoney,
  Category as CategoryIcon,
  Inventory as IngredientIcon,
  MenuBook as MenuIcon,
  LocalOffer as ComboIcon
} from '@mui/icons-material';
import { ProductManagementService, Category, Ingredient, Product, Combo } from '../services/ProductManagementService';

// Interfaces
interface Employee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  cpf: string;
  rg: string;
  phone: string;
  address: string;
  birthDate: string;
  hireDate: string;
  salary: number;
  department: string;
  position: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  bankAccount: {
    bank: string;
    agency: string;
    account: string;
  };
  notes: string;
  lastLogin: string;
}

type UserRole = 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen';

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
  const [loading, setLoading] = useState(false);

  // Estados para snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Hook para funcionários - integração com backend
  const { 
    employees, 
    loading: employeesLoading, 
    error: employeesError,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    loadEmployees 
  } = useEmployee();
  
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    role: 'cashier' as UserRole,
    status: 'active' as 'active' | 'inactive',
    cpf: '',
    rg: '',
    phone: '',
    address: '',
    birthDate: '',
    hireDate: '',
    salary: 0,
    department: '',
    position: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    bankName: '',
    bankAgency: '',
    bankAccount: '',
    notes: ''
  });

  // Estados para produtos avançados
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);

  // Estados para dialogs de produtos
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);

  // Estados para edição
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  // Estados para configurações
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configType, setConfigType] = useState('');
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);

  // Estados para relatórios
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    type: '',
    startDate: '',
    endDate: '',
    format: 'pdf'
  });

  // Estados para dashboard
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 15420.50,
    todayOrders: 127,
    averageTicket: 45.30,
    openCashiers: 3
  });

  // Função para carregar dados de produtos
  const loadProductData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesData, ingredientsData, productsData, combosData] = await Promise.all([
        ProductManagementService.getCategories(),
        ProductManagementService.getIngredients(),
        ProductManagementService.getProducts(),
        ProductManagementService.getCombos()
      ]);
      
      setCategories(categoriesData);
      setIngredients(ingredientsData);
      setProducts(productsData);
      setCombos(combosData);
    } catch (error) {
      console.error('Erro ao carregar dados de produtos:', error);
      showSnackbar('Erro ao carregar dados de produtos', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Verificar se o terminal é válido
    if (!terminalId || isNaN(Number(terminalId))) {
      navigate('/');
      return;
    }

    // Carregar dados iniciais
    loadProductData();

    // Dados mock para funcionários
    // Carregar funcionários do backend
    loadEmployees();
  }, [terminalId, navigate, loadProductData, loadEmployees]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Funções para funcionários
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      status: employee.status,
      cpf: employee.cpf,
      rg: employee.rg,
      phone: employee.phone,
      address: employee.address,
      birthDate: employee.birthDate,
      hireDate: employee.hireDate,
      salary: employee.salary,
      department: employee.department,
      position: employee.position,
      emergencyContactName: employee.emergencyContact.name,
      emergencyContactPhone: employee.emergencyContact.phone,
      emergencyContactRelationship: employee.emergencyContact.relationship,
      bankName: employee.bankAccount.bank,
      bankAgency: employee.bankAccount.agency,
      bankAccount: employee.bankAccount.account,
      notes: employee.notes
    });
    setEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        // Atualizar funcionário existente
        await updateEmployee(editingEmployee.id, {
          name: employeeForm.name,
          email: employeeForm.email,
          phone: employeeForm.phone,
          role: employeeForm.role as any,
          employment_type: 'permanent',
          payment_frequency: 'monthly',
          base_salary: employeeForm.salary,
          hire_date: employeeForm.hireDate || new Date().toISOString().split('T')[0]
        });
        showSnackbar('Funcionário atualizado com sucesso!', 'success');
      } else {
        // Criar novo funcionário
        await createEmployee({
          name: employeeForm.name,
          email: employeeForm.email,
          phone: employeeForm.phone,
          role: employeeForm.role as any,
          employment_type: 'permanent',
          payment_frequency: 'monthly',
          base_salary: employeeForm.salary,
          hire_date: employeeForm.hireDate || new Date().toISOString().split('T')[0]
        });
        showSnackbar('Funcionário criado com sucesso!', 'success');
      }

      setEmployeeDialogOpen(false);
      setEditingEmployee(null);
      setEmployeeForm({
        name: '',
        email: '',
        role: 'cashier',
        status: 'active',
        cpf: '',
        rg: '',
        phone: '',
        address: '',
        birthDate: '',
        hireDate: '',
        salary: 0,
        department: '',
        position: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        bankName: '',
        bankAgency: '',
        bankAccount: '',
        notes: ''
      });
    } catch (error) {
      showSnackbar('Erro ao salvar funcionário', 'error');
    }
  };

  // Funções para manipulação de categorias
  const handleSaveCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      let savedCategory: Category;
      
      if (editingCategory) {
        savedCategory = await ProductManagementService.updateCategory(editingCategory.id, categoryData);
        showSnackbar('Categoria atualizada com sucesso!', 'success');
      } else {
        savedCategory = await ProductManagementService.saveCategory(categoryData);
        showSnackbar('Categoria criada com sucesso!', 'success');
      }
      
      await loadProductData();
      setCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      showSnackbar('Erro ao salvar categoria', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setLoading(true);
      await ProductManagementService.deleteCategory(id);
      showSnackbar('Categoria excluída com sucesso!', 'success');
      await loadProductData();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      showSnackbar('Erro ao excluir categoria', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funções para manipulação de ingredientes
  const handleSaveIngredient = async (ingredientData: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      let savedIngredient: Ingredient;
      
      if (editingIngredient) {
        savedIngredient = await ProductManagementService.updateIngredient(editingIngredient.id, ingredientData);
        showSnackbar('Ingrediente atualizado com sucesso!', 'success');
      } else {
        savedIngredient = await ProductManagementService.saveIngredient(ingredientData);
        showSnackbar('Ingrediente criado com sucesso!', 'success');
      }
      
      await loadProductData();
      setIngredientDialogOpen(false);
      setEditingIngredient(null);
    } catch (error) {
      console.error('Erro ao salvar ingrediente:', error);
      showSnackbar('Erro ao salvar ingrediente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    try {
      setLoading(true);
      await ProductManagementService.deleteIngredient(id);
      showSnackbar('Ingrediente excluído com sucesso!', 'success');
      await loadProductData();
    } catch (error) {
      console.error('Erro ao excluir ingrediente:', error);
      showSnackbar('Erro ao excluir ingrediente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIngredientStock = async (id: string) => {
    try {
      const ingredient = ingredients.find(ing => ing.id === id);
      if (!ingredient) return;
      
      await ProductManagementService.updateIngredient(id, {
        outOfStock: !ingredient.outOfStock
      });
      
      showSnackbar(
        `Ingrediente ${!ingredient.outOfStock ? 'marcado como em falta' : 'reabastecido'}!`, 
        'success'
      );
      await loadProductData();
    } catch (error) {
      console.error('Erro ao alterar status do ingrediente:', error);
      showSnackbar('Erro ao alterar status do ingrediente', 'error');
    }
  };

  // Funções para manipulação de produtos
  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      let savedProduct: Product;
      
      if (editingProduct) {
        savedProduct = await ProductManagementService.updateProduct(editingProduct.id, productData);
        showSnackbar('Produto atualizado com sucesso!', 'success');
      } else {
        savedProduct = await ProductManagementService.saveProduct(productData);
        showSnackbar('Produto criado com sucesso!', 'success');
      }
      
      await loadProductData();
      setProductDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      showSnackbar('Erro ao salvar produto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      setLoading(true);
      await ProductManagementService.deleteProduct(id);
      showSnackbar('Produto excluído com sucesso!', 'success');
      await loadProductData();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      showSnackbar('Erro ao excluir produto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductAvailability = async (id: string) => {
    try {
      await ProductManagementService.toggleProductAvailability(id);
      showSnackbar('Disponibilidade do produto alterada!', 'success');
      await loadProductData();
    } catch (error) {
      console.error('Erro ao alterar disponibilidade:', error);
      showSnackbar('Erro ao alterar disponibilidade do produto', 'error');
    }
  };

  // Funções para manipulação de combos
  const handleSaveCombo = async (comboData: Omit<Combo, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      let savedCombo: Combo;
      
      if (editingCombo) {
        savedCombo = await ProductManagementService.updateCombo(editingCombo.id, comboData);
        showSnackbar('Combo atualizado com sucesso!', 'success');
      } else {
        savedCombo = await ProductManagementService.saveCombo(comboData);
        showSnackbar('Combo criado com sucesso!', 'success');
      }
      
      await loadProductData();
      setComboDialogOpen(false);
      setEditingCombo(null);
    } catch (error) {
      console.error('Erro ao salvar combo:', error);
      showSnackbar('Erro ao salvar combo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCombo = async (id: string) => {
    try {
      setLoading(true);
      await ProductManagementService.deleteCombo(id);
      showSnackbar('Combo excluído com sucesso!', 'success');
      await loadProductData();
    } catch (error) {
      console.error('Erro ao excluir combo:', error);
      showSnackbar('Erro ao excluir combo', 'error');
    } finally {
      setLoading(false);
    }
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
                    {formatCurrency(dashboardData.totalRevenue)}
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

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vendas por Hora
              </Typography>
              <Box height={200} display="flex" alignItems="center" justifyContent="center">
                <Typography color="textSecondary">
                  Gráfico de vendas por hora
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
                  Lista de produtos mais vendidos
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
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
            setEmployeeForm({
              name: '',
              email: '',
              role: 'cashier',
              status: 'active',
              cpf: '',
              rg: '',
              phone: '',
              address: '',
              birthDate: '',
              hireDate: '',
              salary: 0,
              department: '',
              position: '',
              emergencyContactName: '',
              emergencyContactPhone: '',
              emergencyContactRelationship: '',
              bankName: '',
              bankAgency: '',
              bankAccount: '',
              notes: ''
            });
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
              <TableCell>CPF</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Último Login</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {employee.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {employee.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {employee.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{employee.cpf}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {employee.position}
                    </Typography>
                    <Chip 
                      label={employee.role}
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.phone}</TableCell>
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
                    onClick={() => handleEditEmployee(employee)}
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

  // Renderizar Sistema Avançado de Produtos
  const renderAdvancedProducts = () => {
    const [productTab, setProductTab] = useState(0);

    const handleProductTabChange = (event: React.SyntheticEvent, newValue: number) => {
      setProductTab(newValue);
    };

    return (
      <Box>
        <Typography variant="h5" mb={3}>Sistema Avançado de Produtos</Typography>
        
        <Paper sx={{ width: '100%' }}>
          <Tabs 
            value={productTab} 
            onChange={handleProductTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<CategoryIcon />} label="Categorias" />
            <Tab icon={<IngredientIcon />} label="Ingredientes" />
            <Tab icon={<MenuIcon />} label="Produtos" />
            <Tab icon={<ComboIcon />} label="Combos" />
          </Tabs>

          {/* Aba Categorias */}
          <TabPanel value={productTab} index={0}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Categorias</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryDialogOpen(true);
                  }}
                >
                  Nova Categoria
                </Button>
              </Box>

              <Grid container spacing={2}>
                {categories.map((category) => (
                  <Grid item xs={12} sm={6} md={4} key={category.id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: category.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mr: 2,
                              fontSize: '1.2rem'
                            }}
                          >
                            {category.icon}
                          </Box>
                          <Box flex={1}>
                            <Typography variant="h6">{category.name}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              {category.description}
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Chip 
                            label={category.active ? 'Ativo' : 'Inativo'}
                            color={category.active ? 'success' : 'default'}
                            size="small"
                          />
                          <Box>
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setEditingCategory(category);
                                setCategoryDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>

          {/* Aba Ingredientes */}
          <TabPanel value={productTab} index={1}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Ingredientes</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingIngredient(null);
                    setIngredientDialogOpen(true);
                  }}
                >
                  Novo Ingrediente
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Estoque Atual</TableCell>
                      <TableCell>Estoque Mínimo</TableCell>
                      <TableCell>Fornecedor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Em Falta</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ingredients.map((ingredient) => (
                      <TableRow key={ingredient.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {ingredient.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {ingredient.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>{ingredient.currentStock}</TableCell>
                        <TableCell>{ingredient.minimumStock}</TableCell>
                        <TableCell>{ingredient.supplier}</TableCell>
                        <TableCell>
                          <Chip 
                            label={ingredient.currentStock <= ingredient.minimumStock ? 'Baixo' : 'OK'}
                            color={ingredient.currentStock <= ingredient.minimumStock ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={ingredient.outOfStock}
                            onChange={() => handleToggleIngredientStock(ingredient.id)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setEditingIngredient(ingredient);
                              setIngredientDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small"
                            onClick={() => handleDeleteIngredient(ingredient.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Aba Produtos */}
          <TabPanel value={productTab} index={2}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Produtos</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingProduct(null);
                    setProductDialogOpen(true);
                  }}
                >
                  Novo Produto
                </Button>
              </Box>

              <Grid container spacing={2}>
                {products.map((product) => {
                  const category = categories.find(cat => cat.id === product.categoryId);
                  const unavailableIngredients = product.ingredients?.filter(ing => {
                    const ingredient = ingredients.find(i => i.id === ing.ingredientId);
                    return ingredient?.outOfStock && ing.required;
                  }) || [];
                  
                  const isUnavailable = unavailableIngredients.length > 0;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={product.id}>
                      <Card sx={{ opacity: isUnavailable ? 0.6 : 1 }}>
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={2}>
                            {product.imageUrl && (
                              <Box
                                component="img"
                                src={product.imageUrl}
                                alt={product.name}
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 1,
                                  objectFit: 'cover',
                                  mr: 2
                                }}
                              />
                            )}
                            <Box flex={1}>
                              <Typography variant="h6">{product.name}</Typography>
                              <Typography variant="body2" color="textSecondary">
                                {category?.name}
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {formatCurrency(product.price)}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {isUnavailable && (
                            <Box mb={2}>
                              <Chip 
                                label="Indisponível - Ingrediente em falta"
                                color="error"
                                size="small"
                                sx={{ mb: 1 }}
                              />
                            </Box>
                          )}

                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={product.available && !isUnavailable}
                                  onChange={() => handleToggleProductAvailability(product.id)}
                                  disabled={isUnavailable}
                                  size="small"
                                />
                              }
                              label="Disponível"
                            />
                            <Box>
                              <IconButton 
                                size="small"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setProductDialogOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </TabPanel>

          {/* Aba Combos */}
          <TabPanel value={productTab} index={3}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Gestão de Combos</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingCombo(null);
                    setComboDialogOpen(true);
                  }}
                >
                  Novo Combo
                </Button>
              </Box>

              <Grid container spacing={2}>
                {combos.map((combo) => (
                  <Grid item xs={12} sm={6} md={4} key={combo.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" mb={1}>{combo.name}</Typography>
                        <Typography variant="body2" color="textSecondary" mb={2}>
                          {combo.description}
                        </Typography>
                        
                        <Box mb={2}>
                          <Typography variant="subtitle2" mb={1}>Itens:</Typography>
                          {combo.items.map((item, index) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                              <Typography key={index} variant="body2" color="textSecondary">
                                • {product?.name} {item.optional && '(Opcional)'}
                              </Typography>
                            );
                          })}
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              Preço: {formatCurrency(combo.price)}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              Desconto: {formatCurrency(combo.discount)}
                            </Typography>
                          </Box>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(combo.finalPrice)}
                          </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Chip 
                            label={combo.active ? 'Ativo' : 'Inativo'}
                            color={combo.active ? 'success' : 'default'}
                            size="small"
                          />
                          <Box>
                            <IconButton 
                              size="small"
                              onClick={() => {
                                setEditingCombo(combo);
                                setComboDialogOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => handleDeleteCombo(combo.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    );
  };

  // Renderizar IA & Campanhas
  const renderAI = () => (
    <Box>
      <Typography variant="h5" mb={3}>IA & Campanhas</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sugestões de IA
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Recomendações inteligentes para otimizar seu negócio
              </Typography>
              <Button variant="outlined" fullWidth>
                Ver Sugestões
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Campanhas de Marketing
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setCampaignDialogOpen(true);
                  }}
                >
                  Nova Campanha
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Gerencie suas campanhas promocionais
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
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
                Controle de estoque e movimentações
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
                Fluxo de caixa e análises financeiras
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

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Paper sx={{ borderRadius: 0, mb: 3 }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Painel Gerencial - Terminal {terminalId}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Sistema de gestão completo para seu restaurante
          </Typography>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mx: 3, mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" />
          <Tab icon={<PeopleIcon />} label="Funcionários" />
          <Tab icon={<RestaurantIcon />} label="Cardápio" />
          <Tab icon={<MenuIcon />} label="Produtos Avançado" />
          <Tab icon={<AIIcon />} label="IA & Campanhas" />
          <Tab icon={<ReportsIcon />} label="Relatórios" />
        </Tabs>
      </Paper>

      {/* Content */}
      <Box sx={{ px: 3, pb: 3 }}>
        <TabPanel value={currentTab} index={0}>
          {renderDashboard()}
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          {renderEmployees()}
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h5">Cardápio Tradicional</Typography>
          <Typography variant="body1" color="textSecondary">
            Sistema de cardápio tradicional (a ser implementado)
          </Typography>
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          {renderAdvancedProducts()}
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          {renderAI()}
        </TabPanel>
        <TabPanel value={currentTab} index={5}>
          {renderReports()}
        </TabPanel>
      </Box>

      {/* Dialog de Funcionário */}
      <Dialog 
        open={employeeDialogOpen} 
        onClose={() => setEmployeeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Dados Pessoais */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Dados Pessoais</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CPF"
                value={employeeForm.cpf}
                onChange={(e) => setEmployeeForm({ ...employeeForm, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RG"
                value={employeeForm.rg}
                onChange={(e) => setEmployeeForm({ ...employeeForm, rg: e.target.value })}
                placeholder="00.000.000-0"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data de Nascimento"
                type="date"
                value={employeeForm.birthDate}
                onChange={(e) => setEmployeeForm({ ...employeeForm, birthDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                value={employeeForm.address}
                onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade/estado"
              />
            </Grid>

            {/* Dados Profissionais */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Dados Profissionais</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cargo/Posição"
                value={employeeForm.position}
                onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Departamento"
                value={employeeForm.department}
                onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Função no Sistema</InputLabel>
                <Select
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value as UserRole })}
                >
                  <MenuItem value="admin">Administrador</MenuItem>
                  <MenuItem value="manager">Gerente</MenuItem>
                  <MenuItem value="cashier">Operador de Caixa</MenuItem>
                  <MenuItem value="waiter">Garçom</MenuItem>
                  <MenuItem value="kitchen">Cozinha</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={employeeForm.status}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value as 'active' | 'inactive' })}
                >
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data de Admissão"
                type="date"
                value={employeeForm.hireDate}
                onChange={(e) => setEmployeeForm({ ...employeeForm, hireDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Salário"
                type="number"
                value={employeeForm.salary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, salary: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>
                }}
              />
            </Grid>

            {/* Contato de Emergência */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Contato de Emergência</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Nome"
                value={employeeForm.emergencyContactName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContactName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Telefone"
                value={employeeForm.emergencyContactPhone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContactPhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Parentesco"
                value={employeeForm.emergencyContactRelationship}
                onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContactRelationship: e.target.value })}
                placeholder="Ex: Esposa, Pai, Mãe"
              />
            </Grid>

            {/* Dados Bancários */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Dados Bancários</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Banco"
                value={employeeForm.bankName}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bankName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Agência"
                value={employeeForm.bankAgency}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bankAgency: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Conta"
                value={employeeForm.bankAccount}
                onChange={(e) => setEmployeeForm({ ...employeeForm, bankAccount: e.target.value })}
              />
            </Grid>

            {/* Observações */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={employeeForm.notes}
                onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                placeholder="Informações adicionais sobre o funcionário"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEmployee} variant="contained">
            {editingEmployee ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Nova Campanha */}
      <Dialog 
        open={campaignDialogOpen} 
        onClose={() => setCampaignDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Nova Campanha de Marketing</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome da Campanha"
                placeholder="Ex: Promoção de Verão"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Campanha</InputLabel>
                <Select defaultValue="">
                  <MenuItem value="discount">Desconto</MenuItem>
                  <MenuItem value="loyalty">Fidelidade</MenuItem>
                  <MenuItem value="seasonal">Sazonal</MenuItem>
                  <MenuItem value="product">Produto Específico</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data de Início"
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data de Fim"
                type="date"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Público-alvo</InputLabel>
                <Select defaultValue="">
                  <MenuItem value="all">Todos os Clientes</MenuItem>
                  <MenuItem value="frequent">Clientes Frequentes</MenuItem>
                  <MenuItem value="new">Novos Clientes</MenuItem>
                  <MenuItem value="inactive">Clientes Inativos</MenuItem>
                  <MenuItem value="vip">Clientes VIP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Orçamento"
                type="number"
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={3}
                placeholder="Descreva os detalhes da campanha..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Canal de Comunicação</InputLabel>
                <Select defaultValue="">
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="push">Notificação Push</MenuItem>
                  <MenuItem value="all">Todos os Canais</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              setCampaignDialogOpen(false);
              showSnackbar('Campanha criada com sucesso!', 'success');
            }}
          >
            Criar Campanha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Configuração */}
      <Dialog 
        open={configDialogOpen} 
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configurações do Sistema</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Configurações para: {configType}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Relatório */}
      <Dialog 
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Gerar Relatório</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Relatório</InputLabel>
                <Select
                  value={reportConfig.type}
                  onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value })}
                >
                  <MenuItem value="sales">Vendas</MenuItem>
                  <MenuItem value="inventory">Estoque</MenuItem>
                  <MenuItem value="financial">Financeiro</MenuItem>
                  <MenuItem value="employees">Funcionários</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data Inicial"
                type="date"
                value={reportConfig.startDate}
                onChange={(e) => setReportConfig({ ...reportConfig, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data Final"
                type="date"
                value={reportConfig.endDate}
                onChange={(e) => setReportConfig({ ...reportConfig, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Formato</InputLabel>
                <Select
                  value={reportConfig.format}
                  onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              setReportDialogOpen(false);
              showSnackbar('Relatório gerado com sucesso!', 'success');
            }}
          >
            Gerar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Loading overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default ManagerScreen;

