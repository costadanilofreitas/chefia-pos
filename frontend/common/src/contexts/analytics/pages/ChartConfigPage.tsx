import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Typography, Paper, Button, IconButton, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
import { 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableChartIcon,
  LineStyle as LineStyleIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAnalyticsApi } from '../../hooks/useAnalyticsApi';
import ColorPicker from '../components/common/ColorPicker';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ErrorMessage from '../components/common/ErrorMessage';

// Chart configuration components
import BarChartConfig from '../components/dashboard/config/BarChartConfig';
import LineChartConfig from '../components/dashboard/config/LineChartConfig';
import PieChartConfig from '../components/dashboard/config/PieChartConfig';
import TableConfig from '../components/dashboard/config/TableConfig';

const ChartConfigPage = ({ chartData, availableDataSources, onSave, onCancel }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getDataSourceMetadata } = useAnalyticsApi();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [chartType, setChartType] = useState(chartData?.chart_configuration?.type || 'bar');
  const [chartName, setChartName] = useState(chartData?.name || 'Novo Gráfico');
  const [dataSource, setDataSource] = useState(chartData?.chart_configuration?.data_source || null);
  const [dimensions, setDimensions] = useState(chartData?.chart_configuration?.dimensions || []);
  const [measures, setMeasures] = useState(chartData?.chart_configuration?.measures || []);
  const [filters, setFilters] = useState(chartData?.chart_configuration?.filters || []);
  const [options, setOptions] = useState(chartData?.chart_configuration?.options || {});
  const [size, setSize] = useState(chartData?.size || { width: 6, height: 4 });
  
  const [availableFields, setAvailableFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch data source metadata when data source changes
  useEffect(() => {
    if (!dataSource) return;
    
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const metadata = await getDataSourceMetadata(dataSource.type, dataSource.restaurant_id);
        setAvailableFields(metadata.fields || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data source metadata:', err);
        setError('Não foi possível carregar os metadados da fonte de dados. Por favor, tente novamente.');
        setLoading(false);
      }
    };
    
    fetchMetadata();
  }, [dataSource, getDataSourceMetadata]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle chart type change
  const handleChartTypeChange = (type) => {
    setChartType(type);
    
    // Reset options based on chart type
    switch (type) {
      case 'bar':
        setOptions({
          stacked: false,
          horizontal: false,
          showValues: true,
          colors: theme.palette.chart.default
        });
        break;
      case 'line':
        setOptions({
          showPoints: true,
          showArea: false,
          smooth: false,
          colors: theme.palette.chart.default
        });
        break;
      case 'pie':
        setOptions({
          donut: false,
          showLabels: true,
          showLegend: true,
          colors: theme.palette.chart.default
        });
        break;
      case 'table':
        setOptions({
          pagination: true,
          pageSize: 10,
          striped: true,
          bordered: false
        });
        break;
      default:
        setOptions({});
    }
  };
  
  // Handle save
  const handleSave = () => {
    const chartConfiguration = {
      type: chartType,
      data_source: dataSource,
      dimensions,
      measures,
      filters,
      options
    };
    
    onSave({
      name: chartName,
      configuration: chartConfiguration,
      size
    });
  };
  
  // Render loading state
  if (loading) {
    return <LoadingIndicator message="Carregando metadados..." />;
  }
  
  // Render error state
  if (error) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }
  
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Configuração de Gráfico</Typography>
          
          <Box>
            <Button 
              variant="outlined" 
              color="secondary" 
              startIcon={<CloseIcon />}
              onClick={onCancel}
              sx={{ mr: 1 }}
            >
              Cancelar
            </Button>
            
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Salvar
            </Button>
          </Box>
        </Box>
        
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Tipo" />
          <Tab label="Dados" />
          <Tab label="Estilo" />
          <Tab label="Tamanho" />
        </Tabs>
        
        {/* Tab 1: Chart Type */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Nome do Gráfico</Typography>
            <input
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                marginBottom: '20px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
            
            <Typography variant="h6" gutterBottom>Tipo de Gráfico</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Paper 
                  elevation={chartType === 'bar' ? 8 : 1}
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: chartType === 'bar' ? `2px solid ${theme.palette.primary.main}` : 'none',
                    '&:hover': {
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleChartTypeChange('bar')}
                >
                  <BarChartIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="subtitle1">Gráfico de Barras</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Paper 
                  elevation={chartType === 'line' ? 8 : 1}
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: chartType === 'line' ? `2px solid ${theme.palette.primary.main}` : 'none',
                    '&:hover': {
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleChartTypeChange('line')}
                >
                  <LineStyleIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="subtitle1">Gráfico de Linha</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Paper 
                  elevation={chartType === 'pie' ? 8 : 1}
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: chartType === 'pie' ? `2px solid ${theme.palette.primary.main}` : 'none',
                    '&:hover': {
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleChartTypeChange('pie')}
                >
                  <PieChartIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="subtitle1">Gráfico de Pizza</Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Paper 
                  elevation={chartType === 'table' ? 8 : 1}
                  sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: chartType === 'table' ? `2px solid ${theme.palette.primary.main}` : 'none',
                    '&:hover': {
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleChartTypeChange('table')}
                >
                  <TableChartIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="subtitle1">Tabela</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Tab 2: Data Configuration */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Fonte de Dados</Typography>
            <select
              value={dataSource?.id || ''}
              onChange={(e) => {
                const selectedSource = availableDataSources.find(ds => ds.id === e.target.value);
                setDataSource(selectedSource || null);
              }}
              style={{ 
                width: '100%', 
                padding: '10px', 
                marginBottom: '20px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="">Selecione uma fonte de dados</option>
              {availableDataSources.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>
            
            {dataSource && (
              <>
                {chartType === 'bar' && (
                  <BarChartConfig 
                    availableFields={availableFields}
                    dimensions={dimensions}
                    measures={measures}
                    filters={filters}
                    onDimensionsChange={setDimensions}
                    onMeasuresChange={setMeasures}
                    onFiltersChange={setFilters}
                  />
                )}
                
                {chartType === 'line' && (
                  <LineChartConfig 
                    availableFields={availableFields}
                    dimensions={dimensions}
                    measures={measures}
                    filters={filters}
                    onDimensionsChange={setDimensions}
                    onMeasuresChange={setMeasures}
                    onFiltersChange={setFilters}
                  />
                )}
                
                {chartType === 'pie' && (
                  <PieChartConfig 
                    availableFields={availableFields}
                    dimensions={dimensions}
                    measures={measures}
                    filters={filters}
                    onDimensionsChange={setDimensions}
                    onMeasuresChange={setMeasures}
                    onFiltersChange={setFilters}
                  />
                )}
                
                {chartType === 'table' && (
                  <TableConfig 
                    availableFields={availableFields}
                    dimensions={dimensions}
                    measures={measures}
                    filters={filters}
                    onDimensionsChange={setDimensions}
                    onMeasuresChange={setMeasures}
                    onFiltersChange={setFilters}
                  />
                )}
              </>
            )}
          </Box>
        )}
        
        {/* Tab 3: Style Configuration */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Opções de Estilo</Typography>
            
            {chartType === 'bar' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Orientação</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.horizontal ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, horizontal: false })}
                    >
                      Vertical
                    </Button>
                    <Button 
                      variant={options.horizontal ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, horizontal: true })}
                    >
                      Horizontal
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Empilhamento</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.stacked ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, stacked: false })}
                    >
                      Normal
                    </Button>
                    <Button 
                      variant={options.stacked ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, stacked: true })}
                    >
                      Empilhado
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Mostrar Valores</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.showValues ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, showValues: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.showValues ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, showValues: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Cores</Typography>
                  <ColorPicker 
                    colors={options.colors || theme.palette.chart.default}
                    onChange={(colors) => setOptions({ ...options, colors })}
                  />
                </Grid>
              </Grid>
            )}
            
            {chartType === 'line' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Mostrar Pontos</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.showPoints ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, showPoints: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.showPoints ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, showPoints: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Mostrar Área</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.showArea ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, showArea: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.showArea ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, showArea: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Curva Suave</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.smooth ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, smooth: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.smooth ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, smooth: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Cores</Typography>
                  <ColorPicker 
                    colors={options.colors || theme.palette.chart.default}
                    onChange={(colors) => setOptions({ ...options, colors })}
                  />
                </Grid>
              </Grid>
            )}
            
            {chartType === 'pie' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Tipo</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.donut ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, donut: false })}
                    >
                      Pizza
                    </Button>
                    <Button 
                      variant={options.donut ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, donut: true })}
                    >
                      Rosca
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Mostrar Rótulos</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.showLabels ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, showLabels: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.showLabels ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, showLabels: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Mostrar Legenda</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.showLegend ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, showLegend: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.showLegend ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, showLegend: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Cores</Typography>
                  <ColorPicker 
                    colors={options.colors || theme.palette.chart.default}
                    onChange={(colors) => setOptions({ ...options, colors })}
                  />
                </Grid>
              </Grid>
            )}
            
            {chartType === 'table' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Paginação</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.pagination ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, pagination: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.pagination ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, pagination: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                {options.pagination && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" gutterBottom>Itens por Página</Typography>
                    <select
                      value={options.pageSize || 10}
                      onChange={(e) => setOptions({ ...options, pageSize: parseInt(e.target.value) })}
                      style={{ 
                        width: '100%', 
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Linhas Alternadas</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.striped ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, striped: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.striped ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, striped: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>Bordas</Typography>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Button 
                      variant={options.bordered ? 'contained' : 'outlined'} 
                      onClick={() => setOptions({ ...options, bordered: true })}
                    >
                      Sim
                    </Button>
                    <Button 
                      variant={options.bordered ? 'outlined' : 'contained'} 
                      onClick={() => setOptions({ ...options, bordered: false })}
                    >
                      Não
                    </Button>
                  </div>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
        
        {/* Tab 4: Size Configuration */}
        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>Tamanho do Gráfico</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Largura (colunas)</Typography>
                <select
                  value={size.width}
                  onChange={(e) => setSize({ ...size, width: parseInt(e.target.value) })}
                  style={{ 
                    width: '100%', 
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value={3}>25% (3 colunas)</option>
                  <option value={4}>33% (4 colunas)</option>
                  <option value={6}>50% (6 colunas)</option>
                  <option value={8}>66% (8 colunas)</option>
                  <option value={12}>100% (12 colunas)</option>
                </select>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>Altura (unidades)</Typography>
                <select
                  value={size.height}
                  onChange={(e) => setSize({ ...size, height: parseInt(e.target.value) })}
                  style={{ 
                    width: '100%', 
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value={2}>Pequeno (2 unidades)</option>
                  <option value={4}>Médio (4 unidades)</option>
                  <option value={6}>Grande (6 unidades)</option>
                  <option value={8}>Extra Grande (8 unidades)</option>
                </select>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Visualização</Typography>
                <Paper 
                  sx={{ 
                    width: `${(size.width / 12) * 100}%`, 
                    height: `${size.height * 50}px`,
                    backgroundColor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mt: 2
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {chartName} ({size.width} x {size.height})
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ChartConfigPage;
