import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import MessageQueueTestInterface from './MessageQueueTestInterface';

// Criar tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#ff9800',
    },
  },
});

// Componente raiz
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MessageQueueTestInterface />
    </ThemeProvider>
  );
};

// Renderizar aplicação
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
