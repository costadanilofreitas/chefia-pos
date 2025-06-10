import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useApi } from '@common/contexts/core/hooks/useApi';

// Create a context for stock management
const StockContext = createContext(null);

/**
 * Provider component for the stock context
 */
export const StockProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const api = useApi();

  // Fetch inventory items
  const fetchInventory = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/stock/inventory', { params: filters });
      setInventory(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Fetch inventory categories
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/stock/categories');
      setCategories(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch categories');
      console.error('Error fetching categories:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/stock/suppliers');
      setSuppliers(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch suppliers');
      console.error('Error fetching suppliers:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Add new inventory item
  const addInventoryItem = useCallback(async (itemData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/stock/inventory', itemData);
      setInventory(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to add inventory item');
      console.error('Error adding inventory item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Update inventory item
  const updateInventoryItem = useCallback(async (itemId, itemData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/api/stock/inventory/${itemId}`, itemData);
      setInventory(prev => 
        prev.map(item => item.id === itemId ? { ...item, ...response.data } : item)
      );
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to update inventory item');
      console.error('Error updating inventory item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Delete inventory item
  const deleteInventoryItem = useCallback(async (itemId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete(`/api/stock/inventory/${itemId}`);
      setInventory(prev => prev.filter(item => item.id !== itemId));
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete inventory item');
      console.error('Error deleting inventory item:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Record stock movement (in/out)
  const recordStockMovement = useCallback(async (movementData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/stock/movements', movementData);
      
      // Update affected inventory items
      if (response.data.affectedItems && response.data.affectedItems.length > 0) {
        setInventory(prev => {
          const updated = [...prev];
          response.data.affectedItems.forEach(updatedItem => {
            const index = updated.findIndex(item => item.id === updatedItem.id);
            if (index !== -1) {
              updated[index] = { ...updated[index], ...updatedItem };
            }
          });
          return updated;
        });
      }
      
      return response.data;
    } catch (err) {
      setError(err.message || 'Failed to record stock movement');
      console.error('Error recording stock movement:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Generate inventory report
  const generateInventoryReport = useCallback(async (reportType, filters = {}, format = 'pdf') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/stock/reports/${reportType}`, {
        params: { ...filters, format },
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_report_${reportType}_${new Date().toISOString()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (err) {
      setError(err.message || 'Failed to generate inventory report');
      console.error('Error generating inventory report:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  // Load initial data
  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchSuppliers();
  }, [fetchInventory, fetchCategories, fetchSuppliers]);

  const contextValue = {
    inventory,
    categories,
    suppliers,
    isLoading,
    error,
    fetchInventory,
    fetchCategories,
    fetchSuppliers,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordStockMovement,
    generateInventoryReport
  };

  return (
    <StockContext.Provider value={contextValue}>
      {children}
    </StockContext.Provider>
  );
};

/**
 * Hook for accessing the stock context
 * @returns {Object} Stock context with methods for managing inventory
 */
export const useStock = () => {
  const context = useContext(StockContext);
  
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  
  return context;
};

export default useStock;
