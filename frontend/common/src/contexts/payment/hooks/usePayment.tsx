import React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Define payment types
export interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export interface PaymentData {
  amount: number;
  method: 'credit' | 'debit' | 'pix' | 'cash';
  cardDetails?: CardDetails;
  pixCode?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

export interface PaymentStatus {
  status: 'pending' | 'processing' | 'success' | 'error';
  message: string;
  transactionId?: string;
}

export interface PaymentRecord {
  id?: string;
  amount: number;
  method: string;
  transactionId: string;
  timestamp: Date | string;
  status: string;
}

// Define context type
interface PaymentContextType {
  processPayment: (data: PaymentData) => Promise<PaymentStatus>;
  getAvailablePaymentMethods: () => Promise<PaymentMethod[]>;
  validateCardNumber: (cardNumber: string) => boolean;
  paymentStatus: PaymentStatus | null;
  paymentHistory: PaymentRecord[];
  clearPaymentStatus: () => void;
}

// Create context with default values
const PaymentContext = createContext<PaymentContextType | null>(null);

// Props for the provider component
interface PaymentProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for payment functionality
 */
export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  // Load payment history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('payment_history');
      if (storedHistory) {
        setPaymentHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to load payment history from localStorage:', error);
    }
  }, []);

  // Save payment history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('payment_history', JSON.stringify(paymentHistory));
    } catch (error) {
      console.error('Failed to save payment history to localStorage:', error);
    }
  }, [paymentHistory]);

  // Process a payment
  const processPayment = useCallback(async (data: PaymentData): Promise<PaymentStatus> => {
    setPaymentStatus({ status: 'processing', message: 'Processando pagamento...' });
    
    try {
      // In a real implementation, this would call a payment gateway service
      // For now, we'll simulate a successful payment after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate payment processing
      if (data.method === 'credit' || data.method === 'debit') {
        if (!data.cardDetails) {
          throw new Error('Detalhes do cartão são obrigatórios');
        }
        
        // Validate card number (simple check)
        if (!validateCardNumber(data.cardDetails.number)) {
          throw new Error('Número de cartão inválido');
        }
      }
      
      // Generate a transaction ID
      const transactionId = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Add to payment history
      const newPayment: PaymentRecord = {
        amount: data.amount,
        method: data.method,
        transactionId,
        timestamp: new Date(),
        status: 'completed'
      };
      
      setPaymentHistory(prev => [newPayment, ...prev]);
      
      // Update payment status
      const successStatus: PaymentStatus = {
        status: 'success',
        message: 'Pagamento processado com sucesso',
        transactionId
      };
      
      setPaymentStatus(successStatus);
      return successStatus;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStatus: PaymentStatus = {
        status: 'error',
        message: `Erro ao processar pagamento: ${errorMessage}`
      };
      
      setPaymentStatus(errorStatus);
      return errorStatus;
    }
  }, []);

  // Get available payment methods
  const getAvailablePaymentMethods = useCallback(async (): Promise<PaymentMethod[]> => {
    // In a real implementation, this would fetch from a backend API
    // For now, we'll return a static list
    return [
      { id: 'credit', name: 'Cartão de Crédito', enabled: true },
      { id: 'debit', name: 'Cartão de Débito', enabled: true },
      { id: 'pix', name: 'PIX', enabled: true },
      { id: 'cash', name: 'Dinheiro', enabled: true }
    ];
  }, []);

  // Validate a card number using Luhn algorithm
  const validateCardNumber = useCallback((cardNumber: string): boolean => {
    // Remove spaces and non-digit characters
    const digits = cardNumber.replace(/\D/g, '');
    
    // Check if empty or not the right length
    if (!digits || digits.length < 13 || digits.length > 19) {
      return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    // Loop from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0;
  }, []);

  // Clear payment status
  const clearPaymentStatus = useCallback(() => {
    setPaymentStatus(null);
  }, []);

  // Context value
  const contextValue: PaymentContextType = {
    processPayment,
    getAvailablePaymentMethods,
    validateCardNumber,
    paymentStatus,
    paymentHistory,
    clearPaymentStatus
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};

/**
 * Hook for accessing the payment context
 * @returns Payment context with methods for processing payments
 */
export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  
  return context;
};

export default usePayment;
