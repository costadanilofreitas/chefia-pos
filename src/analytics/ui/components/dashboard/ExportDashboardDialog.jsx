import React, { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Tabs, Tab } from '@mui/material';
import { Close as CloseIcon, GetApp as DownloadIcon } from '@mui/icons-material';

const ExportDashboardDialog = ({ open, onClose, onSubmit, dashboard }) => {
  const [format, setFormat] = useState('pdf');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [paperSize, setPaperSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [activeTab, setActiveTab] = useState(0);
  const [errors, setErrors] = useState({});

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormat('pdf');
      setIncludeFilters(true);
      setPaperSize('a4');
      setOrientation('portrait');
      setActiveTab(0);
      setErrors({});
    }
  }, [open]);

  // Handle form submission
  const handleSubmit = () => {
    // Prepare data for submission
    const exportData = {
      format,
      include_filters: includeFilters,
      options: {
        paper_size: paperSize,
        orientation
      }
    };
    
    onSubmit(exportData);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Exportar Dashboard
        <Button
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {dashboard?.name || 'Dashboard'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Exporte este dashboard em diferentes formatos para compartilhar ou arquivar.
          </Typography>
        </Box>
        
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Formato" />
          <Tab label="Opções" />
        </Tabs>
        
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Formato de Exportação
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={format === 'pdf' ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => setFormat('pdf')}
                    sx={{ 
                      height: '100px', 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: 32, mb: 1 }} />
                    PDF
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={format === 'excel' ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => setFormat('excel')}
                    sx={{ 
                      height: '100px', 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: 32, mb: 1 }} />
                    Excel
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={format === 'image' ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => setFormat('image')}
                    sx={{ 
                      height: '100px', 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: 32, mb: 1 }} />
                    Imagem
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant={format === 'csv' ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => setFormat('csv')}
                    sx={{ 
                      height: '100px', 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: 32, mb: 1 }} />
                    CSV
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}
        
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography variant="subtitle1" gutterBottom>
                  Incluir Filtros Aplicados
                </Typography>
                <Grid container spacing={2}>
                  <Grid item>
                    <Button
                      variant={includeFilters ? 'contained' : 'outlined'}
                      onClick={() => setIncludeFilters(true)}
                    >
                      Sim
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      variant={!includeFilters ? 'contained' : 'outlined'}
                      onClick={() => setIncludeFilters(false)}
                    >
                      Não
                    </Button>
                  </Grid>
                </Grid>
              </FormControl>
            </Grid>
            
            {(format === 'pdf' || format === 'image') && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="paper-size-label">Tamanho do Papel</InputLabel>
                    <Select
                      labelId="paper-size-label"
                      value={paperSize}
                      label="Tamanho do Papel"
                      onChange={(e) => setPaperSize(e.target.value)}
                    >
                      <MenuItem value="a4">A4</MenuItem>
                      <MenuItem value="letter">Carta</MenuItem>
                      <MenuItem value="legal">Ofício</MenuItem>
                      <MenuItem value="a3">A3</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="orientation-label">Orientação</InputLabel>
                    <Select
                      labelId="orientation-label"
                      value={orientation}
                      label="Orientação"
                      onChange={(e) => setOrientation(e.target.value)}
                    >
                      <MenuItem value="portrait">Retrato</MenuItem>
                      <MenuItem value="landscape">Paisagem</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          startIcon={<DownloadIcon />}
        >
          Exportar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDashboardDialog;
