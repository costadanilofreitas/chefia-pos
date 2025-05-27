import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';

/**
 * Componente para seleção de estações no KDS
 * @param {Object} props - Propriedades do componente
 * @param {string} props.activeStation - Estação atualmente selecionada
 * @param {Function} props.onStationChange - Função chamada quando a estação é alterada
 * @returns {JSX.Element} Componente de seleção de estações
 */
const StationSelector = ({ activeStation, onStationChange }) => {
  // Lista de estações disponíveis
  const stations = [
    { id: 'all', name: 'Todas as Estações' },
    { id: 'kitchen', name: 'Cozinha' },
    { id: 'bar', name: 'Bar' },
    { id: 'grill', name: 'Grelha' },
    { id: 'dessert', name: 'Sobremesas' }
  ];

  const handleChange = (event) => {
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
