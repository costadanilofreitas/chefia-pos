import { useState, useCallback } from 'react';

export const useStock = () => {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/v1/stock', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load stocks');
      const data = await response.json();
      setStocks(data);
    } catch (err) {
      console.error('Error loading stocks:', err);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const updateStock = useCallback(async (id: string, data: any) => {
    setStocks(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);
  
  return {
    stocks,
    loading,
    loadStocks,
    updateStock
  };
};