import axios from 'axios';
import { fetchRestaurants, fetchRestaurantById } from '../services/restaurantService';
import { Restaurant } from '../models/types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Restaurant Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRestaurants', () => {
    test('returns restaurant data when API call is successful', async () => {
      // Mock data
      const mockRestaurants: Restaurant[] = [
        { id: '1', name: 'Restaurante Central', address: 'Av. Paulista, 1000', phone: '(11) 3456-7890', email: 'central@example.com' },
        { id: '2', name: 'Filial Zona Sul', address: 'Av. Ibirapuera, 500', phone: '(11) 3456-7891', email: 'zonasul@example.com' },
      ];

      // Setup axios mock
      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockRestaurants,
          message: 'Restaurants fetched successfully'
        }
      });

      // Call the function
      const result = await fetchRestaurants();

      // Assertions
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/restaurants');
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '2' })
      ]));
    });

    test('returns fallback data when API call fails', async () => {
      // Setup axios mock to simulate failure
      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Call the function
      const result = await fetchRestaurants();

      // Assertions
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/restaurants');
      expect(result.length).toBeGreaterThan(0); // Should return some fallback data
    });
  });

  describe('fetchRestaurantById', () => {
    test('returns restaurant data when API call is successful', async () => {
      // Mock data
      const mockRestaurant: Restaurant = {
        id: '1',
        name: 'Restaurante Central',
        address: 'Av. Paulista, 1000',
        phone: '(11) 3456-7890',
        email: 'central@example.com'
      };

      // Setup axios mock
      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockRestaurant,
          message: 'Restaurant fetched successfully'
        }
      });

      // Call the function
      const result = await fetchRestaurantById('1');

      // Assertions
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/restaurants/1');
      expect(result).toEqual(expect.objectContaining({ id: '1' }));
    });

    test('throws error when API call fails', async () => {
      // Setup axios mock to simulate failure
      const mockAxiosInstance = axios.create();
      (mockAxiosInstance.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(fetchRestaurantById('1')).rejects.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/restaurants/1');
    });
  });
});
