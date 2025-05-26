// /home/ubuntu/pos-modern/src/logging/ui/LogViewer.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LogViewer.css';

const LogViewer = () => {
  const navigate = useNavigate();
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [queryParams, setQueryParams] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    levels: [],
    sources: [],
    modules: [],
    search_text: '',
    limit: 100,
    offset: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  
  // Log levels and sources for filtering
  const logLevels = ['debug', 'info', 'warning', 'error', 'critical'];
  const logSources = [
    'system', 'user', 'api', 'database', 'network', 'security',
    'pos', 'kds', 'waiter', 'kiosk', 'stock', 'customer', 'supplier', 'payment', 'integration'
  ];
  
  // Load logs on component mount and when query params change
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [queryParams.limit, queryParams.offset]);
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare query object
      const query = {
        ...queryParams,
        start_date: queryParams.start_date ? new Date(queryParams.start_date).toISOString() : null,
        end_date: queryParams.end_date ? new Date(queryParams.end_date + 'T23:59:59').toISOString() : null,
        levels: queryParams.levels.length > 0 ? queryParams.levels : null,
        sources: queryParams.sources.length > 0 ? queryParams.sources : null,
        modules: queryParams.modules.length > 0 ? queryParams.modules : null,
        search_text: queryParams.search_text || null
      };
      
      const response = await axios.post('/api/v1/logs/query', query);
      setLogs(response.data);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch logs. Please try again.');
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      // Prepare query object for stats
      const query = {
        ...queryParams,
        start_date: queryParams.start_date ? new Date(queryParams.start_date).toISOString() : null,
        end_date: queryParams.end_date ? new Date(queryParams.end_date + 'T23:59:59').toISOString() : null,
        levels: queryParams.levels.length > 0 ? queryParams.levels : null,
        sources: queryParams.sources.length > 0 ? queryParams.sources : null,
        modules: queryParams.modules.length > 0 ? queryParams.modules : null,
        search_text: queryParams.search_text || null,
        limit: 10000 // Get stats for a larger dataset
      };
      
      const response = await axios.post('/api/v1/logs/stats', query);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching log stats:', err);
    }
  };
  
  const handleSearch = () => {
    setQueryParams({
      ...queryParams,
      offset: 0 // Reset pagination when searching
    });
    fetchLogs();
    fetchStats();
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQueryParams({
      ...queryParams,
      [name]: value
    });
  };
  
  const handleCheckboxChange = (e, category) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setQueryParams({
        ...queryParams,
        [category]: [...queryParams[category], value]
      });
    } else {
      setQueryParams({
        ...queryParams,
        [category]: queryParams[category].filter(item => item !== value)
      });
    }
  };
  
  const handlePagination = (direction) => {
    if (direction === 'prev' && queryParams.offset > 0) {
      setQueryParams({
        ...queryParams,
        offset: Math.max(0, queryParams.offset - queryParams.limit)
      });
    } else if (direction === 'next') {
      setQueryParams({
        ...queryParams,
        offset: queryParams.offset + queryParams.limit
      });
    }
  };
  
  const handleExport = async () => {
    try {
      setLoading(true);
      
      // Prepare query object
      const query = {
        ...queryParams,
        start_date: queryParams.start_date ? new Date(queryParams.start_date).toISOString() : null,
        end_date: queryParams.end_date ? new Date(queryParams.end_date + 'T23:59:59').toISOString() : null,
        levels: queryParams.levels.length > 0 ? queryParams.levels : null,
        sources: queryParams.sources.length > 0 ? queryParams.sources : null,
        modules: queryParams.modules.length > 0 ? queryParams.modules : null,
        search_text: queryParams.search_text || null,
        limit: 10000 // Export more logs
      };
      
      const response = await axios.post(`/api/v1/logs/export?format=${exportFormat}`, query);
      
      // Show success message
      alert(`Logs exported successfully to ${response.data.file_path}`);
      
      setLoading(false);
    } catch (err) {
      console.error('Error exporting logs:', err);
      setError('Failed to export logs. Please try again.');
      setLoading(false);
    }
  };
  
  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear logs? This action cannot be undone.')) {
      try {
        setLoading(true);
        
        // Keep logs from the last 7 days
        const response = await axios.delete('/api/v1/logs?days_to_keep=7');
        
        alert(`Logs cleared successfully. ${response.data.files_removed} files and ${response.data.entries_removed} entries removed.`);
        
        // Refresh logs
        fetchLogs();
        fetchStats();
        
        setLoading(false);
      } catch (err) {
        console.error('Error clearing logs:', err);
        setError('Failed to clear logs. Please try again.');
        setLoading(false);
      }
    }
  };
  
  const getLevelClass = (level) => {
    switch (level) {
      case 'debug':
        return 'log-level-debug';
      case 'info':
        return 'log-level-info';
      case 'warning':
        return 'log-level-warning';
      case 'error':
        return 'log-level-error';
      case 'critical':
        return 'log-level-critical';
      default:
        return '';
    }
  };
  
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };
  
  return (
    <div className="log-viewer-container">
      <h1>Log Viewer</h1>
      
      <div className="log-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Start Date:</label>
            <input
              type="date"
              name="start_date"
              value={queryParams.start_date}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date:</label>
            <input
              type="date"
              name="end_date"
              value={queryParams.end_date}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              name="search_text"
              value={queryParams.search_text}
              onChange={handleInputChange}
              placeholder="Search in logs..."
            />
          </div>
        </div>
        
        <div className="filter-row">
          <div className="filter-group">
            <label>Log Levels:</label>
            <div className="checkbox-group">
              {logLevels.map(level => (
                <label key={level} className={`checkbox-label ${getLevelClass(level)}`}>
                  <input
                    type="checkbox"
                    value={level}
                    checked={queryParams.levels.includes(level)}
                    onChange={(e) => handleCheckboxChange(e, 'levels')}
                  />
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="filter-row">
          <div className="filter-group">
            <label>Sources:</label>
            <div className="checkbox-group">
              {logSources.map(source => (
                <label key={source} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={source}
                    checked={queryParams.sources.includes(source)}
                    onChange={(e) => handleCheckboxChange(e, 'sources')}
                  />
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="filter-actions">
          <button className="search-button" onClick={handleSearch}>
            Search Logs
          </button>
          
          <div className="export-group">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="txt">Text</option>
            </select>
            <button className="export-button" onClick={handleExport}>
              Export Logs
            </button>
          </div>
          
          <button className="clear-button" onClick={handleClearLogs}>
            Clear Old Logs
          </button>
        </div>
      </div>
      
      {stats && (
        <div className="log-stats">
          <h2>Log Statistics</h2>
          
          <div className="stats-grid">
            <div className="stats-card">
              <h3>Total Entries</h3>
              <div className="stats-value">{stats.total_entries}</div>
            </div>
            
            <div className="stats-card">
              <h3>By Level</h3>
              <div className="stats-list">
                {Object.entries(stats.entries_by_level).map(([level, count]) => (
                  count > 0 && (
                    <div key={level} className={`stats-item ${getLevelClass(level)}`}>
                      <span className="stats-label">{level}</span>
                      <span className="stats-count">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
            
            <div className="stats-card">
              <h3>By Source</h3>
              <div className="stats-list">
                {Object.entries(stats.entries_by_source)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([source, count]) => (
                    <div key={source} className="stats-item">
                      <span className="stats-label">{source}</span>
                      <span className="stats-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            {stats.most_common_errors.length > 0 && (
              <div className="stats-card">
                <h3>Common Errors</h3>
                <div className="stats-list">
                  {stats.most_common_errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="stats-item error">
                      <span className="stats-label">{error.message}</span>
                      <span className="stats-count">{error.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="logs-table-container">
        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Source</th>
                  <th>Module</th>
                  <th>Message</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-logs-message">
                      No logs found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr 
                      key={log.id} 
                      className={getLevelClass(log.level)}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td>{formatDateTime(log.timestamp)}</td>
                      <td className="log-level">{log.level}</td>
                      <td>{log.source}</td>
                      <td>{log.module}</td>
                      <td className="log-message">{log.message}</td>
                      <td>{log.user_name || log.user_id || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className="pagination">
              <button 
                onClick={() => handlePagination('prev')}
                disabled={queryParams.offset === 0}
              >
                Previous
              </button>
              <span>
                Showing {queryParams.offset + 1} - {queryParams.offset + logs.length} logs
              </span>
              <button 
                onClick={() => handlePagination('next')}
                disabled={logs.length < queryParams.limit}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
      
      {selectedLog && (
        <div className="log-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Log Details</h2>
              <button className="close-button" onClick={() => setSelectedLog(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedLog.id}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">{formatDateTime(selectedLog.timestamp)}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Level:</span>
                <span className={`detail-value ${getLevelClass(selectedLog.level)}`}>
                  {selectedLog.level}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Source:</span>
                <span className="detail-value">{selectedLog.source}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Module:</span>
                <span className="detail-value">{selectedLog.module}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Message:</span>
                <span className="detail-value">{selectedLog.message}</span>
              </div>
              
              {selectedLog.user_id && (
                <div className="detail-row">
                  <span className="detail-label">User:</span>
                  <span className="detail-value">
                    {selectedLog.user_name} ({selectedLog.user_id})
                  </span>
                </div>
              )}
              
              {selectedLog.ip_address && (
                <div className="detail-row">
                  <span className="detail-label">IP Address:</span>
                  <span className="detail-value">{selectedLog.ip_address}</span>
                </div>
              )}
              
              {selectedLog.session_id && (
                <div className="detail-row">
                  <span className="detail-label">Session ID:</span>
                  <span className="detail-value">{selectedLog.session_id}</span>
                </div>
              )}
              
              {selectedLog.tags && selectedLog.tags.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Tags:</span>
                  <div className="detail-value tags-list">
                    {selectedLog.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedLog.details && (
                <div className="detail-row">
                  <span className="detail-label">Details:</span>
                  <pre className="detail-value details-json">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
