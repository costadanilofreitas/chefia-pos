import { useState, useCallback } from 'react';

export const useSupplier = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
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
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const createSupplier = useCallback(async (data: any) => {
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