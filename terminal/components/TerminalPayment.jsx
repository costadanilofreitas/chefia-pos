import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faMoneyBill, faMobileAlt, faQrcode, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

const TerminalPayment = ({ tableId, onComplete, onCancel }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carregar dados do pedido
  React.useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setIsLoading(true);
        
        // Simular atraso de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Dados simulados
        const mockTotal = 127.50;
        
        setOrderTotal(mockTotal);
        setAmount(mockTotal);
      } catch (err) {
        setError('Erro ao carregar dados do pedido: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrderData();
  }, [tableId]);
  
  // Métodos de pagamento disponíveis
  const paymentMethods = [
    { id: 'credit', name: 'Cartão de Crédito', icon: faCreditCard },
    { id: 'debit', name: 'Cartão de Débito', icon: faCreditCard },
    { id: 'cash', name: 'Dinheiro', icon: faMoneyBill },
    { id: 'pix', name: 'PIX', icon: faQrcode }
  ];
  
  // Processar pagamento
  const processPayment = async () => {
    if (!selectedMethod) {
      setError('Selecione um método de pagamento');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Em um ambiente real, integraríamos com a API da maquininha
      console.log('Pagamento processado:', {
        table_id: tableId,
        method: selectedMethod,
        amount: amount
      });
      
      onComplete();
    } catch (err) {
      setError('Erro ao processar pagamento: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (isLoading) {
    return <div className="terminal-loading">Carregando dados do pedido...</div>;
  }
  
  return (
    <div className="terminal-payment">
      <div className="terminal-payment-header">
        <h2>Pagamento - Mesa {tableId}</h2>
      </div>
      
      {error && <div className="terminal-error">{error}</div>}
      
      <div className="terminal-payment-amount">
        <div className="terminal-payment-amount-label">Valor Total:</div>
        <div className="terminal-payment-amount-value">R$ {orderTotal.toFixed(2)}</div>
      </div>
      
      <div className="terminal-payment-methods">
        {paymentMethods.map(method => (
          <div
            key={method.id}
            className={`terminal-payment-method ${selectedMethod === method.id ? 'selected' : ''}`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <div className="terminal-payment-method-icon">
              <FontAwesomeIcon icon={method.icon} />
            </div>
            <div className="terminal-payment-method-name">{method.name}</div>
          </div>
        ))}
      </div>
      
      {selectedMethod === 'cash' && (
        <div className="terminal-payment-cash">
          <div className="terminal-payment-cash-label">Valor Recebido:</div>
          <input
            type="number"
            className="terminal-payment-cash-input"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            min={orderTotal}
            step="0.01"
          />
          
          {amount > orderTotal && (
            <div className="terminal-payment-change">
              <div className="terminal-payment-change-label">Troco:</div>
              <div className="terminal-payment-change-value">
                R$ {(amount - orderTotal).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="terminal-payment-actions">
        <button
          className="terminal-button terminal-button-secondary"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <FontAwesomeIcon icon={faTimes} /> Cancelar
        </button>
        <button
          className="terminal-button terminal-button-primary"
          onClick={processPayment}
          disabled={isProcessing || !selectedMethod}
        >
          <FontAwesomeIcon icon={isProcessing ? faMobileAlt : faCheck} />
          {isProcessing ? 'Processando...' : 'Finalizar Pagamento'}
        </button>
      </div>
    </div>
  );
};

export default TerminalPayment;
