import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  SelectChangeEvent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';

interface KDSHeaderProps {
  session?: {
    name?: string;
  };
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
}

/**
 * Componente de cabeçalho para o KDS
 */
const KDSHeader: React.FC<KDSHeaderProps> = ({
  session,
  refreshInterval,
  onRefreshIntervalChange
}) => {
  const refreshOptions = [
    { value: 5, label: '5 segundos' },
    { value: 10, label: '10 segundos' },
    { value: 15, label: '15 segundos' },
    { value: 30, label: '30 segundos' },
    { value: 60, label: '1 minuto' }
  ];

  const handleRefreshChange = (event: SelectChangeEvent<number>) => {
    const value = Number(event.target.value);
    onRefreshIntervalChange(value);
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
            <Select<number>
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
