import axios, { AxiosResponse } from 'axios';
import { Table, ApiResponse, Order } from '../types';

// Base API URL - would be configured from environment in production
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';

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
 * Fetch all tables
 */
export const fetchTables = async (): Promise<Table[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Table[]>> = await apiClient.get('/tables');
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch tables');
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw new Error('Failed to fetch tables. Please try again later.');
  }
};

/**
 * Fetch a single table by ID
 */
export const fetchTableById = async (id: string): Promise<Table> => {
  try {
    const response: AxiosResponse<ApiResponse<Table>> = await apiClient.get(`/tables/${id}`);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Table not found');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch table details');
    }
  } catch (error) {
    console.error(`Error fetching table with ID ${id}:`, error);
    throw new Error('Failed to fetch table details. Please try again later.');
  }
};

/**
 * Update table status
 */
export const updateTableStatus = async (tableId: string, status: string): Promise<Table> => {
  try {
    const response: AxiosResponse<ApiResponse<Table>> = await apiClient.patch(`/tables/${tableId}/status`, { status });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Table not found or could not be updated');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to update table status');
    }
  } catch (error) {
    console.error(`Error updating status for table ${tableId}:`, error);
    throw new Error('Failed to update table status. Please try again later.');
  }
};

/**
 * Fetch current order for a table
 */
export const fetchTableOrder = async (tableId: string): Promise<Order | null> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.get(`/tables/${tableId}/order`);
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching order for table ${tableId}:`, error);
    return null;
  }
};

/**
 * Assign waiter to table
 */
export const assignWaiterToTable = async (tableId: string, waiterId: string): Promise<Table> => {
  try {
    const response: AxiosResponse<ApiResponse<Table>> = await apiClient.patch(`/tables/${tableId}/waiter`, { waiterId });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Table not found or could not be updated');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to assign waiter to table');
    }
  } catch (error) {
    console.error(`Error assigning waiter to table ${tableId}:`, error);
    throw new Error('Failed to assign waiter to table. Please try again later.');
  }
};
