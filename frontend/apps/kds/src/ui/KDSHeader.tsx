import React from 'react';
import { AppBar, Toolbar, Typography, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Componente de cabeçalho para o KDS
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.session - Informações da sessão do KDS
 * @param {number} props.refreshInterval - Intervalo de atualização em segundos
 * @param {Function} props.onRefreshIntervalChange - Função chamada quando o intervalo é alterado
 * @returns {JSX.Element} Componente de cabeçalho do KDS
 */
const KDSHeader = ({ session, refreshInterval, onRefreshIntervalChange }) => {
  // Opções de intervalo de atualização
  const refreshOptions = [
    { value: 5, label: '5 segundos' },
    { value: 10, label: '10 segundos' },
    { value: 15, label: '15 segundos' },
    { value: 30, label: '30 segundos' },
    { value: 60, label: '1 minuto' }
  ];

  const handleRefreshChange = (event) => {
    onRefreshIntervalChange(event.target.value);
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {session?.name || 'KDS'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <RefreshIcon sx={{ mr: 1 }} />
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="refresh-interval-label">Atualizar</InputLabel>
            <Select
              labelId="refresh-interval-label"
              id="refresh-interval"
              value={refreshInterval}
              onChange={handleRefreshChange}
              label="Atualizar"
            >
              {refreshOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        <SettingsIcon />
      </Toolbar>
    </AppBar>
  );
};

export default KDSHeader;
