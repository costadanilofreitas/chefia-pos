// /home/ubuntu/pos-modern/frontend/apps/kiosk/src/ui/PaymentScreen.tsx

import React, { useState } from 'react';
import { formatCurrency } from '@common/utils/formatters';

interface OrderTotal {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

interface PaymentScreenProps {
  orderTotal: OrderTotal;
  onBack: () => void;
  onSubmitOrder: () => void;
  paymentMethods?: string[];
  enablePayment?: boolean;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  orderTotal,
  onBack,
  onSubmitOrder,
  paymentMethods = ["credit", "debit"],
  enablePayment = true
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const getPaymentMethodIcon = (method: string): string => {
    switch (method.toLowerCase()) {
      case 'credit':
      case 'debit':
        return '💳';
      case 'cash':
        return '💵';
      case 'pix':
        return '📱';
      default:
        return '💰';
    }
  };

  const getPaymentMethodName = (method: string): string => {
    switch (method.toLowerCase()) {
      case 'credit':
        return 'Cartão de Crédito';
      case 'debit':
        return 'Cartão de Débito';
      case 'cash':
        return 'Dinheiro';
      case 'pix':
        return 'PIX';
      default:
        return method;
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod && enablePayment) {
      alert('Por favor, selecione um método de pagamento');
      return;
    }

    onSubmitOrder();
  };

  return (
    <div className="payment-screen">
      <div className="payment-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <h2>Pagamento</h2>
        <div></div>
      </div>

      <div className="payment-content">
        <div className="payment-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(orderTotal.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Taxa de serviço</span>
            <span>{formatCurrency(orderTotal.tax)}</span>
          </div>
          {orderTotal.discount > 0 && (
            <div className="summary-row discount">
              <span>Desconto</span>
              <span>-{formatCurrency(orderTotal.discount)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatCurrency(orderTotal.total)}</span>
          </div>
        </div>

        {enablePayment ? (
          <>
            <h3>Selecione o método de pagamento:</h3>

            <div className="payment-methods">
              {paymentMethods.map((method) => (
                <div
                  key={method}
                  className={`payment-method-button ${selectedPaymentMethod === method ? 'selected' : ''}`}
                  onClick={() => handlePaymentMethodSelect(method)}
                >
                  <div className="payment-method-icon">
                    {getPaymentMethodIcon(method)}
                  </div>
                  <div className="payment-method-name">
                    {getPaymentMethodName(method)}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="confirm-payment-button"
              onClick={handleConfirmPayment}
              disabled={!selectedPaymentMethod}
            >
              Confirmar Pagamento
            </button>
          </>
        ) : (
          <>
            <div className="payment-message">
              <p>Dirija-se ao caixa para finalizar seu pedido.</p>
            </div>

            <button
              className="confirm-payment-button"
              onClick={handleConfirmPayment}
            >
              Finalizar Pedido
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentScreen;
