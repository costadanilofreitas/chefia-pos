/**
 * POSMainPage Final Version
 * Combinando o melhor do Design System + PostCSS/Tailwind
 * Esta é a versão definitiva para produção
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../hooks/useAuth';
import { useProduct } from '../hooks/useProduct';
import '../index.css'; // Importa PostCSS/Tailwind via index.css

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  modifiers?: Array<{ name: string; price: number }>;
  notes?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  action: () => void;
  variant: 'primary' | 'success' | 'warning' | 'danger';
}

// Constantes de configuração
const SOUND_ENABLED = true;
const ANIMATION_DURATION = 150; // ms
const MIN_STOCK_WARNING = 10;
const SEARCH_DEBOUNCE = 300; // ms

export default function POSMainPageFinal() {
  const { terminalId } = useParams();
  const { user } = useAuth();
  const { products: backendProducts, categories: backendCategories, loading } = useProduct();
  
  // ========== State Management ==========
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // ========== Refs ==========
  const searchRef = useRef<HTMLInputElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Audio feedback refs
  const audioRefs = useRef({
    success: typeof window !== 'undefined' ? new Audio('/sounds/success.mp3') : null,
    error: typeof window !== 'undefined' ? new Audio('/sounds/error.mp3') : null,
    click: typeof window !== 'undefined' ? new Audio('/sounds/click.mp3') : null,
  });


  // ========== Memoized Data ==========
  const products = useMemo(() => backendProducts || [], [backendProducts]);
  
  const categories = useMemo(() => {
    const cats = backendCategories || [];
    return [
      { id: 'all', name: 'Todos', icon: '🍽️', color: 'slate' },
      ...cats.map(cat => ({
        ...cat,
        icon: cat.icon || '📦',
        color: cat.color || 'primary'
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
    }, SEARCH_DEBOUNCE);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      const searchLower = debouncedSearchTerm.toLowerCase();
      const matchesSearch = debouncedSearchTerm === '' || 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch && product.is_available;
    });
  }, [products, selectedCategory, debouncedSearchTerm]);

  // Cart calculations
  const { cartTotal, cartItemsCount, cartDiscount } = useMemo(() => {
    const itemsCount = cart.reduce((count, item) => count + item.quantity, 0);
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const discount = 0; // TODO: Implement discount logic
    return {
      cartTotal: subtotal - discount,
      cartItemsCount: itemsCount,
      cartDiscount: discount
    };
  }, [cart]);

  // ========== Quick Actions Configuration ==========
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'pay',
      label: 'Pagar',
      icon: <PaymentIcon />,
      shortcut: 'F12',
      action: () => handleQuickPay(),
      variant: 'success'
    },
    {
      id: 'clear',
      label: 'Limpar',
      icon: <TrashIcon />,
      shortcut: 'F9',
      action: () => clearCart(),
      variant: 'danger'
    },
    {
      id: 'search',
      label: 'Buscar',
      icon: <SearchIcon />,
      shortcut: 'F3',
      action: () => searchRef.current?.focus(),
      variant: 'primary'
    },
    {
      id: 'discount',
      label: 'Desconto',
      icon: <DiscountIcon />,
      shortcut: 'F5',
      action: () => applyDiscount(),
      variant: 'warning'
    }
  ], [cart]);

  // ========== Keyboard Shortcuts ==========
  useHotkeys('f12', () => handleQuickPay(), { preventDefault: true });
  useHotkeys('f9', () => clearCart(), { preventDefault: true });
  useHotkeys('f3', () => searchRef.current?.focus(), { preventDefault: true });
  useHotkeys('f5', () => applyDiscount(), { preventDefault: true });
  useHotkeys('esc', () => setSearchTerm(''), { preventDefault: true });
  useHotkeys('ctrl+z', () => undoLastAction(), { preventDefault: true });
  useHotkeys('ctrl+p', () => printReceipt(), { preventDefault: true });
  
  // Number keys for quick quantity
  useHotkeys('1,2,3,4,5,6,7,8,9', (e) => {
    if (selectedProduct && !searchRef.current?.matches(':focus')) {
      const quantity = parseInt(e.key);
      addToCart(selectedProduct, quantity);
      playSound('success');
    }
  });

  // ========== Lifecycle & Effects ==========

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`pos-cart-${terminalId}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
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
    playSound('click');
    
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
    
    // Visual feedback
    animateProductAdd(product.id);
  }, []);

  const updateCartItemQuantity = useCallback((itemId: string, delta: number) => {
    playSound('click');
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, Math.min(99, item.quantity + delta));
          if (newQuantity === 0) return null;
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    playSound('error');
    
    // Animate removal
    const element = document.getElementById(`cart-item-${itemId}`);
    if (element) {
      element.classList.add('animate-slide-out');
      setTimeout(() => {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
      }, 200);
    } else {
      setCart(prevCart => prevCart.filter(item => item.id !== itemId));
    }
  }, []);

  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    
    if (window.confirm('Tem certeza que deseja limpar o carrinho?')) {
      playSound('error');
      
      // Animate all items out
      document.querySelectorAll('[id^="cart-item-"]').forEach((element, index) => {
        setTimeout(() => {
          element.classList.add('animate-slide-out');
        }, index * 50);
      });
      
      setTimeout(() => {
        setCart([]);
      }, 300);
    }
  }, [cart]);

  // ========== Payment & Actions ==========
  
  const handleQuickPay = useCallback(async () => {
    if (cart.length === 0) {
      playSound('error');
      showToast('Carrinho vazio', 'error');
      return;
    }
    
    setIsProcessingPayment(true);
    playSound('success');
    
    try {
      // TODO: Implement actual payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowQuickPay(true);
      // Navigate to payment or process payment
    } catch (error) {
      playSound('error');
      showToast('Erro ao processar pagamento', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  }, [cart]);

  const applyDiscount = useCallback(() => {
    playSound('click');
    // TODO: Open discount modal
    showToast('Função de desconto em desenvolvimento', 'info');
  }, []);

  const undoLastAction = useCallback(() => {
    // TODO: Implement undo functionality
    showToast('Desfazer última ação', 'info');
  }, []);

  const printReceipt = useCallback(() => {
    // TODO: Implement print functionality
    window.print();
  }, []);

  // ========== UI Helpers ==========

  const playSound = useCallback((type: 'success' | 'error' | 'click') => {
    if (!SOUND_ENABLED) return;
    
    try {
      const audio = audioRefs.current[type];
      if (audio) {
        audio.volume = 0.3;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  }, []);

  const animateProductAdd = (productId: string) => {
    const element = document.getElementById(`product-${productId}`);
    if (element) {
      element.classList.add('animate-pulse-once');
      setTimeout(() => {
        element.classList.remove('animate-pulse-once');
      }, ANIMATION_DURATION * 2);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // TODO: Implement toast notification
    console.log(`[${type}] ${message}`);
  };

  // Format currency - Brazilian Real
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  // ========== Render ==========
  
  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Categories Sidebar - Touch Optimized - Hidden on mobile, shown as horizontal scroll */}
      <aside className="w-full lg:w-24 bg-white dark:bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 flex flex-row lg:flex-col shadow-sm overflow-x-auto lg:overflow-x-visible">
        {/* Categories Navigation - Horizontal on mobile, vertical on desktop */}
        <nav className="flex lg:flex-1 flex-row lg:flex-col p-2 gap-2 lg:space-y-2 scrollbar-thin">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                playSound('click');
              }}
              className={`
                min-w-[80px] lg:w-full h-16 lg:aspect-square flex flex-col items-center justify-center
                rounded-xl transition-all duration-150 cursor-pointer
                touch-manipulation relative overflow-hidden group
                ${selectedCategory === category.id 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg lg:scale-105' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                }
              `}
              aria-label={`Categoria ${category.name}`}
              aria-pressed={selectedCategory === category.id}
            >
              {/* Ripple Effect Container */}
              <span className="absolute inset-0 overflow-hidden rounded-xl">
                <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 transition-transform duration-300 rounded-full origin-center" />
              </span>
              
              {/* Category Content */}
              <span className="text-2xl mb-1 relative z-10" role="img" aria-label={category.name}>
                {category.icon}
              </span>
              <span className="text-xs font-medium truncate px-1 relative z-10">
                {category.name}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar - Glass Morphism Effect */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Search Bar - Prominent and Accessible */}
            <div className="flex-1 max-w-xl relative group">
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto... (F3)"
                className={`
                  w-full h-12 pl-12 pr-10
                  text-base lg:text-lg
                  bg-gray-100 dark:bg-gray-700
                  rounded-xl border-2 border-transparent
                  focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800
                  transition-all duration-150
                  placeholder-gray-400 dark:placeholder-gray-500
                `}
                aria-label="Buscar produtos"
                aria-describedby="search-hint"
              />
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              
              {/* Clear Search Button */}
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    searchRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-150"
                  aria-label="Limpar busca"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
              
              {/* Search Results Count */}
              {debouncedSearchTerm && (
                <span id="search-hint" className="sr-only">
                  {filteredProducts.length} produtos encontrados
                </span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="hidden lg:flex gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={isProcessingPayment}
                  className={`
                    px-4 py-2.5 min-w-[100px]
                    flex items-center justify-center gap-2
                    rounded-xl font-medium
                    transition-all duration-150
                    touch-manipulation relative overflow-hidden
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${getButtonVariantClasses(action.variant)}
                  `}
                  title={`${action.label} (${action.shortcut})`}
                  aria-label={action.label}
                >
                  <span className="w-5 h-5">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* User Info Badge */}
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-300 dark:border-gray-600">
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Terminal #{terminalId}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.username || 'Operador'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                {user?.username?.charAt(0) || 'O'}
              </div>
            </div>
          </div>

          {/* Mobile Quick Actions */}
          <div className="flex lg:hidden gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                disabled={isProcessingPayment}
                className={`
                  flex-1 py-2 px-3
                  flex items-center justify-center gap-1
                  rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${getButtonVariantClasses(action.variant)}
                `}
                aria-label={action.label}
              >
                <span className="w-4 h-4">{action.icon}</span>
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Products and Cart Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Products Grid Area */}
          <section className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {loading ? (
              <ProductsLoading />
            ) : filteredProducts.length === 0 ? (
              <EmptyProducts searchTerm={debouncedSearchTerm} onClearSearch={() => setSearchTerm('')} />
            ) : (
              <div 
                ref={productGridRef}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4"
                role="grid"
                aria-label="Grade de produtos"
              >
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onAdd={() => addToCart(product)}
                    onHover={() => setSelectedProduct(product)}
                    onLeave={() => setSelectedProduct(null)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Cart Sidebar - Hidden on mobile, shown as floating button */}
          <aside className="hidden lg:flex w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col shadow-xl">
            <CartSidebar
              cart={cart}
              cartTotal={cartTotal}
              cartItemsCount={cartItemsCount}
              cartDiscount={cartDiscount}
              formatCurrency={formatCurrency}
              updateQuantity={updateCartItemQuantity}
              removeItem={removeFromCart}
              onCheckout={handleQuickPay}
              isProcessing={isProcessingPayment}
            />
          </aside>
        </div>
      </main>

      {/* Keyboard Shortcuts Help - Floating Card */}
      <KeyboardShortcutsHelp />
      
      {/* Mobile Cart Button - Floating */}
      {cart.length > 0 && (
        <button
          className="lg:hidden fixed bottom-20 right-4 z-30 bg-green-500 text-white rounded-full p-4 shadow-2xl flex items-center gap-2"
          onClick={() => handleQuickPay()}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs absolute -top-2 -right-2">
            {cartItemsCount}
          </span>
          <span className="font-bold">{formatCurrency(cartTotal)}</span>
        </button>
      )}
      
      {/* Toast Container */}
      <div id="toast-container" className="fixed bottom-4 right-4 z-50" />
    </div>
  );
}

// ========== Sub-components ==========

const ProductCard = ({ product, index, onAdd, onHover, onLeave, formatCurrency }) => (
  <article
    id={`product-${product.id}`}
    className={`
      bg-white dark:bg-gray-800 rounded-xl shadow-sm
      hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
      cursor-pointer overflow-hidden
      transition-all duration-150
      flex flex-col group
      touch-manipulation relative
    `}
    onClick={onAdd}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    tabIndex={0}
    role="gridcell"
    aria-label={`${product.name} - ${formatCurrency(product.price)}`}
    style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
  >
    {/* Stock Warning Badge */}
    {product.stock_quantity && product.stock_quantity < MIN_STOCK_WARNING && (
      <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg shadow-md">
        Últimas {product.stock_quantity}
      </div>
    )}
    
    {/* Product Image */}
    <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
      {product.image ? (
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-4xl opacity-30">🍽️</span>
        </div>
      )}
      
      {/* Quick Add Overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-200">
          <PlusIcon className="w-6 h-6 text-gray-900" />
        </div>
      </div>
    </div>
    
    {/* Product Info */}
    <div className="p-3 flex-1 flex flex-col">
      <h3 className="font-medium text-sm lg:text-base text-gray-900 dark:text-gray-100 line-clamp-2">
        {product.name}
      </h3>
      {product.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
          {product.description}
        </p>
      )}
      <div className="mt-auto pt-2">
        <span className="text-lg lg:text-xl font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(product.price)}
        </span>
      </div>
    </div>
  </article>
);

const CartSidebar = ({ 
  cart, 
  cartTotal, 
  cartItemsCount, 
  cartDiscount,
  formatCurrency, 
  updateQuantity, 
  removeItem, 
  onCheckout,
  isProcessing 
}) => (
  <>
    {/* Cart Header */}
    <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Carrinho</h2>
          <p className="text-sm opacity-90">
            {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <div className="text-right">
          {cartDiscount > 0 && (
            <div className="text-xs opacity-90 line-through">
              {formatCurrency(cartTotal + cartDiscount)}
            </div>
          )}
          <div className="text-2xl font-bold">{formatCurrency(cartTotal)}</div>
        </div>
      </div>
    </div>

    {/* Cart Items */}
    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
      {cart.length === 0 ? (
        <EmptyCart />
      ) : (
        cart.map((item, index) => (
          <CartItem
            key={item.id}
            item={item}
            index={index}
            formatCurrency={formatCurrency}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
          />
        ))
      )}
    </div>

    {/* Checkout Actions */}
    {cart.length > 0 && (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={onCheckout}
          disabled={isProcessing}
          className={`
            w-full py-3 px-4 mb-3
            bg-gradient-to-r from-green-500 to-green-600
            hover:from-green-600 hover:to-green-700
            text-white text-lg font-semibold
            rounded-xl shadow-lg
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            relative overflow-hidden group
          `}
          aria-label="Finalizar venda"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner />
              Processando...
            </span>
          ) : (
            <>
              <span>💳 Finalizar Venda (F12)</span>
              <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 transition-transform duration-300 rounded-full" />
            </>
          )}
        </button>
        
        {/* Payment Method Quick Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button className="py-2 px-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-150 font-medium text-sm">
            💵 Dinheiro
          </button>
          <button className="py-2 px-3 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-150 font-medium text-sm">
            💳 Cartão
          </button>
          <button className="py-2 px-3 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors duration-150 font-medium text-sm">
            📱 PIX
          </button>
          <button className="py-2 px-3 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors duration-150 font-medium text-sm">
            🎟️ Vale
          </button>
        </div>
      </div>
    )}
  </>
);

const CartItem = ({ item, index, formatCurrency, updateQuantity, removeItem }) => (
  <div
    id={`cart-item-${item.id}`}
    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 transition-all duration-150 hover:shadow-md animate-slide-in-right"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <div className="flex items-center gap-3">
      {/* Item Image */}
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-600">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl opacity-50">🍽️</span>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {item.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatCurrency(item.price)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(item.id, -1);
          }}
          className="w-7 h-7 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 flex items-center justify-center transition-colors duration-150"
          aria-label="Diminuir quantidade"
        >
          <MinusIcon className="w-4 h-4" />
        </button>
        <span className="w-8 text-center font-semibold text-sm">
          {item.quantity}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(item.id, 1);
          }}
          className="w-7 h-7 rounded-lg bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 flex items-center justify-center transition-colors duration-150"
          aria-label="Aumentar quantidade"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Total and Remove */}
      <div className="text-right">
        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {formatCurrency(item.price * item.quantity)}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeItem(item.id);
          }}
          className="text-xs text-red-500 hover:text-red-600 transition-colors duration-150"
          aria-label="Remover item"
        >
          Remover
        </button>
      </div>
    </div>
  </div>
);

const EmptyCart = () => (
  <div className="flex flex-col items-center justify-center h-full text-center py-8">
    <div className="w-20 h-20 mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
      <span className="text-4xl opacity-50">🛒</span>
    </div>
    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
      Carrinho vazio
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
      Adicione produtos para começar
    </p>
  </div>
);

const EmptyProducts = ({ searchTerm, onClearSearch }) => (
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
          onClick={onClearSearch}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-150"
        >
          Limpar busca
        </button>
      </>
    )}
  </div>
);

const ProductsLoading = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="p-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const KeyboardShortcutsHelp = () => (
  <div className="fixed bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-xl p-3 text-xs opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 max-w-xs">
    <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">
      Atalhos de Teclado:
    </div>
    <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
      <div>F3 - Buscar | F5 - Desconto | F9 - Limpar</div>
      <div>F12 - Pagar | Ctrl+D - Tema | Ctrl+Z - Desfazer</div>
      <div>1-9 - Quantidade rápida | ESC - Limpar busca</div>
    </div>
  </div>
);

// ========== Helper Functions ==========

const getButtonVariantClasses = (variant: string) => {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };
  return variants[variant] || variants.primary;
};

// ========== Icons Components ==========

const SearchIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PaymentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DiscountIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const MinusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ========== Custom Styles (if needed) ==========
const customStyles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-out {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes pulse-once {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
  
  .animate-slide-out {
    animation: slide-out 0.2s ease-out;
  }
  
  .animate-pulse-once {
    animation: pulse-once 0.3s ease-in-out;
  }
  
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.7);
  }
  
  .dark .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(75, 85, 99, 0.5);
  }
  
  .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: rgba(75, 85, 99, 0.7);
  }
  
  .touch-manipulation {
    touch-action: manipulation;
  }
`;
