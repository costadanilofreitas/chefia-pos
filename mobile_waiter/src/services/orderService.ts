import axios, { AxiosResponse } from 'axios';
import { Order, OrderItem, ApiResponse } from '../types';

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
 * Create a new order
 */
export const createOrder = async (tableId: string): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.post('/orders', { tableId });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to create order');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to create order');
    }
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order. Please try again later.');
  }
};

/**
 * Fetch an order by ID
 */
export const fetchOrderById = async (orderId: string): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.get(`/orders/${orderId}`);
    
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
    console.error(`Error fetching order with ID ${orderId}:`, error);
    throw new Error('Failed to fetch order details. Please try again later.');
  }
};

/**
 * Add item to order
 */
export const addOrderItem = async (orderId: string, item: Omit<OrderItem, 'id'>): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.post(`/orders/${orderId}/items`, item);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to add item to order');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to add item to order');
    }
  } catch (error) {
    console.error(`Error adding item to order ${orderId}:`, error);
    throw new Error('Failed to add item to order. Please try again later.');
  }
};

/**
 * Update order item
 */
export const updateOrderItem = async (orderId: string, itemId: string, updates: Partial<OrderItem>): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.put(`/orders/${orderId}/items/${itemId}`, updates);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to update order item');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to update order item');
    }
  } catch (error) {
    console.error(`Error updating item in order ${orderId}:`, error);
    throw new Error('Failed to update order item. Please try again later.');
  }
};

/**
 * Remove item from order
 */
export const removeOrderItem = async (orderId: string, itemId: string): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.delete(`/orders/${orderId}/items/${itemId}`);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to remove item from order');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to remove item from order');
    }
  } catch (error) {
    console.error(`Error removing item from order ${orderId}:`, error);
    throw new Error('Failed to remove item from order. Please try again later.');
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId: string, status: string): Promise<Order> => {
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
 * Submit order for preparation
 */
export const submitOrder = async (orderId: string): Promise<Order> => {
  try {
    const response: AxiosResponse<ApiResponse<Order>> = await apiClient.post(`/orders/${orderId}/submit`);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to submit order');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to submit order');
    }
  } catch (error) {
    console.error(`Error submitting order ${orderId}:`, error);
    throw new Error('Failed to submit order. Please try again later.');
  }
};
