import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Receipt,
  Settings,
  Security,
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Warning,
  Info,
  Edit,
  Delete,
  Add,
  Refresh
} from '@mui/icons-material';

interface FiscalConfig {
  id: string;
  terminalId: string;
  nfceEnabled: boolean;
  satEnabled: boolean;
  mfeEnabled: boolean;
  cfeEnabled: boolean;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  certificadoA1?: {
    arquivo: string;
    senha: string;
    validade: string;
  };
  satConfig?: {
    codigoAtivacao: string;
    assinaturaSat: string;
    numeroCaixa: number;
  };
  ambiente: 'producao' | 'homologacao';
  contabilizeiIntegration: boolean;
}

interface FiscalDocument {
  id: string;
  tipo: 'nfce' | 'sat' | 'mfe' | 'cfe';
  numero: string;
  serie: string;
  chave: string;
  valor: number;
  status: 'autorizada' | 'cancelada' | 'rejeitada' | 'pendente';
  dataEmissao: string;
  cliente?: string;
  observacoes?: string;
}

const FiscalScreen: React.FC = () => {
  const { terminalId } = useParams<{ terminalId: string }>();
  const navigate = useNavigate();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [config, setConfig] = useState<FiscalConfig | null>(null);
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  // Form states
  const [configForm, setConfigForm] = useState<Partial<FiscalConfig>>({});

  useEffect(() => {
    loadFiscalData();
  }, []);

  const loadFiscalData = async () => {
    setLoading(true);
    try {
      // Mock data para demonstração
      const mockConfig: FiscalConfig = {
        id: '1',
        terminalId: terminalId || '1',
        nfceEnabled: true,
        satEnabled: false,
        mfeEnabled: false,
        cfeEnabled: false,
        cnpj: '12.345.678/0001-90',
        inscricaoEstadual: '123456789',
        inscricaoMunicipal: '987654321',
        razaoSocial: 'Restaurante ChefIA Ltda',
        nomeFantasia: 'ChefIA Restaurant',
        endereco: {
          logradouro: 'Rua das Flores',
          numero: '123',
          complemento: 'Sala 1',
          bairro: 'Centro',
          cidade: 'São Paulo',
          uf: 'SP',
          cep: '01234-567'
        },
        certificadoA1: {
          arquivo: 'certificado.p12',
          senha: '****',
          validade: '2025-12-31'
        },
        ambiente: 'homologacao',
        contabilizeiIntegration: true
      };

      const mockDocuments: FiscalDocument[] = [
        {
          id: '1',
          tipo: 'nfce',
          numero: '000001',
          serie: '001',
          chave: '35240112345678000190650010000000011234567890',
          valor: 125.50,
          status: 'autorizada',
          dataEmissao: '2024-01-15T19:30:00',
          cliente: 'Maria Silva'
        },
        {
          id: '2',
          tipo: 'nfce',
          numero: '000002',
          serie: '001',
          chave: '35240112345678000190650010000000021234567891',
          valor: 89.90,
          status: 'autorizada',
          dataEmissao: '2024-01-15T20:15:00'
        },
        {
          id: '3',
          tipo: 'nfce',
          numero: '000003',
          serie: '001',
          chave: '35240112345678000190650010000000031234567892',
          valor: 67.80,
          status: 'cancelada',
          dataEmissao: '2024-01-15T21:00:00',
          observacoes: 'Cancelada a pedido do cliente'
        },
        {
          id: '4',
          tipo: 'sat',
          numero: '000001',
          serie: '899',
          chave: '35240112345678000190599000000000011234567893',
          valor: 45.30,
          status: 'autorizada',
          dataEmissao: '2024-01-14T18:45:00'
        }
      ];

      setConfig(mockConfig);
      setDocuments(mockDocuments);
      setConfigForm(mockConfig);
    } catch (error) {
      console.error('Erro ao carregar dados fiscais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    try {
      // Aqui seria feita a chamada para a API
      console.log('Salvando configuração fiscal:', configForm);
      
      setConfig(configForm as FiscalConfig);
      setConfigDialogOpen(false);
      
      // Simular sucesso
      alert('Configuração fiscal salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('Erro ao salvar configuração fiscal');
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Conexão testada com sucesso!');
    } catch (error) {
      alert('Erro ao testar conexão');
    } finally {
      setTestingConnection(false);
    }
  };

  const getStatusColor = (status: FiscalDocument['status']) => {
    switch (status) {
      case 'autorizada': return 'success';
      case 'cancelada': return 'warning';
      case 'rejeitada': return 'error';
      case 'pendente': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: FiscalDocument['status']) => {
    switch (status) {
      case 'autorizada': return 'Autorizada';
      case 'cancelada': return 'Cancelada';
      case 'rejeitada': return 'Rejeitada';
      case 'pendente': return 'Pendente';
      default: return status;
    }
  };

  const getTipoLabel = (tipo: FiscalDocument['tipo']) => {
    switch (tipo) {
      case 'nfce': return 'NFC-e';
      case 'sat': return 'SAT';
      case 'mfe': return 'MF-e';
      case 'cfe': return 'CF-e';
      default: return String(tipo).toUpperCase();
    }
  };

  const renderConfigTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Configurações Fiscais</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleTestConnection}
            disabled={testingConnection}
            sx={{ mr: 1 }}
          >
            {testingConnection ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Editar Configuração
          </Button>
        </Box>
      </Box>

      {config && (
        <Grid container spacing={3}>
          {/* Informações da Empresa */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Dados da Empresa
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box mb={1}>
                  <Typography variant="body2" color="textSecondary">CNPJ</Typography>
                  <Typography variant="body1">{config.cnpj}</Typography>
                </Box>
                
                <Box mb={1}>
                  <Typography variant="body2" color="textSecondary">Razão Social</Typography>
                  <Typography variant="body1">{config.razaoSocial}</Typography>
                </Box>
                
                <Box mb={1}>
                  <Typography variant="body2" color="textSecondary">Nome Fantasia</Typography>
                  <Typography variant="body1">{config.nomeFantasia}</Typography>
                </Box>
                
                <Box mb={1}>
                  <Typography variant="body2" color="textSecondary">Inscrição Estadual</Typography>
                  <Typography variant="body1">{config.inscricaoEstadual}</Typography>
                </Box>
                
                {config.inscricaoMunicipal && (
                  <Box mb={1}>
                    <Typography variant="body2" color="textSecondary">Inscrição Municipal</Typography>
                    <Typography variant="body1">{config.inscricaoMunicipal}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Endereço */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Endereço
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body1">
                  {config.endereco.logradouro}, {config.endereco.numero}
                  {config.endereco.complemento && `, ${config.endereco.complemento}`}
                </Typography>
                <Typography variant="body1">
                  {config.endereco.bairro} - {config.endereco.cidade}/{config.endereco.uf}
                </Typography>
                <Typography variant="body1">
                  CEP: {config.endereco.cep}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Módulos Fiscais */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Módulos Fiscais
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List>
                  <ListItem>
                    <ListItemText primary="NFC-e (Nota Fiscal do Consumidor Eletrônica)" />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={config.nfceEnabled ? 'Ativo' : 'Inativo'}
                        color={config.nfceEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText primary="SAT (Sistema Autenticador e Transmissor)" />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={config.satEnabled ? 'Ativo' : 'Inativo'}
                        color={config.satEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText primary="MF-e (Módulo Fiscal Eletrônico)" />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={config.mfeEnabled ? 'Ativo' : 'Inativo'}
                        color={config.mfeEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText primary="CF-e (Cupom Fiscal Eletrônico)" />
                    <ListItemSecondaryAction>
                      <Chip 
                        label={config.cfeEnabled ? 'Ativo' : 'Inativo'}
                        color={config.cfeEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Certificado e Integrações */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Certificado e Integrações
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {config.certificadoA1 && (
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">Certificado A1</Typography>
                    <Typography variant="body1">{config.certificadoA1.arquivo}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Válido até: {new Date(config.certificadoA1.validade).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
                
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">Ambiente</Typography>
                  <Chip 
                    label={config.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                    color={config.ambiente === 'producao' ? 'error' : 'warning'}
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="textSecondary">Integração Contabilizei</Typography>
                  <Chip 
                    label={config.contabilizeiIntegration ? 'Ativa' : 'Inativa'}
                    color={config.contabilizeiIntegration ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderDocumentsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Documentos Fiscais</Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={() => {
            // Implementar exportação
            alert('Funcionalidade de exportação em desenvolvimento');
          }}
        >
          Exportar Relatório
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Número</TableCell>
              <TableCell>Série</TableCell>
              <TableCell>Chave de Acesso</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data/Hora</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Chip 
                    label={getTipoLabel(doc.tipo)}
                    size="small"
                    color="primary"
                  />
                </TableCell>
                <TableCell>{doc.numero}</TableCell>
                <TableCell>{doc.serie}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {doc.chave}
                  </Typography>
                </TableCell>
                <TableCell>R$ {doc.valor.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(doc.status)}
                    color={getStatusColor(doc.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(doc.dataEmissao).toLocaleString()}
                </TableCell>
                <TableCell>{doc.cliente || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" title="Visualizar">
                    <Info />
                  </IconButton>
                  <IconButton size="small" title="Download XML">
                    <Download />
                  </IconButton>
                  {doc.status === 'autorizada' && (
                    <IconButton size="small" title="Cancelar" color="error">
                      <Delete />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStatusTab = () => {
    const totalDocuments = documents.length;
    const authorizedDocs = documents.filter(d => d.status === 'autorizada').length;
    const cancelledDocs = documents.filter(d => d.status === 'cancelada').length;
    const rejectedDocs = documents.filter(d => d.status === 'rejeitada').length;
    const totalValue = documents
      .filter(d => d.status === 'autorizada')
      .reduce((sum, d) => sum + d.valor, 0);

    return (
      <Box>
        <Typography variant="h6" mb={3}>Status do Sistema Fiscal</Typography>
        
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Receipt sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total de Documentos
                    </Typography>
                    <Typography variant="h4">
                      {totalDocuments}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Autorizados
                    </Typography>
                    <Typography variant="h4">
                      {authorizedDocs}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Warning sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Cancelados
                    </Typography>
                    <Typography variant="h4">
                      {cancelledDocs}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Error sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Rejeitados
                    </Typography>
                    <Typography variant="h4">
                      {rejectedDocs}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Faturamento Fiscal</Typography>
                <Typography variant="h4" color="success.main">
                  R$ {totalValue.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Valor total dos documentos autorizados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Status dos Serviços</Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Receita Federal (NFC-e)" />
                    <ListItemSecondaryAction>
                      <Chip label="Online" color="success" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="SEFAZ SP" />
                    <ListItemSecondaryAction>
                      <Chip label="Online" color="success" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="SAT" />
                    <ListItemSecondaryAction>
                      <Chip label="Offline" color="default" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Carregando módulo fiscal...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Módulo Fiscal - Terminal {terminalId}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/pos/${terminalId}`)}
        >
          Voltar ao POS
        </Button>
      </Box>

      {/* Alert de Ambiente */}
      {config?.ambiente === 'homologacao' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Ambiente de Homologação:</strong> Os documentos emitidos não têm validade fiscal.
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Configurações" icon={<Settings />} />
          <Tab label="Documentos" icon={<Receipt />} />
          <Tab label="Status" icon={<Info />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && renderConfigTab()}
      {currentTab === 1 && renderDocumentsTab()}
      {currentTab === 2 && renderStatusTab()}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configuração Fiscal</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Alterações nas configurações fiscais requerem reinicialização do terminal.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Módulos Fiscais</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.nfceEnabled || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, nfceEnabled: e.target.checked }))}
                  />
                }
                label="NFC-e (Nota Fiscal do Consumidor Eletrônica)"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.satEnabled || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, satEnabled: e.target.checked }))}
                  />
                }
                label="SAT (Sistema Autenticador e Transmissor)"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.mfeEnabled || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, mfeEnabled: e.target.checked }))}
                  />
                }
                label="MF-e (Módulo Fiscal Eletrônico)"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.cfeEnabled || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, cfeEnabled: e.target.checked }))}
                  />
                }
                label="CF-e (Cupom Fiscal Eletrônico)"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Ambiente</Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Ambiente"
                select
                fullWidth
                variant="outlined"
                value={configForm.ambiente || 'homologacao'}
                onChange={(e) => setConfigForm(prev => ({ ...prev, ambiente: e.target.value as any }))}
                SelectProps={{ native: true }}
              >
                <option value="homologacao">Homologação</option>
                <option value="producao">Produção</option>
              </TextField>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Integrações</Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.contabilizeiIntegration || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, contabilizeiIntegration: e.target.checked }))}
                  />
                }
                label="Integração com Contabilizei"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfigSave} variant="contained">
            Salvar Configuração
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FiscalScreen;

