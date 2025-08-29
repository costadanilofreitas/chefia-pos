import { renderHook, act, waitFor } from '@testing-library/react';
import { useKDSOrders } from '../../src/hooks/useKDSOrders';
import { kdsService } from '../../src/services/kdsService';
import { offlineStorage } from '../../src/services/offlineStorage';
import { logger } from '../../src/services/logger';
import { createMockOrder } from '../utils/testUtils';

// Mock dependencies
jest.mock('../../src/services/kdsService');
jest.mock('../../src/services/offlineStorage');
jest.mock('../../src/services/logger');

describe('useKDSOrders Hook', () => {
  const mockOrders = [
    createMockOrder({ 
      id: 1, 
      status: 'pending',
      items: [
        { item_id: 1, name: 'Item 1', status: 'pending', station: 'kitchen', quantity: 1, price: 10 },
        { item_id: 2, name: 'Item 2', status: 'pending', station: 'bar', quantity: 2, price: 15 }
      ]
    }),
    createMockOrder({ 
      id: 2, 
      status: 'preparing',
      items: [
        { item_id: 3, name: 'Item 3', status: 'preparing', station: 'kitchen', quantity: 1, price: 20 }
      ]
    }),
    createMockOrder({ 
      id: 3, 
      status: 'ready',
      items: [
        { item_id: 4, name: 'Item 4', status: 'ready', station: 'kitchen', quantity: 1, price: 25 }
      ]
    })
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (kdsService.getOrders as jest.Mock).mockResolvedValue(mockOrders);
    (kdsService.getOrdersByStation as jest.Mock).mockResolvedValue(mockOrders.filter(o => 
      o.items.some(i => i.station === 'kitchen')
    ));
    (kdsService.updateOrderStatus as jest.Mock).mockResolvedValue({});
    (kdsService.updateItemStatus as jest.Mock).mockResolvedValue({});
    
    (offlineStorage.saveOrder as jest.Mock).mockResolvedValue(undefined);
    (offlineStorage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);
    
    (logger.error as jest.Mock).mockImplementation(() => {});
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Order Loading', () => {
    it('should load all orders when station is "all"', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      expect(result.current.loading).toBe(false);
      expect(result.current.orders).toEqual([]);

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(kdsService.getOrders).toHaveBeenCalled();
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load orders by station', async () => {
      const kitchenOrders = mockOrders.filter(o => 
        o.items.some(i => i.station === 'kitchen')
      );
      (kdsService.getOrdersByStation as jest.Mock).mockResolvedValue(kitchenOrders);

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'kitchen',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(kdsService.getOrdersByStation).toHaveBeenCalledWith('kitchen');
      expect(result.current.orders).toEqual(kitchenOrders);
    });

    it('should cache orders for offline use', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(offlineStorage.saveOrder).toHaveBeenCalledTimes(mockOrders.length);
      mockOrders.forEach(order => {
        expect(offlineStorage.saveOrder).toHaveBeenCalledWith(order);
      });
    });

    it('should load from cache when offline', async () => {
      (navigator as any).onLine = false;

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(offlineStorage.getAllOrders).toHaveBeenCalled();
      expect(kdsService.getOrders).not.toHaveBeenCalled();
      expect(result.current.orders).toEqual(mockOrders);
    });

    it('should filter cached orders by station when offline', async () => {
      (navigator as any).onLine = false;
      const kitchenOrders = mockOrders.filter(o => 
        o.items.some(i => i.station === 'kitchen')
      );

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'kitchen',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.orders).toEqual(kitchenOrders);
    });

    it('should handle loading errors gracefully', async () => {
      const error = new Error('Network error');
      (kdsService.getOrders as jest.Mock).mockRejectedValue(error);
      (offlineStorage.getAllOrders as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.error).toBe('Não foi possível carregar os pedidos');
      expect(logger.error).toHaveBeenCalledWith('Error loading orders', error, 'useKDSOrders');
    });

    it('should use cached data as fallback on error', async () => {
      (kdsService.getOrders as jest.Mock).mockRejectedValue(new Error('API error'));
      (offlineStorage.getAllOrders as jest.Mock).mockResolvedValue(mockOrders);

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.error).toBe('Usando dados em cache (modo offline)');
    });

    it('should set loading state correctly', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      expect(result.current.loading).toBe(false);

      const loadPromise = act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.loading).toBe(true);

      await loadPromise;

      expect(result.current.loading).toBe(false);
    });
  });

  describe('New Order Detection', () => {
    it('should detect and notify about new orders', async () => {
      const onNewOrder = jest.fn();
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder
      }));

      // Initial load
      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).not.toHaveBeenCalled();

      // Add new order
      const newOrder = createMockOrder({ id: 4, status: 'pending' });
      (kdsService.getOrders as jest.Mock).mockResolvedValue([...mockOrders, newOrder]);

      // Reload orders
      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).toHaveBeenCalledWith(newOrder);
    });

    it('should detect multiple new orders', async () => {
      const onNewOrder = jest.fn();
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder
      }));

      // Initial load
      await act(async () => {
        await result.current.loadOrders();
      });

      // Add multiple new orders
      const newOrder1 = createMockOrder({ id: 4 });
      const newOrder2 = createMockOrder({ id: 5 });
      (kdsService.getOrders as jest.Mock).mockResolvedValue([
        ...mockOrders,
        newOrder1,
        newOrder2
      ]);

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).toHaveBeenCalledTimes(2);
      expect(onNewOrder).toHaveBeenCalledWith(newOrder1);
      expect(onNewOrder).toHaveBeenCalledWith(newOrder2);
    });

    it('should not call onNewOrder on first load', async () => {
      const onNewOrder = jest.fn();
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).not.toHaveBeenCalled();
    });

    it('should handle missing onNewOrder callback', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all'
      }));

      // Initial load
      await act(async () => {
        await result.current.loadOrders();
      });

      // Add new order
      const newOrder = createMockOrder({ id: 4 });
      (kdsService.getOrders as jest.Mock).mockResolvedValue([...mockOrders, newOrder]);

      // Should not throw
      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.orders).toHaveLength(4);
    });
  });

  describe('Order Status Updates', () => {
    it('should update order status online', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateOrderStatus(1, 'preparing');
      });

      expect(kdsService.updateOrderStatus).toHaveBeenCalledWith(1, 'preparing');
      expect(result.current.orders[0].status).toBe('preparing');
    });

    it('should update order status offline', async () => {
      (navigator as any).onLine = false;
      
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateOrderStatus(1, 'preparing');
      });

      expect(kdsService.updateOrderStatus).not.toHaveBeenCalled();
      expect(offlineStorage.saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          status: 'preparing',
          synced: false
        })
      );
      expect(result.current.orders[0].status).toBe('preparing');
    });

    it('should handle order status update errors', async () => {
      const error = new Error('Update failed');
      (kdsService.updateOrderStatus as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await expect(
        act(async () => {
          await result.current.updateOrderStatus(1, 'preparing');
        })
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error updating order status',
        error,
        'useKDSOrders'
      );
    });

    it('should update order status optimistically', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      // Make API call slow
      (kdsService.updateOrderStatus as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      act(() => {
        result.current.updateOrderStatus(1, 'preparing');
      });

      // Status should update immediately
      expect(result.current.orders[0].status).toBe('preparing');
    });
  });

  describe('Item Status Updates', () => {
    it('should update item status online', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(1, 1, 'ready');
      });

      expect(kdsService.updateItemStatus).toHaveBeenCalledWith(1, 1, 'ready');
      
      const updatedOrder = result.current.orders[0];
      const updatedItem = updatedOrder.items.find(i => i.item_id === 1);
      expect(updatedItem?.status).toBe('ready');
    });

    it('should update item status offline', async () => {
      (navigator as any).onLine = false;
      
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(1, 1, 'ready');
      });

      expect(kdsService.updateItemStatus).not.toHaveBeenCalled();
      expect(offlineStorage.saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              item_id: 1,
              status: 'ready'
            })
          ]),
          synced: false
        })
      );
    });

    it('should handle item status update errors', async () => {
      const error = new Error('Update failed');
      (kdsService.updateItemStatus as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await expect(
        act(async () => {
          await result.current.updateItemStatus(1, 1, 'ready');
        })
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error updating item status',
        error,
        'useKDSOrders'
      );
    });

    it('should update item status optimistically', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      // Make API call slow
      (kdsService.updateItemStatus as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      act(() => {
        result.current.updateItemStatus(1, 1, 'ready');
      });

      // Status should update immediately
      const updatedOrder = result.current.orders[0];
      const updatedItem = updatedOrder.items.find(i => i.item_id === 1);
      expect(updatedItem?.status).toBe('ready');
    });

    it('should handle non-existent order for item update', async () => {
      (navigator as any).onLine = false;
      
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(999, 1, 'ready');
      });

      // Should not save to storage if order doesn't exist
      const saveOrderCalls = (offlineStorage.saveOrder as jest.Mock).mock.calls;
      const relevantCall = saveOrderCalls.find(call => call[0]?.id === 999);
      expect(relevantCall).toBeUndefined();
    });
  });

  describe('Statistics Computation', () => {
    it('should compute order statistics correctly', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.stats).toEqual({
        total: 3,
        pending: 1,
        preparing: 1,
        ready: 1
      });
    });

    it('should update statistics when orders change', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateOrderStatus(1, 'preparing');
      });

      expect(result.current.stats).toEqual({
        total: 3,
        pending: 0,
        preparing: 2,
        ready: 1
      });
    });

    it('should handle empty orders list', async () => {
      (kdsService.getOrders as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.stats).toEqual({
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0
      });
    });
  });

  describe('Error Handling', () => {
    it('should expose setError function', () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      act(() => {
        result.current.setError('Custom error message');
      });

      expect(result.current.error).toBe('Custom error message');
    });

    it('should clear error when loading succeeds', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      act(() => {
        result.current.setError('Previous error');
      });

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear error at start of loading', async () => {
      const { result } = renderHook(() => useKDSOrders({ 
        selectedStation: 'all',
        onNewOrder: jest.fn()
      }));

      act(() => {
        result.current.setError('Previous error');
      });

      // Make the load take time
      (kdsService.getOrders as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockOrders), 100))
      );

      const loadPromise = act(async () => {
        await result.current.loadOrders();
      });

      // Error should be cleared immediately
      expect(result.current.error).toBeNull();

      await loadPromise;
    });
  });

  describe('Hook Re-rendering', () => {
    it('should reload orders when selectedStation changes', async () => {
      const { result, rerender } = renderHook(
        ({ station }) => useKDSOrders({ 
          selectedStation: station,
          onNewOrder: jest.fn()
        }),
        { initialProps: { station: 'all' } }
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(kdsService.getOrders).toHaveBeenCalledTimes(1);

      rerender({ station: 'kitchen' });

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(kdsService.getOrdersByStation).toHaveBeenCalledWith('kitchen');
    });

    it('should preserve onNewOrder callback reference', async () => {
      const onNewOrder1 = jest.fn();
      const onNewOrder2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ callback }) => useKDSOrders({ 
          selectedStation: 'all',
          onNewOrder: callback
        }),
        { initialProps: { callback: onNewOrder1 } }
      );

      // Initial load
      await act(async () => {
        await result.current.loadOrders();
      });

      // Add new order
      const newOrder = createMockOrder({ id: 4 });
      (kdsService.getOrders as jest.Mock).mockResolvedValue([...mockOrders, newOrder]);

      // Change callback
      rerender({ callback: onNewOrder2 });

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder1).not.toHaveBeenCalled();
      expect(onNewOrder2).toHaveBeenCalledWith(newOrder);
    });
  });
});