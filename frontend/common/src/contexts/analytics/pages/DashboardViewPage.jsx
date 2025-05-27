import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Typography, Paper, Button, IconButton, Menu, MenuItem, Divider, useTheme, useMediaQuery, Tabs, Tab } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  LineStyle as LineStyleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  GetApp as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  FilterList as FilterListIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnalyticsApi } from '../../hooks/useAnalyticsApi';
import ChartComponent from '../components/dashboard/ChartComponent';
import DashboardToolbar from '../components/dashboard/DashboardToolbar';
import DashboardFilterPanel from '../components/dashboard/DashboardFilterPanel';
import AddChartDialog from '../components/dashboard/AddChartDialog';
import EditChartDialog from '../components/dashboard/EditChartDialog';
import ShareDashboardDialog from '../components/dashboard/ShareDashboardDialog';
import ExportDashboardDialog from '../components/dashboard/ExportDashboardDialog';
import AlertsDialog from '../components/dashboard/AlertsDialog';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const DashboardViewPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { dashboardId } = useParams();
  const { 
    getDashboard, 
    updateDashboard, 
    getChartData, 
    createAlert,
    exportDashboard,
    shareDashboard
  } = useAnalyticsApi();
  
  // State
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState([]);
  const [chartData, setChartData] = useState({});
  const [selectedChartId, setSelectedChartId] = useState(null);
  
  // Dialog states
  const [addChartDialogOpen, setAddChartDialogOpen] = useState(false);
  const [editChartDialogOpen, setEditChartDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // View mode
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const dashboardData = await getDashboard(dashboardId);
        setDashboard(dashboardData);
        setCurrentFilters(dashboardData.filters || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Não foi possível carregar o dashboard. Por favor, tente novamente.');
        setLoading(false);
      }
    };
    
    if (dashboardId) {
      fetchDashboard();
    }
  }, [dashboardId, getDashboard]);
  
  // Fetch chart data for all charts
  useEffect(() => {
    const fetchAllChartData = async () => {
      if (!dashboard || !dashboard.items || dashboard.items.length === 0) return;
      
      try {
        const dataPromises = dashboard.items.map(item => {
          if (item.chart_configuration) {
            return getChartData(item.chart_configuration, currentFilters)
              .then(data => ({ id: item.id, data }))
              .catch(err => {
                console.error(`Error fetching data for chart ${item.id}:`, err);
                return { id: item.id, error: err.message || 'Failed to load data' };
              });
          }
          return Promise.resolve({ id: item.id, data: null });
        });
        
        const results = await Promise.all(dataPromises);
        
        const newChartData = {};
        results.forEach(result => {
          newChartData[result.id] = result.data || { error: result.error };
        });
        
        setChartData(newChartData);
      } catch (err) {
        console.error('Error fetching chart data:', err);
      }
    };
    
    fetchAllChartData();
  }, [dashboard, currentFilters, getChartData]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setCurrentFilters(newFilters);
  }, []);
  
  // Handle layout changes (drag and drop)
  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !dashboard) return;
    
    const items = Array.from(dashboard.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setDashboard({
      ...dashboard,
      items
    });
    
    // If in edit mode, don't save automatically
    if (!editMode) {
      updateDashboard(dashboardId, { items });
    }
  }, [dashboard, dashboardId, editMode, updateDashboard]);
  
  // Handle adding a new chart
  const handleAddChart = useCallback((chartData) => {
    if (!dashboard) return;
    
    const newItem = {
      id: `item-${Date.now()}`,
      name: chartData.name,
      type: 'chart',
      chart_configuration: chartData.configuration,
      position: {
        x: 0,
        y: dashboard.items.length > 0 ? Math.max(...dashboard.items.map(item => item.position.y + item.size.height)) : 0,
        width: chartData.size?.width || 6,
        height: chartData.size?.height || 4
      }
    };
    
    const updatedItems = [...dashboard.items, newItem];
    
    setDashboard({
      ...dashboard,
      items: updatedItems
    });
    
    // If in edit mode, don't save automatically
    if (!editMode) {
      updateDashboard(dashboardId, { items: updatedItems });
    }
    
    setAddChartDialogOpen(false);
  }, [dashboard, dashboardId, editMode, updateDashboard]);
  
  // Handle editing a chart
  const handleEditChart = useCallback((chartId, chartData) => {
    if (!dashboard) return;
    
    const updatedItems = dashboard.items.map(item => {
      if (item.id === chartId) {
        return {
          ...item,
          name: chartData.name,
          chart_configuration: chartData.configuration,
          size: chartData.size || item.size
        };
      }
      return item;
    });
    
    setDashboard({
      ...dashboard,
      items: updatedItems
    });
    
    // If in edit mode, don't save automatically
    if (!editMode) {
      updateDashboard(dashboardId, { items: updatedItems });
    }
    
    setEditChartDialogOpen(false);
    setSelectedChartId(null);
  }, [dashboard, dashboardId, editMode, updateDashboard]);
  
  // Handle deleting a chart
  const handleDeleteChart = useCallback(() => {
    if (!dashboard || !selectedChartId) return;
    
    const updatedItems = dashboard.items.filter(item => item.id !== selectedChartId);
    
    setDashboard({
      ...dashboard,
      items: updatedItems
    });
    
    // If in edit mode, don't save automatically
    if (!editMode) {
      updateDashboard(dashboardId, { items: updatedItems });
    }
    
    setDeleteConfirmOpen(false);
    setSelectedChartId(null);
  }, [dashboard, dashboardId, editMode, selectedChartId, updateDashboard]);
  
  // Handle saving dashboard changes in edit mode
  const handleSaveDashboard = useCallback(() => {
    if (!dashboard) return;
    
    updateDashboard(dashboardId, dashboard)
      .then(() => {
        setEditMode(false);
      })
      .catch(err => {
        console.error('Error saving dashboard:', err);
        setError('Não foi possível salvar as alterações. Por favor, tente novamente.');
      });
  }, [dashboard, dashboardId, updateDashboard]);
  
  // Handle sharing dashboard
  const handleShareDashboard = useCallback((shareData) => {
    if (!dashboard) return;
    
    shareDashboard(dashboardId, shareData)
      .then(() => {
        setShareDialogOpen(false);
      })
      .catch(err => {
        console.error('Error sharing dashboard:', err);
        setError('Não foi possível compartilhar o dashboard. Por favor, tente novamente.');
      });
  }, [dashboard, dashboardId, shareDashboard]);
  
  // Handle exporting dashboard
  const handleExportDashboard = useCallback((exportData) => {
    if (!dashboard) return;
    
    exportDashboard(dashboardId, exportData.format, currentFilters)
      .then(exportResult => {
        setExportDialogOpen(false);
        
        // If export is completed immediately, download the file
        if (exportResult.status === 'completed' && exportResult.file_url) {
          window.open(exportResult.file_url, '_blank');
        } else {
          // Otherwise, show a message that export is in progress
          // In a real app, you would poll for status or use websockets
          alert('Exportação iniciada. Você receberá uma notificação quando estiver pronta.');
        }
      })
      .catch(err => {
        console.error('Error exporting dashboard:', err);
        setError('Não foi possível exportar o dashboard. Por favor, tente novamente.');
      });
  }, [dashboard, dashboardId, currentFilters, exportDashboard]);
  
  // Handle creating alert
  const handleCreateAlert = useCallback((alertData) => {
    if (!dashboard) return;
    
    createAlert({
      ...alertData,
      dashboard_id: dashboardId
    })
      .then(() => {
        setAlertsDialogOpen(false);
      })
      .catch(err => {
        console.error('Error creating alert:', err);
        setError('Não foi possível criar o alerta. Por favor, tente novamente.');
      });
  }, [dashboard, dashboardId, createAlert]);
  
  // Handle refreshing data
  const handleRefreshData = useCallback(() => {
    if (!dashboard) return;
    
    setLoading(true);
    
    // Re-fetch dashboard and chart data
    getDashboard(dashboardId)
      .then(dashboardData => {
        setDashboard(dashboardData);
        setCurrentFilters(dashboardData.filters || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error refreshing dashboard:', err);
        setError('Não foi possível atualizar os dados. Por favor, tente novamente.');
        setLoading(false);
      });
  }, [dashboard, dashboardId, getDashboard]);
  
  // Render loading state
  if (loading) {
    return <LoadingIndicator message="Carregando dashboard..." />;
  }
  
  // Render error state
  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }
  
  // Render empty state
  if (!dashboard) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <DashboardIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary' }} />
        <Typography variant="h5" gutterBottom>Dashboard não encontrado</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          O dashboard solicitado não existe ou você não tem permissão para acessá-lo.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/analytics/dashboards')}
          sx={{ mt: 2 }}
        >
          Voltar para Dashboards
        </Button>
      </Box>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Dashboard Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1">
              {dashboard.name}
            </Typography>
            {dashboard.description && (
              <Typography variant="body1" color="text.secondary">
                {dashboard.description}
              </Typography>
            )}
          </Box>
          
          <DashboardToolbar 
            editMode={editMode}
            onToggleEditMode={() => setEditMode(!editMode)}
            onSave={handleSaveDashboard}
            onShare={() => setShareDialogOpen(true)}
            onExport={() => setExportDialogOpen(true)}
            onAlerts={() => setAlertsDialogOpen(true)}
            onRefresh={handleRefreshData}
            onToggleFilterPanel={() => setFilterPanelOpen(!filterPanelOpen)}
            onViewModeChange={setViewMode}
            viewMode={viewMode}
          />
        </Box>
      </Paper>
      
      {/* Main Content */}
      <Box sx={{ display: 'flex' }}>
        {/* Filter Panel */}
        {filterPanelOpen && (
          <Paper sx={{ width: 280, mr: 2, p: 2, height: 'fit-content' }}>
            <DashboardFilterPanel 
              filters={currentFilters}
              onChange={handleFilterChange}
              availableFields={dashboard.available_fields || []}
            />
          </Paper>
        )}
        
        {/* Dashboard Content */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Add Chart Button (Edit Mode) */}
          {editMode && (
            <Box sx={{ mb: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => setAddChartDialogOpen(true)}
              >
                Adicionar Gráfico
              </Button>
            </Box>
          )}
          
          {/* Charts Grid */}
          {dashboard.items.length > 0 ? (
            viewMode === 'grid' ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="dashboard-items" direction="vertical">
                  {(provided) => (
                    <Grid 
                      container 
                      spacing={2}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {dashboard.items.map((item, index) => (
                        <Draggable 
                          key={item.id} 
                          draggableId={item.id} 
                          index={index}
                          isDragDisabled={!editMode}
                        >
                          {(provided) => (
                            <Grid 
                              item 
                              xs={12} 
                              md={item.position?.width || 6}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Paper sx={{ p: 2, height: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="h6">{item.name}</Typography>
                                  
                                  {editMode && (
                                    <Box>
                                      <IconButton 
                                        size="small"
                                        onClick={() => {
                                          setSelectedChartId(item.id);
                                          setEditChartDialogOpen(true);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton 
                                        size="small"
                                        onClick={() => {
                                          setSelectedChartId(item.id);
                                          setDeleteConfirmOpen(true);
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  )}
                                </Box>
                                
                                <Box sx={{ height: item.position?.height ? `${item.position.height * 80}px` : '300px' }}>
                                  <ChartComponent 
                                    chartType={item.chart_configuration?.type || 'bar'}
                                    data={chartData[item.id] || { error: 'Dados não disponíveis' }}
                                    options={item.chart_configuration?.options || {}}
                                  />
                                </Box>
                              </Paper>
                            </Grid>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Grid>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              // List View
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="dashboard-items-list" direction="vertical">
                  {(provided) => (
                    <Box 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {dashboard.items.map((item, index) => (
                        <Draggable 
                          key={item.id} 
                          draggableId={item.id} 
                          index={index}
                          isDragDisabled={!editMode}
                        >
                          {(provided) => (
                            <Paper 
                              sx={{ p: 2, mb: 2 }}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6">{item.name}</Typography>
                                
                                {editMode && (
                                  <Box>
                                    <IconButton 
                                      size="small"
                                      onClick={() => {
                                        setSelectedChartId(item.id);
                                        setEditChartDialogOpen(true);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      size="small"
                                      onClick={() => {
                                        setSelectedChartId(item.id);
                                        setDeleteConfirmOpen(true);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </Box>
                              
                              <Box sx={{ height: '400px' }}>
                                <ChartComponent 
                                  chartType={item.chart_configuration?.type || 'bar'}
                                  data={chartData[item.id] || { error: 'Dados não disponíveis' }}
                                  options={item.chart_configuration?.options || {}}
                                />
                              </Box>
                            </Paper>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
            )
          ) : (
            // Empty dashboard
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
              <BarChartIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary' }} />
              <Typography variant="h5" gutterBottom>Nenhum gráfico adicionado</Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {editMode 
                  ? 'Clique em "Adicionar Gráfico" para começar a construir seu dashboard.'
                  : 'Este dashboard está vazio. Entre no modo de edição para adicionar gráficos.'}
              </Typography>
              {!editMode && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setEditMode(true)}
                  sx={{ mt: 2 }}
                >
                  Entrar no Modo de Edição
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Dialogs */}
      {addChartDialogOpen && (
        <AddChartDialog 
          open={addChartDialogOpen}
          onClose={() => setAddChartDialogOpen(false)}
          onSubmit={handleAddChart}
          availableDataSources={dashboard.available_data_sources || []}
        />
      )}
      
      {editChartDialogOpen && selectedChartId && (
        <EditChartDialog 
          open={editChartDialogOpen}
          onClose={() => {
            setEditChartDialogOpen(false);
            setSelectedChartId(null);
          }}
          onSubmit={(chartData) => handleEditChart(selectedChartId, chartData)}
          chartData={dashboard.items.find(item => item.id === selectedChartId)}
          availableDataSources={dashboard.available_data_sources || []}
        />
      )}
      
      <ShareDashboardDialog 
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        onSubmit={handleShareDashboard}
        dashboard={dashboard}
      />
      
      <ExportDashboardDialog 
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onSubmit={handleExportDashboard}
        dashboard={dashboard}
      />
      
      <AlertsDialog 
        open={alertsDialogOpen}
        onClose={() => setAlertsDialogOpen(false)}
        onSubmit={handleCreateAlert}
        dashboard={dashboard}
      />
      
      <ConfirmDialog 
        open={deleteConfirmOpen}
        title="Excluir Gráfico"
        message="Tem certeza que deseja excluir este gráfico? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteChart}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setSelectedChartId(null);
        }}
      />
    </Container>
  );
};

export default DashboardViewPage;
