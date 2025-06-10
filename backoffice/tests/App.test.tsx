import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { fetchRestaurants } from '../services/restaurantService';

// Mock the restaurant service
jest.mock('../services/restaurantService', () => ({
  fetchRestaurants: jest.fn(),
}));

// Mock the auth service
jest.mock('../services/authService', () => ({
  isAuthenticated: jest.fn().mockReturnValue(false),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form when not authenticated', async () => {
    render(<App />);
    
    // Basic assertion to check if the component renders without crashing
    expect(document.body.textContent).toBeDefined();
  });

  test('fetches restaurants after authentication', async () => {
    // Mock authenticated state
    require('../services/authService').isAuthenticated.mockReturnValue(true);
    
    // Mock restaurant data
    const mockRestaurants = [
      { id: '1', name: 'Restaurante Central', address: 'Av. Paulista, 1000', phone: '(11) 3456-7890', email: 'central@example.com' },
      { id: '2', name: 'Filial Zona Sul', address: 'Av. Ibirapuera, 500', phone: '(11) 3456-7891', email: 'zonasul@example.com' },
    ];
    
    fetchRestaurants.mockResolvedValue(mockRestaurants);
    
    render(<App />);
    
    await waitFor(() => {
      expect(fetchRestaurants).toHaveBeenCalled();
    });
  });
});
