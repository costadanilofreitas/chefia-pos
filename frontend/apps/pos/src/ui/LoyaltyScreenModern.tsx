import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCustomer } from '../hooks/useCustomer';
import { useCoupons } from '../hooks/useCoupons';
import { useAI } from '../hooks/useAI';
import { useLoyalty } from '../hooks/useLoyalty';
import Toast, { useToast } from '../components/Toast';
import '../index.css';

interface LoyaltyCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  birthDate?: Date;
  registeredAt: Date;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  totalOrders: number;
  lastVisit: Date;
  preferences?: string[];
  notes?: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'product' | 'experience' | 'birthday';
  image?: string;
  validUntil?: Date;
  stock?: number;
  terms?: string;
}

interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  description: string;
  orderId?: string;
  rewardId?: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface LoyaltyProgram {
  name: string;
  pointsPerCurrency: number; // Points earned per R$ spent
  tiers: {
    bronze: { min: 0, multiplier: 1, benefits: string[] };
    silver: { min: 500, multiplier: 1.2, benefits: string[] };
    gold: { min: 1500, multiplier: 1.5, benefits: string[] };
    platinum: { min: 5000, multiplier: 2, benefits: string[] };
  };
  birthdayBonus: number;
  welcomeBonus: number;
  referralBonus: number;
}

export default function LoyaltyScreenModern() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { toasts, removeToast, success, error, warning, info } = useToast();
  const { customers: customerList, createCustomer, loadCustomers, creating } = useCustomer();
  const { 
    coupons, 
    loading: loadingCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getStatistics: getCouponStats
  } = useCoupons();
  const {
    loading: loadingAI,
    customerInsight,
    recommendations,
    campaigns,
    optimization,
    getCustomerInsights,
    getProductRecommendations,
    getCampaignRecommendations,
    optimizeLoyaltyProgram,
    generatePersonalizedOffer
  } = useAI();
  const {
    loading: loadingLoyalty,
    addPoints,
    redeemPoints,
    checkBalance,
    getTransactionHistory,
    loadRewards,
    loadTransactions,
    loyaltyProgram = {
      name: 'Programa de Fidelidade',
      pointsPerCurrency: 10,
      tiers: {
        bronze: { min: 0, multiplier: 1, benefits: ['Acumule pontos'] },
        silver: { min: 500, multiplier: 1.2, benefits: ['20% mais pontos'] },
        gold: { min: 1500, multiplier: 1.5, benefits: ['50% mais pontos'] },
        platinum: { min: 5000, multiplier: 2, benefits: ['Pontos em dobro'] }
      },
      birthdayBonus: 500,
      welcomeBonus: 100,
      referralBonus: 250
    }
  } = useLoyalty();
  
  const [selectedTab, setSelectedTab] = useState<'customers' | 'rewards' | 'transactions' | 'coupons' | 'ai' | 'program'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [showAIInsightModal, setShowAIInsightModal] = useState(false);
  const [showAddPointsModal, setShowAddPointsModal] = useState(false);
  const [showRedeemPointsModal, setShowRedeemPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDescription, setPointsDescription] = useState('');
  
  // New customer form state
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    birthDate: ''
  });
  
  // Coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'product' | 'shipping',
    discount_value: 0,
    min_purchase: 0,
    max_discount: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usage_limit: 0,
    per_customer_limit: 0
  });
  
  // Use real customers from hook
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);

  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);

  // Load loyalty data on mount
  useEffect(() => {
    // Load customers, rewards and transactions from API
    loadCustomers();
    loadRewards(); 
    loadTransactions();
  }, []);

  useEffect(() => {
    if (!terminalId || isNaN(Number(terminalId))) {
      navigate('/');
    }
  }, [terminalId, navigate]);

  // Keyboard shortcuts
  useHotkeys('alt+c', () => setSelectedTab('customers'));
  useHotkeys('alt+r', () => setSelectedTab('rewards'));
  useHotkeys('alt+t', () => setSelectedTab('transactions'));
  useHotkeys('esc', () => {
    setShowCustomerModal(false);
    setShowRewardModal(false);
  });

  const getTierColor = (tier: LoyaltyCustomer['tier']) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'silver': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'gold': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'platinum': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    }
  };

  const getTierName = (tier: LoyaltyCustomer['tier']) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.document.includes(searchTerm)
  );

  const getTransactionIcon = (type: LoyaltyTransaction['type']) => {
    switch (type) {
      case 'earned':
        return (
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8 8-8-8" />
            </svg>
          </div>
        );
      case 'redeemed':
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        );
      case 'expired':
        return (
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              Gerencie clientes e recompensas do programa de fidelidade
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Quick Stats */}
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">Total Clientes</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{customers.length}</p>
              </div>
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400">Pontos Ativos</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {customers.reduce((sum, c) => sum + c.points, 0).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            {/* New Customer Button */}
            <button 
              onClick={() => setShowCreateCustomerModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
              title="Criar novo cliente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Novo Cliente
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {[
            { key: 'customers', label: 'Clientes', icon: '👥' },
            { key: 'rewards', label: 'Recompensas', icon: '🎁' },
            { key: 'transactions', label: 'Transações', icon: '📊' },
            { key: 'coupons', label: 'Cupons', icon: '🎟️' },
            { key: 'ai', label: 'IA Insights', icon: '🤖' },
            { key: 'program', label: 'Programa', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedTab === tab.key
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedTab === 'customers' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <input
                type="text"
                placeholder="Buscar por nome, email, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {customer.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {customer.email}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTierColor(customer.tier)}`}>
                      {getTierName(customer.tier)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pontos</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {customer.points.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Gasto</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Última Visita</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(customer.lastVisit)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {customer.totalOrders} pedidos
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add points action
                        }}
                        className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                      >
                        + Adicionar Pontos
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selectedTab === 'rewards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map(reward => (
              <div
                key={reward.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedReward(reward);
                  setShowRewardModal(true);
                }}
              >
                {/* Reward Image Placeholder */}
                <div className="h-32 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-4xl">
                    {reward.category === 'discount' ? '🏷️' :
                     reward.category === 'product' ? '🍽️' :
                     reward.category === 'experience' ? '✨' : '🎂'}
                  </span>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {reward.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {reward.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {reward.pointsCost}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">pontos</span>
                    </div>
                    {reward.stock !== undefined && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {reward.stock} disponíveis
                      </span>
                    )}
                  </div>
                  
                  {reward.validUntil && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Válido até {formatDate(reward.validUntil)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedTab === 'transactions' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Histórico de Transações
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map(transaction => {
                const customer = customers.find(c => c.id === transaction.customerId);
                return (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {customer?.name} • {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-lg font-bold ${
                        transaction.points > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {selectedTab === 'program' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {loyaltyProgram.name}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Configurações Gerais
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pontos por R$</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {loyaltyProgram.pointsPerCurrency} pontos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Bônus de Boas-vindas</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {loyaltyProgram.welcomeBonus} pontos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Bônus de Aniversário</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {loyaltyProgram.birthdayBonus} pontos
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Bônus por Indicação</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {loyaltyProgram.referralBonus} pontos
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                    Níveis do Programa
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(loyaltyProgram.tiers).map(([tier, config]) => (
                      <div key={tier} className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTierColor(tier as any)}`}>
                          {getTierName(tier as any)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {config.min}+ pts • {config.multiplier}x pontos
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tier Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(loyaltyProgram.tiers).map(([tier, config]) => (
                <div key={tier} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                  <div className={`inline-block px-3 py-1 text-sm font-medium rounded-full mb-3 ${getTierColor(tier as any)}`}>
                    {getTierName(tier as any)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    A partir de {config.min} pontos
                  </p>
                  <ul className="space-y-1">
                    {config.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {selectedTab === 'coupons' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Gerenciar Cupons
              </h2>
              <button
                onClick={() => {
                  setSelectedCoupon(null);
                  setCouponForm({
                    code: '',
                    description: '',
                    discount_type: 'percentage',
                    discount_value: 0,
                    min_purchase: 0,
                    max_discount: 0,
                    valid_from: new Date().toISOString().split('T')[0],
                    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    usage_limit: 0,
                    per_customer_limit: 0
                  });
                  setShowCouponModal(true);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <span>➕</span> Novo Cupom
              </button>
            </div>

            {/* Coupons Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total de Cupons</span>
                  <span className="text-blue-500">🎟️</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getCouponStats().total}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cupons Ativos</span>
                  <span className="text-green-500">✅</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getCouponStats().active}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Uso Total</span>
                  <span className="text-purple-500">📊</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getCouponStats().totalUsage}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Média de Uso</span>
                  <span className="text-yellow-500">📈</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getCouponStats().averageUsage.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Coupons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map(coupon => {
                const isExpired = new Date(coupon.valid_until) < new Date();
                const usagePercent = coupon.usage_limit ? (coupon.usage_count / coupon.usage_limit) * 100 : 0;
                
                return (
                  <div
                    key={coupon.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {coupon.code}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {coupon.description}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        coupon.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {isExpired ? 'Expirado' : coupon.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` :
                           coupon.discount_type === 'fixed' ? formatCurrency(coupon.discount_value) :
                           coupon.discount_type === 'shipping' ? 'Frete Grátis' : 'Produto'}
                        </span>
                      </div>
                      
                      {coupon.min_purchase > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Compra Mínima:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(coupon.min_purchase)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Válido até:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      {coupon.usage_limit && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Uso:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {coupon.usage_count} / {coupon.usage_limit}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                usagePercent >= 90 ? 'bg-red-500' :
                                usagePercent >= 70 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setCouponForm({
                            code: coupon.code,
                            description: coupon.description,
                            discount_type: coupon.discount_type,
                            discount_value: coupon.discount_value,
                            min_purchase: coupon.min_purchase || 0,
                            max_discount: coupon.max_discount || 0,
                            valid_from: coupon.valid_from.split('T')[0],
                            valid_until: coupon.valid_until.split('T')[0],
                            usage_limit: coupon.usage_limit || 0,
                            per_customer_limit: coupon.per_customer_limit || 0
                          });
                          setShowCouponModal(true);
                        }}
                        className="flex-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Confirma a exclusão deste cupom?')) {
                            deleteCoupon(coupon.id);
                          }
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Tab */}
        {selectedTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Inteligência Artificial & Insights
              </h2>
              <button
                onClick={() => optimizeLoyaltyProgram()}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                disabled={loadingAI}
              >
                <span>🤖</span> Otimizar Programa
              </button>
            </div>

            {/* Selected Customer Indicator */}
            {selectedCustomer && (
              <div className="bg-purple-50 dark:bg-purple-900 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Cliente Selecionado</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedCustomer.tier} • {selectedCustomer.points} pontos
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700"
                  >
                    Trocar Cliente
                  </button>
                </div>
              </div>
            )}

            {!selectedCustomer && (
              <div className="bg-yellow-50 dark:bg-yellow-900 rounded-xl p-4 mb-4">
                <p className="text-yellow-700 dark:text-yellow-300">
                  ⚠️ Selecione um cliente na aba "Clientes" para usar as análises de IA personalizadas
                </p>
              </div>
            )}

            {/* AI Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => getCampaignRecommendations()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left"
                disabled={loadingAI}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">📣</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    IA
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Campanhas Sugeridas
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Obtenha sugestões de campanhas personalizadas baseadas em dados
                </p>
              </button>
              
              <button
                onClick={async () => {
                  if (selectedCustomer) {
                    await getCustomerInsights(selectedCustomer.id);
                    setShowAIInsightModal(true);
                  } else {
                    warning('Selecione um cliente primeiro na aba "Clientes"');
                  }
                }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left"
                disabled={loadingAI}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🔮</span>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                    IA
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Análise de Cliente
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Preveja comportamento e risco de perda com IA
                </p>
              </button>
              
              <button
                onClick={async () => {
                  if (selectedCustomer) {
                    await getProductRecommendations(selectedCustomer.id);
                  } else {
                    warning('Selecione um cliente primeiro na aba "Clientes"');
                  }
                }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all text-left"
                disabled={loadingAI}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🎯</span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                    IA
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Recomendações
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Produtos recomendados por IA para cada cliente
                </p>
              </button>
            </div>

            {/* Campaign Recommendations */}
            {campaigns.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
                  Campanhas Recomendadas pela IA
                </h3>
                <div className="space-y-4">
                  {campaigns.map((campaign, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {campaign.campaign_type}
                        </h4>
                        <span className="text-sm px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                          ROI: {campaign.expected_roi.toFixed(1)}x
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Segmento: {campaign.target_segment}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Desconto: {campaign.recommended_discount}% | Timing: {campaign.optimal_timing}
                      </p>
                      <p className="text-sm italic text-gray-500 dark:text-gray-500">
                        "{campaign.message_template}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
                  Produtos Recomendados pela IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {rec.product_name}
                        </h4>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {(rec.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {rec.category}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        {rec.reason}
                      </p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Impacto: +{formatCurrency(rec.expected_revenue_impact)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimization Suggestions */}
            {optimization && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">
                  Otimizações Sugeridas pela IA
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Eficiência Atual do Programa</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(optimization.current_program_efficiency * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${optimization.current_program_efficiency * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                    <p className="text-sm text-green-600 dark:text-green-400">Crescimento Projetado de Membros</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      +{(optimization.projected_member_growth * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Aumento Projetado de Receita</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      +{(optimization.projected_revenue_increase * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Mudanças Recomendadas:</h4>
                  {optimization.recommended_changes.map((change, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {change.parameter}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          De {change.current_value} para {change.recommended_value}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {change.expected_impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cliente desde {formatDate(selectedCustomer.registeredAt)}
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Saldo de Pontos</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {selectedCustomer.points.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className={`px-4 py-2 text-sm font-medium rounded-full ${getTierColor(selectedCustomer.tier)}`}>
                    {getTierName(selectedCustomer.tier)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefone
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CPF
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedCustomer.document}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data de Nascimento
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedCustomer.birthDate ? formatDate(selectedCustomer.birthDate) : '-'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Gasto</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(selectedCustomer.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pedidos</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedCustomer.totalOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Última Visita</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(selectedCustomer.lastVisit)}
                    </p>
                  </div>
                </div>
                
                {selectedCustomer.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observações
                    </label>
                    <p className="text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg">
                      {selectedCustomer.notes}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setShowAddPointsModal(true);
                      setPointsAmount(0);
                      setPointsDescription('');
                    }}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    Adicionar Pontos
                  </button>
                  <button 
                    onClick={() => {
                      setShowRedeemPointsModal(true);
                      setPointsAmount(0);
                      setPointsDescription('');
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    Resgatar Recompensa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reward Details Modal */}
      {showRewardModal && selectedReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedReward.name}
                </h2>
                <button
                  onClick={() => setShowRewardModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedReward.description}
                </p>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600 dark:text-blue-400">Custo em Pontos</span>
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {selectedReward.pointsCost}
                    </span>
                  </div>
                </div>
                
                {selectedReward.terms && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedReward.terms}
                    </p>
                  </div>
                )}
                
                <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors">
                  Aplicar Recompensa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Novo Cliente
                </h2>
                <button
                  onClick={() => {
                    setShowCreateCustomerModal(false);
                    setNewCustomerForm({
                      name: '',
                      email: '',
                      phone: '',
                      document: '',
                      birthDate: ''
                    });
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="João da Silva"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="joao@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="(11) 98765-4321"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.document}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, document: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="123.456.789-00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={newCustomerForm.birthDate}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateCustomerModal(false);
                      setNewCustomerForm({
                        name: '',
                        email: '',
                        phone: '',
                        document: '',
                        birthDate: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!newCustomerForm.name || !newCustomerForm.email || !newCustomerForm.phone) {
                        warning('Por favor, preencha todos os campos obrigatórios');
                        return;
                      }
                      
                      const result = await createCustomer({
                        name: newCustomerForm.name,
                        email: newCustomerForm.email,
                        phone: newCustomerForm.phone,
                        document: newCustomerForm.document || undefined,
                        birth_date: newCustomerForm.birthDate || undefined
                      });
                      
                      if (result) {
                        success('Cliente criado com sucesso! Bônus de boas-vindas aplicado.');
                        setShowCreateCustomerModal(false);
                        setNewCustomerForm({
                          name: '',
                          email: '',
                          phone: '',
                          document: '',
                          birthDate: ''
                        });
                        loadCustomers(); // Refresh the customer list
                      } else {
                        error('Erro ao criar cliente. Tente novamente.');
                      }
                    }}
                    disabled={creating || !newCustomerForm.name || !newCustomerForm.email || !newCustomerForm.phone}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Criando...' : 'Criar Cliente'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                </h2>
                <button
                  onClick={() => {
                    setShowCouponModal(false);
                    setSelectedCoupon(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código do Cupom *
                  </label>
                  <input
                    type="text"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: PROMO10"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Desconto de 10% na primeira compra"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Desconto
                  </label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Porcentagem</option>
                    <option value="fixed">Valor Fixo</option>
                    <option value="shipping">Frete Grátis</option>
                    <option value="product">Produto</option>
                  </select>
                </div>
                
                {(couponForm.discount_type === 'percentage' || couponForm.discount_type === 'fixed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Valor do Desconto
                    </label>
                    <input
                      type="number"
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder={couponForm.discount_type === 'percentage' ? '10' : '15.00'}
                      step={couponForm.discount_type === 'percentage' ? '1' : '0.01'}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Compra Mínima
                  </label>
                  <input
                    type="number"
                    value={couponForm.min_purchase}
                    onChange={(e) => setCouponForm({ ...couponForm, min_purchase: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                
                {couponForm.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Desconto Máximo
                    </label>
                    <input
                      type="number"
                      value={couponForm.max_discount}
                      onChange={(e) => setCouponForm({ ...couponForm, max_discount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Válido De
                    </label>
                    <input
                      type="date"
                      value={couponForm.valid_from}
                      onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Válido Até
                    </label>
                    <input
                      type="date"
                      value={couponForm.valid_until}
                      onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Limite de Uso Total
                    </label>
                    <input
                      type="number"
                      value={couponForm.usage_limit}
                      onChange={(e) => setCouponForm({ ...couponForm, usage_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0 = ilimitado"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Limite por Cliente
                    </label>
                    <input
                      type="number"
                      value={couponForm.per_customer_limit}
                      onChange={(e) => setCouponForm({ ...couponForm, per_customer_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0 = ilimitado"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCouponModal(false);
                      setSelectedCoupon(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        if (selectedCoupon) {
                          await updateCoupon(selectedCoupon.id, couponForm);
                        } else {
                          await createCoupon(couponForm);
                        }
                        setShowCouponModal(false);
                        setSelectedCoupon(null);
                      } catch (err) {
                        // Error handled in hook
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {selectedCoupon ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Insight Modal */}
      {showAIInsightModal && customerInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Análise IA do Cliente
                </h2>
                <button
                  onClick={() => setShowAIInsightModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Churn Risk */}
                <div className={`p-4 rounded-lg ${
                  customerInsight.churn_risk === 'high' ? 'bg-red-50 dark:bg-red-900' :
                  customerInsight.churn_risk === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900' :
                  'bg-green-50 dark:bg-green-900'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Risco de Perda
                    </h3>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      customerInsight.churn_risk === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300' :
                      customerInsight.churn_risk === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300' :
                      'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300'
                    }`}>
                      {customerInsight.churn_risk === 'high' ? 'Alto' :
                       customerInsight.churn_risk === 'medium' ? 'Médio' : 'Baixo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Probabilidade: {(customerInsight.churn_probability * 100).toFixed(0)}%
                  </p>
                </div>
                
                {/* Recommended Actions */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Ações Recomendadas
                  </h3>
                  <ul className="space-y-2">
                    {customerInsight.recommended_actions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Predictions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                      Próxima Compra
                    </h4>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {customerInsight.next_purchase_prediction.days_until} dias
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {customerInsight.next_purchase_prediction.likely_categories.join(', ')}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
                      Valor Vitalício
                    </h4>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {formatCurrency(customerInsight.predicted_lifetime_value)}
                    </p>
                  </div>
                </div>
                
                {/* Segment */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Segmento:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {customerInsight.segment}
                    </span>
                  </div>
                </div>
                
                {/* Generate Offer Button */}
                <button
                  onClick={async () => {
                    if (selectedCustomer) {
                      await generatePersonalizedOffer(selectedCustomer.id);
                      setShowAIInsightModal(false);
                    }
                  }}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Gerar Oferta Personalizada com IA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {showAddPointsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Adicionar Pontos
                </h2>
                <button
                  onClick={() => setShowAddPointsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Cliente</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Saldo Atual: {selectedCustomer.points} pontos
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade de Pontos
                  </label>
                  <input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="100"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={pointsDescription}
                    onChange={(e) => setPointsDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Compra #1234, Bonificação, etc"
                  />
                </div>
                
                <div className="bg-green-50 dark:bg-green-900 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">Novo Saldo</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    {selectedCustomer.points + pointsAmount} pontos
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddPointsModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (pointsAmount > 0) {
                        await addPoints(
                          selectedCustomer.id,
                          pointsAmount,
                          pointsDescription || 'Adição manual de pontos'
                        );
                        setShowAddPointsModal(false);
                        // Update customer points locally
                        setSelectedCustomer({
                          ...selectedCustomer,
                          points: selectedCustomer.points + pointsAmount
                        });
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    disabled={pointsAmount <= 0 || loadingLoyalty}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Redeem Points Modal */}
      {showRedeemPointsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Resgatar Pontos
                </h2>
                <button
                  onClick={() => setShowRedeemPointsModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400">Cliente</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Saldo Atual: {selectedCustomer.points} pontos
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecione uma Recompensa
                  </label>
                  <div className="space-y-2">
                    {rewards.map(reward => (
                      <button
                        key={reward.id}
                        onClick={() => {
                          setSelectedReward(reward);
                          setPointsAmount(reward.pointsCost);
                          setPointsDescription(reward.name);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedReward?.id === reward.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        } ${selectedCustomer.points < reward.pointsCost ? 'opacity-50' : ''}`}
                        disabled={selectedCustomer.points < reward.pointsCost}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {reward.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {reward.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                              {reward.pointsCost} pts
                            </p>
                            {reward.stock && (
                              <p className="text-xs text-gray-500">
                                Estoque: {reward.stock}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {selectedReward && selectedCustomer.points >= selectedReward.pointsCost && (
                  <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-3">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Novo Saldo</p>
                    <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                      {selectedCustomer.points - selectedReward.pointsCost} pontos
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRedeemPointsModal(false);
                      setSelectedReward(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (selectedReward) {
                        await redeemPoints(
                          selectedCustomer.id,
                          selectedReward.pointsCost,
                          selectedReward.id,
                          selectedReward.name
                        );
                        setShowRedeemPointsModal(false);
                        // Update customer points locally
                        setSelectedCustomer({
                          ...selectedCustomer,
                          points: selectedCustomer.points - selectedReward.pointsCost
                        });
                        setSelectedReward(null);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    disabled={!selectedReward || selectedCustomer.points < (selectedReward?.pointsCost || 0) || loadingLoyalty}
                  >
                    Resgatar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  );
}