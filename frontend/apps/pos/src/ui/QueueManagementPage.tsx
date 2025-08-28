import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiUsers, FiClock, FiPhone, FiBell, FiCheck, 
  FiX, FiMessageSquare, FiTrendingUp, FiUserPlus,
  FiRefreshCw, FiChevronRight, FiAlertCircle 
} from 'react-icons/fi';
import { useQueue } from '../hooks/useQueue';
import { useTable } from '../hooks/useTable';
import { useToast } from '../components/Toast';
import { formatTime } from '../utils/dateUtils';

interface QueueEntry {
  id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
  position_in_queue: number;
  check_in_time: string;
  estimated_wait_minutes: number;
  notification_method: 'SMS' | 'WHATSAPP' | 'ANNOUNCEMENT' | 'NONE';
  table_preferences?: string[];
  notes?: string;
  notification_time?: string;
  seated_time?: string;
}

const QueueManagementPage: React.FC = () => {
  const { 
    queueEntries, 
    statistics,
    loading, 
    addToQueue, 
    updateEntry,
    notifyCustomer,
    seatCustomer,
    markNoShow,
    cancelEntry,
    refreshQueue
  } = useQueue();
  
  const { tables, getAvailableTables } = useTable();
  const { success, error, info } = useToast();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'WAITING' | 'NOTIFIED'>('WAITING');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    party_size: 2,
    notification_method: 'SMS' as const,
    table_preferences: [] as string[],
    notes: ''
  });

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshQueue();
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshQueue]);

  const handleAddToQueue = async () => {
    try {
      await addToQueue(formData);
      success('Cliente adicionado à fila');
      setShowAddForm(false);
      setFormData({
        customer_name: '',
        customer_phone: '',
        party_size: 2,
        notification_method: 'SMS',
        table_preferences: [],
        notes: ''
      });
    } catch (err) {
      error('Erro ao adicionar à fila');
    }
  };

  const handleNotify = async (entry: QueueEntry) => {
    try {
      await notifyCustomer(entry.id);
      success(`Notificação enviada para ${entry.customer_name}`);
    } catch (err) {
      error('Erro ao enviar notificação');
    }
  };

  const handleSeat = async (entry: QueueEntry) => {
    // Get available tables
    const availableTables = getAvailableTables();
    
    if (availableTables.length === 0) {
      error('Nenhuma mesa disponível');
      return;
    }

    // Find best matching table
    const suitableTable = availableTables.find(
      t => t.seats >= entry.party_size
    ) || availableTables[0];

    try {
      await seatCustomer(entry.id, suitableTable.id);
      success(`${entry.customer_name} alocado na mesa ${suitableTable.number}`);
    } catch (err) {
      error('Erro ao alocar mesa');
    }
  };

  const handleNoShow = async (entry: QueueEntry) => {
    try {
      await markNoShow(entry.id);
      info(`${entry.customer_name} marcado como no-show`);
    } catch (err) {
      error('Erro ao marcar no-show');
    }
  };

  const handleCancel = async (entry: QueueEntry) => {
    if (confirm(`Cancelar entrada de ${entry.customer_name}?`)) {
      try {
        await cancelEntry(entry.id, 'Cancelado pelo staff');
        info('Entrada cancelada');
      } catch (err) {
        error('Erro ao cancelar entrada');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800';
      case 'NOTIFIED': return 'bg-blue-100 text-blue-800';
      case 'SEATED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'NO_SHOW': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING': return 'Aguardando';
      case 'NOTIFIED': return 'Notificado';
      case 'SEATED': return 'Sentado';
      case 'CANCELLED': return 'Cancelado';
      case 'NO_SHOW': return 'Não compareceu';
      default: return status;
    }
  };

  const filteredEntries = queueEntries.filter(entry => {
    if (filter === 'ALL') return true;
    if (filter === 'WAITING') return entry.status === 'WAITING';
    if (filter === 'NOTIFIED') return entry.status === 'NOTIFIED';
    return true;
  });

  const calculateWaitTime = (checkInTime: string) => {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - checkIn.getTime()) / 60000);
    return diffMinutes;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiUsers className="w-8 h-8" />
            Gerenciamento de Fila
          </h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
            <button
              onClick={refreshQueue}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <FiUserPlus className="w-5 h-5" />
              Adicionar à Fila
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Na Fila</p>
                <p className="text-2xl font-bold">{statistics.total_in_queue}</p>
              </div>
              <FiUsers className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tempo Médio</p>
                <p className="text-2xl font-bold">{Math.round(statistics.average_wait_time)}min</p>
              </div>
              <FiClock className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taxa No-Show</p>
                <p className="text-2xl font-bold">{(statistics.no_show_rate * 100).toFixed(1)}%</p>
              </div>
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Precisão</p>
                <p className="text-2xl font-bold">
                  {statistics.accuracy_last_24h?.toFixed(0) || 'N/A'}%
                </p>
              </div>
              <FiTrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'ALL' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Todos ({queueEntries.length})
        </button>
        <button
          onClick={() => setFilter('WAITING')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'WAITING' ? 'bg-yellow-500 text-white' : 'bg-gray-100'
          }`}
        >
          Aguardando ({queueEntries.filter(e => e.status === 'WAITING').length})
        </button>
        <button
          onClick={() => setFilter('NOTIFIED')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'NOTIFIED' ? 'bg-blue-500 text-white' : 'bg-gray-100'
          }`}
        >
          Notificados ({queueEntries.filter(e => e.status === 'NOTIFIED').length})
        </button>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FiUsers className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma entrada na fila</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        #{entry.position_in_queue}
                      </div>
                      <div className="text-xs text-gray-500">Posição</div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {entry.customer_name}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FiUsers className="w-4 h-4" />
                          {entry.party_size} pessoas
                        </span>
                        <span className="flex items-center gap-1">
                          <FiPhone className="w-4 h-4" />
                          {entry.customer_phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          {calculateWaitTime(entry.check_in_time)} min esperando
                        </span>
                        <span className="flex items-center gap-1">
                          <FiMessageSquare className="w-4 h-4" />
                          {entry.notification_method}
                        </span>
                      </div>
                      {entry.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          Obs: {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {getStatusText(entry.status)}
                    </span>
                    
                    {entry.status === 'WAITING' && (
                      <>
                        <button
                          onClick={() => handleNotify(entry)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                          title="Notificar"
                        >
                          <FiBell className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCancel(entry)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="Cancelar"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    
                    {entry.status === 'NOTIFIED' && (
                      <>
                        <button
                          onClick={() => handleSeat(entry)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          title="Sentar"
                        >
                          <FiCheck className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleNoShow(entry)}
                          className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200"
                          title="No-show"
                        >
                          <FiAlertCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add to Queue Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Adicionar à Fila</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="João Silva"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="11999999999"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tamanho do Grupo
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.party_size}
                  onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Método de Notificação
                </label>
                <select
                  value={formData.notification_method}
                  onChange={(e) => setFormData({ ...formData, notification_method: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="ANNOUNCEMENT">Anúncio</option>
                  <option value="NONE">Nenhum</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Preferências especiais, alergias, etc..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddToQueue}
                disabled={!formData.customer_name || !formData.customer_phone}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagementPage;