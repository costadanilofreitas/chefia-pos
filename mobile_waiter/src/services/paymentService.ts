import axios, { AxiosResponse } from 'axios';
import { Payment, ApiResponse } from '../types';

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
 * Process payment for an order
 */
export const processPayment = async (
  orderId: string, 
  amount: number, 
  method: string
): Promise<Payment> => {
  try {
    const response: AxiosResponse<ApiResponse<Payment>> = await apiClient.post('/payments', {
      orderId,
      amount,
      method
    });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to process payment');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to process payment');
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    throw new Error('Failed to process payment. Please try again later.');
  }
};

/**
 * Get payment by order ID
 */
export const getPaymentByOrderId = async (orderId: string): Promise<Payment | null> => {
  try {
    const response: AxiosResponse<ApiResponse<Payment>> = await apiClient.get(`/orders/${orderId}/payment`);
    
    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching payment for order ${orderId}:`, error);
    return null;
  }
};

/**
 * Process refund for a payment
 */
export const processRefund = async (paymentId: string, amount?: number): Promise<Payment> => {
  try {
    const response: AxiosResponse<ApiResponse<Payment>> = await apiClient.post(`/payments/${paymentId}/refund`, {
      amount // Optional: partial refund amount
    });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Failed to process refund');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to process refund');
    }
  } catch (error) {
    console.error(`Error processing refund for payment ${paymentId}:`, error);
    throw new Error('Failed to process refund. Please try again later.');
  }
};

/**
 * Get available payment methods
 */
export const getPaymentMethods = async (): Promise<string[]> => {
  try {
    const response: AxiosResponse<ApiResponse<string[]>> = await apiClient.get('/payments/methods');
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to get payment methods');
    }
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    // Return default payment methods as fallback
    return ['credit', 'debit', 'pix'];
  }
};
