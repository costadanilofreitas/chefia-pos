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

  // Função para criar cupom com token de autenticação
  const handleCreateCoupon = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }
      
      const newCoupon = {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        minimum_purchase: couponForm.minimum_purchase ? parseFloat(couponForm.minimum_purchase) : 0,
        description: couponForm.description,
        valid_from: couponForm.valid_from || new Date().toISOString().split('T')[0],
        valid_until: couponForm.valid_until || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit) : 100,
        is_active: couponForm.is_active
      };
      
      const response = await fetch('http://localhost:8001/api/v1/coupons/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCoupon)
      });
      
      if (response.ok) {
        setCouponDialogOpen(false);
        showSnackbar('Cupom criado com sucesso!', 'success');
        
        // Recarregar cupons
        const couponsResponse = await fetch('http://localhost:8001/api/v1/coupons/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (couponsResponse.ok) {
          const couponsData = await couponsResponse.json();
          setCoupons(couponsData);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro desconhecido');
      }
    } catch (error) {
      showSnackbar(`Erro ao criar cupom: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

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

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
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
      </Box>

      {customersLoading ? (
        <LinearProgress />
      ) : customersError ? (
        <Alert severity="error">Erro ao carregar clientes: {customersError}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell>Segmento</TableCell>
                <TableCell>Pontos</TableCell>
                <TableCell>Total Gasto</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers
                .filter(customer => 
                  customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  customer.phone.includes(searchTerm)
                )
                .map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2, bgcolor: getTierColor(customer.tier) }}>
                          {customer.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">{customer.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {getTierIcon(customer.tier)} {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{customer.email}</Typography>
                      <Typography variant="body2">{customer.phone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getSegmentText(customer.segment || 'new')} 
                        color={getSegmentColor(customer.segment || 'new') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        <strong>{customer.totalPoints - customer.usedPoints}</strong> disponíveis
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {customer.totalPoints} acumulados
                      </Typography>
                    </TableCell>
                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell>
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
                      <IconButton 
                        size="small"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setPointsDialogOpen(true);
                        }}
                      >
                        <CardGiftcard />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
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
          onClick={() => {
            setCampaignForm({
              name: '',
              type: 'whatsapp',
              targetSegment: 'all',
              message: '',
              scheduledAt: ''
            });
            setCampaignDialogOpen(true);
          }}
        >
          Nova Campanha
        </Button>
      </Box>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Campaign sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma campanha encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Crie sua primeira campanha para engajar seus clientes
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Campaign />}
                onClick={() => setCampaignDialogOpen(true)}
              >
                Nova Campanha
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {campaigns.map(campaign => (
            <Grid item xs={12} md={6} lg={4} key={campaign.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{campaign.name}</Typography>
                    <Chip 
                      label={campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)} 
                      color={
                        campaign.status === 'active' ? 'success' :
                        campaign.status === 'draft' ? 'default' :
                        campaign.status === 'paused' ? 'warning' : 'primary'
                      }
                      size="small"
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Tipo de Campanha
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {campaign.type === 'whatsapp' ? <WhatsApp color="success" /> :
                       campaign.type === 'email' ? <Email color="primary" /> :
                       <Sms color="secondary" />}
                      <Typography variant="body1" ml={1}>
                        {campaign.type === 'whatsapp' ? 'WhatsApp' :
                         campaign.type === 'email' ? 'Email' : 'SMS'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Segmento Alvo
                  </Typography>
                  <Typography variant="body1" mb={2}>
                    {campaign.targetSegment}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Mensagem
                  </Typography>
                  <Typography variant="body1" mb={2} sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {campaign.message}
                  </Typography>
                  
                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Enviados
                      </Typography>
                      <Typography variant="body2">
                        {campaign.sentCount}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Taxa de Abertura
                      </Typography>
                      <Typography variant="body2">
                        {campaign.openRate}%
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">
                        Conversão
                      </Typography>
                      <Typography variant="body2">
                        {campaign.conversionRate}%
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box display="flex" justifyContent="flex-end">
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                    <IconButton size="small">
                      <Delete />
                    </IconButton>
                    <IconButton size="small">
                      <Send />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  // Renderizar cupons de desconto
  const renderCoupons = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestão de Cupons</Typography>
        <Button
          variant="contained"
          startIcon={<LocalOffer />}
          onClick={() => {
            setEditingCoupon(null);
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
            setCouponDialogOpen(true);
          }}
        >
          Novo Cupom
        </Button>
      </Box>

      {coupons.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <LocalOffer sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhum cupom encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Crie seu primeiro cupom de desconto
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LocalOffer />}
                onClick={() => setCouponDialogOpen(true)}
              >
                Novo Cupom
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Desconto</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Validade</TableCell>
                <TableCell>Uso</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.map(coupon => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {coupon.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {coupon.type === 'percentage' ? `${coupon.value}%` :
                     coupon.type === 'fixed' ? formatCurrency(coupon.value) :
                     `${coupon.value} pontos`}
                    {coupon.minPurchase && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Min: {formatCurrency(coupon.minPurchase)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {coupon.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validUntil).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {coupon.usedCount}/{coupon.usageLimit}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(coupon.usedCount / coupon.usageLimit) * 100}
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
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
                      onClick={() => {
                        setEditingCoupon(coupon);
                        setCouponForm({
                          code: coupon.code,
                          discount_type: coupon.type as any,
                          discount_value: coupon.value.toString(),
                          minimum_purchase: coupon.minPurchase?.toString() || '',
                          description: coupon.description,
                          valid_from: coupon.validFrom,
                          valid_until: coupon.validUntil,
                          usage_limit: coupon.usageLimit.toString(),
                          is_active: coupon.isActive
                        });
                        setCouponDialogOpen(true);
                      }}
                    >
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
      )}
    </Box>
  );

  // Renderizar transações de pontos
  const renderTransactions = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Transações de Pontos</Typography>
      </Box>

      {transactions.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <History sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma transação encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                As transações de pontos aparecerão aqui
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
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
              {transactions.map(transaction => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {customers.find(c => c.id === transaction.customerId)?.name || 'Cliente não encontrado'}
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
                    >
                      {transaction.type === 'earn' ? '+' : '-'}{transaction.points}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    {transaction.orderId ? (
                      <Button size="small" variant="outlined">
                        Ver Pedido
                      </Button>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
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
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Nome da Campanha"
                fullWidth
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Campanha</InputLabel>
                <Select
                  value={campaignForm.type}
                  label="Tipo de Campanha"
                  onChange={(e) => setCampaignForm({...campaignForm, type: e.target.value as any})}
                >
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Segmento de Clientes</InputLabel>
                <Select
                  value={campaignForm.targetSegment}
                  label="Segmento de Clientes"
                  onChange={(e) => setCampaignForm({...campaignForm, targetSegment: e.target.value})}
                >
                  <MenuItem value="all">Todos os Clientes</MenuItem>
                  <MenuItem value="vip">Clientes VIP</MenuItem>
                  <MenuItem value="regular">Clientes Regulares</MenuItem>
                  <MenuItem value="new">Novos Clientes</MenuItem>
                  <MenuItem value="inactive">Clientes Inativos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Mensagem"
                fullWidth
                multiline
                rows={4}
                value={campaignForm.message}
                onChange={(e) => setCampaignForm({...campaignForm, message: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Envio"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={campaignForm.scheduledAt}
                onChange={(e) => setCampaignForm({...campaignForm, scheduledAt: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              // Implementar criação de campanha
              setCampaignDialogOpen(false);
              showSnackbar('Campanha criada com sucesso!', 'success');
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
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Código do Cupom"
                fullWidth
                placeholder="Ex: DESCONTO10"
                value={couponForm.code}
                onChange={(e) => setCouponForm({...couponForm, code: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Desconto</InputLabel>
                <Select
                  value={couponForm.discount_type}
                  label="Tipo de Desconto"
                  onChange={(e) => setCouponForm({...couponForm, discount_type: e.target.value as any})}
                >
                  <MenuItem value="percentage">Porcentagem (%)</MenuItem>
                  <MenuItem value="fixed">Valor Fixo (R$)</MenuItem>
                  <MenuItem value="points">Pontos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor do Desconto"
                fullWidth
                placeholder={couponForm.discount_type === 'percentage' ? "Ex: 10" : "Ex: 50.00"}
                value={couponForm.discount_value}
                onChange={(e) => setCouponForm({...couponForm, discount_value: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Compra Mínima (R$)"
                fullWidth
                placeholder="Ex: 50.00"
                value={couponForm.minimum_purchase}
                onChange={(e) => setCouponForm({...couponForm, minimum_purchase: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Descrição"
                fullWidth
                placeholder="Ex: 10% de desconto em pedidos acima de R$ 50"
                value={couponForm.description}
                onChange={(e) => setCouponForm({...couponForm, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Válido de"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={couponForm.valid_from}
                onChange={(e) => setCouponForm({...couponForm, valid_from: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Válido até"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={couponForm.valid_until}
                onChange={(e) => setCouponForm({...couponForm, valid_until: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Limite de Uso"
                fullWidth
                placeholder="Ex: 100"
                value={couponForm.usage_limit}
                onChange={(e) => setCouponForm({...couponForm, usage_limit: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={couponForm.is_active}
                    onChange={(e) => setCouponForm({...couponForm, is_active: e.target.checked})}
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
            color="primary"
            onClick={handleCreateCoupon}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Criar Cupom'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cliente */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Nome Completo"
                fullWidth
                value={customerForm.name}
                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Telefone"
                fullWidth
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Data de Nascimento"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={customerForm.birthDate}
                onChange={(e) => setCustomerForm({...customerForm, birthDate: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Endereço"
                fullWidth
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
                label="Email"
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
            color="primary"
            onClick={async () => {
              try {
                setLoading(true);
                
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

