import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useOrder } from '../hooks/useOrder';
import { useTable } from '../hooks/useTable';
import { useAuth } from '../hooks/useAuth';
import Toast, { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';
import '../index.css';

interface Chair {
  id: number;
  occupied: boolean;
  customerName?: string;
  orderValue?: number;
}

interface Table {
  id: string;
  number: number;
  seats: number;
  chairs?: Chair[];
  splitByChair?: boolean; // Se true, permite pedidos por cadeira
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  area: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  shape?: 'square' | 'round' | 'rectangle';
  waiter?: string;
  customers?: number;
  orderValue?: number;
  startTime?: string;
}

export default function TablePage() {
  const navigate = useNavigate();
  const { terminalId } = useParams();
  const { user } = useAuth();
  const { orders, getOrders, createOrder } = useOrder();
  const { 
    tables: backendTables, 
    loading: tablesLoading,
    updateTable,
    updateTableStatus,
    occupyTable,
    clearTable,
    reserveTable: reserveTableApi,
    createTable: createNewTable,
    deleteTable,
    loadTables
  } = useTable();
  const { toasts, removeToast, success, error, warning, info } = useToast();
  
  // State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showTableDetails, setShowTableDetails] = useState(false);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'layout' | 'grid' | 'list'>('layout');
  const [editMode, setEditMode] = useState(false);
  const [draggedTable, setDraggedTable] = useState<Table | null>(null);
  const [gridSize] = useState(20);
  
  // Form states
  const [reservationName, setReservationName] = useState('');
  const [reservationPhone, setReservationPhone] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [reservationGuests, setReservationGuests] = useState('');
  
  // New table form
  const [newTable, setNewTable] = useState({
    number: '',
    seats: 4,
    area: 'saloon',
    shape: 'square' as 'square' | 'round' | 'rectangle',
    width: 80,
    height: 80
  });
  
  // Areas
  const areas = [
    { id: 'all', name: 'Todas as Áreas', icon: '🏢' },
    { id: 'saloon', name: 'Salão Principal', icon: '🍽️' },
    { id: 'terrace', name: 'Terraço', icon: '☀️' },
    { id: 'vip', name: 'Área VIP', icon: '⭐' },
    { id: 'bar', name: 'Bar', icon: '🍻' }
  ];
  
  // Transform backend tables to include UI properties
  const tables = backendTables.map((t: any) => {
    // Set minimum size for small tables
    const minSize = t.seats <= 2 ? 80 : 100;
    const width = t.size?.width || (t.seats <= 2 ? 80 : 100);
    const height = t.size?.height || (t.seats <= 2 ? 80 : 100);
    
    return {
      ...t,
      chairs: Array.from({ length: t.seats }, (_, i) => ({ 
        id: i + 1, 
        occupied: false 
      })),
      splitByChair: false,
      customers: t.customer_count,
      orderValue: t.order_total,
      startTime: t.start_time,
      waiter: t.waiter_name,
      size: { width, height }
    };
  });

  // Load data on mount
  useEffect(() => {
    loadOrders();
    loadTables();
  }, []);
  
  const loadOrders = useCallback(async () => {
    try {
      await getOrders();
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }, [getOrders]);
  
  // Keyboard shortcuts
  useHotkeys('v', () => setViewMode(prev => prev === 'layout' ? 'grid' : 'layout'));
  useHotkeys('e', () => setEditMode(!editMode));
  useHotkeys('a', () => setShowAddTableDialog(true));
  useHotkeys('esc', () => {
    setShowTableDetails(false);
    setShowReservationDialog(false);
    setShowAddTableDialog(false);
    setEditMode(false);
  });
  
  const handleTableClick = async (table: Table) => {
    if (editMode) return;
    
    if (table.status === 'available') {
      try {
        await occupyTable(table.id, 2, user?.id);
        navigate(`/pos/${terminalId}/waiter/table/${table.number}`);
      } catch (err) {
        error('Erro ao ocupar mesa');
      }
    } else {
      setSelectedTable(table);
      setShowTableDetails(true);
    }
  };
  
  const handleReservation = async () => {
    if (!selectedTable || !reservationName || !reservationPhone || !reservationTime) return;
    
    try {
      await reserveTableApi(selectedTable.id, {
        customer_name: reservationName,
        customer_phone: reservationPhone,
        reservation_time: reservationTime,
        guest_count: parseInt(reservationGuests) || 0,
        notes: ''
      });
      
      success('Mesa reservada com sucesso!');
      setShowReservationDialog(false);
      setReservationName('');
      setReservationPhone('');
      setReservationTime('');
      setReservationGuests('');
    } catch (err) {
      error('Erro ao reservar mesa');
    }
  };
  
  const handleAddTable = async () => {
    if (!newTable.number) return;
    
    try {
      if (selectedTable && editMode) {
        // Edit existing table
        const updatedData = {
          number: parseInt(newTable.number),
          seats: newTable.seats,
          area: newTable.area,
          size: { width: newTable.width, height: newTable.height },
          shape: newTable.shape
        };
        
        await updateTable(selectedTable.id, updatedData);
        success('Mesa atualizada com sucesso!');
      } else {
        // Create new table
        const newTableData = {
          number: parseInt(newTable.number),
          seats: newTable.seats,
          status: 'available' as const,
          area: newTable.area,
          position: { x: 100, y: 300 },
          size: { width: newTable.width, height: newTable.height },
          shape: newTable.shape
        };
        
        await createNewTable(newTableData);
        success('Mesa adicionada com sucesso!');
      }
      
      setShowAddTableDialog(false);
      setSelectedTable(null);
      setNewTable({
        number: '',
        seats: 4,
        area: 'saloon',
        shape: 'square',
        width: 80,
        height: 80
      });
      await loadTables();
    } catch (err) {
      error(selectedTable ? 'Erro ao atualizar mesa' : 'Erro ao adicionar mesa');
    }
  };
  
  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Tem certeza que deseja remover esta mesa?')) return;
    try {
      await deleteTable(tableId);
      success('Mesa removida com sucesso!');
      await loadTables();
    } catch (err) {
      error('Erro ao remover mesa');
    }
  };
  
  const handleTableDragStart = (table: Table, e: React.DragEvent) => {
    if (!editMode) return;
    setDraggedTable(table);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleTableDragEnd = () => {
    setDraggedTable(null);
  };
  
  const handleLayoutDrop = (e: React.DragEvent) => {
    if (!editMode || !draggedTable) return;
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / gridSize) * gridSize;
    const y = Math.round((e.clientY - rect.top) / gridSize) * gridSize;
    
    // TODO: Use the updateTable function from useTable hook
    // updateTable(draggedTable.id, { position: { x, y } });
  };
  
  const handleLayoutDragOver = (e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleResizeTable = (table: Table, direction: 'width' | 'height', delta: number) => {
    if (!editMode) return;
    
    // TODO: Use the updateTable function from useTable hook
    // const newSize = {
    //   ...table.size!,
    //   [direction]: Math.max(60, Math.min(200, (table.size?.[direction] || 80) + delta))
    // };
    // updateTable(table.id, { size: newSize });
  };
  
  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700';
      case 'occupied':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700';
      case 'cleaning':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
      default:
        return '';
    }
  };
  
  const getStatusIcon = (status: Table['status']) => {
    switch (status) {
      case 'available': return '✅';
      case 'occupied': return '🍽️';
      case 'reserved': return '📅';
      case 'cleaning': return '🧹';
      default: return '?';
    }
  };
  
  const filteredTables = tables.filter((table: any) => {
    const matchesArea = selectedArea === 'all' || table.area === selectedArea;
    const matchesStatus = filter === 'all' || table.status === filter;
    return matchesArea && matchesStatus;
  });
  
  const stats = {
    total: tables.length,
    available: tables.filter((t: any) => t.status === 'available').length,
    occupied: tables.filter((t: any) => t.status === 'occupied').length,
    reserved: tables.filter((t: any) => t.status === 'reserved').length,
    occupancyRate: Math.round((tables.filter((t: any) => t.status === 'occupied').length / tables.length) * 100)
  };
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400">
              {stats.occupied} de {stats.total} mesas ocupadas ({stats.occupancyRate}%)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('layout')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'layout'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                title="Layout Visual (V)"
              >
                Layout
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                title="Grade (V)"
              >
                Grade
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Lista
              </button>
            </div>
            
            {/* Edit Mode (only for layout) */}
            {viewMode === 'layout' && (
              <>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    editMode
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                  title="Editar Layout (E)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {editMode ? 'Salvar' : 'Editar'}
                </button>
                
                {/* Close Edit Mode Button */}
                {editMode && (
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center gap-2"
                    title="Fechar Edição (ESC)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Fechar
                  </button>
                )}
              </>
            )}
            
            {/* Add Table (edit mode) */}
            {editMode && (
              <button
                onClick={() => setShowAddTableDialog(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
                title="Adicionar Mesa (A)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Mesa
              </button>
            )}
            
            {/* Delivery Button */}
            <button
              onClick={() => navigate(`/pos/${terminalId}/delivery`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Delivery
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedArea === area.id
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span>{area.icon}</span>
              {area.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Layout View */}
        {viewMode === 'layout' && (
          <div 
            className="relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg"
            style={{ height: '600px' }}
            onDrop={handleLayoutDrop}
            onDragOver={handleLayoutDragOver}
          >
            {/* Grid (edit mode) */}
            {editMode && (
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #ccc 1px, transparent 1px),
                    linear-gradient(to bottom, #ccc 1px, transparent 1px)
                  `,
                  backgroundSize: `${gridSize}px ${gridSize}px`
                }}
              />
            )}
            
            {/* Edit Mode Banner */}
            {editMode && (
              <div className="absolute top-4 left-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg text-sm z-10">
                <p className="font-medium">Modo de Edição</p>
                <p className="text-xs">Arraste para mover • Clique em X para deletar</p>
              </div>
            )}
            
            {/* Tables */}
            {filteredTables.map(table => {
              // Calculate chair positions
              const getChairPositions = () => {
                const positions: Array<{ x: number; y: number; angle: number }> = [];
                const centerX = (table.size?.width || 100) / 2;
                const centerY = (table.size?.height || 100) / 2;
                const chairCount = table.seats || 4;
                
                if (table.shape === 'round') {
                  // Circular arrangement
                  const radius = Math.min(centerX, centerY) - 10;
                  for (let i = 0; i < chairCount; i++) {
                    const angle = (i * 2 * Math.PI) / chairCount - Math.PI / 2;
                    positions.push({
                      x: centerX + radius * Math.cos(angle),
                      y: centerY + radius * Math.sin(angle),
                      angle: angle + Math.PI / 2
                    });
                  }
                } else if (table.shape === 'rectangle' && chairCount === 6) {
                  // Rectangle with 3 chairs on each long side
                  const spacing = (table.size?.width || 140) / 4;
                  positions.push(
                    { x: spacing, y: 5, angle: 0 },
                    { x: spacing * 2, y: 5, angle: 0 },
                    { x: spacing * 3, y: 5, angle: 0 },
                    { x: spacing, y: (table.size?.height || 100) - 5, angle: Math.PI },
                    { x: spacing * 2, y: (table.size?.height || 100) - 5, angle: Math.PI },
                    { x: spacing * 3, y: (table.size?.height || 100) - 5, angle: Math.PI }
                  );
                } else {
                  // Square arrangement - chairs on 4 sides
                  if (chairCount === 4) {
                    positions.push(
                      { x: centerX, y: 5, angle: 0 }, // top
                      { x: (table.size?.width || 100) - 5, y: centerY, angle: Math.PI / 2 }, // right
                      { x: centerX, y: (table.size?.height || 100) - 5, angle: Math.PI }, // bottom
                      { x: 5, y: centerY, angle: -Math.PI / 2 } // left
                    );
                  } else if (chairCount === 2) {
                    positions.push(
                      { x: centerX, y: 5, angle: 0 },
                      { x: centerX, y: (table.size?.height || 80) - 5, angle: Math.PI }
                    );
                  }
                }
                return positions;
              };
              
              const chairPositions = getChairPositions();
              
              return (
                <div
                  key={table.id}
                  draggable={editMode}
                  onDragStart={(e) => handleTableDragStart(table, e)}
                  onDragEnd={handleTableDragEnd}
                  onClick={() => handleTableClick(table)}
                  className={`absolute border-2 transition-all cursor-pointer ${
                    getStatusColor(table.status)
                  } ${editMode ? 'hover:shadow-xl' : 'hover:scale-105'} ${
                    table.shape === 'round' ? 'rounded-full' : 
                    table.shape === 'rectangle' ? 'rounded-lg' : 'rounded-lg'
                  }`}
                  style={{
                    left: `${table.position.x}px`,
                    top: `${table.position.y}px`,
                    width: `${Math.max(table.size?.width || 100, table.seats <= 2 ? 80 : 100)}px`,
                    height: `${Math.max(table.size?.height || 100, table.seats <= 2 ? 80 : 100)}px`
                  }}
                >
                  {/* Chairs - show for all tables */}
                  {!editMode && chairPositions.length > 0 && chairPositions.map((pos, index) => {
                    const chair = table.chairs && table.chairs[index];
                    const isOccupied = chair?.occupied || false;
                    return (
                      <div
                        key={index}
                        className={`absolute w-3 h-3 rounded-full border-2 ${
                          isOccupied
                            ? 'bg-red-500 border-red-600' 
                            : 'bg-gray-300 border-gray-400 dark:bg-gray-600 dark:border-gray-500'
                        }`}
                        style={{
                          left: `${pos.x - 6}px`,
                          top: `${pos.y - 6}px`,
                        }}
                        title={isOccupied && chair
                          ? `${chair.customerName} - ${formatCurrency(chair.orderValue || 0)}`
                          : 'Disponível'
                        }
                      />
                    );
                  })}
                  
                  {/* Edit/Delete buttons (edit mode) */}
                  {editMode && (
                    <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTable(table);
                          setNewTable({
                            number: table.number.toString(),
                            seats: table.seats,
                            area: table.area,
                            shape: table.shape || 'square',
                            width: table.size?.width || 100,
                            height: table.size?.height || 100
                          });
                          setShowAddTableDialog(true);
                        }}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 text-xs"
                        title="Editar Mesa"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                        className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs"
                        title="Remover Mesa"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  
                  {/* Table content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                    {/* Adjust content size based on table size */}
                    <div className={`${(table.size?.width || 100) < 90 ? 'text-sm' : 'text-lg'}`}>
                      {getStatusIcon(table.status)}
                    </div>
                    <div className={`font-bold ${(table.size?.width || 100) < 90 ? 'text-[10px]' : 'text-xs'}`}>
                      Mesa {table.number}
                    </div>
                    {!editMode && (
                      <>
                        {(table.size?.width || 100) >= 80 && (
                          <div className="text-[10px] opacity-75">
                            {table.splitByChair && table.chairs ? 
                              `${table.chairs.filter(c => c.occupied).length}/${table.seats}` :
                              `${table.seats}L`
                            }
                          </div>
                        )}
                        {table.orderValue && (table.size?.width || 100) >= 80 && (
                          <div className="text-[10px] font-bold mt-0.5 px-1 text-center">
                            {formatCurrency(table.orderValue).replace('R$ ', '')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTables.map(table => (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`p-6 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 ${
                  getStatusColor(table.status)
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{getStatusIcon(table.status)}</div>
                  <h3 className="text-xl font-bold mb-1">Mesa {table.number}</h3>
                  <p className="text-sm opacity-75">{table.seats} lugares</p>
                  {table.orderValue && (
                    <p className="text-lg font-bold mt-2">
                      {formatCurrency(table.orderValue)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mesa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Área</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lugares</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTables.map(table => (
                  <tr key={table.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(table.status)}</span>
                        <span className="font-medium text-gray-900 dark:text-white">Mesa {table.number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {areas.find(a => a.id === table.area)?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{table.seats}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(table.status)}`}>
                        {table.status === 'available' ? 'Disponível' :
                         table.status === 'occupied' ? 'Ocupada' :
                         table.status === 'reserved' ? 'Reservada' : 'Limpeza'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {table.orderValue ? formatCurrency(table.orderValue) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTableClick(table)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        {table.status === 'available' ? 'Abrir' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Table Details Modal */}
      {showTableDetails && selectedTable && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTableDetails(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Mesa {selectedTable.number}
                </h2>
                <button
                  onClick={() => setShowTableDetails(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="font-medium capitalize">{selectedTable.status}</p>
                </div>
                
                {/* Chair details if split by chair */}
                {selectedTable.splitByChair && selectedTable.chairs && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pedidos por Cadeira
                    </p>
                    <div className="space-y-2">
                      {selectedTable.chairs.map((chair, index) => (
                        <div 
                          key={chair.id}
                          className={`p-3 rounded-lg border ${
                            chair.occupied 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                chair.occupied 
                                  ? 'bg-red-500' 
                                  : 'bg-gray-400 dark:bg-gray-600'
                              }`} />
                              <span className="text-sm font-medium">
                                Cadeira {index + 1}
                              </span>
                              {chair.occupied && (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  - {chair.customerName}
                                </span>
                              )}
                            </div>
                            {chair.occupied ? (
                              <span className="font-bold text-sm">
                                {formatCurrency(chair.orderValue || 0)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Disponível
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Total da Mesa
                        </span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(selectedTable.orderValue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Regular total if not split by chair */}
                {!selectedTable.splitByChair && selectedTable.orderValue && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Consumo Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(selectedTable.orderValue)}</p>
                  </div>
                )}
                
                {/* Toggle split by chair option */}
                {selectedTable.status === 'occupied' && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pedidos por Cadeira
                    </span>
                    <button
                      onClick={() => {
                        // TODO: Use the updateTable function from useTable hook
                        // updateTable(selectedTable.id, { splitByChair: !selectedTable.splitByChair });
                        setSelectedTable({ ...selectedTable, splitByChair: !selectedTable.splitByChair });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        selectedTable.splitByChair ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        selectedTable.splitByChair ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {selectedTable.status === 'occupied' && (
                    <>
                      <button
                        onClick={() => navigate(`/pos/${terminalId}/waiter/table/${selectedTable.number}`)}
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                      >
                        Ver Pedidos
                      </button>
                      <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">
                        Fechar Conta
                      </button>
                    </>
                  )}
                  
                  {selectedTable.status === 'available' && (
                    <button
                      onClick={() => {
                        setShowTableDetails(false);
                        setShowReservationDialog(true);
                      }}
                      className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600"
                    >
                      Reservar Mesa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reservation Dialog */}
      {showReservationDialog && selectedTable && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReservationDialog(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Reservar Mesa {selectedTable.number}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={reservationName}
                    onChange={(e) => setReservationName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={reservationPhone}
                    onChange={(e) => setReservationPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de Pessoas
                  </label>
                  <input
                    type="number"
                    value={reservationGuests}
                    onChange={(e) => setReservationGuests(e.target.value)}
                    min="1"
                    max={selectedTable.seats}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReservationDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReservation}
                    className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600"
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Table Dialog */}
      {showAddTableDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddTableDialog(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {selectedTable && editMode ? 'Editar Mesa' : 'Adicionar Nova Mesa'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número da Mesa
                  </label>
                  <input
                    type="text"
                    value={newTable.number}
                    onChange={(e) => setNewTable({ ...newTable, number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de Lugares
                  </label>
                  <input
                    type="number"
                    value={newTable.seats}
                    onChange={(e) => setNewTable({ ...newTable, seats: parseInt(e.target.value) || 2 })}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Área
                  </label>
                  <select
                    value={newTable.area}
                    onChange={(e) => setNewTable({ ...newTable, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {areas.filter(a => a.id !== 'all').map(area => (
                      <option key={area.id} value={area.id}>
                        {area.icon} {area.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Formato
                  </label>
                  <div className="flex gap-2">
                    {(['square', 'round', 'rectangle'] as const).map(shape => (
                      <button
                        key={shape}
                        onClick={() => setNewTable({ ...newTable, shape })}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-all ${
                          newTable.shape === shape
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {shape === 'square' ? 'Quadrada' : shape === 'round' ? 'Redonda' : 'Retangular'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddTableDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddTable}
                    disabled={!newTable.number}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedTable && editMode ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  );
}