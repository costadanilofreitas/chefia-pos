import axios, { AxiosResponse } from 'axios';
import { Product, Category, ApiResponse } from '../types';

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
 * Fetch all products
 */
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Product[]>> = await apiClient.get('/products');
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch products');
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products. Please try again later.');
  }
};

/**
 * Fetch products by category
 */
export const fetchProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Product[]>> = await apiClient.get(`/categories/${categoryId}/products`);
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch products by category');
    }
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    throw new Error('Failed to fetch products by category. Please try again later.');
  }
};

/**
 * Fetch all categories
 */
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Category[]>> = await apiClient.get('/categories');
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch categories');
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to fetch categories. Please try again later.');
  }
};

/**
 * Fetch a single product by ID
 */
export const fetchProductById = async (id: string): Promise<Product> => {
  try {
    const response: AxiosResponse<ApiResponse<Product>> = await apiClient.get(`/products/${id}`);
    
    if (response.data && response.data.success) {
      if (!response.data.data) {
        throw new Error('Product not found');
      }
      return response.data.data;
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to fetch product details');
    }
  } catch (error) {
    console.error(`Error fetching product with ID ${id}:`, error);
    throw new Error('Failed to fetch product details. Please try again later.');
  }
};

/**
 * Search products by name or description
 */
export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    const response: AxiosResponse<ApiResponse<Product[]>> = await apiClient.get('/products/search', {
      params: { query }
    });
    
    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      console.error('Error in API response:', response.data?.message);
      throw new Error(response.data?.message || 'Failed to search products');
    }
  } catch (error) {
    console.error('Error searching products:', error);
    throw new Error('Failed to search products. Please try again later.');
  }
};
