import { useState, useCallback } from 'react';
import logger, { LogSource } from '../services/LocalLoggerService';
import { buildApiUrl } from '../config/api';

interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  notes?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SupplierCreateData {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  notes?: string;
}

interface SupplierUpdateData {
  name?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  notes?: string;
  active?: boolean;
}

export const useSupplier = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  
  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/v1/suppliers'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      await logger.error('Erro ao carregar fornecedores', { error }, 'useSupplier', LogSource.SUPPLIER);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const createSupplier = useCallback(async (data: SupplierCreateData): Promise<Supplier> => {
    const newSupplier: Supplier = { ...data, id: Date.now().toString(), name: data.name };
    setSuppliers(prev => [...prev, newSupplier]);
    return newSupplier;
  }, []);
  
  const updateSupplier = useCallback(async (id: string, data: SupplierUpdateData): Promise<void> => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);
  
  const deleteSupplier = useCallback(async (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);
  
  return {
    suppliers,
    loading,
    loadSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier
  };
};