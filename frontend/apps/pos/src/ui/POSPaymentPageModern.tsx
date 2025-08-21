import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAuth } from '../hooks/useAuth';
import { useCashier } from '../hooks/useCashier';
import { formatCurrency } from '../utils/formatters';
import '../index.css';

interface OrderItem {
  id: string;
  product_id?: string;
  productId?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  total_price?: number;
  subtotal?: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  type?: string;
  customer?: {
    name: string;
    phone: string;
    address?: string;
  };
}

interface PaymentOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  shortcut?: string;
}

export default function POSPaymentPageModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const { terminalId } = useParams();
  const { user } = useAuth();
  const { currentCashier } = useCashier();

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [splitPayments, setSplitPayments] = useState<Array<{id: string, method: string, amount: number}>>([]);
  const [isSplitPayment, setIsSplitPayment] = useState(false);

  // Payment options
  const paymentOptions: PaymentOption[] = [
    { id: 'cash', name: 'Dinheiro', icon: '💵', color: 'green', shortcut: 'F1' },
    { id: 'credit', name: 'Crédito', icon: '💳', color: 'blue', shortcut: 'F2' },
    { id: 'debit', name: 'Débito', icon: '💳', color: 'purple', shortcut: 'F3' },
    { id: 'pix', name: 'PIX', icon: '📱', color: 'cyan', shortcut: 'F4' },
    { id: 'voucher', name: 'Vale Refeição', icon: '🎟️', color: 'orange', shortcut: 'F5' },
  ];

  // Quick cash amounts
  const quickAmounts = [10, 20, 50, 100, 200];

  // Load order from navigation state
  useEffect(() => {
    const orderFromState = location.state?.order;
    
    if (orderFromState) {
      // Normalize order items structure
      const normalizedOrder = {
        ...orderFromState,
        items: orderFromState.items.map((item: OrderItem) => ({
          ...item,
          product_name: item.product_name || item.name,
          unit_price: item.unit_price || item.price,
          total_price: item.total_price || item.subtotal || (item.quantity * (item.unit_price || item.price || 0))
        }))
      };
      setOrder(normalizedOrder);
      setPaymentAmount(normalizedOrder.total.toFixed(2));
    } else {
      // No order available - redirect to main page
      navigate(`/pos/${terminalId}/main`);
    }
  }, [location.state]);

  // Calculate change
  useEffect(() => {
    if (order && selectedPayment === 'cash' && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      const change = amount - order.total;
      setChangeAmount(change > 0 ? change : 0);
    } else {
      setChangeAmount(0);
    }
  }, [paymentAmount, order, selectedPayment]);

  // Handle payment amount change
  const handlePaymentAmountChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1] && parts[1].length > 2) return;
    setPaymentAmount(cleanValue);
  }, []);

  // Handle keypad input
  const handleKeypadInput = useCallback((key: string) => {
    if (key === 'C') {
      setPaymentAmount('');
    } else if (key === '←') {
      setPaymentAmount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!paymentAmount.includes('.')) {
        setPaymentAmount(prev => prev + '.');
      }
    } else {
      setPaymentAmount(prev => prev + key);
    }
  }, [paymentAmount]);

  // Set quick amount
  const setQuickAmount = useCallback((amount: number) => {
    setPaymentAmount(amount.toFixed(2));
  }, []);

  // Process payment
  const processPayment = useCallback(async () => {
    if (!order) return;

    if (selectedPayment === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < order.total)) {
      alert('Valor insuficiente para pagamento em dinheiro');
      return;
    }

    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update order
      const updatedOrder = {
        ...order,
        status: 'completed',
        payment_status: 'paid',
        payment_method: isSplitPayment ? 'split' : selectedPayment
      };
      setOrder(updatedOrder);

      setPaymentComplete(true);
      setShowReceipt(true);

      // Print receipt after delay
      setTimeout(() => {
        console.log('Printing receipt...', {
          order: updatedOrder,
          payment: {
            method: selectedPayment,
            amount: parseFloat(paymentAmount),
            change: changeAmount
          }
        });
      }, 500);

    } catch (error) {
      console.error('Payment error:', error);
      alert('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  }, [order, selectedPayment, paymentAmount, changeAmount, isSplitPayment]);

  // Complete sale and go to next
  const completeSale = useCallback(() => {
    navigate(`/pos/${terminalId}/main`);
  }, [navigate, terminalId]);

  // Cancel payment
  const cancelPayment = useCallback(() => {
    if (confirm('Deseja cancelar o pagamento?')) {
      navigate(`/pos/${terminalId}/order`);
    }
  }, [navigate, terminalId]);

  // Add split payment
  const addSplitPayment = useCallback(() => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    
    const amount = parseFloat(paymentAmount);
    const totalSplit = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    
    if (order && totalSplit + amount > order.total) {
      alert('Valor total dos pagamentos excede o total do pedido');
      return;
    }

    setSplitPayments(prev => [...prev, {
      id: Date.now().toString(),
      method: selectedPayment,
      amount
    }]);
    setPaymentAmount('');
    
    // Check if split payment is complete
    if (order && totalSplit + amount >= order.total) {
      processPayment();
    }
  }, [paymentAmount, selectedPayment, splitPayments, order, processPayment]);

  // Remove split payment
  const removeSplitPayment = useCallback((id: string) => {
    setSplitPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  // Keyboard shortcuts
  useHotkeys('f1', () => setSelectedPayment('cash'));
  useHotkeys('f2', () => setSelectedPayment('credit'));
  useHotkeys('f3', () => setSelectedPayment('debit'));
  useHotkeys('f4', () => setSelectedPayment('pix'));
  useHotkeys('f5', () => setSelectedPayment('voucher'));
  useHotkeys('f10', processPayment);
  useHotkeys('escape', cancelPayment);

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-xl">Nenhum pedido selecionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Order Summary */}
      <div className="flex-1 flex flex-col p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex-1 flex flex-col">
          {/* Order Header */}
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Pagamento - Pedido #{order.id.slice(-6)}
              </h2>
              <div className="flex items-center gap-3">
                {order.type && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {order.type === 'local' ? '🍽️ Local' : 
                     order.type === 'delivery' ? '🛵 Entrega' :
                     order.type === 'takeout' ? '🥡 Retirada' : '💻 Online'}
                  </span>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            {order.customer && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cliente: {order.customer.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tel: {order.customer.phone}
                </p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {item.product_name || item.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity}x {formatCurrency(item.unit_price || item.price || 0)}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(item.total_price || item.subtotal || 0)}
                  </p>
                </div>
              ))}
            </div>

            {/* Split Payments */}
            {isSplitPayment && splitPayments.length > 0 && (
              <div className="mt-6 pt-6 border-t dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Pagamentos Parciais
                </h3>
                <div className="space-y-2">
                  {splitPayments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {paymentOptions.find(o => o.id === payment.method)?.icon}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {paymentOptions.find(o => o.id === payment.method)?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </span>
                        <button
                          onClick={() => removeSplitPayment(payment.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Total */}
          <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(order.total)}
                </span>
              </div>
              {isSplitPayment && splitPayments.length > 0 && (
                <>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-700 dark:text-gray-300">Pago:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(splitPayments.reduce((sum, p) => sum + p.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span className="text-gray-900 dark:text-white">Restante:</span>
                    <span className="text-red-600 dark:text-red-400">
                      {formatCurrency(order.total - splitPayments.reduce((sum, p) => sum + p.amount, 0))}
                    </span>
                  </div>
                </>
              )}
              {!isSplitPayment && (
                <div className="flex justify-between text-2xl font-bold pt-2">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Payment Methods */}
      <div className="w-[480px] bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Payment Methods */}
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Forma de Pagamento
            </h3>
            <button
              onClick={() => setIsSplitPayment(!isSplitPayment)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isSplitPayment 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isSplitPayment ? '✅ Pagamento Dividido' : '➗ Dividir Pagamento'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {paymentOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setSelectedPayment(option.id)}
                disabled={paymentComplete}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedPayment === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } ${paymentComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-3xl mb-2">{option.icon}</div>
                <div className="font-medium text-gray-900 dark:text-white">{option.name}</div>
                {option.shortcut && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {option.shortcut}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Amount Input */}
        {!paymentComplete && (
          <div className="p-6 border-b dark:border-gray-700">
            {selectedPayment === 'cash' && (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor Recebido
                </label>
                <input
                  type="text"
                  value={paymentAmount}
                  onChange={(e) => handlePaymentAmountChange(e.target.value)}
                  className="w-full px-4 py-3 text-2xl font-bold text-center bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.00"
                  disabled={paymentComplete}
                />

                {/* Quick amounts for cash */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setQuickAmount(amount)}
                      disabled={paymentComplete}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      R$ {amount}
                    </button>
                  ))}
                  <button
                    onClick={() => setPaymentAmount(order.total.toFixed(2))}
                    disabled={paymentComplete}
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    Valor Exato
                  </button>
                </div>

                {/* Change display */}
                {changeAmount > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Troco:
                      </span>
                      <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(changeAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Keypad for cash payment */}
            {selectedPayment === 'cash' && !paymentComplete && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '←'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleKeypadInput(key)}
                    className="p-4 text-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}

            {/* Other payment methods */}
            {selectedPayment !== 'cash' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">
                  {paymentOptions.find(o => o.id === selectedPayment)?.icon}
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  Aguardando confirmação do pagamento...
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatCurrency(order.total)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment Complete */}
        {paymentComplete && (
          <div className="p-6 flex-1 flex flex-col items-center justify-center">
            <div className="text-green-500 mb-4">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Pagamento Concluído!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedPayment === 'cash' && changeAmount > 0 && (
                <>Troco: {formatCurrency(changeAmount)}</>
              )}
            </p>
            <button
              onClick={completeSale}
              className="px-8 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Nova Venda
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {!paymentComplete && (
          <div className="p-6 border-t dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={cancelPayment}
                className="py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar (ESC)
              </button>
              {isSplitPayment ? (
                <button
                  onClick={addSplitPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="py-3 px-4 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar Pagamento
                </button>
              ) : (
                <button
                  onClick={processPayment}
                  disabled={loading || (selectedPayment === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < order.total))}
                  className="py-3 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processando...
                    </>
                  ) : (
                    <>Finalizar (F10)</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Recibo
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                Pedido: #{order.id.slice(-6)}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Data: {new Date().toLocaleString('pt-BR')}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Operador: {user?.name || user?.username}
              </p>
              <div className="border-t dark:border-gray-700 pt-2 mt-2">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Total: {formatCurrency(order.total)}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Pagamento: {paymentOptions.find(o => o.id === selectedPayment)?.name}
                </p>
                {changeAmount > 0 && (
                  <p className="text-gray-700 dark:text-gray-300">
                    Troco: {formatCurrency(changeAmount)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  console.log('Printing receipt...');
                  setShowReceipt(false);
                }}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}