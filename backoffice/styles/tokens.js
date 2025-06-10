// Convert ES module to CommonJS for Jest compatibility
const colors = {
  primary: '#FF5722',
  secondary: '#2196F3',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#00BCD4',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#9E9E9E',
    hint: '#9E9E9E'
  }
};

const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px'
};

const typography = {
  fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px'
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700
  }
};

const breakpoints = {
  xs: '0px',
  sm: '600px',
  md: '960px',
  lg: '1280px',
  xl: '1920px'
};

const shadows = {
  none: 'none',
  sm: '0 2px 4px rgba(0,0,0,0.1)',
  md: '0 4px 8px rgba(0,0,0,0.12)',
  lg: '0 8px 16px rgba(0,0,0,0.14)',
  xl: '0 12px 24px rgba(0,0,0,0.16)'
};

// Export using CommonJS for Jest compatibility
module.exports = {
  colors,
  spacing,
  typography,
  breakpoints,
  shadows
};
