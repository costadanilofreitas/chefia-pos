import React, { useState, useEffect } from 'react';
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
  Alert
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
  Campaign
} from '@mui/icons-material';

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
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const loadLoyaltyData = async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
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

  const handleCustomerSave = () => {
    if (!customerForm.name || !customerForm.email || !customerForm.phone) {
      return;
    }

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
    setCustomerForm({ name: '', email: '', phone: '', birthDate: '', address: '' });
    setCustomerDialogOpen(false);
  };

  const handleCouponSave = () => {
    if (!couponForm.code || !couponForm.description || couponForm.value <= 0) {
      return;
    }

    const newCoupon: Coupon = {
      id: Date.now().toString(),
      ...couponForm,
      usedCount: 0,
      isActive: true
    };

    setCoupons(prev => [...prev, newCoupon]);
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
    setCouponDialogOpen(false);
  };

  const handlePointsAdjustment = () => {
    if (!selectedCustomer || pointsForm.points === 0) {
      return;
    }

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
              : customer.totalPoints - pointsForm.points
          }
        : customer
    ));

    setPointsForm({ points: 0, description: '', type: 'earn' });
    setPointsDialogOpen(false);
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
          onClick={() => setCustomerDialogOpen(true)}
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
                      R$ {customer.totalSpent.toFixed(2)}
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
                  <IconButton size="small">
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
          onClick={() => setCouponDialogOpen(true)}
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
                   coupon.type === 'fixed' ? `R$ ${coupon.value}` :
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
                  <IconButton size="small">
                    <Edit />
                  </IconButton>
                  <IconButton size="small">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderAnalyticsTab = () => {
    const totalCustomers = customers.length;
    const totalPoints = customers.reduce((sum, c) => sum + c.totalPoints, 0);
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgSpentPerCustomer = totalSpent / totalCustomers;

    const tierDistribution = customers.reduce((acc, customer) => {
      acc[customer.tier] = (acc[customer.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Box>
        <Typography variant="h6" mb={3}>Analytics de Fidelidade</Typography>
        
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Person sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Clientes
                    </Typography>
                    <Typography variant="h4">
                      {totalCustomers}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Star sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Pontos Ativos
                    </Typography>
                    <Typography variant="h4">
                      {totalPoints.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AttachMoney sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Faturamento Total
                    </Typography>
                    <Typography variant="h4">
                      R$ {totalSpent.toFixed(0)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Ticket Médio
                    </Typography>
                    <Typography variant="h4">
                      R$ {avgSpentPerCustomer.toFixed(0)}
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
                <Typography variant="h6" mb={2}>Distribuição por Tier</Typography>
                {Object.entries(tierDistribution).map(([tier, count]) => (
                  <Box key={tier} mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">
                        {getTierLabel(tier as Customer['tier'])}
                      </Typography>
                      <Typography variant="body2">
                        {count} ({((count / totalCustomers) * 100).toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(count / totalCustomers) * 100}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getTierColor(tier as Customer['tier'])
                        }
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Transações Recentes</Typography>
                <List>
                  {transactions.slice(0, 5).map((transaction) => {
                    const customer = customers.find(c => c.id === transaction.customerId);
                    return (
                      <ListItem key={transaction.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: transaction.type === 'earn' ? 'success.main' : 'warning.main' 
                          }}>
                            {transaction.type === 'earn' ? '+' : '-'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={customer?.name}
                          secondary={`${transaction.description} - ${new Date(transaction.date).toLocaleDateString()}`}
                        />
                        <ListItemSecondaryAction>
                          <Typography 
                            variant="body2" 
                            color={transaction.type === 'earn' ? 'success.main' : 'warning.main'}
                            fontWeight="bold"
                          >
                            {transaction.type === 'earn' ? '+' : ''}{transaction.points} pts
                          </Typography>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando sistema de fidelidade...</Typography>
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
          onClick={() => navigate(`/pos/${terminalId}`)}
        >
          Voltar ao POS
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Clientes" icon={<Person />} />
          <Tab label="Cupons" icon={<LocalOffer />} />
          <Tab label="Analytics" icon={<TrendingUp />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && renderCustomersTab()}
      {currentTab === 1 && renderCouponsTab()}
      {currentTab === 2 && renderAnalyticsTab()}

      {/* Customer Dialog */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Cliente</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome Completo"
            fullWidth
            variant="outlined"
            value={customerForm.name}
            onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={customerForm.email}
            onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Telefone"
            fullWidth
            variant="outlined"
            value={customerForm.phone}
            onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Data de Nascimento"
            type="date"
            fullWidth
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={customerForm.birthDate}
            onChange={(e) => setCustomerForm(prev => ({ ...prev, birthDate: e.target.value }))}
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
            onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCustomerSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onClose={() => setCouponDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo Cupom de Desconto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                autoFocus
                margin="dense"
                label="Código do Cupom"
                fullWidth
                variant="outlined"
                value={couponForm.code}
                onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                margin="dense"
                label="Tipo"
                select
                fullWidth
                variant="outlined"
                value={couponForm.type}
                onChange={(e) => setCouponForm(prev => ({ ...prev, type: e.target.value as any }))}
                SelectProps={{ native: true }}
              >
                <option value="percentage">Percentual</option>
                <option value="fixed">Valor Fixo</option>
                <option value="points">Pontos</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Descrição"
                fullWidth
                variant="outlined"
                value={couponForm.description}
                onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                margin="dense"
                label={couponForm.type === 'percentage' ? 'Percentual (%)' : 
                       couponForm.type === 'fixed' ? 'Valor (R$)' : 'Pontos'}
                type="number"
                fullWidth
                variant="outlined"
                value={couponForm.value}
                onChange={(e) => setCouponForm(prev => ({ ...prev, value: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                margin="dense"
                label="Compra Mínima (R$)"
                type="number"
                fullWidth
                variant="outlined"
                value={couponForm.minPurchase}
                onChange={(e) => setCouponForm(prev => ({ ...prev, minPurchase: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                margin="dense"
                label="Limite de Uso"
                type="number"
                fullWidth
                variant="outlined"
                value={couponForm.usageLimit}
                onChange={(e) => setCouponForm(prev => ({ ...prev, usageLimit: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                margin="dense"
                label="Válido de"
                type="date"
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={couponForm.validFrom}
                onChange={(e) => setCouponForm(prev => ({ ...prev, validFrom: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                margin="dense"
                label="Válido até"
                type="date"
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={couponForm.validUntil}
                onChange={(e) => setCouponForm(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCouponDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCouponSave} variant="contained">
            Criar Cupom
          </Button>
        </DialogActions>
      </Dialog>

      {/* Points Adjustment Dialog */}
      <Dialog open={pointsDialogOpen} onClose={() => setPointsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Ajustar Pontos - {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Pontos atuais: {selectedCustomer ? selectedCustomer.totalPoints - selectedCustomer.usedPoints : 0}
          </Alert>
          
          <TextField
            margin="dense"
            label="Tipo"
            select
            fullWidth
            variant="outlined"
            value={pointsForm.type}
            onChange={(e) => setPointsForm(prev => ({ ...prev, type: e.target.value as any }))}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            <option value="earn">Adicionar Pontos</option>
            <option value="redeem">Remover Pontos</option>
          </TextField>
          
          <TextField
            margin="dense"
            label="Quantidade de Pontos"
            type="number"
            fullWidth
            variant="outlined"
            value={pointsForm.points}
            onChange={(e) => setPointsForm(prev => ({ ...prev, points: Number(e.target.value) }))}
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
            onChange={(e) => setPointsForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPointsDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePointsAdjustment} variant="contained">
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoyaltyScreen;

