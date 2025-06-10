import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Typography, Paper, Button, IconButton, Menu, MenuItem, Divider, useTheme, useMediaQuery } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Add as AddIcon, 
  MoreVert as MoreVertIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  FileCopy as FileCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  GetApp as DownloadIcon,
  Notifications as NotificationsIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsApi } from '../../hooks/useAnalyticsApi';
import DashboardCard from '../components/dashboard/DashboardCard';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import CreateDashboardDialog from '../components/dashboard/CreateDashboardDialog';
import TemplateGallery from '../components/dashboard/TemplateGallery';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

const DashboardsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { getDashboards, getTemplates, createDashboard, deleteDashboard, toggleFavorite } = useAnalyticsApi();
  
  const [dashboards, setDashboards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    favorite: false,
    sortBy: 'recent'
  });
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  
  // Fetch dashboards and templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const restaurantId = localStorage.getItem('restaurantId') || 'default';
        
        // Fetch dashboards
        const dashboardsData = await getDashboards(restaurantId);
        setDashboards(dashboardsData.items || []);
        
        // Fetch templates
        const templatesData = await getTemplates(restaurantId);
        setTemplates(templatesData.items || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboards:', err);
        setError('Não foi possível carregar os dashboards. Por favor, tente novamente.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [getDashboards, getTemplates]);
  
  // Filter dashboards
  const filteredDashboards = dashboards.filter(dashboard => {
    // Filter by category
    if (filters.category !== 'all' && dashboard.category !== filters.category) {
      return false;
    }
    
    // Filter by favorite
    if (filters.favorite && !dashboard.is_favorite) {
      return false;
    }
    
    return true;
  });
  
  // Sort dashboards
  const sortedDashboards = [...filteredDashboards].sort((a, b) => {
    if (filters.sortBy === 'recent') {
      return new Date(b.updated_at) - new Date(a.updated_at);
    } else if (filters.sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (filters.sortBy === 'views') {
      return b.view_count - a.view_count;
    }
    return 0;
  });
  
  // Handle dashboard creation
  const handleCreateDashboard = async (dashboardData) => {
    try {
      const restaurantId = localStorage.getItem('restaurantId') || 'default';
      dashboardData.restaurant_id = restaurantId;
      
      const newDashboard = await createDashboard(dashboardData);
      setDashboards([...dashboards, newDashboard]);
      setCreateDialogOpen(false);
      
      // Navigate to the new dashboard
      navigate(`/analytics/dashboards/${newDashboard.id}`);
    } catch (err) {
      console.error('Error creating dashboard:', err);
      setError('Não foi possível criar o dashboard. Por favor, tente novamente.');
    }
  };
  
  // Handle dashboard deletion
  const handleDeleteDashboard = async (dashboardId) => {
    try {
      await deleteDashboard(dashboardId);
      setDashboards(dashboards.filter(d => d.id !== dashboardId));
      handleMenuClose();
    } catch (err) {
      console.error('Error deleting dashboard:', err);
      setError('Não foi possível excluir o dashboard. Por favor, tente novamente.');
    }
  };
  
  // Handle dashboard favorite toggle
  const handleToggleFavorite = async (dashboard) => {
    try {
      const updatedDashboard = await toggleFavorite(dashboard.id, !dashboard.is_favorite);
      setDashboards(dashboards.map(d => d.id === dashboard.id ? updatedDashboard : d));
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError('Não foi possível atualizar o status de favorito. Por favor, tente novamente.');
    }
  };
  
  // Handle dashboard click
  const handleDashboardClick = (dashboardId) => {
    navigate(`/analytics/dashboards/${dashboardId}`);
  };
  
  // Handle menu open
  const handleMenuOpen = (event, dashboard) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedDashboard(dashboard);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDashboard(null);
  };
  
  // Handle edit dashboard
  const handleEditDashboard = () => {
    if (selectedDashboard) {
      navigate(`/analytics/dashboards/${selectedDashboard.id}/edit`);
    }
    handleMenuClose();
  };
  
  // Handle duplicate dashboard
  const handleDuplicateDashboard = async () => {
    if (selectedDashboard) {
      try {
        const newName = `Cópia de ${selectedDashboard.name}`;
        const duplicatedDashboard = await duplicateDashboard(selectedDashboard.id, newName);
        setDashboards([...dashboards, duplicatedDashboard]);
        handleMenuClose();
      } catch (err) {
        console.error('Error duplicating dashboard:', err);
        setError('Não foi possível duplicar o dashboard. Por favor, tente novamente.');
      }
    }
  };
  
  // Handle share dashboard
  const handleShareDashboard = () => {
    if (selectedDashboard) {
      navigate(`/analytics/dashboards/${selectedDashboard.id}/share`);
    }
    handleMenuClose();
  };
  
  // Handle create from template
  const handleCreateFromTemplate = async (templateId) => {
    try {
      const restaurantId = localStorage.getItem('restaurantId') || 'default';
      const newDashboard = await createFromTemplate(templateId, restaurantId);
      setDashboards([...dashboards, newDashboard]);
      setTemplateGalleryOpen(false);
      
      // Navigate to the new dashboard
      navigate(`/analytics/dashboards/${newDashboard.id}`);
    } catch (err) {
      console.error('Error creating from template:', err);
      setError('Não foi possível criar o dashboard a partir do template. Por favor, tente novamente.');
    }
  };
  
  // Render loading state
  if (loading) {
    return <LoadingIndicator message="Carregando dashboards..." />;
  }
  
  // Render error state
  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Dashboards Analíticos
          </Typography>
          
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<DashboardIcon />}
              onClick={() => setTemplateGalleryOpen(true)}
              sx={{ mr: 1 }}
            >
              Galeria de Templates
            </Button>
            
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Novo Dashboard
            </Button>
          </Box>
        </Box>
        
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <DashboardFilters 
            filters={filters} 
            onFilterChange={setFilters} 
          />
        </Paper>
        
        {/* Dashboard Grid */}
        {sortedDashboards.length > 0 ? (
          <Grid container spacing={3}>
            {sortedDashboards.map(dashboard => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={dashboard.id}>
                <DashboardCard 
                  dashboard={dashboard}
                  onClick={() => handleDashboardClick(dashboard.id)}
                  onMenuClick={(e) => handleMenuOpen(e, dashboard)}
                  onFavoriteToggle={() => handleToggleFavorite(dashboard)}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <EmptyState 
            icon={<DashboardIcon sx={{ fontSize: 64 }} />}
            title="Nenhum dashboard encontrado"
            description="Crie um novo dashboard ou use um de nossos templates para começar."
            actions={
              <>
                <Button 
                  variant="outlined" 
                  startIcon={<DashboardIcon />}
                  onClick={() => setTemplateGalleryOpen(true)}
                  sx={{ mr: 1 }}
                >
                  Ver Templates
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Criar Dashboard
                </Button>
              </>
            }
          />
        )}
      </Box>
      
      {/* Dashboard Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditDashboard}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedDashboard) handleToggleFavorite(selectedDashboard);
          handleMenuClose();
        }}>
          {selectedDashboard?.is_favorite ? (
            <>
              <FavoriteIcon fontSize="small" sx={{ mr: 1 }} />
              Remover dos Favoritos
            </>
          ) : (
            <>
              <FavoriteBorderIcon fontSize="small" sx={{ mr: 1 }} />
              Adicionar aos Favoritos
            </>
          )}
        </MenuItem>
        <MenuItem onClick={handleShareDashboard}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          Compartilhar
        </MenuItem>
        <MenuItem onClick={handleDuplicateDashboard}>
          <FileCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Duplicar
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (selectedDashboard) handleDeleteDashboard(selectedDashboard.id);
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>
      
      {/* Create Dashboard Dialog */}
      <CreateDashboardDialog 
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateDashboard}
      />
      
      {/* Template Gallery Dialog */}
      <TemplateGallery 
        open={templateGalleryOpen}
        onClose={() => setTemplateGalleryOpen(false)}
        templates={templates}
        onSelectTemplate={handleCreateFromTemplate}
      />
    </Container>
  );
};

export default DashboardsPage;
