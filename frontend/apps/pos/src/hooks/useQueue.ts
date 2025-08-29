/**
 * Simplified Queue Hook using the reusable API call pattern
 * Reduces code from 385 lines to ~150 lines
 */

import { useState, useEffect, useCallback } from 'react';
import { apiInterceptor } from '../services/ApiInterceptor';
import { useApiCall } from './useApiCall';
import eventBus from '../utils/EventBus';

// Types
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
  const api = useApiCall();

  // Load queue entries
  const loadQueue = useCallback(async (status?: string) => {
    const params = status ? { status } : {};
    
    await api.execute(
      () => apiInterceptor.get<QueueEntry[]>('/api/v1/tables/queue', { params }),
      {
        onSuccess: (data) => setQueueEntries(data),
        errorMessage: 'Failed to load queue'
      }
    );
  }, [api]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    await api.execute(
      () => apiInterceptor.get<QueueStatistics>('/api/v1/tables/queue/statistics'),
      {
        onSuccess: (data) => setStatistics(data)
        // Silent error - statistics are optional
      }
    );
  }, [api]);

  // Queue operations factory
  const createQueueOperation = useCallback((
    method: 'post' | 'put' | 'delete',
    urlFactory: (id?: string) => string,
    options: {
      updateLocal?: (entries: QueueEntry[], data: any) => QueueEntry[];
      eventName?: string;
      successMsg?: string;
      errorMsg?: string;
    }
  ) => {
    return async (id?: string, data?: any) => {
      const result = await api.execute(
        () => {
          const url = urlFactory(id);
          if (method === 'post') return apiInterceptor.post(url, data);
          if (method === 'put') return apiInterceptor.put(url, data);
          if (method === 'delete') return apiInterceptor.delete(url, { params: data });
          throw new Error('Invalid method');
        },
        {
          successMessage: options.successMsg,
          errorMessage: options.errorMsg,
          invalidateCache: 'queue',
          emitEvent: options.eventName ? { name: options.eventName, data: { id, ...data } } : undefined,
          onSuccess: (response) => {
            if (options.updateLocal) {
              setQueueEntries(prev => options.updateLocal(prev, response.data));
            }
          }
        }
      );
      
      return result?.data;
    };
  }, [api]);

  // Create queue operations using the factory
  const addToQueue = useCallback(async (entry: QueueEntryCreate) => {
    return createQueueOperation(
      'post',
      () => '/api/v1/tables/queue',
      {
        updateLocal: (entries, newEntry) => [...entries, newEntry],
        eventName: 'queue:entry_added',
        successMsg: 'Customer added to queue'
      }
    )(undefined, entry);
  }, [createQueueOperation]);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<QueueEntry>) => {
    return createQueueOperation(
      'put',
      (id) => `/api/v1/tables/queue/${id}`,
      {
        updateLocal: (entries, updated) => entries.map(e => e.id === entryId ? updated : e),
        eventName: 'queue:entry_updated'
      }
    )(entryId, updates);
  }, [createQueueOperation]);

  const notifyCustomer = useCallback(async (entryId: string) => {
    return createQueueOperation(
      'post',
      (id) => `/api/v1/tables/queue/${id}/notify`,
      {
        updateLocal: (entries, _) => {
          return entries.map(e => 
            e.id === entryId 
              ? { ...e, status: 'NOTIFIED' as const, notification_time: new Date().toISOString() }
              : e
          );
        },
        eventName: 'queue:customer_notified',
        successMsg: 'Notification sent'
      }
    )(entryId);
  }, [createQueueOperation]);

  const seatCustomer = useCallback(async (entryId: string, tableId: string) => {
    return createQueueOperation(
      'post',
      (id) => `/api/v1/tables/queue/${id}/seat`,
      {
        updateLocal: (entries) => entries.filter(e => e.id !== entryId),
        eventName: 'queue:customer_seated',
        successMsg: 'Customer seated'
      }
    )(entryId, { table_id: tableId });
  }, [createQueueOperation]);

  const markNoShow = useCallback(async (entryId: string) => {
    return createQueueOperation(
      'post',
      (id) => `/api/v1/tables/queue/${id}/no-show`,
      {
        updateLocal: (entries) => entries.filter(e => e.id !== entryId),
        eventName: 'queue:no_show'
      }
    )(entryId);
  }, [createQueueOperation]);

  const cancelEntry = useCallback(async (entryId: string, reason?: string) => {
    return createQueueOperation(
      'delete',
      (id) => `/api/v1/tables/queue/${id}`,
      {
        updateLocal: (entries) => entries.filter(e => e.id !== entryId),
        eventName: 'queue:entry_cancelled'
      }
    )(entryId, { reason });
  }, [createQueueOperation]);

  const estimateWaitTime = useCallback(async (partySize: number): Promise<WaitTimeEstimate> => {
    const result = await api.execute(
      () => apiInterceptor.get<WaitTimeEstimate>(
        '/api/v1/tables/queue/estimate',
        { params: { party_size: partySize } }
      )
    );
    return result?.data;
  }, [api]);

  // Setup real-time sync
  useEffect(() => {
    const syncHandlers = {
      'sync:queue:create': (data: QueueEntry) => {
        setQueueEntries(prev => prev.some(e => e.id === data.id) ? prev : [...prev, data]);
      },
      'sync:queue:update': (data: QueueEntry) => {
        setQueueEntries(prev => prev.map(e => e.id === data.id ? data : e));
      },
      'sync:queue:delete': ({ entryId }: { entryId: string }) => {
        setQueueEntries(prev => prev.filter(e => e.id !== entryId));
      },
      'sync:queue:positions': () => loadQueue()
    };

    // Register all event handlers
    Object.entries(syncHandlers).forEach(([event, handler]) => {
      eventBus.on(event, handler);
    });

    // Cleanup
    return () => {
      Object.entries(syncHandlers).forEach(([event, handler]) => {
        eventBus.off(event, handler);
      });
    };
  }, [loadQueue]);

  // Initial load
  useEffect(() => {
    loadQueue();
    loadStatistics();
  }, [loadQueue, loadStatistics]);

  const refreshQueue = useCallback(async () => {
    await Promise.all([loadQueue(), loadStatistics()]);
  }, [loadQueue, loadStatistics]);

  return {
    queueEntries,
    statistics,
    loading: api.loading,
    error: api.error,
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