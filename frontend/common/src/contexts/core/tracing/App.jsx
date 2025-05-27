import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import TransactionVisualizer from './TransactionVisualizer';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#ff9800',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
        },
      },
    },
  },
});

// Componente principal
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<TransactionVisualizer />} />
          <Route path="/transactions" element={<TransactionVisualizer />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

// Renderizar aplicação
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

export default App;
