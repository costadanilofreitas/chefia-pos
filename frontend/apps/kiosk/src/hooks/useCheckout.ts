import { useState, useCallback, useMemo } from 'react';
import { useCart } from '../contexts/CartContext';
import { useOrder } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/orderService';
import { offlineStorage } from '../services/offlineStorage';
import { errorHandler } from '../services/errorHandler';
import { PaymentMethod, OrderType } from '../contexts/OrderContext';

interface CheckoutState {
  currentStep: 'cart' | 'type' | 'customer' | 'payment' | 'processing' | 'success';
  isProcessing: boolean;
  error: Error | null;
  paymentUrl?: string;
  qrCode?: string;
  orderNumber?: string;
}

interface CustomerInfo {
  name: string;
  phone?: string;
  email?: string;
}

interface UseCheckoutReturn extends CheckoutState {
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: CheckoutState['currentStep']) => void;
  
  // Actions
  setOrderType: (type: OrderType) => void;
  setCustomerInfo: (info: CustomerInfo) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  processCheckout: () => Promise<void>;
  resetCheckout: () => void;
  
  // Computed
  canProceed: boolean;
  isComplete: boolean;
  totalSteps: number;
  currentStepIndex: number;
}

const CHECKOUT_STEPS: CheckoutState['currentStep'][] = [
  'cart',
  'type',
  'customer',
  'payment',
  'processing',
  'success'
];

/**
 * Custom hook for managing the checkout flow
 */
export function useCheckout(): UseCheckoutReturn {
  const { cart, clearCart } = useCart();
  const { 
    currentOrder,
    createOrder,
    setOrderType: setOrderTypeContext,
    setCustomerInfo: setCustomerInfoContext,
    setPaymentMethod: setPaymentMethodContext
    // confirmOrder is not used in this hook
  } = useOrder();
  const { user, startGuestSession } = useAuth();

  const [state, setState] = useState<CheckoutState>({
    currentStep: 'cart',
    isProcessing: false,
    error: null
  });

  // Navigation: next step - Use setState functional update to avoid dependency
  const nextStep = useCallback(() => {
    setState(prev => {
      const currentIndex = CHECKOUT_STEPS.indexOf(prev.currentStep);
      if (currentIndex < CHECKOUT_STEPS.length - 1) {
        const nextStep = CHECKOUT_STEPS[currentIndex + 1];
        offlineStorage.trackAction('checkout_step_forward', { 
          from: prev.currentStep,
          to: nextStep 
        });
        return { ...prev, currentStep: nextStep as CheckoutState['currentStep'], error: null };
      }
      return prev;
    });
  }, []); // No dependencies - stable reference

  // Navigation: previous step - Use setState functional update to avoid dependency
  const previousStep = useCallback(() => {
    setState(prev => {
      const currentIndex = CHECKOUT_STEPS.indexOf(prev.currentStep);
      if (currentIndex > 0) {
        const prevStep = CHECKOUT_STEPS[currentIndex - 1];
        offlineStorage.trackAction('checkout_step_back', { 
          from: prev.currentStep,
          to: prevStep 
        });
        return { ...prev, currentStep: prevStep as CheckoutState['currentStep'], error: null };
      }
      return prev;
    });
  }, []); // No dependencies - stable reference

  // Navigation: go to specific step - Use setState functional update to avoid dependency
  const goToStep = useCallback((step: CheckoutState['currentStep']) => {
    setState(prev => {
      const targetIndex = CHECKOUT_STEPS.indexOf(step);
      const currentIndex = CHECKOUT_STEPS.indexOf(prev.currentStep);
      
      // Only allow going back or to the next immediate step
      if (targetIndex <= currentIndex + 1) {
        offlineStorage.trackAction('checkout_step_jump', { 
          from: prev.currentStep,
          to: step 
        });
        return { ...prev, currentStep: step, error: null };
      }
      return prev;
    });
  }, []); // No dependencies - stable reference

  // Set order type - nextStep is now stable
  const setOrderType = useCallback((type: OrderType) => {
    // Create order if it doesn't exist
    if (!currentOrder) {
      const totals = orderService.calculateTotals(cart.items);
      createOrder(cart.items, totals.subtotal, totals.tax, totals.total);
    }
    
    setOrderTypeContext(type);
    offlineStorage.trackAction('order_type_selected', { type });
    nextStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder, cart.items, createOrder, setOrderTypeContext]); // nextStep has stable reference

  // Set customer info - nextStep is now stable
  const setCustomerInfo = useCallback((info: CustomerInfo) => {
    // Start guest session if no user
    if (!user) {
      startGuestSession();
    }
    
    setCustomerInfoContext(info.name, info.phone);
    offlineStorage.trackAction('customer_info_provided', { 
      hasPhone: !!info.phone,
      hasEmail: !!info.email 
    });
    nextStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, startGuestSession, setCustomerInfoContext]); // nextStep has stable reference

  // Set payment method - nextStep is now stable
  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setPaymentMethodContext(method);
    offlineStorage.trackAction('payment_method_selected', { method });
    nextStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPaymentMethodContext]); // nextStep has stable reference

  // Process checkout - goToStep is now stable
  const processCheckout = useCallback(async () => {
    if (!currentOrder) {
      const error = new Error('No order to process');
      setState(prev => ({ ...prev, error }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    offlineStorage.log('Starting checkout process', { 
      orderId: currentOrder.id,
      total: currentOrder.total 
    });

    try {
      // Move to processing step
      goToStep('processing');
      
      // Create order in backend
      const orderRequest = {
        items: currentOrder.items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          customizations: item.customizations
        })),
        type: currentOrder.type,
        customer_name: currentOrder.customerName,
        customer_phone: currentOrder.customerPhone,
        notes: currentOrder.notes,
        payment_method: currentOrder.paymentMethod,
        subtotal: currentOrder.subtotal,
        tax: currentOrder.tax,
        total: currentOrder.total
      };

      const orderResponse = await orderService.createOrder(orderRequest);
      
      // Process payment if needed
      if (currentOrder.paymentMethod && currentOrder.paymentMethod !== 'cash') {
        const paymentResponse = await orderService.processPayment({
          order_id: orderResponse.id,
          payment_method: currentOrder.paymentMethod,
          amount: currentOrder.total
        });

        if (paymentResponse.success) {
          setState(prev => ({
            ...prev,
            paymentUrl: paymentResponse.payment_url,
            qrCode: paymentResponse.qr_code,
            orderNumber: orderResponse.orderNumber
          }));
        } else {
          throw new Error(paymentResponse.message || 'Payment failed');
        }
      }

      // Clear cart and move to success
      clearCart();
      setState(prev => ({
        ...prev,
        currentStep: 'success',
        isProcessing: false,
        orderNumber: orderResponse.orderNumber
      }));
      
      offlineStorage.log('Checkout completed successfully', { 
        orderId: orderResponse.id,
        orderNumber: orderResponse.orderNumber 
      });
      
    } catch (error) {
      const appError = errorHandler.handle(error, 'useCheckout.processCheckout');
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: appError,
        currentStep: 'payment' // Go back to payment step on error
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder, clearCart]); // goToStep has stable reference

  // Reset checkout
  const resetCheckout = useCallback(() => {
    setState({
      currentStep: 'cart',
      isProcessing: false,
      error: null
    });
    clearCart();
    offlineStorage.trackAction('checkout_reset');
  }, [clearCart]);

  // Computed: can proceed to next step
  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 'cart':
        return cart.itemCount > 0;
      case 'type':
        return !!currentOrder?.type;
      case 'customer':
        return !!currentOrder?.customerName;
      case 'payment':
        return !!currentOrder?.paymentMethod;
      case 'processing':
        return false; // Can't proceed manually from processing
      case 'success':
        return false; // Final step
      default:
        return false;
    }
  }, [state.currentStep, cart.itemCount, currentOrder]);

  // Computed: is checkout complete
  const isComplete = useMemo(() => {
    return state.currentStep === 'success';
  }, [state.currentStep]);

  // Computed: total steps (excluding processing and success)
  const totalSteps = 4;

  // Computed: current step index (for progress indicator)
  const currentStepIndex = useMemo(() => {
    const index = CHECKOUT_STEPS.indexOf(state.currentStep);
    // Don't count processing and success in progress
    return Math.min(index, totalSteps - 1);
  }, [state.currentStep]);

  return {
    ...state,
    nextStep,
    previousStep,
    goToStep,
    setOrderType,
    setCustomerInfo,
    setPaymentMethod,
    processCheckout,
    resetCheckout,
    canProceed,
    isComplete,
    totalSteps,
    currentStepIndex
  };
}