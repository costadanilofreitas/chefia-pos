import axios, { AxiosResponse } from 'axios';
import { ApiResponse, DashboardStats } from '../models/types';

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
 * Fetch dashboard statistics for a specific restaurant
 */
export const fetchDashboardStats = async (restaurantId: string): Promise<DashboardStats> => {
  try {
    const response: AxiosResponse<ApiResponse<DashboardStats>> = await apiClient.get(`/restaurants/${restaurantId}/stats`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching dashboard stats for restaurant ${restaurantId}:`, error);
    // Temporary fallback data until API is fully implemented
    return {
      dailySales: 3250.75,
      monthlySales: 87450.25,
      averageTicket: 42.30,
      pendingOrders: 8,
      topProducts: [
        { id: '1', name: 'Hambúrguer Clássico', quantity: 145, revenue: 2175.0 },
        { id: '2', name: 'Batata Frita Grande', quantity: 120, revenue: 1080.0 },
        { id: '3', name: 'Refrigerante 500ml', quantity: 180, revenue: 900.0 },
        { id: '4', name: 'Milk Shake', quantity: 75, revenue: 825.0 },
        { id: '5', name: 'Combo Família', quantity: 45, revenue: 2025.0 }
      ]
    };
  }
};

/**
 * Fetch sales report data for a specific restaurant and date range
 */
export const fetchSalesReport = async (
  restaurantId: string, 
  startDate: string, 
  endDate: string
): Promise<any> => {
  try {
    const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(
      `/restaurants/${restaurantId}/reports/sales`,
      { params: { startDate, endDate } }
    );
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching sales report for restaurant ${restaurantId}:`, error);
    throw new Error('Failed to fetch sales report');
  }
};

/**
 * Fetch inventory report data for a specific restaurant
 */
export const fetchInventoryReport = async (restaurantId: string): Promise<any> => {
  try {
    const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(
      `/restaurants/${restaurantId}/reports/inventory`
    );
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching inventory report for restaurant ${restaurantId}:`, error);
    throw new Error('Failed to fetch inventory report');
  }
};
