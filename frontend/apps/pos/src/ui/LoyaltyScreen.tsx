import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Fab,
  InputAdornment,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  Star,
  LocalOffer,
  TrendingUp,
  CardGiftcard,
  Phone,
  Email,
  Cake,
  LocationOn,
  AttachMoney,
  History,
  Campaign,
  Save,
  Cancel
} from '@mui/icons-material';
import { formatCurrency } from '../utils/formatters';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  address?: string;
  totalPoints: number;
  usedPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  registrationDate: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  orderId?: string;
  date: string;
}

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'points';
  value: number;
  description: string;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  applicableProducts?: string[];
}

const LoyaltyScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    address: ''
  });

  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percentage' as const,
    value: 0,
    description: '',
    minPurchase: 0,
    maxDiscount: 0,
    validFrom: '',
    validUntil: '',
    usageLimit: 1,
    applicableProducts: [] as string[]
  });

  const [pointsForm, setPointsForm] = useState({
    points: 0,
    description: '',
    type: 'earn' as const
  });

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = useCallback(async () => {
    setLoading(true);
    try {
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data para demonstração
      const mockCustomers: Customer[] = [
        {
          id: '1',
          name: 'Maria Silva',
          email: 'maria@email.com',
          phone: '(11) 99999-1234',
          birthDate: '1985-03-15',
          address: 'Rua das Flores, 123 - Centro',
          totalPoints: 1250,
          usedPoints: 300,
          totalSpent: 2450.80,
          visitCount: 15,
          lastVisit: '2024-01-15',
          registrationDate: '2023-06-10',
          tier: 'gold'
        },
        {
          id: '2',
          name: 'João Santos',
          email: 'joao@email.com',
          phone: '(11) 88888-5678',
          birthDate: '1990-07-22',
          totalPoints: 850,
          usedPoints: 150,
          totalSpent: 1680.50,
          visitCount: 12,
          lastVisit: '2024-01-10',
          registrationDate: '2023-08-20',
          tier: 'silver'
        },
        {
          id: '3',
          name: 'Ana Costa',
          email: 'ana@email.com',
          phone: '(11) 77777-9012',
          totalPoints: 2100,
          usedPoints: 500,
          totalSpent: 4200.30,
          visitCount: 28,
          lastVisit: '2024-01-18',
          registrationDate: '2023-04-05',
          tier: 'platinum'
        },
        {
          id: '4',
          name: 'Pedro Lima',
          email: 'pedro@email.com',
          phone: '(11) 66666-3456',
          totalPoints: 320,
          usedPoints: 50,
          totalSpent: 680.90,
          visitCount: 5,
          lastVisit: '2024-01-12',
          registrationDate: '2023-12-01',
          tier: 'bronze'
        }
      ];

      const mockTransactions: LoyaltyTransaction[] = [
        {
          id: '1',
          customerId: '1',
          type: 'earn',
          points: 125,
          description: 'Compra - Pedido #1234',
          orderId: '1234',
          date: '2024-01-15'
        },
        {
          id: '2',
          customerId: '1',
          type: 'redeem',
          points: -100,
          description: 'Desconto aplicado',
          date: '2024-01-10'
        },
        {
          id: '3',
          customerId: '2',
          type: 'earn',
          points: 85,
          description: 'Compra - Pedido #1235',
          orderId: '1235',
          date: '2024-01-10'
        }
      ];

      const mockCoupons: Coupon[] = [
        {
          id: '1',
          code: 'WELCOME10',
          type: 'percentage',
          value: 10,
          description: 'Desconto de boas-vindas',
          minPurchase: 50,
          maxDiscount: 20,
          validFrom: '2024-01-01',
          validUntil: '2024-12-31',
          usageLimit: 100,
          usedCount: 25,
          isActive: true
        },
        {
          id: '2',
          code: 'FIDELIDADE50',
          type: 'points',
          value: 500,
          description: 'Troca por 500 pontos',
          validFrom: '2024-01-01',
          validUntil: '2024-12-31',
          usageLimit: 50,
          usedCount: 12,
          isActive: true
        },
        {
          id: '3',
          code: 'PIZZA20',
          type: 'fixed',
          value: 20,
          description: 'R$ 20 off em pizzas',
          minPurchase: 80,
          validFrom: '2024-01-01',
          validUntil: '2024-06-30',
          usageLimit: 200,
          usedCount: 45,
          isActive: true,
          applicableProducts: ['pizza-margherita', 'pizza-calabresa']
        }
      ];

      setCustomers(mockCustomers);
      setTransactions(mockTransactions);
      setCoupons(mockCoupons);
    } catch (error) {
      console.error('Erro ao carregar dados de fidelidade:', error);
      showSnackbar('Erro ao carregar dados de fidelidade', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getTierColor = (tier: Customer['tier']) => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#9E9E9E';
    }
  };

  const getTierLabel = (tier: Customer['tier']) => {
    switch (tier) {
      case 'bronze': return 'Bronze';
      case 'silver': return 'Prata';
      case 'gold': return 'Ouro';
      case 'platinum': return 'Platina';
      default: return tier;
    }
  };

  const calculateTier = (totalSpent: number): Customer['tier'] => {
    if (totalSpent >= 3000) return 'platinum';
    if (totalSpent >= 2000) return 'gold';
    if (totalSpent >= 1000) return 'silver';
    return 'bronze';
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleCustomerEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      birthDate: customer.birthDate || '',
      address: customer.address || ''
    });
    setCustomerDialogOpen(true);
  };

  const handleCustomerSave = async () => {
    if (!customerForm.name || !customerForm.email || !customerForm.phone) {
      showSnackbar('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingCustomer) {
        // Editar cliente existente
        setCustomers(prev => prev.map(customer =>
          customer.id === editingCustomer.id
            ? { ...customer, ...customerForm }
            : customer
        ));
        showSnackbar('Cliente atualizado com sucesso!', 'success');
      } else {
        // Criar novo cliente
        const newCustomer: Customer = {
          id: Date.now().toString(),
          ...customerForm,
          totalPoints: 0,
          usedPoints: 0,
          totalSpent: 0,
          visitCount: 0,
          lastVisit: new Date().toISOString().split('T')[0],
          registrationDate: new Date().toISOString().split('T')[0],
          tier: 'bronze'
        };
        setCustomers(prev => [...prev, newCustomer]);
        showSnackbar('Cliente cadastrado com sucesso!', 'success');
      }

      setCustomerForm({ name: '', email: '', phone: '', birthDate: '', address: '' });
      setEditingCustomer(null);
      setCustomerDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCouponEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
      minPurchase: coupon.minPurchase || 0,
      maxDiscount: coupon.maxDiscount || 0,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      usageLimit: coupon.usageLimit,
      applicableProducts: coupon.applicableProducts || []
    });
    setCouponDialogOpen(true);
  };

  const handleCouponSave = async () => {
    if (!couponForm.code || !couponForm.description || couponForm.value <= 0) {
      showSnackbar('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingCoupon) {
        // Editar cupom existente
        setCoupons(prev => prev.map(coupon =>
          coupon.id === editingCoupon.id
            ? { ...coupon, ...couponForm }
            : coupon
        ));
        showSnackbar('Cupom atualizado com sucesso!', 'success');
      } else {
        // Criar novo cupom
        const newCoupon: Coupon = {
          id: Date.now().toString(),
          ...couponForm,
          usedCount: 0,
          isActive: true
        };
        setCoupons(prev => [...prev, newCoupon]);
        showSnackbar('Cupom criado com sucesso!', 'success');
      }

      setCouponForm({
        code: '',
        type: 'percentage',
        value: 0,
        description: '',
        minPurchase: 0,
        maxDiscount: 0,
        validFrom: '',
        validUntil: '',
        usageLimit: 1,
        applicableProducts: []
      });
      setEditingCoupon(null);
      setCouponDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao salvar cupom', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCouponToggle = async (couponId: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCoupons(prev => prev.map(coupon =>
        coupon.id === couponId
          ? { ...coupon, isActive: !coupon.isActive }
          : coupon
      ));
      
      showSnackbar('Status do cupom atualizado!', 'success');
    } catch (error) {
      showSnackbar('Erro ao atualizar cupom', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePointsAdjustment = async () => {
    if (!selectedCustomer || pointsForm.points === 0) {
      showSnackbar('Informe a quantidade de pontos', 'error');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const transaction: LoyaltyTransaction = {
        id: Date.now().toString(),
        customerId: selectedCustomer.id,
        type: pointsForm.type,
        points: pointsForm.type === 'earn' ? pointsForm.points : -pointsForm.points,
        description: pointsForm.description || (pointsForm.type === 'earn' ? 'Pontos adicionados' : 'Pontos removidos'),
        date: new Date().toISOString().split('T')[0]
      };

      setTransactions(prev => [...prev, transaction]);
      
      setCustomers(prev => prev.map(customer => 
        customer.id === selectedCustomer.id
          ? {
              ...customer,
              totalPoints: pointsForm.type === 'earn' 
                ? customer.totalPoints + pointsForm.points
                : Math.max(0, customer.totalPoints - pointsForm.points)
            }
          : customer
      ));

      showSnackbar(`Pontos ${pointsForm.type === 'earn' ? 'adicionados' : 'removidos'} com sucesso!`, 'success');
      setPointsForm({ points: 0, description: '', type: 'earn' });
      setPointsDialogOpen(false);
    } catch (error) {
      showSnackbar('Erro ao ajustar pontos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderCustomersTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <TextField
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingCustomer(null);
            setCustomerForm({ name: '', email: '', phone: '', birthDate: '', address: '' });
            setCustomerDialogOpen(true);
          }}
        >
          Novo Cliente
        </Button>
      </Box>

      <Grid container spacing={2}>
        {filteredCustomers.map((customer) => (
          <Grid item xs={12} md={6} lg={4} key={customer.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: getTierColor(customer.tier), mr: 2 }}>
                    <Person />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6">{customer.name}</Typography>
                    <Chip 
                      label={getTierLabel(customer.tier)}
                      size="small"
                      sx={{ 
                        backgroundColor: getTierColor(customer.tier),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    <Email sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                    {customer.email}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <Phone sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                    {customer.phone}
                  </Typography>
                </Box>

                <Grid container spacing={1} mb={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Pontos</Typography>
                    <Typography variant="h6" color="primary">
                      {customer.totalPoints - customer.usedPoints}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Gasto Total</Typography>
                    <Typography variant="h6">
                      {formatCurrency(customer.totalSpent)}
                    </Typography>
                  </Grid>
                </Grid>

                <Box display="flex" justifyContent="space-between">
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setPointsDialogOpen(true);
                    }}
                  >
                    Ajustar Pontos
                  </Button>
                  <IconButton 
                    size="small"
                    onClick={() => handleCustomerEdit(customer)}
                  >
                    <Edit />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderCouponsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Cupons de Desconto</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingCoupon(null);
            setCouponForm({
              code: '',
              type: 'percentage',
              value: 0,
              description: '',
              minPurchase: 0,
              maxDiscount: 0,
              validFrom: '',
              validUntil: '',
              usageLimit: 1,
              applicableProducts: []
            });
            setCouponDialogOpen(true);
          }}
        >
          Novo Cupom
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Uso</TableCell>
              <TableCell>Validade</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {coupon.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={
                      coupon.type === 'percentage' ? 'Percentual' :
                      coupon.type === 'fixed' ? 'Valor Fixo' : 'Pontos'
                    }
                    size="small"
                    color={
                      coupon.type === 'percentage' ? 'primary' :
                      coupon.type === 'fixed' ? 'secondary' : 'success'
                    }
                  />
                </TableCell>
                <TableCell>
                  {coupon.type === 'percentage' ? `${coupon.value}%` :
                   coupon.type === 'fixed' ? formatCurrency(coupon.value) :
                   `${coupon.value} pts`}
                </TableCell>
                <TableCell>{coupon.description}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {coupon.usedCount}/{coupon.usageLimit}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(coupon.usedCount / coupon.usageLimit) * 100}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validUntil).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={coupon.isActive ? 'Ativo' : 'Inativo'}
                    color={coupon.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small"
                    onClick={() => handleCouponEdit(coupon)}
                  >
                    <Edit />
                  </IconButton>
                  <Button
                    size="small"
                    onClick={() => handleCouponToggle(coupon.id)}
                    color={coupon.isActive ? 'error' : 'success'}
                  >
                    {coupon.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderTransactionsTab = () => (
    <Box>
      <Typography variant="h6" mb={3}>Histórico de Transações</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Pontos</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Pedido</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => {
              const customer = customers.find(c => c.id === transaction.customerId);
              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{customer?.name || 'Cliente não encontrado'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={transaction.type === 'earn' ? 'Ganho' : 'Resgate'}
                      color={transaction.type === 'earn' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      color={transaction.type === 'earn' ? 'success.main' : 'warning.main'}
                      fontWeight="bold"
                    >
                      {transaction.type === 'earn' ? '+' : ''}{transaction.points}
                    </Typography>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    {transaction.orderId && (
                      <Chip label={`#${transaction.orderId}`} size="small" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  if (loading && customers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Sistema de Fidelidade - Terminal {terminalId}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/pos/${terminalId}/main`)}
        >
          Voltar ao POS
        </Button>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Person sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total de Clientes
                  </Typography>
                  <Typography variant="h5">
                    {customers.length}
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
                <Star sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pontos Ativos
                  </Typography>
                  <Typography variant="h5">
                    {customers.reduce((sum, c) => sum + (c.totalPoints - c.usedPoints), 0)}
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
                <LocalOffer sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Cupons Ativos
                  </Typography>
                  <Typography variant="h5">
                    {coupons.filter(c => c.isActive).length}
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
                <AttachMoney sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Faturamento Total
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="Clientes" />
          <Tab label="Cupons" />
          <Tab label="Transações" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {currentTab === 0 && renderCustomersTab()}
          {currentTab === 1 && renderCouponsTab()}
          {currentTab === 2 && renderTransactionsTab()}
        </Box>
      </Paper>

      {/* Dialog de Cliente */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nome *"
              fullWidth
              variant="outlined"
              value={customerForm.name}
              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Email *"
              type="email"
              fullWidth
              variant="outlined"
              value={customerForm.email}
              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Telefone *"
              fullWidth
              variant="outlined"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Data de Nascimento"
              type="date"
              fullWidth
              variant="outlined"
              value={customerForm.birthDate}
              onChange={(e) => setCustomerForm({ ...customerForm, birthDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Endereço"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={customerForm.address}
              onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleCustomerSave} 
            variant="contained"
            disabled={loading || !customerForm.name || !customerForm.email || !customerForm.phone}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cupom */}
      <Dialog open={couponDialogOpen} onClose={() => setCouponDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Código *"
                  fullWidth
                  variant="outlined"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Tipo *</InputLabel>
                  <Select
                    value={couponForm.type}
                    label="Tipo *"
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value as any })}
                  >
                    <MenuItem value="percentage">Percentual</MenuItem>
                    <MenuItem value="fixed">Valor Fixo</MenuItem>
                    <MenuItem value="points">Pontos</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Valor *"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={couponForm.value}
                  onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Limite de Uso"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  label="Descrição *"
                  fullWidth
                  variant="outlined"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Válido de"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={couponForm.validFrom}
                  onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  margin="dense"
                  label="Válido até"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={couponForm.validUntil}
                  onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {couponForm.type !== 'points' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      margin="dense"
                      label="Compra Mínima"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={couponForm.minPurchase}
                      onChange={(e) => setCouponForm({ ...couponForm, minPurchase: Number(e.target.value) })}
                    />
                  </Grid>
                  {couponForm.type === 'percentage' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        margin="dense"
                        label="Desconto Máximo"
                        type="number"
                        fullWidth
                        variant="outlined"
                        value={couponForm.maxDiscount}
                        onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: Number(e.target.value) })}
                      />
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCouponDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleCouponSave} 
            variant="contained"
            disabled={loading || !couponForm.code || !couponForm.description || couponForm.value <= 0}
          >
            {loading ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Ajuste de Pontos */}
      <Dialog open={pointsDialogOpen} onClose={() => setPointsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Ajustar Pontos - {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={pointsForm.type}
                label="Tipo"
                onChange={(e) => setPointsForm({ ...pointsForm, type: e.target.value as any })}
              >
                <MenuItem value="earn">Adicionar Pontos</MenuItem>
                <MenuItem value="redeem">Remover Pontos</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Quantidade de Pontos"
              type="number"
              fullWidth
              variant="outlined"
              value={pointsForm.points}
              onChange={(e) => setPointsForm({ ...pointsForm, points: Number(e.target.value) })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Descrição"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={pointsForm.description}
              onChange={(e) => setPointsForm({ ...pointsForm, description: e.target.value })}
            />
            {selectedCustomer && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Pontos atuais: {selectedCustomer.totalPoints - selectedCustomer.usedPoints}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPointsDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handlePointsAdjustment} 
            variant="contained"
            disabled={loading || pointsForm.points <= 0}
          >
            {loading ? <CircularProgress size={20} /> : 'Confirmar'}
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

export default LoyaltyScreen;

