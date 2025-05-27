import { createContext, useContext, useState, useCallback } from 'react';
import { useApi } from '@common/contexts/core/hooks/useApi';

// Create a context for payment
const PaymentContext = createContext(null);

/**
 * Provider component for the payment context
 */
export const PaymentProvider = ({ children }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const api = useApi();

  // Fetch available payment methods
  const fetchPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/payment/methods');
      setPaymentMethods(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch payment methods');
      console.error('Error fetching payment methods:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Process a payment
  const processPayment = useCallback(async (paymentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/payment/process', paymentData);
      
      // Add the new transaction to the list
      setTransactions(prev => [...prev, response.data]);
      
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to process payment');
      console.error('Error processing payment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Fetch payment transactions
  const fetchTransactions = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/payment/transactions', { params: filters });
      setTransactions(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Refund a payment
  const refundPayment = useCallback(async (transactionId, amount, reason) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/payment/refund/${transactionId}`, { amount, reason });
      
      // Update the transaction in the list
      setTransactions(prev => 
        prev.map(tx => tx.id === transactionId ? { ...tx, ...response.data } : tx)
      );
      
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to refund payment');
      console.error('Error refunding payment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Split payment between multiple methods
  const splitPayment = useCallback(async (orderId, paymentSplits) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/api/payment/split/${orderId}`, { paymentSplits });
      
      // Add all new transactions to the list
      setTransactions(prev => [...prev, ...response.data]);
      
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to process split payment');
      console.error('Error processing split payment:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Get payment receipt
  const getReceipt = useCallback(async (transactionId, format = 'pdf') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/payment/receipt/${transactionId}`, {
        params: { format },
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${transactionId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (err) {
      setError(err.message || 'Failed to get receipt');
      console.error('Error getting receipt:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const contextValue = {
    paymentMethods,
    transactions,
    isLoading,
    error,
    fetchPaymentMethods,
    processPayment,
    fetchTransactions,
    refundPayment,
    splitPayment,
    getReceipt
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};

/**
 * Hook for accessing the payment context
 * @returns {Object} Payment context with methods for processing payments
 */
export const usePayment = () => {
  const context = useContext(PaymentContext);
  
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  
  return context;
};

export default usePayment;
