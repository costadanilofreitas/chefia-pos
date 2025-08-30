import React, { memo, useCallback, useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useOrder } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCheckout } from '../hooks/useCheckout';
import { formatCurrency } from '../utils/formatters';
import { TouchButton } from '../components/ui/TouchButton';
import { Text } from '../components/ui/Text';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CartSummary } from '../components/cart/CartSummary';
import { OrderTypeSelector } from '../components/payment/OrderTypeSelector';
import { CustomerInfoForm } from '../components/payment/CustomerInfoForm';
import { PaymentMethodSelector } from '../components/payment/PaymentMethodSelector';
import { OrderSuccess } from '../components/payment/OrderSuccess';
import { offlineStorage } from '../services/offlineStorage';
import { PaymentMethod, OrderType } from '../contexts/OrderContext';

interface PaymentScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

/**
 * Payment screen component integrated with OrderContext and checkout flow
 * Manages the complete checkout process from order type to payment confirmation
 */
const PaymentScreenComponent: React.FC<PaymentScreenProps> = ({ 
  onBack, 
  onComplete 
}) => {
  const { cart } = useCart();
  const { currentOrder } = useOrder();
  const { isDarkMode } = useTheme();
  const {
    currentStep,
    isProcessing,
    error,
    qrCode,
    orderNumber,
    nextStep,
    previousStep,
    setOrderType,
    setCustomerInfo,
    setPaymentMethod,
    processCheckout,
    canProceed,
    isComplete,
    totalSteps,
    currentStepIndex
  } = useCheckout();

  // Local state
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Handle order type selection
  const handleOrderTypeSelect = useCallback((type: OrderType) => {
    setSelectedOrderType(type);
    setOrderType(type);
  }, [setOrderType]);

  // Handle customer info submission
  const handleCustomerInfoSubmit = useCallback((info: { name: string; phone?: string }) => {
    setCustomerInfo(info);
  }, [setCustomerInfo]);

  // Handle payment method selection
  const handlePaymentMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setPaymentMethod(method);
  }, [setPaymentMethod]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (currentStep === 'cart') {
      onBack();
    } else {
      previousStep();
    }
  }, [currentStep, onBack, previousStep]);

  // Effect for handling completion
  useEffect(() => {
    if (isComplete) {
      offlineStorage.log('Order completed', { orderNumber });
      setTimeout(() => {
        onComplete();
      }, 3000); // Show success for 3 seconds
    }
  }, [isComplete, orderNumber, onComplete]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'cart':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <Text variant="h3" className="mb-4">Resumo do Pedido</Text>
              
              {/* Cart items summary */}
              <div className="space-y-3 mb-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <CartSummary
                subtotal={cart.subtotal}
                tax={cart.tax}
                discount={cart.discount}
                total={cart.total}
                className="border-t dark:border-gray-600 pt-4"
              />
            </div>

            <TouchButton
              onClick={nextStep}
              variant="primary"
              size="large"
              className="w-full"
              disabled={!canProceed}
            >
              Continuar para Tipo de Pedido
            </TouchButton>
          </div>
        );

      case 'type':
        return (
          <div className="space-y-6">
            <Text variant="h3">Como deseja receber seu pedido?</Text>
            <OrderTypeSelector
              selectedType={selectedOrderType}
              onSelect={handleOrderTypeSelect}
            />
          </div>
        );

      case 'customer':
        return (
          <div className="space-y-6">
            <Text variant="h3">Informações para o Pedido</Text>
            <CustomerInfoForm onSubmit={handleCustomerInfoSubmit} />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <Text variant="h3">Forma de Pagamento</Text>
            <PaymentMethodSelector
              selectedMethod={selectedPaymentMethod}
              onSelect={handlePaymentMethodSelect}
            />
            {selectedPaymentMethod === 'cash' && (
              <Alert type="info">
                Dirija-se ao balcão para efetuar o pagamento em dinheiro
              </Alert>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="large" />
            <Text variant="h3" className="mt-4">Processando seu pedido...</Text>
            <Text variant="body" className="text-gray-500 dark:text-gray-400 mt-2">
              Por favor, aguarde
            </Text>
          </div>
        );

      case 'success':
        return (
          <OrderSuccess
            {...(orderNumber && { orderNumber })}
            {...(currentOrder?.type && currentOrder.type !== 'delivery' && { orderType: currentOrder.type })}
            {...(qrCode && { qrCode })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {currentStep !== 'processing' && currentStep !== 'success' && (
                  <TouchButton
                    onClick={handleBack}
                    variant="ghost"
                    size="medium"
                    aria-label="Voltar"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </TouchButton>
                )}
                <Text variant="h2">Finalizar Pedido</Text>
              </div>
            </div>
          </div>
        </header>

        {/* Progress bar */}
        {currentStep !== 'processing' && currentStep !== 'success' && (
          <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
            <div className="container mx-auto px-4 py-3">
              <ProgressBar 
                current={currentStepIndex + 1} 
                total={totalSteps} 
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className={currentStepIndex >= 0 ? 'text-primary-600' : ''}>Resumo</span>
                <span className={currentStepIndex >= 1 ? 'text-primary-600' : ''}>Tipo</span>
                <span className={currentStepIndex >= 2 ? 'text-primary-600' : ''}>Dados</span>
                <span className={currentStepIndex >= 3 ? 'text-primary-600' : ''}>Pagamento</span>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 container mx-auto px-4 py-6">
          {/* Error display */}
          {error && (
            <Alert type="error" className="mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error.message}</span>
              </div>
            </Alert>
          )}

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation buttons (except for processing/success) */}
          {currentStep !== 'processing' && currentStep !== 'success' && currentStep !== 'cart' && (
            <div className="flex gap-4 mt-8">
              <TouchButton
                onClick={handleBack}
                variant="outline"
                size="large"
                className="flex-1"
              >
                Voltar
              </TouchButton>
              
              {currentStep === 'payment' ? (
                <TouchButton
                  onClick={processCheckout}
                  variant="primary"
                  size="large"
                  className="flex-1"
                  disabled={!canProceed || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </TouchButton>
              ) : (
                currentStep !== 'type' && currentStep !== 'customer' && (
                  <TouchButton
                    onClick={nextStep}
                    variant="primary"
                    size="large"
                    className="flex-1"
                    disabled={!canProceed}
                  >
                    Continuar
                  </TouchButton>
                )
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const PaymentScreen = memo(PaymentScreenComponent);
export default PaymentScreen;