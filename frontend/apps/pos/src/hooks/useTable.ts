import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/Toast';
import { tableService, Table } from '../services/TableService';
import { requestCache } from '../services/RequestCache';
import eventBus from '../utils/EventBus';

interface TableReservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  reservation_time: string;
  guest_count: number;
  notes?: string;
}

// TableService is now imported from external service file

export const useTable = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();
  const hasInitialLoad = useRef(false);

  const loadTables = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const cacheKey = 'tables-layout-active';
      
      // Se forceRefresh, invalida o cache
      if (forceRefresh) {
        requestCache.invalidate(cacheKey);
      }
      
      const data = await requestCache.execute(
        cacheKey,
        () => tableService.getTables(),
        { ttl: 30000 } // Cache por 30 segundos
      );
      setTables(data);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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

  const reserveTable = useCallback(async (tableId: string, reservation: TableReservation) => {
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
    } catch (err) {
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

  // Load tables on mount - only once
  useEffect(() => {
    if (!hasInitialLoad.current) {
      hasInitialLoad.current = true;
      loadTables();
    }
  }, []); // Remove loadTables dependency to prevent re-runs

  // Listen for table sync events from other terminals
  useEffect(() => {
    const handleTableUpdate = (data: Table) => {
      setTables(prev => prev.map(t => t.id === data.id ? data : t));
    };
    
    const handleTableCreate = (data: Table) => {
      setTables(prev => {
        // Check if table already exists to avoid duplicates
        if (prev.some(t => t.id === data.id)) return prev;
        return [...prev, data];
      });
    };
    
    const handleTableDelete = (data: { id: string }) => {
      setTables(prev => prev.filter(t => t.id !== data.id));
    };
    
    const handleTableStatusChange = (data: Table) => {
      setTables(prev => prev.map(t => t.id === data.id ? data : t));
    };
    
    // Subscribe to sync events
    eventBus.on('sync:table:update', handleTableUpdate);
    eventBus.on('sync:table:create', handleTableCreate);
    eventBus.on('sync:table:delete', handleTableDelete);
    eventBus.on('sync:table:status:changed', handleTableStatusChange);
    
    // Cleanup listeners on unmount
    return () => {
      eventBus.off('sync:table:update', handleTableUpdate);
      eventBus.off('sync:table:create', handleTableCreate);
      eventBus.off('sync:table:delete', handleTableDelete);
      eventBus.off('sync:table:status:changed', handleTableStatusChange);
    };
  }, []);

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