import { useState, useCallback } from 'react';
import logger, { LogSource } from '../services/LocalLoggerService';

interface Supplier {
  id: string;
  [key: string]: any;
}

export const useSupplier = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  
  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/v1/suppliers', {
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
  
  const createSupplier = useCallback(async (data) => {
    const newSupplier = { ...data, id: Date.now().toString() };
    setSuppliers(prev => [...prev, newSupplier]);
    return newSupplier;
  }, []);
  
  const updateSupplier = useCallback(async (id: string, data: any) => {
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