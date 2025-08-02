import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const POSMainPageTest: React.FC = () => {
  console.log('🚀 POSMainPageTest: Componente carregado com sucesso!');
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎉 POS Main Page - FUNCIONANDO!
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          ✅ Teste de Carregamento Bem-Sucedido
        </Typography>
        
        <Typography variant="body1" paragraph>
          Esta é uma versão simplificada da POSMainPage para testar se o componente consegue ser carregado.
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Se você está vendo esta mensagem, significa que:
        </Typography>
        
        <ul>
          <li>✅ React Router está funcionando</li>
          <li>✅ Lazy loading está operacional</li>
          <li>✅ Componente consegue ser renderizado</li>
          <li>✅ Próximo passo: testar integração com produtos</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default POSMainPageTest;

