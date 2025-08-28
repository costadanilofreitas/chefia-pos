/**
 * Simplified Queue Management Page
 * Reduces complexity through extraction and composition
 */

import React, { useState } from 'react';
import { FiUsers, FiClock, FiBell, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { useQueueSimplified } from '../hooks/useQueueSimplified';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useToast } from '../components/Toast';

// Constants
const REFRESH_INTERVAL = 30000; // 30 seconds
const DEFAULT_PARTY_SIZE = 2;
const NOTIFICATION_METHODS = ['SMS', 'WHATSAPP', 'ANNOUNCEMENT', 'NONE'] as const;
const QUEUE_FILTERS = ['ALL', 'WAITING', 'NOTIFIED'] as const;

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

// Queue Entry Card Component
const QueueEntryCard: React.FC<{
  entry: QueueEntry;
  onNotify: (entry: QueueEntry) => void;
  onSeat: (entry: QueueEntry) => void;
  onCancel: (entry: QueueEntry) => void;
}> = ({ entry, onNotify, onSeat, onCancel }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      WAITING: 'bg-yellow-100 text-yellow-800',
      NOTIFIED: 'bg-blue-100 text-blue-800',
      SEATED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      NO_SHOW: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-lg">{entry.customer_name}</h3>
          <p className="text-sm text-gray-600">{entry.customer_phone}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(entry.status)}`}>
          {entry.status}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <FiUsers /> {entry.party_size}
          </span>
          <span className="flex items-center gap-1">
            <FiClock /> {entry.estimated_wait_minutes || 0} min
          </span>
        </div>
        
        <div className="flex gap-2">
          {entry.status === 'WAITING' && (
            <button
              onClick={() => onNotify(entry)}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="Notify"
            >
              <FiBell className="w-4 h-4" />
            </button>
          )}
          
          {['WAITING', 'NOTIFIED'].includes(entry.status) && (
            <>
              <button
                onClick={() => onSeat(entry)}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                title="Seat"
              >
                <FiCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => onCancel(entry)}
                className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                title="Cancel"
              >
                <FiX className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Add to Queue Form Component
const AddToQueueForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    party_size: DEFAULT_PARTY_SIZE,
    notification_method: NOTIFICATION_METHODS[0],
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({
      customer_name: '',
      customer_phone: '',
      party_size: DEFAULT_PARTY_SIZE,
      notification_method: NOTIFICATION_METHODS[0],
      notes: ''
    });
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium mb-4">Add to Queue</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Customer Name"
          value={formData.customer_name}
          onChange={(e) => updateField('customer_name', e.target.value)}
          className="px-3 py-2 border rounded-md"
          required
        />
        
        <input
          type="tel"
          placeholder="Phone Number"
          value={formData.customer_phone}
          onChange={(e) => updateField('customer_phone', e.target.value)}
          className="px-3 py-2 border rounded-md"
          required
        />
        
        <input
          type="number"
          placeholder="Party Size"
          value={formData.party_size}
          onChange={(e) => updateField('party_size', parseInt(e.target.value))}
          min="1"
          max="20"
          className="px-3 py-2 border rounded-md"
          required
        />
        
        <select
          value={formData.notification_method}
          onChange={(e) => updateField('notification_method', e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          {NOTIFICATION_METHODS.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
      </div>
      
      <textarea
        placeholder="Notes (optional)"
        value={formData.notes}
        onChange={(e) => updateField('notes', e.target.value)}
        className="w-full mt-4 px-3 py-2 border rounded-md"
        rows={2}
      />
      
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add to Queue
        </button>
      </div>
    </form>
  );
};

// Main Component
export const QueueManagementPageSimplified: React.FC = () => {
  const { entries, statistics, loading, addToQueue, notifyCustomer, seatCustomer, cancelEntry, refresh } = useQueueSimplified();
  const { success, error: showError } = useToast();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<typeof QUEUE_FILTERS[number]>('WAITING');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Setup auto-refresh
  useAutoRefresh({
    callback: async () => { 
      await refresh();
    },
    interval: REFRESH_INTERVAL,
    enabled: autoRefreshEnabled,
    immediate: false
  });

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    if (filter === 'ALL') return true;
    return entry.status === filter;
  });

  // Handlers
  const handleAddToQueue = async (data: any) => {
    await addToQueue(null, data);
    setShowAddForm(false);
  };

  const handleNotify = async (entry: QueueEntry) => {
    await notifyCustomer(entry.id);
  };

  const handleSeat = async (entry: QueueEntry) => {
    // In real implementation, would show table selection dialog
    const tableId = 'table-1'; // Placeholder
    await seatCustomer(entry.id, { table_id: tableId });
  };

  const handleCancel = async (entry: QueueEntry) => {
    await cancelEntry(entry.id, { reason: 'Customer request' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Queue Management</h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`px-4 py-2 rounded-md ${
              autoRefreshEnabled ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            <FiRefreshCw className={autoRefreshEnabled ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add to Queue
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">In Queue</p>
            <p className="text-2xl font-bold">{statistics.total_in_queue}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">Avg Wait</p>
            <p className="text-2xl font-bold">{Math.round(statistics.average_wait_time)} min</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">No-show Rate</p>
            <p className="text-2xl font-bold">{(statistics.no_show_rate * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {QUEUE_FILTERS.map(filterOption => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-4 py-2 rounded-md ${
              filter === filterOption 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {filterOption}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-6">
          <AddToQueueForm
            onSubmit={handleAddToQueue}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-3">
        {loading && <p>Loading...</p>}
        
        {!loading && filteredEntries.length === 0 && (
          <p className="text-gray-500 text-center py-8">No entries in queue</p>
        )}
        
        {filteredEntries.map(entry => (
          <QueueEntryCard
            key={entry.id}
            entry={entry}
            onNotify={handleNotify}
            onSeat={handleSeat}
            onCancel={handleCancel}
          />
        ))}
      </div>
    </div>
  );
};