import axios, { AxiosResponse } from 'axios';
import { Order, OrderStatus, ApiResponse } from '../models/types';

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
 * Fetch all orders
 */
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Order[]>> = await apiClient.get('/orders');
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch orders');
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw new Error('Failed to fetch orders. Please try again later.');
  }
};

/**
 * Fetch a single order by ID
 */
export const fetchOrderById = async (id: string): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.get(`/orders/${id}`);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Order not found');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch order details');
    }
  } catch (error) {
    console.error(`Error fetching order with ID ${id}:`, error);
    throw new Error('Failed to fetch order details. Please try again later.');
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.patch(`/orders/${orderId}/status`, { status });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Order not found or could not be updated');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to update order status');
    }
  } catch (error) {
    console.error(`Error updating status for order ${orderId}:`, error);
    throw new Error('Failed to update order status. Please try again later.');
  }
};

/**
 * Search orders by customer name, email, or order ID
 */
export const searchOrders = async (query: string): Promise<Order[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Order[]>> = await apiClient.get('/orders/search', {
      params: { query }
    });
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to search orders');
    }
  } catch (error) {
    console.error('Error searching orders:', error);
    throw new Error('Failed to search orders. Please try again later.');
  }
};

/**
 * Fetch orders by status
 */
export const fetchOrdersByStatus = async (status: OrderStatus): Promise<Order[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Order[]>> = await apiClient.get('/orders', {
      params: { status }
    });
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch orders by status');
    }
  } catch (error) {
    console.error(`Error fetching orders with status ${status}:`, error);
    throw new Error('Failed to fetch orders by status. Please try again later.');
  }
};
