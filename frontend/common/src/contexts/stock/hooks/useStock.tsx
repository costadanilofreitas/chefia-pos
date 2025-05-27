import React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Define stock types
export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowThreshold: number;
  category?: string;
  location?: string;
}

export interface StockMovement {
  id?: string;
  productId: string;
  type: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  timestamp: Date | string;
  userId?: string;
}

// Define context type
interface StockContextType {
  stockLevels: StockItem[];
  lowStockItems: StockItem[];
  refreshStock: () => Promise<StockItem[]>;
  updateStock: (productId: string, newQuantity: number) => Promise<boolean>;
  recordMovement: (movement: Omit<StockMovement, 'id' | 'timestamp'>) => Promise<string>;
  getMovements: (productId?: string) => Promise<StockMovement[]>;
  loading: boolean;
  error: string | null;
}

// Create context with default values
const StockContext = createContext<StockContextType | null>(null);

// Props for the provider component
interface StockProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for stock management functionality
 */
export const StockProvider: React.FC<StockProviderProps> = ({ children }) => {
  const [stockLevels, setStockLevels] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate low stock items
  const lowStockItems = stockLevels.filter(item => item.quantity <= item.lowThreshold);

  // Fetch stock levels from API or local storage
  const fetchStockLevels = useCallback(async (): Promise<StockItem[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from a backend API
      // For now, we'll simulate API call and return mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to get from localStorage first
      const storedStock = localStorage.getItem('stock_levels');
      let stockData: StockItem[] = [];
      
      if (storedStock) {
        stockData = JSON.parse(storedStock);
      } else {
        // Default mock data if nothing in localStorage
        stockData = [
          { id: 'prod1', name: 'Coffee', quantity: 100, unit: 'units', lowThreshold: 20 },
          { id: 'prod2', name: 'Milk', quantity: 5, unit: 'liters', lowThreshold: 10 },
          { id: 'prod3', name: 'Sugar', quantity: 15, unit: 'kg', lowThreshold: 5 },
          { id: 'prod4', name: 'Cups', quantity: 200, unit: 'units', lowThreshold: 50 },
          { id: 'prod5', name: 'Napkins', quantity: 500, unit: 'units', lowThreshold: 100 }
        ];
        
        // Save to localStorage
        localStorage.setItem('stock_levels', JSON.stringify(stockData));
      }
      
      setStockLevels(stockData);
      return stockData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update stock level for a product
  const updateStock = useCallback(async (productId: string, newQuantity: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call a backend API
      // For now, we'll update the local state and localStorage
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setStockLevels(prevStock => {
        const updatedStock = prevStock.map(item => 
          item.id === productId ? { ...item, quantity: newQuantity } : item
        );
        
        // Save to localStorage
        localStorage.setItem('stock_levels', JSON.stringify(updatedStock));
        
        return updatedStock;
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stock';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Record a stock movement
  const recordMovement = useCallback(async (movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would call a backend API
      // For now, we'll simulate API call and update local state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate movement ID
      const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create complete movement record
      const completeMovement: StockMovement = {
        ...movement,
        id: movementId,
        timestamp: new Date()
      };
      
      // Get existing movements
      const storedMovements = localStorage.getItem('stock_movements');
      const movements: StockMovement[] = storedMovements ? JSON.parse(storedMovements) : [];
      
      // Add new movement
      movements.unshift(completeMovement);
      
      // Save to localStorage
      localStorage.setItem('stock_movements', JSON.stringify(movements));
      
      // Update stock level based on movement
      const stockItem = stockLevels.find(item => item.id === movement.productId);
      if (stockItem) {
        const newQuantity = movement.type === 'increase' 
          ? stockItem.quantity + movement.quantity
          : stockItem.quantity - movement.quantity;
        
        await updateStock(movement.productId, newQuantity);
      }
      
      return movementId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record movement';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [stockLevels, updateStock]);

  // Get stock movements
  const getMovements = useCallback(async (productId?: string): Promise<StockMovement[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from a backend API
      // For now, we'll simulate API call and return from localStorage
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get movements from localStorage
      const storedMovements = localStorage.getItem('stock_movements');
      const movements: StockMovement[] = storedMovements ? JSON.parse(storedMovements) : [];
      
      // Filter by product ID if provided
      return productId 
        ? movements.filter(movement => movement.productId === productId)
        : movements;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get movements';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stock levels on mount
  useEffect(() => {
    fetchStockLevels().catch(err => {
      console.error('Error loading initial stock levels:', err);
    });
  }, [fetchStockLevels]);

  // Context value
  const contextValue: StockContextType = {
    stockLevels,
    lowStockItems,
    refreshStock: fetchStockLevels,
    updateStock,
    recordMovement,
    getMovements,
    loading,
    error
  };

  return (
    <StockContext.Provider value={contextValue}>
      {children}
    </StockContext.Provider>
  );
};

/**
 * Hook for accessing the stock context
 * @returns Stock context with methods for managing inventory
 */
export const useStock = (): StockContextType => {
  const context = useContext(StockContext);
  
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  
  return context;
};

export default useStock;
