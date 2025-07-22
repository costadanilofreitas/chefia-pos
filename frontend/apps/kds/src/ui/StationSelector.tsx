import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, SelectChangeEvent } from '@mui/material';

interface Station {
  id: string;
  name: string;
}

interface StationSelectorProps {
  activeStation: string;
  onStationChange: (stationId: string) => void;
}

/**
 * Componente para seleção de estações no KDS
 */
const StationSelector: React.FC<StationSelectorProps> = ({ activeStation, onStationChange }) => {
  // Lista de estações disponíveis
  const stations: Station[] = [
    { id: 'all', name: 'Todas as Estações' },
    { id: 'kitchen', name: 'Cozinha' },
    { id: 'bar', name: 'Bar' },
    { id: 'grill', name: 'Grelha' },
    { id: 'dessert', name: 'Sobremesas' }
  ];

  const handleChange = (event: SelectChangeEvent<string>) => {
    onStationChange(event.target.value);
  };

  return (
    <Box sx={{ minWidth: 200, margin: '16px 0' }}>
      <FormControl fullWidth>
        <InputLabel id="station-selector-label">Estação</InputLabel>
        <Select
          labelId="station-selector-label"
          id="station-selector"
          value={activeStation}
          label="Estação"
          onChange={handleChange}
        >
          {stations.map((station) => (
            <MenuItem key={station.id} value={station.id}>
              {station.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default StationSelector;
