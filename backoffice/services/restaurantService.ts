import axios, { AxiosResponse } from 'axios';
import { Restaurant, ApiResponse } from '../models/types';

// Base API URL - would be configured from environment in production
const API_BASE_URL = 'http://localhost:8000/api';

// Axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fetch all restaurants for the authenticated user
 */
export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Restaurant[]>> = await apiClient.get('/restaurants');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    // For now, return mock data if API fails
    // This will be removed once the API is fully implemented
    return [
      { id: '1', name: 'Restaurante Central', address: 'Av. Paulista, 1000', phone: '(11) 3456-7890', email: 'central@example.com' },
      { id: '2', name: 'Filial Zona Sul', address: 'Av. Ibirapuera, 500', phone: '(11) 3456-7891', email: 'zonasul@example.com' },
      { id: '3', name: 'Filial Zona Norte', address: 'Av. Santana, 200', phone: '(11) 3456-7892', email: 'zonanorte@example.com' },
    ];
  }
};

/**
 * Fetch a single restaurant by ID
 */
export const fetchRestaurantById = async (id: string): Promise<Restaurant> => {
  try {
    const response: AxiosResponse<ApiResponse<Restaurant>> = await apiClient.get(`/restaurants/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching restaurant with ID ${id}:`, error);
    throw new Error('Failed to fetch restaurant details');
  }
};

/**
 * Update restaurant details
 */
export const updateRestaurant = async (id: string, data: Partial<Restaurant>): Promise<Restaurant> => {
  try {
    const response: AxiosResponse<ApiResponse<Restaurant>> = await apiClient.put(`/restaurants/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error(`Error updating restaurant with ID ${id}:`, error);
    throw new Error('Failed to update restaurant details');
  }
};
