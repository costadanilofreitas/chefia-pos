/**
 * Comprehensive tests for useKDSOrders hook
 * Tests offline support, order updates, error handling, statistics
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKDSOrders } from '../../hooks/useKDSOrders';
import { kdsService, Order } from '../../services/kdsService';
import { offlineStorage } from '../../services/offlineStorage';
import { logger } from '../../services/logger';

// Mock dependencies
jest.mock('../../services/kdsService');
jest.mock('../../services/offlineStorage');
jest.mock('../../services/logger');

const mockKdsService = kdsService as jest.Mocked<typeof kdsService>;
const mockOfflineStorage = offlineStorage as jest.Mocked<typeof offlineStorage>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Sample test data
const createMockOrder = (id: string | number, status = 'pending'): Order => ({
  id,
  order_number: `ORD-${id}`,
  status,
  priority: 'normal',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [
    {
      item_id: `item-${id}-1`,
      name: `Item 1 for Order ${id}`,
      quantity: 2,
      notes: '',
      station: 'Kitchen-1',
      status: 'pending',
      created_at: new Date().toISOString()
    },
    {
      item_id: `item-${id}-2`,
      name: `Item 2 for Order ${id}`,
      quantity: 1,
      notes: 'Extra spicy',
      station: 'Kitchen-2',
      status: 'pending',
      created_at: new Date().toISOString()
    }
  ],
  customer_name: `Customer ${id}`,
  table_number: id.toString(),
  notes: '',
  total_amount: 100 + Number(id),
  payment_status: 'pending',
  synced: true
});

describe('useKDSOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockKdsService.getOrders.mockResolvedValue([]);
    mockKdsService.getOrdersByStation.mockResolvedValue([]);
    mockKdsService.updateOrderStatus.mockResolvedValue(undefined as any);
    mockKdsService.updateItemStatus.mockResolvedValue(undefined as any);
    
    mockOfflineStorage.getAllOrders.mockResolvedValue([]);
    mockOfflineStorage.saveOrder.mockResolvedValue(undefined);
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Initial State', () => {
    it('should initialize with empty orders and loading false', () => {
      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      expect(result.current.orders).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.stats).toEqual({
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0
      });
    });
  });

  describe('Loading Orders - Online Mode', () => {
    it('should load all orders when station is "all"', async () => {
      const mockOrders = [
        createMockOrder(1),
        createMockOrder(2, 'preparing'),
        createMockOrder(3, 'ready')
      ];
      mockKdsService.getOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(mockKdsService.getOrders).toHaveBeenCalled();
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load orders by station when specific station selected', async () => {
      const mockOrders = [createMockOrder(1), createMockOrder(2)];
      mockKdsService.getOrdersByStation.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'Kitchen-1' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(mockKdsService.getOrdersByStation).toHaveBeenCalledWith('Kitchen-1');
      expect(result.current.orders).toEqual(mockOrders);
    });

    it('should cache orders for offline use', async () => {
      const mockOrders = [createMockOrder(1), createMockOrder(2)];
      mockKdsService.getOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(mockOfflineStorage.saveOrder).toHaveBeenCalledTimes(2);
      expect(mockOfflineStorage.saveOrder).toHaveBeenCalledWith(mockOrders[0]);
      expect(mockOfflineStorage.saveOrder).toHaveBeenCalledWith(mockOrders[1]);
    });

    it('should handle loading state correctly', async () => {
      mockKdsService.getOrders.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      expect(result.current.loading).toBe(false);

      const loadPromise = act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.loading).toBe(true);

      await loadPromise;

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Loading Orders - Offline Mode', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });

    it('should load orders from cache when offline', async () => {
      const cachedOrders = [
        createMockOrder(1),
        createMockOrder(2, 'preparing')
      ];
      mockOfflineStorage.getAllOrders.mockResolvedValue(cachedOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(mockOfflineStorage.getAllOrders).toHaveBeenCalled();
      expect(mockKdsService.getOrders).not.toHaveBeenCalled();
      expect(result.current.orders).toEqual(cachedOrders);
    });

    it('should filter cached orders by station when offline', async () => {
      const cachedOrders = [
        createMockOrder(1),
        createMockOrder(2),
        createMockOrder(3)
      ];
      mockOfflineStorage.getAllOrders.mockResolvedValue(cachedOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'Kitchen-1' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      // All test orders have items in Kitchen-1, so all should be included
      expect(result.current.orders).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors and fallback to cache', async () => {
      const error = new Error('API Error');
      mockKdsService.getOrders.mockRejectedValue(error);
      
      const cachedOrders = [createMockOrder(1)];
      mockOfflineStorage.getAllOrders.mockResolvedValue(cachedOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error loading orders',
        error,
        'useKDSOrders'
      );
      expect(result.current.orders).toEqual(cachedOrders);
      expect(result.current.error).toBe('Usando dados em cache (modo offline)');
    });

    it('should show error when no cached data available', async () => {
      mockKdsService.getOrders.mockRejectedValue(new Error('API Error'));
      mockOfflineStorage.getAllOrders.mockResolvedValue([]);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.error).toBe('Não foi possível carregar os pedidos');
      expect(result.current.orders).toEqual([]);
    });

    it('should clear error on successful load', async () => {
      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      // Set initial error
      act(() => {
        result.current.setError('Initial error');
      });
      expect(result.current.error).toBe('Initial error');

      // Successful load should clear error
      mockKdsService.getOrders.mockResolvedValue([createMockOrder(1)]);
      
      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('New Order Detection', () => {
    it('should detect and notify about new orders', async () => {
      const onNewOrder = jest.fn();
      const initialOrders = [createMockOrder(1)];
      const updatedOrders = [createMockOrder(1), createMockOrder(2)];

      mockKdsService.getOrders
        .mockResolvedValueOnce(initialOrders)
        .mockResolvedValueOnce(updatedOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all', onNewOrder })
      );

      // Initial load
      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).not.toHaveBeenCalled();

      // Second load with new order
      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).toHaveBeenCalledTimes(1);
      expect(onNewOrder).toHaveBeenCalledWith(updatedOrders[1]);
    });

    it('should not notify on first load', async () => {
      const onNewOrder = jest.fn();
      mockKdsService.getOrders.mockResolvedValue([createMockOrder(1)]);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all', onNewOrder })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).not.toHaveBeenCalled();
    });

    it('should detect multiple new orders', async () => {
      const onNewOrder = jest.fn();
      const initialOrders = [createMockOrder(1)];
      const updatedOrders = [
        createMockOrder(1),
        createMockOrder(2),
        createMockOrder(3)
      ];

      mockKdsService.getOrders
        .mockResolvedValueOnce(initialOrders)
        .mockResolvedValueOnce(updatedOrders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all', onNewOrder })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder).toHaveBeenCalledTimes(2);
      expect(onNewOrder).toHaveBeenNthCalledWith(1, updatedOrders[1]);
      expect(onNewOrder).toHaveBeenNthCalledWith(2, updatedOrders[2]);
    });
  });

  describe('Update Order Status', () => {
    it('should update order status optimistically', async () => {
      const orders = [
        createMockOrder(1, 'pending'),
        createMockOrder(2, 'preparing')
      ];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateOrderStatus(1, 'ready');
      });

      // Check optimistic update
      expect(result.current.orders[0].status).toBe('ready');
      expect(mockKdsService.updateOrderStatus).toHaveBeenCalledWith(1, 'ready');
    });

    it('should handle order status update in offline mode', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const orders = [createMockOrder(1, 'pending')];
      mockOfflineStorage.getAllOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateOrderStatus(1, 'preparing');
      });

      expect(mockKdsService.updateOrderStatus).not.toHaveBeenCalled();
      expect(mockOfflineStorage.saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          status: 'preparing',
          synced: false
        })
      );
    });

    it('should handle order status update errors', async () => {
      const error = new Error('Update failed');
      mockKdsService.updateOrderStatus.mockRejectedValue(error);
      
      const orders = [createMockOrder(1)];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await expect(
        act(async () => {
          await result.current.updateOrderStatus(1, 'ready');
        })
      ).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating order status',
        error,
        'useKDSOrders'
      );
    });

    it('should handle numeric order IDs', async () => {
      const orders = [createMockOrder(123)];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateOrderStatus(123, 'ready');
      });

      expect(mockKdsService.updateOrderStatus).toHaveBeenCalledWith(123, 'ready');
    });
  });

  describe('Update Item Status', () => {
    it('should update item status optimistically', async () => {
      const orders = [createMockOrder(1)];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(1, 'item-1-1', 'ready');
      });

      const updatedItem = result.current.orders[0].items.find(
        item => item.item_id === 'item-1-1'
      );
      expect(updatedItem?.status).toBe('ready');
      expect(mockKdsService.updateItemStatus).toHaveBeenCalledWith(1, 'item-1-1', 'ready');
    });

    it('should handle item status update in offline mode', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const orders = [createMockOrder(1)];
      mockOfflineStorage.getAllOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(1, 'item-1-1', 'preparing');
      });

      expect(mockKdsService.updateItemStatus).not.toHaveBeenCalled();
      expect(mockOfflineStorage.saveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          items: expect.arrayContaining([
            expect.objectContaining({
              item_id: 'item-1-1',
              status: 'preparing'
            })
          ]),
          synced: false
        })
      );
    });

    it('should handle item status update errors', async () => {
      const error = new Error('Item update failed');
      mockKdsService.updateItemStatus.mockRejectedValue(error);
      
      const orders = [createMockOrder(1)];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await expect(
        act(async () => {
          await result.current.updateItemStatus(1, 'item-1-1', 'ready');
        })
      ).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating item status',
        error,
        'useKDSOrders'
      );
    });

    it('should handle numeric item IDs', async () => {
      const order = createMockOrder(1);
      order.items[0].item_id = 999 as any;
      mockKdsService.getOrders.mockResolvedValue([order]);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(1, 999, 'ready');
      });

      expect(mockKdsService.updateItemStatus).toHaveBeenCalledWith(1, 999, 'ready');
    });

    it('should not update non-existent items', async () => {
      const orders = [createMockOrder(1)];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      await act(async () => {
        await result.current.updateItemStatus(1, 'non-existent', 'ready');
      });

      // Item should not be found, so no change
      const unchangedOrder = result.current.orders[0];
      expect(unchangedOrder.items.every(item => item.status === 'pending')).toBe(true);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate order statistics correctly', async () => {
      const orders = [
        createMockOrder(1, 'pending'),
        createMockOrder(2, 'pending'),
        createMockOrder(3, 'preparing'),
        createMockOrder(4, 'ready'),
        createMockOrder(5, 'ready'),
        createMockOrder(6, 'ready')
      ];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.stats).toEqual({
        total: 6,
        pending: 2,
        preparing: 1,
        ready: 3
      });
    });

    it('should update statistics when orders change', async () => {
      const orders = [createMockOrder(1, 'pending')];
      mockKdsService.getOrders.mockResolvedValue(orders);

      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.stats.pending).toBe(1);
      expect(result.current.stats.preparing).toBe(0);

      await act(async () => {
        await result.current.updateOrderStatus(1, 'preparing');
      });

      expect(result.current.stats.pending).toBe(0);
      expect(result.current.stats.preparing).toBe(1);
    });

    it('should handle empty orders list', () => {
      const { result } = renderHook(() => 
        useKDSOrders({ selectedStation: 'all' })
      );

      expect(result.current.stats).toEqual({
        total: 0,
        pending: 0,
        preparing: 0,
        ready: 0
      });
    });
  });

  describe('Hook Dependencies', () => {
    it('should reload orders when selectedStation changes', async () => {
      const allOrders = [createMockOrder(1), createMockOrder(2)];
      const kitchenOrders = [createMockOrder(1)];
      
      mockKdsService.getOrders.mockResolvedValue(allOrders);
      mockKdsService.getOrdersByStation.mockResolvedValue(kitchenOrders);

      const { result, rerender } = renderHook(
        ({ selectedStation }) => useKDSOrders({ selectedStation }),
        { initialProps: { selectedStation: 'all' } }
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(result.current.orders).toEqual(allOrders);

      // Change selectedStation
      rerender({ selectedStation: 'Kitchen-1' });

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(mockKdsService.getOrdersByStation).toHaveBeenCalledWith('Kitchen-1');
      expect(result.current.orders).toEqual(kitchenOrders);
    });

    it('should use new onNewOrder callback when it changes', async () => {
      const onNewOrder1 = jest.fn();
      const onNewOrder2 = jest.fn();
      
      const initialOrders = [createMockOrder(1)];
      const updatedOrders = [createMockOrder(1), createMockOrder(2)];
      
      mockKdsService.getOrders
        .mockResolvedValueOnce(initialOrders)
        .mockResolvedValueOnce(updatedOrders);

      const { result, rerender } = renderHook(
        ({ onNewOrder }) => useKDSOrders({ selectedStation: 'all', onNewOrder }),
        { initialProps: { onNewOrder: onNewOrder1 } }
      );

      await act(async () => {
        await result.current.loadOrders();
      });

      // Change callback
      rerender({ onNewOrder: onNewOrder2 });

      await act(async () => {
        await result.current.loadOrders();
      });

      expect(onNewOrder1).not.toHaveBeenCalled();
      expect(onNewOrder2).toHaveBeenCalledWith(updatedOrders[1]);
    });
  });
});