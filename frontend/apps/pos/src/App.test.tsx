import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import TestPage from './ui/TestPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppTest: React.FC = () => {
  console.log('🚀 AppTest rendered');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TestPage />
    </ThemeProvider>
  );
};

export default AppTest;

