import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// import { useOrder } from '../hooks/useOrder';
import { useProduct } from '../hooks/useProduct';
// import { useCustomer } from '../hooks/useCustomer';
import { useToast } from '../components/Toast';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { SimpleTooltip } from '../components/Tooltip';
// Temporarily removed hotkeys until library issue is resolved
// import { useHotkeys } from 'react-hotkeys-hook';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { products, categories, loading } = useProduct();
  // const { createOrder } = useOrder(); // TODO: usar quando implementar
  // const { customers } = useCustomer(); // TODO: usar quando implementar  
  const { success, error: showError } = useToast();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [customerInfo] = useState<unknown>(null);
  const [orderType, setOrderType] = useState<'local' | 'delivery' | 'takeout' | 'online'>('local');
  const [speedMode, setSpeedMode] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);

  const selectCategoryByIndex = useCallback((index: number) => {
    if (categories[index]) {
      setSelectedCategory(categories[index].id);
    }
  }, [categories]);

  // Filtered products with memoization
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }
    
    // In speed mode, show only top 12 products
    if (speedMode && !searchTerm) {
      filtered = filtered.slice(0, 12);
    }
    
    return filtered;
  }, [products, selectedCategory, searchTerm, speedMode]);

  // Cart calculations
  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [cart]
  );

  const cartItemsCount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Optimized add to cart - SINGLE CLICK
  const addToCart = useCallback((product) => {
    // Remove focus from unknown active element (especially inputs)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        // Update quantity with animation feedback
        setLastAddedProduct(product.id);
        setTimeout(() => setLastAddedProduct(null), 300);
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item with animation
        setLastAddedProduct(product.id);
        setTimeout(() => setLastAddedProduct(null), 300);
        
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
    
    // Haptic feedback simulation (visual pulse)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    success(`+1 ${product.name}`, 1000);
  }, [success]);

  // Quick quantity update
  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          if (newQuantity === 0) {
            return null;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean);
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    if (cart.length > 0) {
      showConfirm(
        'Limpar Carrinho',
        'Tem certeza que deseja limpar o carrinho?',
        () => {
          setCart([]);
          success('Carrinho limpo');
        },
        { type: 'warning' }
      );
    }
  }, [cart.length, showConfirm, success]);

  const processPayment = useCallback(() => {
    if (cart.length === 0) {
      showError('Carrinho vazio');
      return;
    }
    navigate(`/pos/${terminalId}/payment`, { 
      state: { cart, total: cartTotal, orderType, customerInfo }
    });
  }, [cart, cartTotal, orderType, customerInfo, navigate, terminalId, showError]);

  // Prevent unwanted focus on mobile
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // If clicking outside of search input, blur it
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        searchRef.current.blur();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Keyboard Shortcuts - Using native event listener temporarily
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 - Search
      if (e.key === 'F3') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // F4 - Payment
      else if (e.key === 'F4') {
        e.preventDefault();
        processPayment();
      }
      // F5 - Clear cart
      else if (e.key === 'F5') {
        e.preventDefault();
        clearCart();
      }
      // F6 - Speed mode
      else if (e.key === 'F6') {
        e.preventDefault();
        setSpeedMode(prev => !prev);
      }
      // Escape - Clear search
      else if (e.key === 'Escape') {
        setSearchTerm('');
      }
      // Number keys for categories (when not in input)
      else if (e.target === document.body) {
        if (e.key >= '1' && e.key <= '5') {
          const index = parseInt(e.key) - 1;
          selectCategoryByIndex(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speedMode, processPayment, clearCart, categories, selectCategoryByIndex]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Speed Mode Indicator */}
      {speedMode && (
        <div className="fixed top-2 right-2 z-50 px-3 py-1 bg-green-500 text-white rounded-lg animate-pulse">
          ⚡ Modo Rápido (F6)
        </div>
      )}

      {/* Categories Sidebar - Optimized for touch */}
      <aside className="w-20 lg:w-28 bg-white dark:bg-gray-800 flex flex-col shadow-lg">
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xs lg:text-sm font-bold text-center text-gray-700 dark:text-gray-300">
            Categorias
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2 space-y-2">
          <div
            onClick={() => setSelectedCategory('all')}
            className={`
              w-full min-h-[100px] lg:min-h-[100px] flex flex-col items-center justify-center
              rounded-xl transition-all duration-75 cursor-pointer relative select-none
              ${selectedCategory === 'all' 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105' 
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
              }
            `}
            style={{ WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation' }}
          >
            <span className="text-3xl lg:text-4xl mb-1">🏠</span>
            <span className="text-xs lg:text-sm font-medium">Todos</span>
            <span className="absolute top-1 right-1 text-[10px] opacity-50">0</span>
          </div>
          
          {categories.slice(0, speedMode ? 4 : undefined).map((category, index) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                w-full min-h-[100px] lg:min-h-[100px] flex flex-col items-center justify-center
                rounded-xl transition-all duration-75 cursor-pointer relative select-none
                ${selectedCategory === category.id 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md'
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent', userSelect: 'none', touchAction: 'manipulation' }}
            >
              <span className="text-3xl lg:text-4xl mb-1">{category.icon}</span>
              <span className="text-xs lg:text-sm font-medium truncate px-1">
                {category.name}
              </span>
              <span className="absolute top-1 right-1 text-[10px] opacity-50">{index + 1}</span>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Search - Compact */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-3">
            {/* Order Type Quick Switch */}
            <div className="flex gap-1">
              {[
                { type: 'local' as const, icon: '🍽️' },
                { type: 'delivery' as const, icon: '🛵' },
                { type: 'takeout' as const, icon: '🥡' }
              ].map(({ type, icon }) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`
                    w-10 h-10 rounded-lg text-lg transition-all duration-75 touch-manipulation
                    ${orderType === type
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
            
            {/* Search - Optimized */}
            <div className="flex-1 max-w-md relative">
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={(e) => {
                  // Only allow focus if explicitly triggered by F3 or user click on the input itself
                  const isClickOnInput = e.relatedTarget === null || e.target === e.currentTarget;
                  if (!isClickOnInput) {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Buscar... (F3)"
                className="w-full h-10 pl-10 pr-8 text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all duration-75"
                inputMode="text"
                autoComplete="off"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Cart Summary - Compact */}
            <div className="flex items-center gap-3 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">Itens</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{cartItemsCount}</div>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(cartTotal)}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Products Grid - Optimized for speed */}
        <div className="flex-1 flex">
          <div 
            ref={productGridRef} 
            className="flex-1 overflow-auto p-3"
            tabIndex={-1}
            style={{ outline: 'none' }}
            onFocus={(e) => e.currentTarget.blur()}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div 
                className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2"
                tabIndex={-1}
                style={{ outline: 'none' }}
                onFocus={(e) => e.currentTarget.blur()}
                onClick={(e) => {
                  // Prevent focus on grid clicks
                  e.preventDefault();
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}>
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      addToCart(product);
                    }}
                    onPointerDown={(e) => e.preventDefault()}
                    className={`
                      min-h-[120px] lg:min-h-[140px] bg-white dark:bg-gray-800 rounded-lg shadow-sm 
                      hover:shadow-lg transform transition-all duration-75 overflow-hidden group
                      select-none cursor-pointer active:scale-95 relative
                      ${lastAddedProduct === product.id ? 'ring-2 ring-green-500 animate-pulse' : ''}
                    `}
                    style={{ 
                      WebkitTapHighlightColor: 'transparent', 
                      userSelect: 'none',
                      touchAction: 'manipulation'
                    }}
                  >
                    {/* Quick Badge for popular items - could be added based on order frequency */}
                    
                    <div className="h-20 lg:h-24 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-xs lg:text-sm text-gray-900 dark:text-white truncate">
                        {product.name}
                      </h3>
                      <p className="text-base lg:text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Sidebar - Optimized */}
          <aside className="w-80 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            {/* Cart Header */}
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Carrinho</h2>
                <SimpleTooltip title="Limpar carrinho (F5)" position="left">
                  <button
                    onClick={clearCart}
                    className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Limpar carrinho"
                  >
                    <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </SimpleTooltip>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-2">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🛒</div>
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                      
                      {/* Quick quantity controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, -1);
                          }}
                          className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-xs transition-colors duration-75"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, 1);
                          }}
                          className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-xs transition-colors duration-75"
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(item.id);
                          }}
                          className="w-6 h-6 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs ml-1 transition-colors duration-75"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(cartTotal)}
                  </span>
                </div>
                <button
                  onClick={processPayment}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg shadow-lg transform transition-all duration-75 active:scale-95"
                >
                  Pagar (F4)
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-2 left-2 text-xs text-gray-400 dark:text-gray-600 space-x-3">
        <span>F3: Buscar</span>
        <span>F4: Pagar</span>
        <span>F5: Limpar</span>
        <span>F6: Modo Rápido</span>
        <span>1-5: Categorias</span>
      </div>
      
      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
};

export default MainPage;