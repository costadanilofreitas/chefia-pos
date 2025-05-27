import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Paper, Divider, 
  FormControl, InputLabel, Select, MenuItem, TextField, Button,
  Chip, Alert, CircularProgress, Switch, FormControlLabel,
  Tabs, Tab, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination
} from '@mui/material';
import { 
  Add as AddIcon, 
  Send as SendIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  Telegram as TelegramIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componentes customizados
import CampaignForm from './components/CampaignForm';
import TemplateForm from './components/TemplateForm';
import CampaignCard from './components/CampaignCard';
import CustomerSegmentForm from './components/CustomerSegmentForm';
import MessagePreview from './components/MessagePreview';

// Serviço de API
import { 
  fetchCampaigns, 
  createCampaign, 
  processCampaign,
  updateCampaignStatus,
  fetchTemplates,
  createTemplate,
  generateMessage,
  sendTestMessage
} from '../services/campaignApi';

const MarketingCampaignDashboard = ({ restaurantId }) => {
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  
  // Estados de diálogos
  const [newCampaignDialogOpen, setNewCampaignDialogOpen] = useState(false);
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [previewMessage, setPreviewMessage] = useState('');
  
  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('all');
  
  // Carregar dados iniciais
  useEffect(() => {
    if (restaurantId) {
      loadInitialData();
    }
  }, [restaurantId]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar campanhas
      const campaignsData = await fetchCampaigns(restaurantId, statusFilter !== 'all' ? statusFilter : null);
      setCampaigns(campaignsData);
      
      // Carregar templates
      const templatesData = await fetchTemplates(restaurantId, templateTypeFilter !== 'all' ? templateTypeFilter : null);
      setTemplates(templatesData);
      
    } catch (err) {
      setError('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Recarregar dados quando os filtros mudarem
  useEffect(() => {
    loadInitialData();
  }, [statusFilter, templateTypeFilter]);
  
  // Manipuladores de eventos
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleCreateCampaign = async (campaignData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Adicionar restaurant_id
      campaignData.restaurant_id = restaurantId;
      
      // Chamar API para criar campanha
      const response = await createCampaign(campaignData);
      
      // Atualizar lista de campanhas
      setCampaigns([response, ...campaigns]);
      
      // Fechar diálogo
      setNewCampaignDialogOpen(false);
      
      // Mostrar mensagem de sucesso
      setSuccess('Campanha criada com sucesso!');
      
    } catch (err) {
      setError('Erro ao criar campanha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateTemplate = async (templateData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Adicionar restaurant_id
      templateData.restaurant_id = restaurantId;
      
      // Chamar API para criar template
      const response = await createTemplate(templateData);
      
      // Atualizar lista de templates
      setTemplates([response, ...templates]);
      
      // Fechar diálogo
      setNewTemplateDialogOpen(false);
      
      // Mostrar mensagem de sucesso
      setSuccess('Template criado com sucesso!');
      
    } catch (err) {
      setError('Erro ao criar template: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleProcessCampaign = async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Chamar API para processar campanha
      await processCampaign(campaignId);
      
      // Atualizar lista de campanhas
      await loadInitialData();
      
      // Mostrar mensagem de sucesso
      setSuccess('Campanha iniciada com sucesso!');
      
    } catch (err) {
      setError('Erro ao processar campanha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateCampaignStatus = async (campaignId, status) => {
    try {
      setLoading(true);
      setError(null);
      
      // Chamar API para atualizar status
      await updateCampaignStatus(campaignId, status);
      
      // Atualizar lista de campanhas
      await loadInitialData();
      
      // Mostrar mensagem de sucesso
      setSuccess(`Status da campanha atualizado para ${status}!`);
      
    } catch (err) {
      setError('Erro ao atualizar status da campanha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviewMessage = async (campaign) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedCampaign(campaign);
      
      // Dados de exemplo para preview
      const sampleCustomer = {
        customer_id: 'sample-customer',
        name: 'Cliente Exemplo',
        last_order_date: new Date().toISOString(),
        favorite_items: ['Hambúrguer Clássico', 'Batata Frita'],
        visit_frequency: 'Semanal',
        average_order_value: 45.90,
        days_since_last_order: 7
      };
      
      // Gerar mensagem de preview
      const response = await generateMessage(
        campaign.message_template,
        sampleCustomer,
        campaign
      );
      
      setPreviewMessage(response.message);
      setPreviewDialogOpen(true);
      
    } catch (err) {
      setError('Erro ao gerar preview da mensagem: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendTestMessage = async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);
      
      // Chamar API para enviar mensagem de teste
      await sendTestMessage(phoneNumber, previewMessage, 'whatsapp', {
        campaign_id: selectedCampaign.campaign_id,
        is_test: true
      });
      
      // Mostrar mensagem de sucesso
      setSuccess('Mensagem de teste enviada com sucesso!');
      
      // Fechar diálogo
      setPreviewDialogOpen(false);
      
    } catch (err) {
      setError('Erro ao enviar mensagem de teste: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar abas
  const renderTabs = () => {
    return (
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab label="Campanhas" />
        <Tab label="Templates" />
        <Tab label="Segmentação" />
        <Tab label="Relatórios" />
      </Tabs>
    );
  };
  
  // Renderizar conteúdo da aba de campanhas
  const renderCampaignsTab = () => {
    // Filtrar campanhas
    const filteredCampaigns = campaigns.filter(campaign => {
      if (statusFilter === 'all') return true;
      return campaign.status === statusFilter;
    });
    
    // Aplicar paginação
    const paginatedCampaigns = filteredCampaigns.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
    
    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="scheduled">Agendadas</MenuItem>
              <MenuItem value="running">Em Execução</MenuItem>
              <MenuItem value="completed">Concluídas</MenuItem>
              <MenuItem value="cancelled">Canceladas</MenuItem>
              <MenuItem value="failed">Falhas</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setNewCampaignDialogOpen(true)}
          >
            Nova Campanha
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredCampaigns.length === 0 ? (
          <Alert severity="info">
            Nenhuma campanha encontrada. Crie uma nova campanha para começar.
          </Alert>
        ) : (
          <>
            <Grid container spacing={2}>
              {paginatedCampaigns.map(campaign => (
                <Grid item xs={12} md={6} lg={4} key={campaign.campaign_id}>
                  <CampaignCard 
                    campaign={campaign}
                    onProcess={() => handleProcessCampaign(campaign.campaign_id)}
                    onCancel={() => handleUpdateCampaignStatus(campaign.campaign_id, 'cancelled')}
                    onPreview={() => handlePreviewMessage(campaign)}
                  />
                </Grid>
              ))}
            </Grid>
            
            <TablePagination
              component="div"
              count={filteredCampaigns.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Box>
    );
  };
  
  // Renderizar conteúdo da aba de templates
  const renderTemplatesTab = () => {
    // Filtrar templates
    const filteredTemplates = templates.filter(template => {
      if (templateTypeFilter === 'all') return true;
      return template.type === templateTypeFilter;
    });
    
    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={templateTypeFilter}
              onChange={(e) => setTemplateTypeFilter(e.target.value)}
              label="Tipo"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="reengagement">Reengajamento</MenuItem>
              <MenuItem value="promotion">Promoção</MenuItem>
              <MenuItem value="feedback">Feedback</MenuItem>
              <MenuItem value="loyalty">Fidelidade</MenuItem>
              <MenuItem value="announcement">Anúncio</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setNewTemplateDialogOpen(true)}
          >
            Novo Template
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredTemplates.length === 0 ? (
          <Alert severity="info">
            Nenhum template encontrado. Crie um novo template para começar.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTemplates.map(template => (
                  <TableRow key={template.template_id}>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          template.type === 'reengagement' ? 'Reengajamento' :
                          template.type === 'promotion' ? 'Promoção' :
                          template.type === 'feedback' ? 'Feedback' :
                          template.type === 'loyalty' ? 'Fidelidade' :
                          template.type === 'announcement' ? 'Anúncio' :
                          template.type
                        }
                        size="small"
                        color={
                          template.type === 'reengagement' ? 'primary' :
                          template.type === 'promotion' ? 'secondary' :
                          template.type === 'feedback' ? 'success' :
                          template.type === 'loyalty' ? 'info' :
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(template.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };
  
  // Renderizar conteúdo da aba de segmentação
  const renderSegmentationTab = () => {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Segmentação de Clientes
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Crie segmentos de clientes para direcionar suas campanhas de marketing de forma mais eficaz.
        </Alert>
        
        <CustomerSegmentForm />
      </Box>
    );
  };
  
  // Renderizar conteúdo da aba de relatórios
  const renderReportsTab = () => {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Relatórios de Campanhas
        </Typography>
        
        <Alert severity="info">
          Visualize métricas e resultados de suas campanhas de marketing.
        </Alert>
        
        {/* Implementar gráficos e métricas aqui */}
      </Box>
    );
  };
  
  // Renderizar conteúdo da aba atual
  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return renderCampaignsTab();
      case 1:
        return renderTemplatesTab();
      case 2:
        return renderSegmentationTab();
      case 3:
        return renderReportsTab();
      default:
        return null;
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Campanhas de Marketing Inteligentes
        </Typography>
        
        <Typography variant="body1" paragraph>
          Utilize inteligência artificial para criar campanhas personalizadas via WhatsApp e Telegram, 
          aumentando o engajamento e fidelização dos clientes.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Snackbar
            open={!!success}
            autoHideDuration={6000}
            onClose={() => setSuccess(null)}
            message={success}
          />
        )}
        
        <Card>
          <CardContent>
            {renderTabs()}
            {renderTabContent()}
          </CardContent>
        </Card>
        
        {/* Diálogo para criar nova campanha */}
        <Dialog 
          open={newCampaignDialogOpen} 
          onClose={() => setNewCampaignDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Nova Campanha</DialogTitle>
          <DialogContent>
            <CampaignForm 
              templates={templates}
              onSubmit={handleCreateCampaign}
              onCancel={() => setNewCampaignDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* Diálogo para criar novo template */}
        <Dialog 
          open={newTemplateDialogOpen} 
          onClose={() => setNewTemplateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Novo Template</DialogTitle>
          <DialogContent>
            <TemplateForm 
              onSubmit={handleCreateTemplate}
              onCancel={() => setNewTemplateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* Diálogo para preview de mensagem */}
        <Dialog 
          open={previewDialogOpen} 
          onClose={() => setPreviewDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Preview da Mensagem</DialogTitle>
          <DialogContent>
            <MessagePreview 
              message={previewMessage}
              onSendTest={handleSendTestMessage}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default MarketingCampaignDashboard;
