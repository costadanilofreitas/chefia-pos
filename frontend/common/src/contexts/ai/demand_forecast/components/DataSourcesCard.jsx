import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid, Divider } from '@mui/material';
import { CloudQueue, Event, Celebration, LocalOffer } from '@mui/icons-material';

const DataSourcesCard = ({ dataSources }) => {
  if (!dataSources) return null;

  return (
    <Card sx={{ boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Fontes de Dados Utilizadas
        </Typography>
        
        <Divider sx={{ my: 1 }} />
        
        <Grid container spacing={2}>
          {dataSources.includes('weather') && (
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudQueue color="primary" />
              <Typography variant="body2">
                Dados Climáticos
              </Typography>
            </Grid>
          )}
          
          {dataSources.includes('events') && (
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Event color="primary" />
              <Typography variant="body2">
                Eventos Locais
              </Typography>
            </Grid>
          )}
          
          {dataSources.includes('holidays') && (
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Celebration color="primary" />
              <Typography variant="body2">
                Feriados
              </Typography>
            </Grid>
          )}
          
          {dataSources.includes('promotions') && (
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalOffer color="primary" />
              <Typography variant="body2">
                Promoções
              </Typography>
            </Grid>
          )}
        </Grid>
        
        {dataSources.includes('custom') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Fontes de Dados Personalizadas
            </Typography>
            <Chip 
              label="Dados Personalizados" 
              size="small" 
              color="secondary" 
              sx={{ mt: 0.5 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DataSourcesCard;
