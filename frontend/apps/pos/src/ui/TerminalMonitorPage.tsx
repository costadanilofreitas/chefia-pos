import React, { useState, useEffect } from 'react';
import { FiMonitor, FiWifi, FiWifiOff, FiUser, FiClock, FiActivity, FiRefreshCw } from 'react-icons/fi';
import realtimeSync from '../services/RealtimeSyncService';
import eventBus from '../utils/EventBus';
import { requestCache } from '../services/RequestCache';
import { apiInterceptor } from '../services/ApiInterceptor';

interface Terminal {
  terminal_id: string;
  user_id: string;
  user_name?: string;
  connected_at?: string;
  last_activity?: string;
  status: 'online' | 'offline' | 'idle';
}

interface SyncStatus {
  connected_terminals: Record<string, string>;
  total_connections: number;
  queued_messages: Record<string, number>;
}

interface CacheStats {
  cacheSize: number;
  maxCacheSize: number;
  pendingRequests: number;
  memoryUsageMB: string;
  maxMemoryMB: number;
  memoryUsagePercent: string;
  entries: Array<{
    key: string;
    age: number;
    ttl: number;
    expired: boolean;
    hasData: boolean;
  }>;
}

const TerminalMonitorPage: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isConnected, setIsConnected] = useState(realtimeSync.connected);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const myTerminalId = localStorage.getItem('terminal_id') || 'unknown';

  // Fetch sync status from backend
  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      const response = await apiInterceptor.get<SyncStatus>('/ws/sync/status');
      setSyncStatus(response.data);
      
      // Convert connected terminals to Terminal array
      const connectedTerminals: Terminal[] = Object.entries(response.data.connected_terminals).map(
        ([terminal_id, user_id]) => ({
          terminal_id,
          user_id,
          status: 'online' as const,
          connected_at: new Date().toISOString()
        })
      );
      
      setTerminals(connectedTerminals);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get cache statistics
  const fetchCacheStats = () => {
    const stats = requestCache.getStats();
    setCacheStats(stats as CacheStats);
  };

  // Setup event listeners
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      fetchSyncStatus();
    };
    
    const handleDisconnected = () => {
      setIsConnected(false);
    };
    
    const handleTerminalConnected = (data: { terminal_id: string; user_id: string }) => {
      setTerminals(prev => {
        const exists = prev.some(t => t.terminal_id === data.terminal_id);
        if (exists) {
          return prev.map(t => 
            t.terminal_id === data.terminal_id 
              ? { ...t, status: 'online' as const, connected_at: new Date().toISOString() }
              : t
          );
        }
        return [...prev, {
          terminal_id: data.terminal_id,
          user_id: data.user_id,
          status: 'online' as const,
          connected_at: new Date().toISOString()
        }];
      });
    };
    
    const handleTerminalDisconnected = (data: { terminal_id: string }) => {
      setTerminals(prev => 
        prev.map(t => 
          t.terminal_id === data.terminal_id 
            ? { ...t, status: 'offline' as const }
            : t
        )
      );
    };
    
    // Subscribe to events
    eventBus.on('sync:connected', handleConnected);
    eventBus.on('sync:disconnected', handleDisconnected);
    eventBus.on('sync:terminal:connected', handleTerminalConnected);
    eventBus.on('sync:terminal:disconnected', handleTerminalDisconnected);
    
    // Initial load
    fetchSyncStatus();
    fetchCacheStats();
    
    // Cleanup
    return () => {
      eventBus.off('sync:connected', handleConnected);
      eventBus.off('sync:disconnected', handleDisconnected);
      eventBus.off('sync:terminal:connected', handleTerminalConnected);
      eventBus.off('sync:terminal:disconnected', handleTerminalDisconnected);
    };
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchCacheStats();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    fetchSyncStatus();
    fetchCacheStats();
  };

  const clearCache = () => {
    requestCache.clear();
    fetchCacheStats();
  };

  const getStatusColor = (status: Terminal['status']) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-gray-500';
      case 'idle': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: Terminal['status']) => {
    switch (status) {
      case 'online': return <FiWifi className="w-5 h-5" />;
      case 'offline': return <FiWifiOff className="w-5 h-5" />;
      case 'idle': return <FiActivity className="w-5 h-5" />;
      default: return <FiWifiOff className="w-5 h-5" />;
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatAge = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiMonitor className="w-8 h-8" />
            Monitor de Terminais
          </h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-600">Auto-refresh</span>
            </label>
            <button
              onClick={handleRefresh}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              disabled={loading}
            >
              <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
              {isConnected ? (
                <FiWifi className="w-6 h-6 text-green-500" />
              ) : (
                <FiWifiOff className="w-6 h-6 text-red-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">Status da Conexão</h2>
              <p className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? 'Conectado ao servidor de sincronização' : 'Desconectado'}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Terminal ID: <span className="font-mono">{myTerminalId}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Terminals */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center justify-between">
              <span>Terminais Conectados</span>
              <span className="text-sm text-gray-500">
                {terminals.filter(t => t.status === 'online').length} online
              </span>
            </h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {terminals.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhum terminal conectado
              </div>
            ) : (
              terminals.map((terminal) => (
                <div key={terminal.terminal_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(terminal.status)}>
                        {getStatusIcon(terminal.status)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {terminal.terminal_id === myTerminalId ? (
                            <span className="text-blue-600">
                              {terminal.terminal_id} (Este Terminal)
                            </span>
                          ) : (
                            terminal.terminal_id
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <FiUser className="w-3 h-3" />
                          {terminal.user_id}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatTime(terminal.connected_at)}
                      </div>
                      {terminal.status === 'offline' && (
                        <span className="text-red-500">Desconectado</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center justify-between">
              <span>Estatísticas de Cache</span>
              <button
                onClick={clearCache}
                className="text-sm px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Limpar Cache
              </button>
            </h2>
          </div>
          {cacheStats && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500">Entradas</div>
                  <div className="font-semibold">
                    {cacheStats.cacheSize}/{cacheStats.maxCacheSize}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Memória</div>
                  <div className="font-semibold">
                    {cacheStats.memoryUsageMB}MB ({cacheStats.memoryUsagePercent}%)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Requisições Pendentes</div>
                  <div className="font-semibold">{cacheStats.pendingRequests}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Limite de Memória</div>
                  <div className="font-semibold">{cacheStats.maxMemoryMB}MB</div>
                </div>
              </div>
              
              {/* Progress bar for memory usage */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${cacheStats.memoryUsagePercent}%` }}
                  />
                </div>
              </div>

              {/* Cache entries */}
              <div>
                <h3 className="text-sm font-medium mb-2">Entradas Recentes</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                  {cacheStats.entries.slice(0, 10).map((entry, index) => (
                    <div key={index} className="flex justify-between py-1 px-2 hover:bg-gray-50 rounded">
                      <span className="font-mono truncate max-w-xs">{entry.key}</span>
                      <div className="flex items-center gap-2">
                        <span className={entry.expired ? 'text-red-500' : 'text-gray-500'}>
                          {formatAge(entry.age)}
                        </span>
                        <span className="text-gray-400">/ {formatAge(entry.ttl)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Queue Status */}
      {syncStatus && syncStatus.queued_messages && Object.keys(syncStatus.queued_messages).length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Mensagens em Fila</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(syncStatus.queued_messages).map(([terminal, count]) => (
              <div key={terminal} className="text-sm">
                <span className="font-mono text-yellow-700">{terminal}</span>
                <span className="ml-2 font-semibold">{count} msgs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalMonitorPage;