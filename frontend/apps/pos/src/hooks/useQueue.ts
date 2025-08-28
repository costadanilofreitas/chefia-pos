import { useState, useEffect, useCallback } from 'react';
import { apiInterceptor } from '../services/ApiInterceptor';
import { requestCache } from '../services/RequestCache';
import eventBus from '../utils/EventBus';
import { useToast } from '../components/Toast';

interface QueueEntry {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  party_size: number;
  party_size_category: 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';
  status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
  position_in_queue: number;
  table_preferences?: string[];
  notification_method: 'SMS' | 'WHATSAPP' | 'ANNOUNCEMENT' | 'NONE';
  notes?: string;
  check_in_time: string;
  estimated_wait_minutes?: number;
  notification_time?: string;
  seated_time?: string;
  assigned_table_id?: string;
  store_id: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface QueueStatistics {
  total_in_queue: number;
  average_wait_time: number;
  longest_wait?: number;
  parties_by_size: Record<string, number>;
  estimated_total_clear_time: number;
  no_show_rate: number;
  accuracy_last_24h?: number;
}

interface QueueEntryCreate {
  customer_name: string;
  customer_phone: string;
  party_size: number;
  table_preferences?: string[];
  notification_method: 'SMS' | 'WHATSAPP' | 'ANNOUNCEMENT' | 'NONE';
  notes?: string;
  customer_id?: string;
}

interface WaitTimeEstimate {
  party_size: number;
  estimated_minutes: number;
  confidence_level: number;
  factors: Record<string, any>;
}

export const useQueue = () => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [statistics, setStatistics] = useState<QueueStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  /**
   * Carrega a fila
   */
  const loadQueue = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = status ? { status } : {};
      
      const response = await requestCache.execute(
        `queue-list-${JSON.stringify(params)}`,
        () => apiInterceptor.get<QueueEntry[]>('/api/v1/tables/queue', { params }),
        { ttl: 5000 } // Cache por 5 segundos
      );
      
      setQueueEntries(response.data);
    } catch (err) {
      setError(err.message);
      showError('Erro ao carregar fila');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Carrega estatísticas
   */
  const loadStatistics = useCallback(async () => {
    try {
      const response = await requestCache.execute(
        'queue-statistics',
        () => apiInterceptor.get<QueueStatistics>('/api/v1/tables/queue/statistics'),
        { ttl: 10000 } // Cache por 10 segundos
      );
      
      setStatistics(response.data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);

  /**
   * Adiciona cliente à fila
   */
  const addToQueue = useCallback(async (entry: QueueEntryCreate) => {
    setLoading(true);
    
    try {
      const response = await apiInterceptor.post<QueueEntry>(
        '/api/v1/tables/queue',
        entry
      );
      
      // Adicionar à lista local
      setQueueEntries(prev => [...prev, response.data]);
      
      // Invalidar cache
      requestCache.invalidatePattern('queue');
      
      // Emitir evento
      eventBus.emit('queue:entry_added', response.data);
      
      success('Cliente adicionado à fila');
      return response.data;
    } catch (err) {
      showError('Erro ao adicionar à fila');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  /**
   * Atualiza entrada na fila
   */
  const updateEntry = useCallback(async (entryId: string, updates: Partial<QueueEntry>) => {
    setLoading(true);
    
    try {
      const response = await apiInterceptor.put<QueueEntry>(
        `/api/v1/tables/queue/${entryId}`,
        updates
      );
      
      // Atualizar lista local
      setQueueEntries(prev => 
        prev.map(e => e.id === entryId ? response.data : e)
      );
      
      // Invalidar cache
      requestCache.invalidatePattern('queue');
      
      // Emitir evento
      eventBus.emit('queue:entry_updated', response.data);
      
      return response.data;
    } catch (err) {
      showError('Erro ao atualizar entrada');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Notifica cliente
   */
  const notifyCustomer = useCallback(async (entryId: string) => {
    setLoading(true);
    
    try {
      const response = await apiInterceptor.post(
        `/api/v1/tables/queue/${entryId}/notify`
      );
      
      // Atualizar status local
      setQueueEntries(prev => 
        prev.map(e => e.id === entryId 
          ? { ...e, status: 'NOTIFIED', notification_time: new Date().toISOString() }
          : e
        )
      );
      
      // Invalidar cache
      requestCache.invalidatePattern('queue');
      
      // Emitir evento
      eventBus.emit('queue:customer_notified', { entryId });
      
      success('Notificação enviada');
      return response.data;
    } catch (err) {
      showError('Erro ao enviar notificação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  /**
   * Marca cliente como sentado
   */
  const seatCustomer = useCallback(async (entryId: string, tableId: string) => {
    setLoading(true);
    
    try {
      const response = await apiInterceptor.post<QueueEntry>(
        `/api/v1/tables/queue/${entryId}/seat`,
        { table_id: tableId }
      );
      
      // Remover da lista local (não está mais na fila)
      setQueueEntries(prev => prev.filter(e => e.id !== entryId));
      
      // Invalidar cache
      requestCache.invalidatePattern('queue');
      requestCache.invalidatePattern('tables');
      
      // Emitir evento
      eventBus.emit('queue:customer_seated', { entryId, tableId });
      
      success('Cliente alocado à mesa');
      return response.data;
    } catch (err) {
      showError('Erro ao alocar mesa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  /**
   * Marca como no-show
   */
  const markNoShow = useCallback(async (entryId: string) => {
    setLoading(true);
    
    try {
      const response = await apiInterceptor.post<QueueEntry>(
        `/api/v1/tables/queue/${entryId}/no-show`
      );
      
      // Remover da lista local
      setQueueEntries(prev => prev.filter(e => e.id !== entryId));
      
      // Invalidar cache
      requestCache.invalidatePattern('queue');
      
      // Emitir evento
      eventBus.emit('queue:no_show', { entryId });
      
      return response.data;
    } catch (err) {
      showError('Erro ao marcar no-show');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Cancela entrada
   */
  const cancelEntry = useCallback(async (entryId: string, reason?: string) => {
    setLoading(true);
    
    try {
      const response = await apiInterceptor.delete<QueueEntry>(
        `/api/v1/tables/queue/${entryId}`,
        { params: { reason } }
      );
      
      // Remover da lista local
      setQueueEntries(prev => prev.filter(e => e.id !== entryId));
      
      // Invalidar cache
      requestCache.invalidatePattern('queue');
      
      // Emitir evento
      eventBus.emit('queue:entry_cancelled', { entryId, reason });
      
      return response.data;
    } catch (err) {
      showError('Erro ao cancelar entrada');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Estima tempo de espera
   */
  const estimateWaitTime = useCallback(async (partySize: number): Promise<WaitTimeEstimate> => {
    try {
      const response = await requestCache.execute(
        `queue-estimate-${partySize}`,
        () => apiInterceptor.get<WaitTimeEstimate>(
          '/api/v1/tables/queue/estimate',
          { params: { party_size: partySize } }
        ),
        { ttl: 30000 } // Cache por 30 segundos
      );
      
      return response.data;
    } catch (err) {
      console.error('Erro ao estimar tempo:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh da fila e estatísticas
   */
  const refreshQueue = useCallback(async () => {
    requestCache.invalidatePattern('queue');
    await Promise.all([
      loadQueue(),
      loadStatistics()
    ]);
  }, [loadQueue, loadStatistics]);

  // Carregar dados iniciais
  useEffect(() => {
    loadQueue();
    loadStatistics();
  }, [loadQueue, loadStatistics]);

  // Escutar eventos de sincronização
  useEffect(() => {
    const handleEntryAdded = (data: QueueEntry) => {
      setQueueEntries(prev => {
        if (prev.some(e => e.id === data.id)) return prev;
        return [...prev, data];
      });
    };
    
    const handleEntryUpdated = (data: QueueEntry) => {
      setQueueEntries(prev => prev.map(e => e.id === data.id ? data : e));
    };
    
    const handleEntryRemoved = (data: { entryId: string }) => {
      setQueueEntries(prev => prev.filter(e => e.id !== data.entryId));
    };
    
    const handlePositionsChanged = () => {
      // Recarregar fila quando posições mudarem
      loadQueue();
    };
    
    // Inscrever nos eventos
    eventBus.on('sync:queue:create', handleEntryAdded);
    eventBus.on('sync:queue:update', handleEntryUpdated);
    eventBus.on('sync:queue:delete', handleEntryRemoved);
    eventBus.on('sync:queue:positions', handlePositionsChanged);
    
    // Cleanup
    return () => {
      eventBus.off('sync:queue:create', handleEntryAdded);
      eventBus.off('sync:queue:update', handleEntryUpdated);
      eventBus.off('sync:queue:delete', handleEntryRemoved);
      eventBus.off('sync:queue:positions', handlePositionsChanged);
    };
  }, [loadQueue]);

  return {
    queueEntries,
    statistics,
    loading,
    error,
    addToQueue,
    updateEntry,
    notifyCustomer,
    seatCustomer,
    markNoShow,
    cancelEntry,
    estimateWaitTime,
    refreshQueue,
    loadQueue
  };
};