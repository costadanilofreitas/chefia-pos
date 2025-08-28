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
  party_size: number;
  status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
  position_in_queue: number;
  estimated_wait_minutes?: number;
}

interface QueueStatistics {
  total_in_queue: number;
  average_wait_time: number;
  no_show_rate: number;
}

export const useQueueSimplified = () => {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [statistics, setStatistics] = useState<QueueStatistics | null>(null);
  const api = useApiCall();

  // Load queue entries
  const loadQueue = useCallback(async (status?: string) => {
    const params = status ? { status } : {};
    
    await api.execute(
      () => apiInterceptor.get<QueueEntry[]>('/api/v1/tables/queue', { params }),
      {
        onSuccess: (data) => setEntries(data),
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
              setEntries(prev => options.updateLocal(prev, response.data));
            }
          }
        }
      );
      
      return result?.data;
    };
  }, [api]);

  // Create queue operations using the factory
  const addToQueue = createQueueOperation(
    'post',
    () => '/api/v1/tables/queue',
    {
      updateLocal: (entries, newEntry) => [...entries, newEntry],
      eventName: 'queue:entry_added',
      successMsg: 'Customer added to queue'
    }
  );

  const notifyCustomer = createQueueOperation(
    'post',
    (id) => `/api/v1/tables/queue/${id}/notify`,
    {
      updateLocal: (entries, _) => {
        return entries.map(e => 
          e.id === _.entryId 
            ? { ...e, status: 'NOTIFIED', notification_time: new Date().toISOString() }
            : e
        );
      },
      eventName: 'queue:customer_notified',
      successMsg: 'Notification sent'
    }
  );

  const seatCustomer = createQueueOperation(
    'post',
    (id) => `/api/v1/tables/queue/${id}/seat`,
    {
      updateLocal: (entries, data) => entries.filter(e => e.id !== data.entryId),
      eventName: 'queue:customer_seated',
      successMsg: 'Customer seated'
    }
  );

  const cancelEntry = createQueueOperation(
    'delete',
    (id) => `/api/v1/tables/queue/${id}`,
    {
      updateLocal: (entries, data) => entries.filter(e => e.id !== data.entryId),
      eventName: 'queue:entry_cancelled'
    }
  );

  // Setup real-time sync
  useEffect(() => {
    const syncHandlers = {
      'sync:queue:create': (data: QueueEntry) => {
        setEntries(prev => prev.some(e => e.id === data.id) ? prev : [...prev, data]);
      },
      'sync:queue:update': (data: QueueEntry) => {
        setEntries(prev => prev.map(e => e.id === data.id ? data : e));
      },
      'sync:queue:delete': ({ entryId }: { entryId: string }) => {
        setEntries(prev => prev.filter(e => e.id !== entryId));
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

  return {
    entries,
    statistics,
    loading: api.loading,
    error: api.error,
    addToQueue,
    notifyCustomer,
    seatCustomer,
    cancelEntry,
    refresh: () => Promise.all([loadQueue(), loadStatistics()])
  };
};