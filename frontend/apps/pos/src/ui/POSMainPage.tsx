/**
 * POSMainPage Final Version
 * Combinando o melhor do Design System + PostCSS/Tailwind
 * Esta é a versão definitiva para produção
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/useProduct';
import '../index.css'; // Importa PostCSS/Tailwind via index.css
import { formatCurrency } from '../utils/formatters';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  modifiers?: Array<{ name: string; price: number }>;
  notes?: string;
}

export default function POSMainPageFinal() {
  const { terminalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products: backendProducts, categories: backendCategories, loading } = useProduct();
  
  // ========== State Management ==========
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'local' | 'delivery' | 'takeout' | 'online'>('local');
  const [customerInfo, setCustomerInfo] = useState<{ name: string; phone: string; address?: string } | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  
  // ========== Refs ==========
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // ========== Memoized Data ==========
  const products = useMemo(() => backendProducts || [], [backendProducts]);
  
  const categories = useMemo(() => {
    const cats = backendCategories || [];
    return [
      { id: 'all', name: 'Todos', icon: '🍽️' },
      ...cats.map(cat => ({
        ...cat,
        icon: cat.icon || '📦',
        name: cat.name || 'Categoria'
      }))
    ];
  }, [backendCategories]);

  // Filtered products with debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      const matchesSearch = !debouncedSearchTerm || 
        product.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, debouncedSearchTerm]);

  // ========== Cart Calculations ==========
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Load cart from localStorage
  useEffect(() => {
    if (terminalId) {
      try {
        const savedCart = localStorage.getItem(`pos-cart-${terminalId}`);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error('Failed to load cart from storage');
      }
    }
  }, [terminalId]);

  // Save cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`pos-cart-${terminalId}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`pos-cart-${terminalId}`);
    }
  }, [cart, terminalId]);

  // ========== Cart Operations ==========
  const addToCart = useCallback((product: any, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        // Update existing item
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
            : item
        );
      }
      
      // Add new item
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: Math.min(quantity, 99),
        image: product.image || '/images/placeholder.png',
        modifiers: [],
        notes: ''
      }];
    });
  }, []);

  const updateCartItemQuantity = useCallback((itemId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, Math.min(99, item.quantity + delta));
          return newQuantity === 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // ========== Payment ==========
  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    
    // Create order object with all necessary data
    const order = {
      id: `ORDER-${Date.now()}`,
      items: cart,
      total: cartTotal,
      type: orderType,
      customer: customerInfo,
      status: 'pending'
    };
    
    // Navigate to payment screen with order data
    navigate(`/pos/${terminalId}/payment`, { 
      state: { order }
    });
  }, [cart, cartTotal, orderType, customerInfo, terminalId, navigate]);

  // ========== Keyboard Shortcuts ==========
  useHotkeys('f3', () => searchRef.current?.focus(), { preventDefault: true });
  useHotkeys('f9', () => clearCart(), { preventDefault: true });
  useHotkeys('f12', () => handleCheckout(), { preventDefault: true });
  useHotkeys('esc', () => setSearchTerm(''), { preventDefault: true });

  // ========== Render ==========
  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Categories Sidebar */}
        <aside className="w-full lg:w-24 bg-white dark:bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 flex flex-row lg:flex-col shadow-sm overflow-x-auto lg:overflow-x-visible">
          <nav className="flex lg:flex-1 flex-row lg:flex-col p-2 gap-2 lg:space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                min-w-[80px] lg:w-full h-16 lg:aspect-square flex flex-col items-center justify-center
                rounded-xl transition-all duration-150 cursor-pointer relative
                ${selectedCategory === category.id 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                }
              `}
            >
              <span className="text-2xl mb-1">{category.icon}</span>
              <span className="text-xs font-medium truncate px-1">
                {category.name}
              </span>
            </button>
          ))}
        </nav>
      </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header Bar with Search and Cart Title */}
          <header className="flex flex-col lg:flex-row bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Search Section */}
            <div className="flex-1 p-4">
            <div className="flex items-center gap-4">
              {/* Order Type Indicator - Only shows when not local */}
              {orderType !== 'local' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm">
                    {orderType === 'delivery' && '🛵'}
                    {orderType === 'takeout' && '🥡'}
                    {orderType === 'online' && '💻'}
                  </span>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {orderType === 'delivery' && 'Entrega'}
                    {orderType === 'takeout' && 'Retirada'}
                    {orderType === 'online' && 'Online'}
                  </span>
                </div>
              )}
              
              <div className="flex-1 max-w-xl relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produto... (F3)"
                  className="w-full h-12 pl-12 pr-10 text-base lg:text-lg bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-150 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      searchRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-150"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          
            {/* Cart Header Section - Hidden on mobile */}
            <div className="hidden lg:block w-80 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 border-l border-blue-400">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Carrinho</h2>
                  <p className="text-sm opacity-90">
                    {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(cartTotal)}
                </div>
              </div>
            </div>
          </header>

          {/* Products Grid and Cart */}
          <div className="flex-1 flex">
            {/* Products Area */}
            <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Carregando produtos...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-xl font-medium text-gray-600 dark:text-gray-400">
                  Nenhum produto encontrado
                </p>
                {searchTerm && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Não encontramos produtos para "{searchTerm}"
                    </p>
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-150"
                    >
                      Limpar busca
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transform hover:scale-105 transition-all duration-150 overflow-hidden group"
                  >
                    <div className="aspect-square bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm lg:text-base text-gray-900 dark:text-white truncate">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {product.description}
                        </p>
                      )}
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

            {/* Cart Sidebar - Hidden on mobile */}
            <aside className="hidden lg:flex w-80 flex-col bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            
            {/* Order Type Selector */}
            {cart.length > 0 && (
              <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-1">
                  {[
                    { type: 'local' as const, icon: '🍽️', label: 'Local' },
                    { type: 'delivery' as const, icon: '🛵', label: 'Entrega' },
                    { type: 'takeout' as const, icon: '🥡', label: 'Retirada' },
                    { type: 'online' as const, icon: '💻', label: 'Online' }
                  ].map(({ type, icon, label }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setOrderType(type);
                        if (type === 'delivery' || type === 'online') {
                          setShowCustomerDialog(true);
                        }
                      }}
                      className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-1 ${
                        orderType === type
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="text-sm">{icon}</span>
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Info or Alert */}
            {cart.length > 0 && (orderType === 'delivery' || orderType === 'online') && (
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                {customerInfo ? (
                  <button
                    onClick={() => setShowCustomerDialog(true)}
                    className="w-full flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                    <span className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium">
                      👤 {customerInfo.name} ✏️
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCustomerDialog(true)}
                    className="w-full py-1.5 px-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    ⚠️ Adicionar dados do cliente
                  </button>
                )}
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-800">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <div className="text-6xl mb-4">🛒</div>
                  <p>Carrinho vazio</p>
                  <p className="text-sm mt-2">Adicione produtos para começar</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.price)} cada
                        </p>
                        {item.notes && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remover item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 flex items-center justify-center transition-colors"
                          title="Diminuir quantidade"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-10 text-center font-medium text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItemQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 flex items-center justify-center transition-colors"
                          title="Aumentar quantidade"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg font-semibold rounded-xl shadow-lg transition-all duration-150"
                  >
                    Finalizar Pedido (F12)
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full mt-2 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    Limpar Carrinho (F9)
                  </button>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      {/* Mobile Cart Indicator/Button */}
      <div className="lg:hidden">
        {cart.length > 0 ? (
          /* Mobile Bottom Sheet - Shows when cart has items */
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl z-30">
            <div className="p-4">
              {/* Cart Summary */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total ({cartItemsCount} itens)</span>
                </div>
                <button 
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Limpar
                </button>
              </div>
              
              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3"
              >
                <span>Finalizar Pedido</span>
                <span className="text-xl font-bold">{formatCurrency(cartTotal)}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Cart Indicator */
          <div className="fixed bottom-4 right-4 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full p-3 shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Customer Dialog */}
      {showCustomerDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Dados do Cliente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={customerInfo?.name || ''}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value } as any)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={customerInfo?.phone || ''}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value } as any)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>
              {orderType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endereço
                  </label>
                  <textarea
                    value={customerInfo?.address || ''}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value } as any)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                    rows={3}
                    placeholder="Endereço completo"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCustomerDialog(false)}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowCustomerDialog(false)}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}