import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer } from '../hooks/useCustomer';
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
  CircularProgress,
  Divider,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating
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
  Cancel,
  ArrowBack,
  WhatsApp,
  Sms,
  Analytics,
  Group,
  Timeline,
  Favorite,
  ShoppingBag,
  CalendarToday,
  ExpandMore,
  Send,
  Visibility,
  BarChart,
  PieChart,
  TrendingDown,
  PersonAdd,
  MessageOutlined
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
  preferences?: {
    favoriteItems: string[];
    allergies: string[];
    dietaryRestrictions: string[];
  };
  communication?: {
    whatsapp: boolean;
    email: boolean;
    sms: boolean;
  };
  satisfaction?: number; // 1-5 rating
  clv?: number; // Customer Lifetime Value
  segment?: 'new' | 'regular' | 'vip' | 'inactive';
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

interface Campaign {
  id: string;
  name: string;
  type: 'whatsapp' | 'email' | 'sms';
  status: 'draft' | 'active' | 'completed' | 'paused';
  targetSegment: string;
  message: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  createdAt: string;
  scheduledAt?: string;
}

interface CRMAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averageClv: number;
  retentionRate: number;
  satisfactionScore: number;
  topSpenders: Customer[];
  segmentDistribution: {
    new: number;
    regular: number;
    vip: number;
    inactive: number;
  };
}

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
      id={`crm-tabpanel-${index}`}
      aria-labelledby={`crm-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const LoyaltyScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  // Hook para clientes - integração com backend
  const { 
    customers, 
    loading: customersLoading, 
    error: customersError,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    loadCustomers 
  } = useCustomer();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<CRMAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [customerDetailDialogOpen, setCustomerDetailDialogOpen] = useState(false);
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
    address: '',
    favoriteItems: [] as string[],
    allergies: [] as string[],
    dietaryRestrictions: [] as string[],
    whatsappEnabled: true,
    emailEnabled: true,
    smsEnabled: false
  });

  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage' as const,
    discount_value: '',
    minimum_purchase: '',
    description: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    is_active: true
  });

  const [pointsForm, setPointsForm] = useState({
    points: 0,
    description: '',
    type: 'earn' as const
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'whatsapp' as const,
    targetSegment: 'all',
    message: '',
    scheduledAt: ''
  });

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar dados reais do backend
      await loadCustomers();
      
      // Carregar cupons do backend
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const couponsResponse = await fetch('http://localhost:8001/api/v1/coupons/', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Origin': 'http://localhost:3000'
            }
          });
          if (couponsResponse.ok) {
            const couponsData = await couponsResponse.json();
            setCoupons(couponsData);
          }
        } catch (error) {
          console.error('Erro ao carregar cupons:', error);
        }
      }
      
      // Dados reais baseados nos customers do backend
      const realCustomers = customers || [];
      const realCampaigns: Campaign[] = []; // Array vazio até implementar no backend
      const realTransactions: LoyaltyTransaction[] = []; // Array vazio até implementar no backend
      
      // Analytics calculados com dados reais
      const realAnalytics: CRMAnalytics = {
        totalCustomers: realCustomers.length,
        activeCustomers: realCustomers.filter(c => c.lastVisit && new Date(c.lastVisit) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        newCustomersThisMonth: realCustomers.filter(c => c.registrationDate && new Date(c.registrationDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        averageClv: realCustomers.length > 0 ? realCustomers.reduce((sum, c) => sum + (c.clv || 0), 0) / realCustomers.length : 0,
        retentionRate: realCustomers.length > 0 ? (realCustomers.filter(c => c.visitCount && c.visitCount > 1).length / realCustomers.length) * 100 : 0,
        satisfactionScore: realCustomers.length > 0 ? realCustomers.reduce((sum, c) => sum + (c.satisfaction || 0), 0) / realCustomers.length : 0,
        topSpenders: realCustomers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 3),
        segmentDistribution: {
          new: realCustomers.filter(c => c.segment === 'new').length,
          regular: realCustomers.filter(c => c.segment === 'regular').length,
          vip: realCustomers.filter(c => c.segment === 'vip').length,
          inactive: realCustomers.filter(c => c.segment === 'inactive').length
        }
      };

      setCampaigns(realCampaigns);
      setTransactions(realTransactions);
      setAnalytics(realAnalytics);
      
    } catch (error) {
      showSnackbar('Erro ao carregar dados do CRM', 'error');
    } finally {
      setLoading(false);
    }
  }, [customers, loadCustomers]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return '#E5E4E2';
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return '#666666';
    }
  };

  const getTierIcon = (tier: string) => {
    return <Star sx={{ color: getTierColor(tier) }} />;
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'vip': return 'error';
      case 'regular': return 'primary';
      case 'new': return 'success';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getSegmentText = (segment: string) => {
    switch (segment) {
      case 'vip': return 'VIP';
      case 'regular': return 'Regular';
      case 'new': return 'Novo';
      case 'inactive': return 'Inativo';
      default: return segment;
    }
  };

  // Renderizar Dashboard CRM
  const renderCRMDashboard = () => (
    <Box>
      <Typography variant="h5" mb={3}>Dashboard CRM</Typography>
      
      {analytics && (
        <Grid container spacing={3}>
          {/* KPIs Principais */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Group sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Clientes
                    </Typography>
                    <Typography variant="h5">
                      {analytics.totalCustomers.toLocaleString()}
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
                  <TrendingUp sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Clientes Ativos
                    </Typography>
                    <Typography variant="h5">
                      {analytics.activeCustomers.toLocaleString()}
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
                  <AttachMoney sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      CLV Médio
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(analytics.averageClv)}
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
                  <Favorite sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Satisfação
                    </Typography>
                    <Typography variant="h5">
                      {analytics.satisfactionScore.toFixed(1)}
                    </Typography>
                    <Rating value={analytics.satisfactionScore} readOnly size="small" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráficos e Análises */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Distribuição por Segmento</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {analytics.segmentDistribution.new}%
                      </Typography>
                      <Typography variant="body2">Novos</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary.main">
                        {analytics.segmentDistribution.regular}%
                      </Typography>
                      <Typography variant="body2">Regulares</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error.main">
                        {analytics.segmentDistribution.vip}%
                      </Typography>
                      <Typography variant="body2">VIP</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="text.secondary">
                        {analytics.segmentDistribution.inactive}%
                      </Typography>
                      <Typography variant="body2">Inativos</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Top Clientes</Typography>
                <List>
                  {analytics.topSpenders.map((customer, index) => (
                    <ListItem key={customer.id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getTierColor(customer.tier) }}>
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={customer.name}
                        secondary={formatCurrency(customer.totalSpent)}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Renderizar lista de clientes expandida
  const renderCustomers = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestão de Clientes</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => {
            setEditingCustomer(null);
            setCustomerForm({
              name: '',
              email: '',
              phone: '',
              birthDate: '',
              address: '',
              favoriteItems: [],
              allergies: [],
              dietaryRestrictions: [],
              whatsappEnabled: true,
              emailEnabled: true,
              smsEnabled: false
            });
            setCustomerDialogOpen(true);
          }}
        >
          Novo Cliente
        </Button>
      </Box>

      {/* Filtros */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
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
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">
              {customers.length} clientes encontrados
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Lista de clientes */}
      <Grid container spacing={2}>
        {customers
          .filter(customer => 
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm)
          )
          .map((customer) => (
            <Grid item xs={12} md={6} lg={4} key={customer.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ bgcolor: getTierColor(customer.tier) }}>
                        {customer.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{customer.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getTierIcon(customer.tier)}
                          <Typography variant="caption" color="textSecondary">
                            {customer.tier.toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Chip 
                      label={getSegmentText(customer.segment || 'regular')}
                      color={getSegmentColor(customer.segment || 'regular') as any}
                      size="small"
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      <Phone sx={{ fontSize: 16, mr: 1 }} />
                      {customer.phone}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <Email sx={{ fontSize: 16, mr: 1 }} />
                      {customer.email}
                    </Typography>
                    {customer.birthDate && (
                      <Typography variant="body2" color="textSecondary">
                        <Cake sx={{ fontSize: 16, mr: 1 }} />
                        {new Date(customer.birthDate).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  <Grid container spacing={1} mb={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Pontos</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {customer.totalPoints.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Gasto Total</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(customer.totalSpent)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Visitas</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {customer.visitCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">CLV</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(customer.clv || 0)}
                      </Typography>
                    </Grid>
                  </Grid>

                  {customer.satisfaction && (
                    <Box mb={2}>
                      <Typography variant="caption" color="textSecondary">Satisfação</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating value={customer.satisfaction} readOnly size="small" />
                        <Typography variant="body2">
                          {customer.satisfaction.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" gap={1}>
                      {customer.communication?.whatsapp && (
                        <Tooltip title="WhatsApp ativo">
                          <WhatsApp sx={{ fontSize: 16, color: '#25D366' }} />
                        </Tooltip>
                      )}
                      {customer.communication?.email && (
                        <Tooltip title="Email ativo">
                          <Email sx={{ fontSize: 16, color: 'primary.main' }} />
                        </Tooltip>
                      )}
                      {customer.communication?.sms && (
                        <Tooltip title="SMS ativo">
                          <Sms sx={{ fontSize: 16, color: 'warning.main' }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerDetailDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingCustomer(customer);
                          setCustomerForm({
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone,
                            birthDate: customer.birthDate || '',
                            address: customer.address || '',
                            favoriteItems: customer.preferences?.favoriteItems || [],
                            allergies: customer.preferences?.allergies || [],
                            dietaryRestrictions: customer.preferences?.dietaryRestrictions || [],
                            whatsappEnabled: customer.communication?.whatsapp || false,
                            emailEnabled: customer.communication?.email || false,
                            smsEnabled: customer.communication?.sms || false
                          });
                          setCustomerDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>
    </Box>
  );

  // Renderizar campanhas de marketing
  const renderCampaigns = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Campanhas de Marketing</Typography>
        <Button
          variant="contained"
          startIcon={<Campaign />}
          onClick={() => setCampaignDialogOpen(true)}
        >
          Nova Campanha
        </Button>
      </Box>

      <Grid container spacing={3}>
        {campaigns.map((campaign) => (
          <Grid item xs={12} md={6} key={campaign.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">{campaign.name}</Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      {campaign.type === 'whatsapp' && <WhatsApp sx={{ color: '#25D366' }} />}
                      {campaign.type === 'email' && <Email sx={{ color: 'primary.main' }} />}
                      {campaign.type === 'sms' && <Sms sx={{ color: 'warning.main' }} />}
                      <Typography variant="body2" color="textSecondary">
                        {campaign.type.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={campaign.status.toUpperCase()}
                    color={campaign.status === 'active' ? 'success' : 
                           campaign.status === 'completed' ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="textSecondary" mb={2}>
                  {campaign.message}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Enviados</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {campaign.sentCount.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Taxa de Abertura</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {campaign.openRate.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Taxa de Clique</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {campaign.clickRate.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Conversão</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {campaign.conversionRate.toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>

                <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="textSecondary">
                    Criada em {new Date(campaign.createdAt).toLocaleDateString()}
                  </Typography>
                  <Box>
                    <IconButton size="small">
                      <BarChart />
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Renderizar cupons
  const renderCoupons = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestão de Cupons</Typography>
        <Button
          variant="contained"
          startIcon={<LocalOffer />}
          onClick={() => setCouponDialogOpen(true)}
        >
          Novo Cupom
        </Button>
      </Box>

      <Grid container spacing={3}>
        {coupons.map((coupon) => (
          <Grid item xs={12} md={6} lg={4} key={coupon.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">{coupon.code}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {coupon.description}
                    </Typography>
                  </Box>
                  <Chip 
                    label={coupon.isActive ? 'Ativo' : 'Inativo'}
                    color={coupon.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {coupon.type === 'percentage' ? 'Percentual' : 
                                           coupon.type === 'fixed' ? 'Valor Fixo' : 'Pontos'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Valor:</strong> {coupon.type === 'percentage' ? `${coupon.value}%` :
                                           coupon.type === 'fixed' ? `R$ ${coupon.value.toFixed(2)}` :
                                           `${coupon.value} pontos`}
                  </Typography>
                  {coupon.minPurchase && (
                    <Typography variant="body2">
                      <strong>Compra mínima:</strong> R$ {coupon.minPurchase.toFixed(2)}
                    </Typography>
                  )}
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">
                    <strong>Válido:</strong> {new Date(coupon.validFrom).toLocaleDateString()} até {new Date(coupon.validUntil).toLocaleDateString()}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(coupon.usedCount / coupon.usageLimit) * 100}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {coupon.usedCount} de {coupon.usageLimit} usos
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => {
                      // Implementar edição de cupom
                      showSnackbar('Funcionalidade em desenvolvimento', 'info');
                    }}
                  >
                    Editar
                  </Button>
                  <Switch
                    checked={coupon.isActive}
                    onChange={() => {
                      // Implementar toggle de cupom
                      showSnackbar('Status do cupom alterado', 'success');
                    }}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Renderizar transações
  const renderTransactions = () => (
    <Box>
      <Typography variant="h5" mb={3}>Histórico de Transações</Typography>
      
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
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {customer?.name.charAt(0) || '?'}
                      </Avatar>
                      <Typography variant="body2">
                        {customer?.name || 'Cliente não encontrado'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={transaction.type === 'earn' ? 'Ganho' : 'Resgate'}
                      color={transaction.type === 'earn' ? 'success' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={transaction.type === 'earn' ? 'success.main' : 'primary.main'}
                      fontWeight="bold"
                    >
                      {transaction.type === 'earn' ? '+' : '-'}{transaction.points}
                    </Typography>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    {transaction.orderId && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          // Implementar visualização do pedido
                          showSnackbar('Funcionalidade em desenvolvimento', 'info');
                        }}
                      >
                        #{transaction.orderId}
                      </Button>
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(`/pos/${terminalId}/main`)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            CRM & Fidelidade - Terminal {terminalId}
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Analytics />} label="Dashboard" />
          <Tab icon={<Group />} label="Clientes" />
          <Tab icon={<Campaign />} label="Campanhas" />
          <Tab icon={<LocalOffer />} label="Cupons" />
          <Tab icon={<History />} label="Transações" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {renderCRMDashboard()}
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          {renderCustomers()}
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          {renderCampaigns()}
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          {renderCoupons()}
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          {renderTransactions()}
        </TabPanel>
      </Paper>

      {/* Dialogs existentes e novos... */}
      
      {/* Dialog de Nova Campanha */}
      <Dialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova Campanha de Marketing</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Campanha"
                placeholder="Ex: Promoção de Verão 2024"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Campanha</InputLabel>
                <Select defaultValue="">
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Segmento de Clientes</InputLabel>
                <Select defaultValue="">
                  <MenuItem value="all">Todos os Clientes</MenuItem>
                  <MenuItem value="vip">Clientes VIP</MenuItem>
                  <MenuItem value="regular">Clientes Regulares</MenuItem>
                  <MenuItem value="inactive">Clientes Inativos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Mensagem da Campanha"
                placeholder="Digite a mensagem que será enviada aos clientes..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data de Início"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data de Fim"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              // Implementar criação de campanha
              setCampaignDialogOpen(false);
              setSnackbar({
                open: true,
                message: 'Campanha criada com sucesso!',
                severity: 'success'
              });
            }}
          >
            Criar Campanha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Novo Cupom */}
      <Dialog open={couponDialogOpen} onClose={() => setCouponDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo Cupom de Desconto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código do Cupom"
                placeholder="Ex: DESCONTO10"
                value={couponForm.code}
                onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Desconto</InputLabel>
                <Select 
                  value={couponForm.discount_type}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' | 'points' }))}
                >
                  <MenuItem value="percentage">Porcentagem (%)</MenuItem>
                  <MenuItem value="fixed">Valor Fixo (R$)</MenuItem>
                  <MenuItem value="points">Pontos de Fidelidade</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor do Desconto"
                placeholder="Ex: 10"
                value={couponForm.discount_value}
                onChange={(e) => setCouponForm(prev => ({ ...prev, discount_value: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Compra Mínima (R$)"
                placeholder="Ex: 50.00"
                value={couponForm.minimum_purchase}
                onChange={(e) => setCouponForm(prev => ({ ...prev, minimum_purchase: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                placeholder="Ex: 10% de desconto em pedidos acima de R$ 50"
                value={couponForm.description}
                onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Válido de"
                InputLabelProps={{ shrink: true }}
                value={couponForm.valid_from}
                onChange={(e) => setCouponForm(prev => ({ ...prev, valid_from: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Válido até"
                InputLabelProps={{ shrink: true }}
                value={couponForm.valid_until}
                onChange={(e) => setCouponForm(prev => ({ ...prev, valid_until: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Limite de Uso"
                placeholder="Ex: 100"
                value={couponForm.usage_limit}
                onChange={(e) => setCouponForm(prev => ({ ...prev, usage_limit: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={couponForm.is_active}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Cupom Ativo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCouponDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                if (!token) {
                  setSnackbar({
                    open: true,
                    message: 'Token de autenticação não encontrado',
                    severity: 'error'
                  });
                  return;
                }

                const couponData = {
                  code: couponForm.code,
                  discount_type: couponForm.discount_type || 'percentage',
                  discount_value: parseFloat(couponForm.discount_value) || 0,
                  minimum_purchase: parseFloat(couponForm.minimum_purchase) || 0,
                  description: couponForm.description,
                  valid_from: couponForm.valid_from,
                  valid_until: couponForm.valid_until,
                  usage_limit: parseInt(couponForm.usage_limit) || 0,
                  is_active: couponForm.is_active
                };

                const response = await fetch('http://localhost:8001/api/v1/coupons/', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Origin': 'http://localhost:3000'
                  },
                  body: JSON.stringify(couponData)
                });

                if (response.ok) {
                  const newCoupon = await response.json();
                  setCoupons(prev => [...prev, newCoupon]);
                  setCouponDialogOpen(false);
                  setCouponForm({
                    code: '',
                    discount_type: 'percentage',
                    discount_value: '',
                    minimum_purchase: '',
                    description: '',
                    valid_from: '',
                    valid_until: '',
                    usage_limit: '',
                    is_active: true
                  });
                  setSnackbar({
                    open: true,
                    message: 'Cupom criado com sucesso!',
                    severity: 'success'
                  });
                } else {
                  const errorData = await response.json();
                  setSnackbar({
                    open: true,
                    message: `Erro ao criar cupom: ${errorData.detail || 'Erro desconhecido'}`,
                    severity: 'error'
                  });
                }
              } catch (error) {
                console.error('Erro ao criar cupom:', error);
                setSnackbar({
                  open: true,
                  message: 'Erro ao criar cupom',
                  severity: 'error'
                });
              }
            }}
          >
            Criar Cupom
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Novo Cliente */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome Completo"
                placeholder="Ex: João Silva"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                placeholder="Ex: joao@email.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                placeholder="Ex: (11) 99999-9999"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Nascimento"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={customerForm.birthDate}
                onChange={(e) => setCustomerForm({...customerForm, birthDate: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endereço"
                placeholder="Ex: Rua das Flores, 123 - Centro"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Preferências de Comunicação
              </Typography>
              <FormControlLabel
                control={
                  <Switch 
                    checked={customerForm.whatsappEnabled}
                    onChange={(e) => setCustomerForm({...customerForm, whatsappEnabled: e.target.checked})}
                  />
                }
                label="WhatsApp"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={customerForm.emailEnabled}
                    onChange={(e) => setCustomerForm({...customerForm, emailEnabled: e.target.checked})}
                  />
                }
                label="E-mail"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={customerForm.smsEnabled}
                    onChange={(e) => setCustomerForm({...customerForm, smsEnabled: e.target.checked})}
                  />
                }
                label="SMS"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              try {
                setLoading(true);
                // Criar cliente via API
                const newCustomer = {
                  name: customerForm.name,
                  email: customerForm.email,
                  phone: customerForm.phone,
                  birth_date: customerForm.birthDate,
                  address: customerForm.address,
                  whatsapp_enabled: customerForm.whatsappEnabled,
                  email_enabled: customerForm.emailEnabled,
                  sms_enabled: customerForm.smsEnabled
                };
                
                const response = await fetch('http://localhost:8001/api/v1/customers/', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify(newCustomer)
                });
                
                if (response.ok) {
                  setCustomerDialogOpen(false);
                  setSnackbar({
                    open: true,
                    message: 'Cliente criado com sucesso!',
                    severity: 'success'
                  });
                  loadCustomers(); // Recarregar lista
                } else {
                  throw new Error('Erro ao criar cliente');
                }
              } catch (error) {
                setSnackbar({
                  open: true,
                  message: 'Erro ao criar cliente: ' + error.message,
                  severity: 'error'
                });
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Criar Cliente'}
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

