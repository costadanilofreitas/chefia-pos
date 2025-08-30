import React, { useCallback, useEffect, useState } from 'react';
import { CategorySidebar } from '../components/layout/CategorySidebar';
import { KioskHeader } from '../components/layout/KioskHeader';
import { SessionTimeoutModal } from '../components/layout/SessionTimeoutModal';
import { EmptyProducts } from '../components/products/EmptyProducts';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductSection } from '../components/products/ProductSection';
import { Alert } from '../components/ui/Alert';
import { WelcomeScreen } from '../components/ui/WelcomeScreen';
import { OrderConfirmation } from '../components/ui/OrderConfirmation';
import { Spinner } from '../components/ui/Spinner';
import { TabGroup } from '../components/ui/TabGroup';
import { Text } from '../components/ui/Text';
import { TouchButton } from '../components/ui/TouchButton';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTerminalConfig } from '../contexts/TerminalConfigContext';
import { useFullscreen } from '../hooks/useFullscreen';
import { useProducts } from '../hooks/useProducts';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { offlineStorage } from '../services/offlineStorage';
import { Product } from '../services/productService';
import CartSidebar from './CartSidebar';
import PaymentScreen from './PaymentScreen';

/**
 * Enhanced Kiosk Main Page using Context API and custom hooks
 */
const KioskMainPage: React.FC = () => {
  // Contexts
  const { isDarkMode } = useTheme();
  const { user, startGuestSession } = useAuth();
  const { cart, addItem, clearCart, isInCart } = useCart();
  const { config: terminalConfig } = useTerminalConfig();
  
  // Custom hooks
  const {
    categories,
    isLoading,
    error,
    selectedCategory,
    searchTerm,
    availableProducts,
    featuredProducts,
    selectCategory,
    searchProducts,
    clearSearch,
    refresh
  } = useProducts();

  // Session timeout with warning
  const { 
    isWarning, 
    timeRemaining, 
    extendSession, 
    endSession 
  } = useSessionTimeout({
    timeoutDuration: 5 * 60 * 1000, // 5 minutes
    warningDuration: 60 * 1000, // 1 minute warning
    onTimeout: () => {
      setShowTimeoutModal(true);
      clearCart();
    }
  });

  // Local state
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  useFullscreen(); // Fullscreen is handled by the hook
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string>('');

  // Initialize guest session on mount
  useEffect(() => {
    if (!user) {
      startGuestSession();
      offlineStorage.log('Guest session started');
    }
  }, [user, startGuestSession]);

  // Handle product selection
  const handleProductSelect = useCallback((product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
    
    offlineStorage.trackAction('product_added_to_cart', {
      productId: product.id,
      productName: product.name,
      price: product.price
    });

    // Show cart briefly
    setShowCart(true);
    setTimeout(() => setShowCart(false), 2000);
  }, [addItem]);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setLocalSearchTerm(term);
    if (term.trim()) {
      searchProducts(term);
    } else {
      clearSearch();
    }
  }, [searchProducts, clearSearch]);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    selectCategory(categoryId);
    setShowSearch(false);
    setLocalSearchTerm('');
  }, [selectCategory]);

  // Handle checkout
  const handleCheckout = useCallback(() => {
    if (cart.itemCount > 0) {
      setShowPayment(true);
      setShowCart(false);
    }
  }, [cart.itemCount]);
  
  // Handle home/reset
  const handleHome = useCallback(() => {
    clearSearch();
    selectCategory(null);
    setShowSearch(false);
    setShowCart(false);
    setShowPayment(false);
    setLocalSearchTerm('');
    extendSession();
  }, [clearSearch, selectCategory, extendSession]);
  
  // Handle payment complete
  const handlePaymentComplete = useCallback(() => {
    // Generate order number
    const orderNumber = Math.floor(100 + Math.random() * 900).toString();
    setLastOrderNumber(orderNumber);
    
    offlineStorage.log('Order completed', { orderNumber });
    
    clearCart();
    setShowPayment(false);
    setShowOrderConfirmation(true);
  }, [clearCart]);
  
  // Handle new order
  const handleNewOrder = useCallback(() => {
    setShowOrderConfirmation(false);
    setShowWelcome(true);
    handleHome();
  }, [handleHome]);
  
  // Handle start order
  const handleStartOrder = useCallback(() => {
    setShowWelcome(false);
    startGuestSession();
    offlineStorage.log('Customer started new order');
  }, [startGuestSession]);

  // Categories for sidebar
  const categoriesWithCount = categories.map(cat => ({
    ...cat,
    itemCount: availableProducts.filter(p => p.category_id === cat.id).length
  }));

  // Show welcome screen
  if (showWelcome) {
    return (
      <WelcomeScreen 
        onStart={handleStartOrder}
      />
    );
  }
  
  // Show order confirmation
  if (showOrderConfirmation) {
    return (
      <OrderConfirmation
        orderNumber={lastOrderNumber}
        estimatedTime={15}
        onNewOrder={handleNewOrder}
        autoCloseDelay={15000}
      />
    );
  }
  
  // Render payment screen
  if (showPayment) {
    return (
      <PaymentScreen
        onBack={() => {
          setShowPayment(false);
          setShowCart(true);
        }}
        onComplete={handlePaymentComplete}
      />
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex">
        {/* Category Sidebar - Left - Hidden on mobile */}
        {terminalConfig?.ui?.layout?.categoriesPosition === 'left' && !showSearch && (
          <CategorySidebar
            categories={categoriesWithCount}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            className="hidden lg:block flex-shrink-0 w-64 xl:w-72 2xl:w-80"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <KioskHeader
            cartItemCount={cart.itemCount}
            cartTotal={cart.total}
            isDarkMode={isDarkMode}
            showSearch={showSearch}
            searchTerm={localSearchTerm}
            onHome={handleHome}
            onToggleSearch={() => setShowSearch(!showSearch)}
            onToggleDarkMode={() => {}}
            onCartClick={() => setShowCart(!showCart)}
            onSearchChange={handleSearch}
          />

          {/* Top Category Tabs - Shows on mobile when sidebar is hidden */}
          {(!showSearch && categories.length > 0) && (
            <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-14 sm:top-16 z-30 lg:hidden">
              <div className="container mx-auto px-2 sm:px-4 overflow-x-auto">
                <TabGroup
                  tabs={[
                    { id: '', label: 'Todos' },
                    ...categories.filter(c => c.is_active).map(c => ({
                      id: c.id,
                      label: c.name
                    }))
                  ]}
                  value={selectedCategory || ''}
                  onChange={(value) => handleCategorySelect(value === '' ? null : value.toString())}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Spinner size="large" />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Alert type="error" className="mb-6">
              <p>Erro ao carregar produtos.</p>
              <TouchButton
                onClick={refresh}
                variant="outline"
                size="small"
                className="mt-2"
              >
                Tentar novamente
              </TouchButton>
            </Alert>
          )}

          {/* Empty State */}
          {!isLoading && !error && availableProducts.length === 0 && (
            <EmptyProducts
              searchTerm={searchTerm}
              onClearSearch={clearSearch}
            />
          )}

          {/* Featured Products (when no search/filter) */}
          {!isLoading && !error && !searchTerm && !selectedCategory && featuredProducts.length > 0 && (
            <ProductSection
              title="Destaques"
              products={featuredProducts}
              onProductSelect={handleProductSelect}
              isInCart={isInCart}
            />
          )}

          {/* Products Grid */}
          {!isLoading && !error && availableProducts.length > 0 && (
            <ProductGrid
              products={availableProducts}
              onProductSelect={handleProductSelect}
              isInCart={isInCart}
            />
          )}
          </main>
        </div>

        {/* Cart Sidebar - Responsive width */}
        <div className={`${showCart ? 'block' : 'hidden'}`}>
          <CartSidebar
            isOpen={showCart}
            onClose={() => setShowCart(false)}
            onCheckout={handleCheckout}
          />
        </div>

        {/* Session Timeout Warning */}
        {isWarning && !showTimeoutModal && (
          <SessionTimeoutModal
            isWarning={isWarning}
            timeRemaining={timeRemaining}
            onExtend={extendSession}
            onEnd={endSession}
          />
        )}

        {/* Session Ended Modal */}
        {showTimeoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
              <Text variant="h2" className="mb-4 text-gray-900 dark:text-white">
                Sessão Encerrada
              </Text>
              <Text variant="body" className="text-gray-600 dark:text-gray-300 mb-6">
                Sua sessão foi encerrada por inatividade.
              </Text>
              <TouchButton
                onClick={() => {
                  setShowTimeoutModal(false);
                  handleHome();
                }}
                variant="primary"
                size="large"
                className="w-full"
              >
                Iniciar Nova Sessão
              </TouchButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KioskMainPage;