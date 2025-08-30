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

  // Navigation: next step
  const nextStep = useCallback(() => {
    const currentIndex = CHECKOUT_STEPS.indexOf(state.currentStep);
    if (currentIndex < CHECKOUT_STEPS.length - 1) {
      const nextStep = CHECKOUT_STEPS[currentIndex + 1];
      setState(prev => ({ ...prev, currentStep: nextStep as CheckoutState['currentStep'], error: null }));
      offlineStorage.trackAction('checkout_step_forward', { 
        from: state.currentStep,
        to: nextStep 
      });
    }
  }, [state.currentStep]);

  // Navigation: previous step
  const previousStep = useCallback(() => {
    const currentIndex = CHECKOUT_STEPS.indexOf(state.currentStep);
    if (currentIndex > 0) {
      const prevStep = CHECKOUT_STEPS[currentIndex - 1];
      setState(prev => ({ ...prev, currentStep: prevStep as CheckoutState['currentStep'], error: null }));
      offlineStorage.trackAction('checkout_step_back', { 
        from: state.currentStep,
        to: prevStep 
      });
    }
  }, [state.currentStep]);

  // Navigation: go to specific step
  const goToStep = useCallback((step: CheckoutState['currentStep']) => {
    const targetIndex = CHECKOUT_STEPS.indexOf(step);
    const currentIndex = CHECKOUT_STEPS.indexOf(state.currentStep);
    
    // Only allow going back or to the next immediate step
    if (targetIndex <= currentIndex + 1) {
      setState(prev => ({ ...prev, currentStep: step, error: null }));
      offlineStorage.trackAction('checkout_step_jump', { 
        from: state.currentStep,
        to: step 
      });
    }
  }, [state.currentStep]);

  // Set order type
  const setOrderType = useCallback((type: OrderType) => {
    // Create order if it doesn't exist
    if (!currentOrder) {
      const totals = orderService.calculateTotals(cart.items);
      createOrder(cart.items, totals.subtotal, totals.tax, totals.total);
    }
    
    setOrderTypeContext(type);
    offlineStorage.trackAction('order_type_selected', { type });
    nextStep();
  }, [currentOrder, cart.items, createOrder, setOrderTypeContext, nextStep]);

  // Set customer info
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
  }, [user, startGuestSession, setCustomerInfoContext, nextStep]);

  // Set payment method
  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setPaymentMethodContext(method);
    offlineStorage.trackAction('payment_method_selected', { method });
    nextStep();
  }, [setPaymentMethodContext, nextStep]);

  // Process checkout
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
  }, [currentOrder, clearCart, goToStep]);

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