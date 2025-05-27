import { ApiClient } from '@common/services/apiClient';

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category_id: number;
}

/**
 * Service for managing products and categories in the Kiosk app
 */
export class ProductService {
  private apiClient: ApiClient;

  constructor() {
    // Use the base URL from environment or default to /api
    const baseURL = process.env.REACT_APP_API_URL || '/api';
    this.apiClient = new ApiClient(`${baseURL}/products`);
  }

  /**
   * Get all product categories
   * @returns Promise with categories data
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Category[]}>('/categories');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get all products
   * @returns Promise with products data
   */
  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product[]}>('/');
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch products');
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   * @param categoryId - ID of the category to filter by
   * @returns Promise with filtered products data
   */
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product[]}>(`/category/${categoryId}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch products by category');
    } catch (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Search products by term
   * @param searchTerm - Search term to filter products
   * @returns Promise with search results
   */
  async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product[]}>(`/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to search products');
    } catch (error) {
      console.error(`Error searching products with term "${searchTerm}":`, error);
      throw error;
    }
  }

  /**
   * Get product details by ID
   * @param productId - ID of the product to fetch
   * @returns Promise with product details
   */
  async getProductById(productId: number): Promise<Product> {
    try {
      const response = await this.apiClient.get<{success: boolean, data: Product}>(`/${productId}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error(`Failed to fetch product with ID ${productId}`);
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const productService = new ProductService();
