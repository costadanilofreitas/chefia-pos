import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { tableService, Table } from '../services/TableService';

// Table interface is now imported from TableService

// TableService is now imported from external service file

export const useTable = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tableService.getTables();
      setTables(data);
    } catch (err: any) {
      setError(err.message);
      showError('Erro ao carregar mesas');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const createTable = useCallback(async (table: Partial<Table>) => {
    setLoading(true);
    try {
      const newTable = await tableService.createTable(table);
      setTables(prev => [...prev, newTable]);
      success('Mesa criada com sucesso!');
      return newTable;
    } catch (err: any) {
      showError('Erro ao criar mesa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const updateTable = useCallback(async (id: string, updates: Partial<Table>) => {
    setLoading(true);
    try {
      const updatedTable = await tableService.updateTable(id, updates);
      setTables(prev => prev.map(t => t.id === id ? updatedTable : t));
      success('Mesa atualizada com sucesso!');
      return updatedTable;
    } catch (err: any) {
      showError('Erro ao atualizar mesa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const deleteTable = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await tableService.deleteTable(id);
      setTables(prev => prev.filter(t => t.id !== id));
      success('Mesa removida com sucesso!');
    } catch (err: any) {
      showError('Erro ao remover mesa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const updateTableStatus = useCallback(async (id: string, status: Table['status']) => {
    return updateTable(id, { status });
  }, [updateTable]);

  const assignWaiter = useCallback(async (tableId: string, waiterId: string, waiterName?: string) => {
    return updateTable(tableId, { 
      waiter_id: waiterId,
      waiter_name: waiterName,
      status: 'occupied' 
    });
  }, [updateTable]);

  const reserveTable = useCallback(async (tableId: string, reservation: any) => {
    return updateTable(tableId, { 
      status: 'reserved',
      reservation 
    });
  }, [updateTable]);

  const clearTable = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const clearedTable = await tableService.clearTable(id);
      setTables(prev => prev.map(t => t.id === id ? clearedTable : t));
      success('Mesa liberada com sucesso!');
      return clearedTable;
    } catch (err: any) {
      showError('Erro ao liberar mesa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const occupyTable = useCallback(async (
    tableId: string, 
    customerCount: number, 
    waiterId?: string,
    orderId?: string
  ) => {
    return updateTable(tableId, { 
      status: 'occupied',
      customer_count: customerCount,
      waiter_id: waiterId,
      order_id: orderId,
      start_time: new Date().toISOString()
    });
  }, [updateTable]);

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, [loadTables]);

  return {
    tables,
    loading,
    error,
    loadTables,
    createTable,
    updateTable,
    deleteTable,
    updateTableStatus,
    assignWaiter,
    reserveTable,
    clearTable,
    occupyTable,
    // Utility functions
    getAvailableTables: useCallback(() => 
      tables.filter(t => t.status === 'available'), [tables]),
    getOccupiedTables: useCallback(() => 
      tables.filter(t => t.status === 'occupied'), [tables]),
    getTablesByArea: useCallback((area: string) => 
      tables.filter(t => t.area === area), [tables]),
    getTableById: useCallback((id: string) => 
      tables.find(t => t.id === id), [tables])
  };
};