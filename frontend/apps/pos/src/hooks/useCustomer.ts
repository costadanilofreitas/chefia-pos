import { useState, useEffect, useCallback } from 'react';
import { customerService, Customer, CustomerCreate, CustomerUpdate } from '../services/CustomerService';

interface UseCustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
}

interface UseCustomerActions {
  // CRUD operations
  loadCustomers: (search?: string) => Promise<void>;
  getCustomer: (customerId: string) => Promise<Customer | null>;
  createCustomer: (customerData: CustomerCreate) => Promise<Customer | null>;
  updateCustomer: (customerId: string, customerData: CustomerUpdate) => Promise<Customer | null>;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  
  // Search operations
  searchByPhone: (phone: string) => Promise<Customer[]>;
  searchByEmail: (email: string) => Promise<Customer[]>;
  
  // Loyalty operations
  addLoyaltyPoints: (customerId: string, points: number) => Promise<Customer | null>;
  redeemLoyaltyPoints: (customerId: string, points: number) => Promise<Customer | null>;
  
  // State management
  setCurrentCustomer: (customer: Customer | null) => void;
  clearError: () => void;
  refreshCustomers: () => Promise<void>;
}

export const useCustomer = (): UseCustomerState & UseCustomerActions => {
  const [state, setState] = useState<UseCustomerState>({
    customers: [],
    currentCustomer: null,
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    error: null
  });

  // Load customers with optional search
  const loadCustomers = useCallback(async (search?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const customers = await customerService.listCustomers(search);
      setState(prev => ({ 
        ...prev, 
        customers,
        loading: false 
      }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao carregar clientes' 
      }));
    }
  }, []);

  // Get specific customer
  const getCustomer = useCallback(async (customerId: string): Promise<Customer | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const customer = await customerService.getCustomer(customerId);
      setState(prev => ({ 
        ...prev, 
        currentCustomer: customer,
        loading: false 
      }));
      return customer;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar cliente' 
      }));
      return null;
    }
  }, []);

  // Create new customer
  const createCustomer = useCallback(async (customerData: CustomerCreate): Promise<Customer | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));
    
    try {
      const newCustomer = await customerService.createCustomer(customerData);
      setState(prev => ({ 
        ...prev, 
        customers: [...prev.customers, newCustomer],
        creating: false 
      }));
      return newCustomer;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        creating: false, 
        error: error.message || 'Erro ao criar cliente' 
      }));
      return null;
    }
  }, []);

  // Update existing customer
  const updateCustomer = useCallback(async (customerId: string, customerData: CustomerUpdate): Promise<Customer | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedCustomer = await customerService.updateCustomer(customerId, customerData);
      setState(prev => ({ 
        ...prev, 
        customers: prev.customers.map(c => c.id === customerId ? updatedCustomer : c),
        currentCustomer: prev.currentCustomer?.id === customerId ? updatedCustomer : prev.currentCustomer,
        updating: false 
      }));
      return updatedCustomer;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao atualizar cliente' 
      }));
      return null;
    }
  }, []);

  // Delete customer
  const deleteCustomer = useCallback(async (customerId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, deleting: true, error: null }));
    
    try {
      await customerService.deleteCustomer(customerId);
      setState(prev => ({ 
        ...prev, 
        customers: prev.customers.filter(c => c.id !== customerId),
        currentCustomer: prev.currentCustomer?.id === customerId ? null : prev.currentCustomer,
        deleting: false 
      }));
      return true;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        deleting: false, 
        error: error.message || 'Erro ao excluir cliente' 
      }));
      return false;
    }
  }, []);

  // Search by phone
  const searchByPhone = useCallback(async (phone: string): Promise<Customer[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const customers = await customerService.searchByPhone(phone);
      setState(prev => ({ ...prev, loading: false }));
      return customers;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar por telefone' 
      }));
      return [];
    }
  }, []);

  // Search by email
  const searchByEmail = useCallback(async (email: string): Promise<Customer[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const customers = await customerService.searchByEmail(email);
      setState(prev => ({ ...prev, loading: false }));
      return customers;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Erro ao buscar por email' 
      }));
      return [];
    }
  }, []);

  // Add loyalty points
  const addLoyaltyPoints = useCallback(async (customerId: string, points: number): Promise<Customer | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedCustomer = await customerService.addLoyaltyPoints(customerId, points);
      setState(prev => ({ 
        ...prev, 
        customers: prev.customers.map(c => c.id === customerId ? updatedCustomer : c),
        currentCustomer: prev.currentCustomer?.id === customerId ? updatedCustomer : prev.currentCustomer,
        updating: false 
      }));
      return updatedCustomer;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao adicionar pontos' 
      }));
      return null;
    }
  }, []);

  // Redeem loyalty points
  const redeemLoyaltyPoints = useCallback(async (customerId: string, points: number): Promise<Customer | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    
    try {
      const updatedCustomer = await customerService.redeemLoyaltyPoints(customerId, points);
      setState(prev => ({ 
        ...prev, 
        customers: prev.customers.map(c => c.id === customerId ? updatedCustomer : c),
        currentCustomer: prev.currentCustomer?.id === customerId ? updatedCustomer : prev.currentCustomer,
        updating: false 
      }));
      return updatedCustomer;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        updating: false, 
        error: error.message || 'Erro ao resgatar pontos' 
      }));
      return null;
    }
  }, []);

  // Set current customer
  const setCurrentCustomer = useCallback((customer: Customer | null) => {
    setState(prev => ({ ...prev, currentCustomer: customer }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh customers
  const refreshCustomers = useCallback(async () => {
    await loadCustomers();
  }, [loadCustomers]);

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return {
    ...state,
    loadCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    searchByPhone,
    searchByEmail,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
    setCurrentCustomer,
    clearError,
    refreshCustomers
  };
};

