// /home/ubuntu/pos-modern/src/kiosk/ui/KioskMainPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './KioskMainPage.css';
import ProductCard from './ProductCard';
import CategorySelector from './CategorySelector';
import CartSidebar from './CartSidebar';
import OrderSummary from './OrderSummary';
import PaymentScreen from './PaymentScreen';
import WelcomeScreen from './WelcomeScreen';
import CustomizationModal from './CustomizationModal';
import LoadingSpinner from '../../utils/LoadingSpinner';
import ErrorMessage from '../../utils/ErrorMessage';
import { formatCurrency } from '../../utils/formatters';

const IDLE_TIMEOUT = 60000; // 60 seconds of inactivity before reset

const KioskMainPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const kioskId = queryParams.get('kiosk') || '1'; // Default to kiosk 1 if not specified
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kioskConfig, setKioskConfig] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, menu, cart, payment, confirmation
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [orderTotal, setOrderTotal] = useState({ subtotal: 0, tax: 0, discount: 0, total: 0 });
  
  // Refs
  const idleTimerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  
  // Initialize kiosk session
  useEffect(() => {
    const initializeKiosk = async () => {
      try {
        setLoading(true);
        
        // Fetch kiosk configuration
        const configResponse = await axios.get(`/api/v1/kiosk/config/${kioskId}`);
        setKioskConfig(configResponse.data);
        
        // Start a new session
        const sessionResponse = await axios.post(`/api/v1/kiosk/${kioskId}/session`);
        setSessionId(sessionResponse.data.id);
        
        // Fetch categories and products
        const categoriesResponse = await axios.get('/api/v1/products/categories');
        const productsResponse = await axios.get('/api/v1/products');
        
        setCategories(categoriesResponse.data);
        setProducts(productsResponse.data);
        
        if (categoriesResponse.data.length > 0) {
          setSelectedCategory(categoriesResponse.data[0].id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error initializing kiosk:', err);
        setError('Não foi possível inicializar o quiosque. Por favor, tente novamente.');
        setLoading(false);
      }
    };
    
    initializeKiosk();
    
    // Cleanup function to end session when component unmounts
    return () => {
      if (sessionId) {
        axios.put(`/api/v1/kiosk/session/${sessionId}/end`).catch(err => {
          console.error('Error ending kiosk session:', err);
        });
      }
    };
  }, [kioskId]);
  
  // Filter products when category changes
  useEffect(() => {
    if (selectedCategory && products.length > 0) {
      const filtered = products.filter(product => 
        product.category_id === selectedCategory && product.is_active
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCategory, products]);
  
  // Calculate order total when cart changes
  useEffect(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.10; // Assuming 10% tax
    const total = subtotal + tax;
    
    setOrderTotal({
      subtotal,
      tax,
      discount: 0, // No discount by default
      total
    });
  }, [cart]);
  
  // Set up idle timer
  useEffect(() => {
    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      
      // Update session activity
      if (sessionId) {
        axios.put(`/api/v1/kiosk/session/${sessionId}/activity`).catch(err => {
          console.error('Error updating session activity:', err);
        });
      }
      
      idleTimerRef.current = setTimeout(() => {
        // Reset to welcome screen after idle timeout
        resetKiosk();
      }, kioskConfig?.timeout_seconds * 1000 || IDLE_TIMEOUT);
    };
    
    // Set up event listeners for user activity
    const handleUserActivity = () => {
      resetIdleTimer();
    };
    
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    
    // Initialize timer
    resetIdleTimer();
    
    // Cleanup
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [sessionId, kioskConfig]);
  
  // Touch event handlers for swipe detection
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };
  
  const handleTouchEnd = (e) => {
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    
    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    
    // Detect horizontal swipe (for category navigation)
    if (Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
        // Swipe right - previous category
        navigateToPreviousCategory();
      } else {
        // Swipe left - next category
        navigateToNextCategory();
      }
    }
  };
  
  // Category navigation
  const navigateToNextCategory = () => {
    if (categories.length > 0) {
      const currentIndex = categories.findIndex(cat => cat.id === selectedCategory);
      if (currentIndex < categories.length - 1) {
        setSelectedCategory(categories[currentIndex + 1].id);
      }
    }
  };
  
  const navigateToPreviousCategory = () => {
    if (categories.length > 0) {
      const currentIndex = categories.findIndex(cat => cat.id === selectedCategory);
      if (currentIndex > 0) {
        setSelectedCategory(categories[currentIndex - 1].id);
      }
    }
  };
  
  // Cart management
  const addToCart = (product) => {
    // Check if product requires customization
    if (product.customizable || (product.type === 'COMPOSITE' && product.sections?.length > 0)) {
      setCustomizingProduct(product);
      return;
    }
    
    // Add product directly to cart
    const existingItemIndex = cart.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      // Update quantity if product already in cart
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      // Add new product to cart
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        customizations: [],
        notes: null
      }]);
    }
  };
  
  const addCustomizedProductToCart = (product, customizations, quantity, notes) => {
    const totalCustomizationPrice = customizations.reduce(
      (sum, customization) => sum + customization.price_adjustment, 
      0
    );
    
    const unitPrice = product.price + totalCustomizationPrice;
    const totalPrice = unitPrice * quantity;
    
    setCart([...cart, {
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      customizations,
      notes
    }]);
    
    setCustomizingProduct(null);
  };
  
  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };
  
  const updateCartItemQuantity = (index, quantity) => {
    if (quantity < 1) return;
    
    const updatedCart = [...cart];
    updatedCart[index].quantity = quantity;
    updatedCart[index].total_price = updatedCart[index].unit_price * quantity;
    setCart(updatedCart);
  };
  
  // Screen navigation
  const goToMenu = () => {
    setCurrentScreen('menu');
  };
  
  const goToCart = () => {
    setCurrentScreen('cart');
  };
  
  const goToPayment = () => {
    setCurrentScreen('payment');
  };
  
  const goToConfirmation = () => {
    setCurrentScreen('confirmation');
  };
  
  // Order submission
  const submitOrder = async () => {
    try {
      setLoading(true);
      
      const orderData = {
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          customizations: item.customizations,
          notes: item.notes
        })),
        subtotal: orderTotal.subtotal,
        tax: orderTotal.tax,
        discount: orderTotal.discount,
        total: orderTotal.total
      };
      
      await axios.post(`/api/v1/kiosk/session/${sessionId}/order`, orderData);
      
      // End session with completed status
      await axios.put(`/api/v1/kiosk/session/${sessionId}/end`, {
        completed: true
      });
      
      goToConfirmation();
      
      // Reset kiosk after a delay
      setTimeout(() => {
        resetKiosk();
      }, 10000); // 10 seconds
      
      setLoading(false);
    } catch (err) {
      console.error('Error submitting order:', err);
      setError('Não foi possível finalizar o pedido. Por favor, tente novamente.');
      setLoading(false);
    }
  };
  
  // Reset kiosk to initial state
  const resetKiosk = async () => {
    try {
      // End current session if exists
      if (sessionId) {
        await axios.put(`/api/v1/kiosk/session/${sessionId}/end`);
      }
      
      // Start a new session
      const sessionResponse = await axios.post(`/api/v1/kiosk/${kioskId}/session`);
      setSessionId(sessionResponse.data.id);
      
      // Reset state
      setCart([]);
      setCurrentScreen('welcome');
      setCustomizingProduct(null);
      setError(null);
      
      if (categories.length > 0) {
        setSelectedCategory(categories[0].id);
      }
    } catch (err) {
      console.error('Error resetting kiosk:', err);
      setError('Não foi possível reiniciar o quiosque. Por favor, tente novamente.');
    }
  };
  
  // Render appropriate screen based on current state
  const renderScreen = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (error) {
      return <ErrorMessage message={error} onRetry={resetKiosk} />;
    }
    
    switch (currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen 
            welcomeMessage={kioskConfig?.welcome_message || 'Bem-vindo! Toque para começar seu pedido.'} 
            logoUrl={kioskConfig?.logo_url}
            onStart={goToMenu}
          />
        );
        
      case 'menu':
        return (
          <div className="kiosk-menu-container" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="kiosk-header">
              <h1>Faça seu pedido</h1>
              <button className="cart-button" onClick={goToCart}>
                <span className="cart-icon">🛒</span>
                <span className="cart-count">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </button>
            </div>
            
            <CategorySelector 
              categories={categories} 
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            
            <div className="products-grid">
              {filteredProducts.map(product => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  onAddToCart={() => addToCart(product)}
                />
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="no-products-message">
                  Nenhum produto disponível nesta categoria.
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="floating-cart-summary">
                <div className="cart-summary-text">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} itens | 
                  {formatCurrency(orderTotal.total)}
                </div>
                <button className="view-cart-button" onClick={goToCart}>
                  Ver Carrinho
                </button>
              </div>
            )}
          </div>
        );
        
      case 'cart':
        return (
          <CartSidebar
            cart={cart}
            orderTotal={orderTotal}
            onUpdateQuantity={updateCartItemQuantity}
            onRemoveItem={removeFromCart}
            onContinueShopping={goToMenu}
            onCheckout={goToPayment}
          />
        );
        
      case 'payment':
        return (
          <PaymentScreen
            orderTotal={orderTotal}
            onBack={goToCart}
            onSubmitOrder={submitOrder}
            paymentMethods={kioskConfig?.payment_methods || ["credit", "debit"]}
            enablePayment={kioskConfig?.enable_payment || true}
          />
        );
        
      case 'confirmation':
        return (
          <OrderSummary
            orderNumber="123" // This would come from the order response
            estimatedTime={15} // This would be calculated or provided by the backend
            onNewOrder={resetKiosk}
          />
        );
        
      default:
        return <ErrorMessage message="Tela não encontrada" onRetry={resetKiosk} />;
    }
  };
  
  return (
    <div className="kiosk-container">
      {renderScreen()}
      
      {customizingProduct && (
        <CustomizationModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAddToCart={addCustomizedProductToCart}
        />
      )}
    </div>
  );
};

export default KioskMainPage;
