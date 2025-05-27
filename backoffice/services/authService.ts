import axios, { AxiosResponse } from 'axios';
import { User, ApiResponse } from '../models/types';

// Base API URL - would be configured from environment in production
const API_BASE_URL = 'http://localhost:8000/api';

// Axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Authenticate user with email and password
 */
export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  try {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
      await apiClient.post('/auth/login', { email, password });
    
    // Store token in localStorage for subsequent requests
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('auth_token', response.data.data.token);
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Falha na autenticação. Verifique suas credenciais.');
  }
};

/**
 * Log out the current user
 */
export const logout = (): void => {
  localStorage.removeItem('auth_token');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('auth_token');
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.get('/auth/me');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw new Error('Falha ao obter dados do usuário.');
  }
};
