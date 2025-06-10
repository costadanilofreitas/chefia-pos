import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeScreen from '../screens/HomeScreen';
import { fetchTables } from '../services/tableService';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock the table service
jest.mock('../services/tableService', () => ({
  fetchTables: jest.fn(),
}));

describe('HomeScreen Component', () => {
  const Stack = createNativeStackNavigator();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithNavigation = (component) => {
    return render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={component} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  };

  test('displays loading indicator when fetching tables', async () => {
    // Mock tables data but don't resolve yet
    const fetchTablesPromise = new Promise(() => {});
    fetchTables.mockReturnValue(fetchTablesPromise);
    
    renderWithNavigation(() => <HomeScreen />);
    
    expect(screen.getByText(/Carregando mesas/i)).toBeInTheDocument();
  });

  test('displays tables when fetch is successful', async () => {
    // Mock tables data
    const mockTables = [
      {
        id: '1',
        number: '1',
        capacity: 4,
        status: 'available'
      },
      {
        id: '2',
        number: '2',
        capacity: 2,
        status: 'occupied',
        currentOrderId: '1001'
      }
    ];
    
    fetchTables.mockResolvedValue(mockTables);
    
    renderWithNavigation(() => <HomeScreen />);
    
    await waitFor(() => {
      expect(screen.getByText(/Mesa 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Mesa 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Capacidade: 4 pessoas/i)).toBeInTheDocument();
      expect(screen.getByText(/Disponível/i)).toBeInTheDocument();
      expect(screen.getByText(/Ocupada/i)).toBeInTheDocument();
    });
  });

  test('displays error message when fetch fails', async () => {
    // Mock fetch error
    fetchTables.mockRejectedValue(new Error('Network error'));
    
    renderWithNavigation(() => <HomeScreen />);
    
    await waitFor(() => {
      expect(screen.getByText(/Falha ao carregar mesas/i)).toBeInTheDocument();
      expect(screen.getByText(/Tentar Novamente/i)).toBeInTheDocument();
    });
  });

  test('navigates to table screen when table is selected', async () => {
    // Mock tables data
    const mockTables = [
      {
        id: '1',
        number: '1',
        capacity: 4,
        status: 'available'
      }
    ];
    
    fetchTables.mockResolvedValue(mockTables);
    
    renderWithNavigation(() => <HomeScreen navigation={{ navigate: mockNavigate }} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Mesa 1/i)).toBeInTheDocument();
    });
    
    // Click on the table
    fireEvent.press(screen.getByText(/Mesa 1/i));
    
    expect(mockNavigate).toHaveBeenCalledWith('Table', {
      tableId: '1',
      tableNumber: '1'
    });
  });
});
