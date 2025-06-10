import axios, { AxiosResponse } from 'axios';
import { User, ApiResponse } from '../types';

// Base API URL - would be configured from environment in production
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';

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
    
    if (response.data && response.data.success) {
      if (!response.data.data || !response.data.data.token) {
        throw new Error('Resposta de autenticação inválida');
      }
      
      // Store token in local storage for subsequent requests
      localStorage.setItem('auth_token', response.data.data.token);
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Falha na autenticação');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Falha na autenticação. Verifique suas credenciais e tente novamente.');
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
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Usuário não autenticado');
    }
    
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Dados do usuário não encontrados');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Falha ao obter dados do usuário');
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw new Error('Falha ao obter dados do usuário. Por favor, faça login novamente.');
  }
};

/**
 * Update user password
 */
export const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    
    if (!response.data || !response.data.success) {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Falha ao atualizar senha');
    }
  } catch (error) {
    console.error('Error updating password:', error);
    throw new Error('Falha ao atualizar senha. Verifique a senha atual e tente novamente.');
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.post('/auth/forgot-password', { email });
    
    if (!response.data || !response.data.success) {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Falha ao solicitar redefinição de senha');
    }
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw new Error('Falha ao solicitar redefinição de senha. Verifique o email e tente novamente.');
  }
};
