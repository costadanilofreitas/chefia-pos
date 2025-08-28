/**
 * Tests for useTable Hook with Sync Features
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTable } from './useTable';
import { tableService } from '../services/TableService';
import { requestCache } from '../services/RequestCache';
import eventBus from '../utils/EventBus';
import { useToast } from '../components/Toast';

// Mock dependencies
jest.mock('../services/TableService', () => ({
  tableService: {
    getTables: jest.fn(),
    createTable: jest.fn(),
    updateTable: jest.fn(),
    deleteTable: jest.fn(),
    clearTable: jest.fn(),
  }
}));

jest.mock('../services/RequestCache', () => ({
  requestCache: {
    execute: jest.fn(),
    invalidate: jest.fn(),
    invalidatePattern: jest.fn(),
  }
}));

jest.mock('../utils/EventBus', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  }
}));

jest.mock('../components/Toast', () => ({
  useToast: jest.fn(() => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }))
}));

describe('useTable Hook', () => {
  const mockTables = [
    {
      id: 'table-1',
      number: 1,
      status: 'available' as const,
      capacity: 4,
      area: 'main'
    },
    {
      id: 'table-2',
      number: 2,
      status: 'occupied' as const,
      capacity: 2,
      area: 'main',
      customer_count: 2,
      waiter_id: 'waiter-1',
      waiter_name: 'John Doe',
      order_id: 'order-123',
      start_time: '2024-01-01T10:00:00Z'
    },
    {
      id: 'table-3',
      number: 3,
      status: 'reserved' as const,
      capacity: 6,
      area: 'vip',
      reservation: {
        id: 'res-1',
        customer_name: 'Jane Smith',
        customer_phone: '555-0123',
        reservation_time: '2024-01-01T18:00:00Z',
        guest_count: 5,
      }
    }
  ];

  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue(mockToast);
    (requestCache.execute as jest.Mock).mockResolvedValue(mockTables);
    (tableService.getTables as jest.Mock).mockResolvedValue(mockTables);
  });

  describe('Initial Load', () => {
    it('should load tables on mount', async () => {
      const { result } = renderHook(() => useTable());
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.tables).toEqual(mockTables);
      });
      
      expect(requestCache.execute).toHaveBeenCalledWith(
        'tables-layout-active',
        expect.any(Function),
        { ttl: 30000 }
      );
    });

    it('should only load tables once on mount', async () => {
      const { rerender } = renderHook(() => useTable());
      
      await waitFor(() => {
        expect(requestCache.execute).toHaveBeenCalledTimes(1);
      });
      
      rerender();
      
      // Should not call again
      expect(requestCache.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle loading error', async () => {
      (requestCache.execute as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(mockToast.error).toHaveBeenCalledWith('Erro ao carregar mesas');
      });
    });
  });

  describe('Table Operations', () => {
    it('should create a new table', async () => {
      const newTable = { id: 'table-4', number: 4, status: 'available' as const, capacity: 4, area: 'main' };
      (tableService.createTable as jest.Mock).mockResolvedValue(newTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      let createdTable;
      await act(async () => {
        createdTable = await result.current.createTable({ number: 4, capacity: 4, area: 'main' });
      });
      
      expect(createdTable).toEqual(newTable);
      expect(result.current.tables).toContainEqual(newTable);
      expect(mockToast.success).toHaveBeenCalledWith('Mesa criada com sucesso!');
    });

    it('should update a table', async () => {
      const updatedTable = { ...mockTables[0], status: 'occupied' as const };
      (tableService.updateTable as jest.Mock).mockResolvedValue(updatedTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.updateTable('table-1', { status: 'occupied' });
      });
      
      expect(result.current.tables[0].status).toBe('occupied');
      expect(mockToast.success).toHaveBeenCalledWith('Mesa atualizada com sucesso!');
    });

    it('should delete a table', async () => {
      (tableService.deleteTable as jest.Mock).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.deleteTable('table-1');
      });
      
      expect(result.current.tables).not.toContainEqual(mockTables[0]);
      expect(mockToast.success).toHaveBeenCalledWith('Mesa removida com sucesso!');
    });

    it('should clear a table', async () => {
      const clearedTable = { ...mockTables[1], status: 'available' as const, customer_count: 0, waiter_id: null };
      (tableService.clearTable as jest.Mock).mockResolvedValue(clearedTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.clearTable('table-2');
      });
      
      expect(result.current.tables.find(t => t.id === 'table-2')?.status).toBe('available');
      expect(mockToast.success).toHaveBeenCalledWith('Mesa liberada com sucesso!');
    });

    it('should update table status', async () => {
      const updatedTable = { ...mockTables[0], status: 'reserved' as const };
      (tableService.updateTable as jest.Mock).mockResolvedValue(updatedTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.updateTableStatus('table-1', 'reserved');
      });
      
      expect(tableService.updateTable).toHaveBeenCalledWith('table-1', { status: 'reserved' });
    });

    it('should assign waiter to table', async () => {
      const updatedTable = { ...mockTables[0], waiter_id: 'waiter-2', waiter_name: 'Alice', status: 'occupied' as const };
      (tableService.updateTable as jest.Mock).mockResolvedValue(updatedTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.assignWaiter('table-1', 'waiter-2', 'Alice');
      });
      
      expect(tableService.updateTable).toHaveBeenCalledWith('table-1', {
        waiter_id: 'waiter-2',
        waiter_name: 'Alice',
        status: 'occupied'
      });
    });

    it('should reserve a table', async () => {
      const reservation = {
        id: 'res-2',
        customer_name: 'Bob Johnson',
        customer_phone: '555-9999',
        reservation_time: '2024-01-01T20:00:00Z',
        guest_count: 4,
      };
      
      const updatedTable = { ...mockTables[0], status: 'reserved' as const, reservation };
      (tableService.updateTable as jest.Mock).mockResolvedValue(updatedTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.reserveTable('table-1', reservation);
      });
      
      expect(tableService.updateTable).toHaveBeenCalledWith('table-1', {
        status: 'reserved',
        reservation
      });
    });

    it('should occupy a table', async () => {
      const updatedTable = {
        ...mockTables[0],
        status: 'occupied' as const,
        customer_count: 3,
        waiter_id: 'waiter-3',
        order_id: 'order-456',
        start_time: expect.any(String)
      };
      (tableService.updateTable as jest.Mock).mockResolvedValue(updatedTable);
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.occupyTable('table-1', 3, 'waiter-3', 'order-456');
      });
      
      expect(tableService.updateTable).toHaveBeenCalledWith('table-1', {
        status: 'occupied',
        customer_count: 3,
        waiter_id: 'waiter-3',
        order_id: 'order-456',
        start_time: expect.any(String)
      });
    });
  });

  describe('Cache Management', () => {
    it('should force refresh when requested', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.loadTables(true);
      });
      
      expect(requestCache.invalidate).toHaveBeenCalledWith('tables-layout-active');
      expect(requestCache.execute).toHaveBeenCalledTimes(2);
    });

    it('should use cached data within TTL', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await act(async () => {
        await result.current.loadTables();
      });
      
      // Should use cache, not invalidate
      expect(requestCache.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('Sync Event Handling', () => {
    it('should handle table update sync event', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const updateHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:table:update'
      )?.[1];
      
      const updatedTable = { ...mockTables[0], status: 'occupied' as const };
      
      act(() => {
        updateHandler?.(updatedTable);
      });
      
      expect(result.current.tables.find(t => t.id === 'table-1')?.status).toBe('occupied');
    });

    it('should handle table create sync event', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const createHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:table:create'
      )?.[1];
      
      const newTable = { id: 'table-5', number: 5, status: 'available' as const, capacity: 4, area: 'main' };
      
      act(() => {
        createHandler?.(newTable);
      });
      
      expect(result.current.tables).toContainEqual(newTable);
    });

    it('should not duplicate tables on create sync event', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const createHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:table:create'
      )?.[1];
      
      // Try to add existing table
      act(() => {
        createHandler?.(mockTables[0]);
      });
      
      // Should not duplicate
      const table1Count = result.current.tables.filter(t => t.id === 'table-1').length;
      expect(table1Count).toBe(1);
    });

    it('should handle table delete sync event', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const deleteHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:table:delete'
      )?.[1];
      
      act(() => {
        deleteHandler?.({ id: 'table-1' });
      });
      
      expect(result.current.tables.find(t => t.id === 'table-1')).toBeUndefined();
    });

    it('should handle table status change sync event', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const statusHandler = (eventBus.on as jest.Mock).mock.calls.find(
        call => call[0] === 'sync:table:status:changed'
      )?.[1];
      
      const updatedTable = { ...mockTables[0], status: 'reserved' as const };
      
      act(() => {
        statusHandler?.(updatedTable);
      });
      
      expect(result.current.tables.find(t => t.id === 'table-1')?.status).toBe('reserved');
    });

    it('should unsubscribe from events on unmount', () => {
      const { unmount } = renderHook(() => useTable());
      
      unmount();
      
      expect(eventBus.off).toHaveBeenCalledWith('sync:table:update', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:table:create', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:table:delete', expect.any(Function));
      expect(eventBus.off).toHaveBeenCalledWith('sync:table:status:changed', expect.any(Function));
    });
  });

  describe('Utility Functions', () => {
    it('should get available tables', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const availableTables = result.current.getAvailableTables();
      expect(availableTables).toEqual([mockTables[0]]);
    });

    it('should get occupied tables', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const occupiedTables = result.current.getOccupiedTables();
      expect(occupiedTables).toEqual([mockTables[1]]);
    });

    it('should get tables by area', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const mainAreaTables = result.current.getTablesByArea('main');
      expect(mainAreaTables).toEqual([mockTables[0], mockTables[1]]);
      
      const vipAreaTables = result.current.getTablesByArea('vip');
      expect(vipAreaTables).toEqual([mockTables[2]]);
    });

    it('should get table by id', async () => {
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      const table = result.current.getTableById('table-2');
      expect(table).toEqual(mockTables[1]);
      
      const notFound = result.current.getTableById('non-existent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle create table error', async () => {
      (tableService.createTable as jest.Mock).mockRejectedValue(new Error('Create failed'));
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await expect(
        act(async () => {
          await result.current.createTable({ number: 10, capacity: 4, area: 'main' });
        })
      ).rejects.toThrow('Create failed');
      
      expect(mockToast.error).toHaveBeenCalledWith('Erro ao criar mesa');
    });

    it('should handle update table error', async () => {
      (tableService.updateTable as jest.Mock).mockRejectedValue(new Error('Update failed'));
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await expect(
        act(async () => {
          await result.current.updateTable('table-1', { status: 'occupied' });
        })
      ).rejects.toThrow('Update failed');
      
      expect(mockToast.error).toHaveBeenCalledWith('Erro ao atualizar mesa');
    });

    it('should handle delete table error', async () => {
      (tableService.deleteTable as jest.Mock).mockRejectedValue(new Error('Delete failed'));
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await expect(
        act(async () => {
          await result.current.deleteTable('table-1');
        })
      ).rejects.toThrow('Delete failed');
      
      expect(mockToast.error).toHaveBeenCalledWith('Erro ao remover mesa');
    });

    it('should handle clear table error', async () => {
      (tableService.clearTable as jest.Mock).mockRejectedValue(new Error('Clear failed'));
      
      const { result } = renderHook(() => useTable());
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      await expect(
        act(async () => {
          await result.current.clearTable('table-1');
        })
      ).rejects.toThrow('Clear failed');
      
      expect(mockToast.error).toHaveBeenCalledWith('Erro ao liberar mesa');
    });
  });
});