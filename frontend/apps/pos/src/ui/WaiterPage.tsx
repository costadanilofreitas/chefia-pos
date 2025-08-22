import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/useProduct';
import { useOrder } from '../hooks/useOrder';
import { Order, OrderCreate, OrderUpdate, OrderType, OrderStatus } from '../types/order';
import { Product, ProductCategory } from '../services/ProductService';
import Toast, { useToast } from '../components/Toast';
import '../index.css';

interface TableOrder {
  id: string;
  tableId: string;
  tableName: string;
  waiterId: string;
  waiterName: string;
  customers: number;
  status: 'open' | 'ordering' | 'preparing' | 'served' | 'payment' | 'closed';
  items: OrderItem[];
  subtotal: number;
  serviceCharge: number;
  discount: number;
  total: number;
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  notes?: string;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  orderedAt: Date;
  servedAt?: Date;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  products?: Product[];
}

// Using the Product interface from ProductService with extended properties
interface ExtendedProduct extends Omit<Product, 'status'> {
  available?: boolean;
  preparationTime?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  modifiers?: Array<{
    id: string;
    name: string;
    options: Array<{
      name: string;
      price: number;
    }>;
  }>;
}

export default function WaiterPage() {
  const navigate = useNavigate();
  const { terminalId, tableId } = useParams();
  const { user } = useAuth();
  const { products, categories: backendCategories, loading: productsLoading } = useProduct();
  const { orders, createOrder, updateOrder, loading: ordersLoading } = useOrder();
  const { toasts, removeToast, success, error, warning, info } = useToast();
  const [selectedTab, setSelectedTab] = useState<'order' | 'items' | 'payment'>('order');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentOrder, setCurrentOrder] = useState<TableOrder | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ExtendedProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Transform backend categories for display with icons
  const categoriesWithIcons = backendCategories?.map(cat => ({
    ...cat,
    icon: cat.icon || 
      (cat.name?.toLowerCase().includes('entrada') ? '🥗' :
       cat.name?.toLowerCase().includes('prato') ? '🍽️' :
       cat.name?.toLowerCase().includes('bebida') ? '🥤' :
       cat.name?.toLowerCase().includes('sobremesa') ? '🍰' : '📦'),
    color: cat.color || 'bg-blue-500'
  })) || [];

  const categories = [
    { id: 'all', name: 'Todos', icon: '🍽️', color: 'bg-gray-500' },
    ...categoriesWithIcons
  ];

  useEffect(() => {
    if (!terminalId || !tableId || isNaN(Number(terminalId))) {
      navigate('/');
      return;
    }

    // Load current order for the table from existing orders
    const tableOrder = orders?.find(o => 
      o.table_id === tableId && 
      ['pending', 'preparing', 'ready'].includes(o.status)
    );

    if (tableOrder) {
      setCurrentOrder({
        id: tableOrder.id,
        tableId: tableOrder.table_id || tableId,
        tableName: `Mesa ${tableId}`,
        waiterId: tableOrder.waiter_id || user?.id || '1',
        waiterName: user?.name || 'Garçom',
        customers: 2, // Default value since customers not in Order interface
        status: 'open',
        items: tableOrder.items.map(item => ({
          id: item.id,
          productId: item.product_id,
          name: item.product_name,
          category: '',
          quantity: item.quantity,
          price: item.unit_price,
          status: 'pending' as const,
          notes: item.notes,
          orderedAt: new Date()
        })),
        subtotal: 0, // Calculate from items
        serviceCharge: 0,
        discount: 0,
        total: tableOrder.total || 0,
        openedAt: new Date(tableOrder.created_at || new Date())
      });
    } else {
      // Create new order for the table
      setCurrentOrder({
        id: `ORDER-${Date.now()}`,
        tableId: tableId,
        tableName: `Mesa ${tableId}`,
        waiterId: user?.id || '1',
        waiterName: user?.name || 'Garçom',
        customers: 2,
        status: 'open',
        items: [],
        subtotal: 0,
        serviceCharge: 0,
        discount: 0,
        total: 0,
        openedAt: new Date()
      });
    }
  }, [terminalId, tableId, navigate, user, orders]);

  // Keyboard shortcuts
  useHotkeys('alt+n', () => setSelectedTab('order'));
  useHotkeys('alt+i', () => setSelectedTab('items'));
  useHotkeys('alt+p', () => setSelectedTab('payment'));
  useHotkeys('esc', () => setShowProductModal(false));
  useHotkeys('enter', (e) => {
    if (showProductModal && selectedProduct) {
      e.preventDefault();
      handleAddToCart();
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: OrderItem['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-400';
      case 'confirmed': return 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400';
      case 'preparing': return 'text-orange-600 bg-orange-50 dark:bg-orange-900 dark:text-orange-400';
      case 'ready': return 'text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-400';
      case 'served': return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
      case 'cancelled': return 'text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusText = (status: OrderItem['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'served': return 'Servido';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      category: '',
      quantity: quantity,
      price: selectedProduct.price,
      status: 'pending',
      notes: notes,
      orderedAt: new Date()
    };

    setCart([...cart, newItem]);
    setShowProductModal(false);
    setSelectedProduct(null);
    setQuantity(1);
    setNotes('');
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleSendOrder = async () => {
    if (cart.length === 0) return;

    try {
      // Prepare order items
      const orderItems = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        notes: item.notes,
        modifiers: item.modifiers
      }));

      const orderTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      if (currentOrder && currentOrder.id.startsWith('ORDER-')) {
        // Create new order
        await createOrder({
          table_id: tableId,
          waiter_id: user?.id,
          items: orderItems,
          total_amount: orderTotal,
          order_type: OrderType.DINE_IN,
          status: OrderStatus.PENDING,
          source: 'pos'
        });
      } else if (currentOrder) {
        // Update existing order
        await updateOrder(currentOrder.id, {
          status: OrderStatus.PENDING
        });
      }

      setCart([]);
      success('Pedido enviado para a cozinha!');
    } catch (err) {
      error('Erro ao enviar pedido');
      console.error(err);
    }
  };

  const handleRequestBill = () => {
    if (currentOrder) {
      setCurrentOrder({ ...currentOrder, status: 'payment' });
      info('Conta solicitada! Aguardando impressão...');
    }
  };

  const handlePrintBill = () => {
    if (!currentOrder) {
      warning('Nenhum pedido para imprimir');
      return;
    }
    
    // Simular impressão
    info('Enviando conta para impressora...');
    setTimeout(() => {
      success('Conta impressa com sucesso!');
    }, 1500);
  };

  const handleFinalizePayment = () => {
    if (!currentOrder) {
      warning('Nenhum pedido para finalizar');
      return;
    }
    
    // Simular finalização
    info('Processando pagamento...');
    setTimeout(() => {
      success('Pagamento finalizado com sucesso!');
      setCurrentOrder({ ...currentOrder, status: 'closed', closedAt: new Date() });
      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate(`/pos/${terminalId}/tables`);
      }, 2000);
    }, 1500);
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products || []
    : products?.filter(p => p.category_id === selectedCategory) || [];

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white select-none">
              Mesa {tableId}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 select-none">
              Garçom: {user?.name || 'Não identificado'} • {currentOrder?.customers || 0} pessoas
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Order Status */}
            <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg font-medium text-sm">
              Mesa Aberta • {currentOrder && formatTime(currentOrder.openedAt)}
            </div>
            
            {/* Quick Actions */}
            <button
              onClick={handleRequestBill}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Solicitar Conta
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { key: 'order', label: 'Novo Pedido', icon: '➕' },
            { key: 'items', label: 'Itens da Mesa', icon: '📋' },
            { key: 'payment', label: 'Pagamento', icon: '💳' }
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
      <div className="flex-1 flex overflow-hidden">
        {selectedTab === 'order' && (
          <>
            {/* Products Section */}
            <div className="flex-1 overflow-auto p-6">
              {/* Category Filter */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Todos
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedCategory === category.id
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
              
              {/* Products Grid - Mobile optimized */}
              {productsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Carregando produtos...</p>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500 dark:text-gray-400">Nenhum produto disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product as ExtendedProduct);
                        setShowProductModal(true);
                      }}
                      disabled={!(product.is_available ?? true)}
                      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 lg:p-4 text-left hover:shadow-xl transition-all ${
                        !(product.is_available ?? true) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-20 lg:h-24 w-full object-cover rounded-lg mb-2 lg:mb-3"
                        />
                      ) : (
                        <div className="h-20 lg:h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg mb-2 lg:mb-3 flex items-center justify-center">
                          <span className="text-2xl lg:text-3xl">🍽️</span>
                        </div>
                      )}
                      <h3 className="font-medium text-sm lg:text-base text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 hidden lg:block">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm lg:text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(product.price)}
                        </span>
                        {/* Preparation time not available in current Product interface */}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cart Sidebar - Hidden on mobile, shown as bottom sheet */}
            <div className="hidden lg:flex w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 flex-col">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Carrinho
              </h2>
              
              <div className="flex-1 overflow-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Carrinho vazio
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Adicione itens para fazer o pedido
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </h4>
                            {item.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newQuantity = Math.max(1, item.quantity - 1);
                                const updatedCart = cart.map(cartItem => 
                                  cartItem.id === item.id 
                                    ? { ...cartItem, quantity: newQuantity }
                                    : cartItem
                                );
                                setCart(updatedCart);
                              }}
                              className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = Math.max(1, Math.min(99, parseInt(e.target.value) || 1));
                                const updatedCart = cart.map(cartItem => 
                                  cartItem.id === item.id 
                                    ? { ...cartItem, quantity: newQuantity }
                                    : cartItem
                                );
                                setCart(updatedCart);
                              }}
                              className="w-12 text-center text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <button
                              onClick={() => {
                                const newQuantity = Math.min(99, item.quantity + 1);
                                const updatedCart = cart.map(cartItem => 
                                  cartItem.id === item.id 
                                    ? { ...cartItem, quantity: newQuantity }
                                    : cartItem
                                );
                                setCart(updatedCart);
                              }}
                              className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-600 dark:text-gray-400 block">
                              {formatCurrency(item.price)} cada
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cart.length > 0 && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div className="flex justify-between text-lg font-medium">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSendOrder}
                    className="mt-4 w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Enviar Pedido
                  </button>
                </>
              )}
            </div>
          </>
        )}
        
        {selectedTab === 'items' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Itens Pedidos
                </h2>
              </div>
              
              {currentOrder && currentOrder.items.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentOrder.items.map(item => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-medium text-gray-900 dark:text-white">
                              {item.quantity}x
                            </span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.category} • {formatTime(item.orderedAt)}
                              </p>
                            </div>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-12">
                              Obs: {item.notes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum item pedido ainda
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {selectedTab === 'payment' && currentOrder && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Resumo da Conta
                </h2>
                
                <div className="space-y-3 mb-6">
                  {currentOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(currentOrder.subtotal)}
                    </span>
                  </div>
                  {currentOrder.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Serviço (10%)</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(currentOrder.serviceCharge)}
                      </span>
                    </div>
                  )}
                  {currentOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Desconto</span>
                      <span className="text-green-600 dark:text-green-400">
                        -{formatCurrency(currentOrder.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(currentOrder.total)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <button 
                    onClick={handleFinalizePayment}
                    className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    Finalizar Pagamento
                  </button>
                  <button 
                    onClick={handlePrintBill}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Imprimir Conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Cart Bottom Sheet */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl z-40">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Total ({cart.reduce((sum, item) => sum + item.quantity, 0)} itens)</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(cartTotal)}
                </p>
              </div>
              <button
                onClick={handleSendOrder}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                Enviar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Product Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedProduct.name}
                </h2>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedProduct.description}
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Sem cebola, bem passado..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(selectedProduct.price * quantity)}
                  </span>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  );
}