import { useStock } from '../hooks/useStock';
import { render, act } from '@testing-library/react';
import { StockProvider } from '../StockProvider';

// Mock stock service
jest.mock('../../../services/stockService', () => ({
  getStockLevels: jest.fn().mockResolvedValue({
    products: [
      { id: 'prod1', name: 'Coffee', quantity: 100, unit: 'units', lowThreshold: 20 },
      { id: 'prod2', name: 'Milk', quantity: 5, unit: 'liters', lowThreshold: 10 },
      { id: 'prod3', name: 'Sugar', quantity: 15, unit: 'kg', lowThreshold: 5 }
    ]
  }),
  updateStockLevel: jest.fn().mockResolvedValue({ success: true }),
  recordStockMovement: jest.fn().mockResolvedValue({ success: true, movementId: 'mov-123' }),
  getStockMovements: jest.fn().mockResolvedValue([
    { id: 'mov-1', productId: 'prod1', type: 'decrease', quantity: 5, reason: 'sale', timestamp: '2025-05-27T06:00:00Z' },
    { id: 'mov-2', productId: 'prod2', type: 'increase', quantity: 10, reason: 'restock', timestamp: '2025-05-27T05:00:00Z' }
  ])
}));

// Test component that uses the hook
const TestComponent = ({ initialAction = null }) => {
  const { 
    stockLevels,
    lowStockItems,
    refreshStock,
    updateStock,
    recordMovement,
    getMovements,
    loading,
    error
  } = useStock();
  
  if (initialAction === 'refresh') {
    refreshStock();
  } else if (initialAction === 'update') {
    updateStock('prod1', 90);
  } else if (initialAction === 'record') {
    recordMovement({
      productId: 'prod1',
      type: 'decrease',
      quantity: 10,
      reason: 'sale'
    });
  } else if (initialAction === 'movements') {
    getMovements();
  }
  
  return <div>Test Component</div>;
};

describe('useStock Hook', () => {
  test('should load stock levels on mount', async () => {
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    const { stockLevels, loading } = useStock();
    
    expect(loading).toBe(false);
    expect(stockLevels).toHaveLength(3);
    expect(stockLevels[0].name).toBe('Coffee');
    expect(stockLevels[1].name).toBe('Milk');
    expect(stockLevels[2].name).toBe('Sugar');
  });
  
  test('should identify low stock items', async () => {
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    const { lowStockItems } = useStock();
    
    expect(lowStockItems).toHaveLength(1);
    expect(lowStockItems[0].name).toBe('Milk');
    expect(lowStockItems[0].quantity).toBe(5);
    expect(lowStockItems[0].lowThreshold).toBe(10);
  });
  
  test('should refresh stock levels', async () => {
    const stockService = require('../../../services/stockService');
    
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    // Clear previous calls
    stockService.getStockLevels.mockClear();
    
    const { refreshStock, loading } = useStock();
    
    await act(async () => {
      await refreshStock();
    });
    
    expect(stockService.getStockLevels).toHaveBeenCalledTimes(1);
  });
  
  test('should update stock level', async () => {
    const stockService = require('../../../services/stockService');
    
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    const { updateStock, stockLevels } = useStock();
    
    await act(async () => {
      await updateStock('prod1', 90);
    });
    
    expect(stockService.updateStockLevel).toHaveBeenCalledWith('prod1', 90);
    
    // Mock the updated stock levels
    stockService.getStockLevels.mockResolvedValueOnce({
      products: [
        { id: 'prod1', name: 'Coffee', quantity: 90, unit: 'units', lowThreshold: 20 },
        { id: 'prod2', name: 'Milk', quantity: 5, unit: 'liters', lowThreshold: 10 },
        { id: 'prod3', name: 'Sugar', quantity: 15, unit: 'kg', lowThreshold: 5 }
      ]
    });
    
    // Refresh to get updated values
    const { refreshStock } = useStock();
    
    await act(async () => {
      await refreshStock();
    });
    
    expect(useStock().stockLevels[0].quantity).toBe(90);
  });
  
  test('should record stock movement', async () => {
    const stockService = require('../../../services/stockService');
    
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    const { recordMovement } = useStock();
    
    await act(async () => {
      await recordMovement({
        productId: 'prod1',
        type: 'decrease',
        quantity: 10,
        reason: 'sale'
      });
    });
    
    expect(stockService.recordStockMovement).toHaveBeenCalledWith({
      productId: 'prod1',
      type: 'decrease',
      quantity: 10,
      reason: 'sale'
    });
  });
  
  test('should get stock movements', async () => {
    const stockService = require('../../../services/stockService');
    
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    const { getMovements } = useStock();
    
    let movements;
    await act(async () => {
      movements = await getMovements();
    });
    
    expect(stockService.getStockMovements).toHaveBeenCalled();
    expect(movements).toHaveLength(2);
    expect(movements[0].id).toBe('mov-1');
    expect(movements[1].id).toBe('mov-2');
  });
  
  test('should handle errors gracefully', async () => {
    const stockService = require('../../../services/stockService');
    stockService.getStockLevels.mockRejectedValueOnce(new Error('Failed to fetch stock'));
    
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    const { error } = useStock();
    
    expect(error).toBe('Failed to fetch stock');
  });
  
  test('should handle update errors', async () => {
    const stockService = require('../../../services/stockService');
    
    await act(async () => {
      render(
        <StockProvider>
          <TestComponent />
        </StockProvider>
      );
    });
    
    stockService.updateStockLevel.mockRejectedValueOnce(new Error('Failed to update stock'));
    
    const { updateStock } = useStock();
    
    await act(async () => {
      try {
        await updateStock('prod1', 90);
      } catch (e) {
        // Expected to throw
      }
    });
    
    expect(useStock().error).toBe('Failed to update stock');
  });
});
