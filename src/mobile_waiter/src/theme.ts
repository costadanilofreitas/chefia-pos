import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF9800',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
    disabled: '#9E9E9E',
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'Roboto-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'Roboto-Medium',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'Roboto-Light',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'Roboto-Thin',
      fontWeight: '100',
    },
  },
};

export const darkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#90CAF9',
    accent: '#FFB74D',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
    disabled: '#757575',
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'Roboto-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'Roboto-Medium',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'Roboto-Light',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'Roboto-Thin',
      fontWeight: '100',
    },
  },
};
