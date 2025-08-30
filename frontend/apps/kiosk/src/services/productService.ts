import apiClient from './apiClient';
import { API_CONFIG } from '../config/api';
import { offlineStorage } from './offlineStorage';
import { errorHandler } from './errorHandler';

// Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active: boolean;
  parent_id?: string | null;
}

export interface ProductCustomization {
  id: string;
  name: string;
  type: 'addition' | 'removal' | 'option';
  price?: number;
  max_quantity?: number;
  is_required?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category_id: string;
  category?: Category;
  is_available: boolean;
  preparation_time?: number; // in minutes
  customizations?: ProductCustomization[];
  variants?: ProductVariant[];
  tags?: string[];
  nutritional_info?: {
    calories?: number;
    proteins?: number;
    carbohydrates?: number;
    fats?: number;
  };
}

export interface ProductSearchParams {
  q?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  tags?: string[];
  is_available?: boolean;
  sort_by?: 'name' | 'price' | 'popularity';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Enhanced Product Service with caching and error handling
 */
class ProductService {
  // Simple in-memory cache
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all product categories
   */
  async getCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = this.getFromCache<Category[]>(cacheKey);
    if (cached) return cached;

    const timer = offlineStorage.startTimer('Fetch Categories');
    
    try {
      const response = await apiClient.get<Category[]>(
        API_CONFIG.ENDPOINTS.PRODUCTS.CATEGORIES
      );
      
      const categories = response.data;
      this.setCache(cacheKey, categories);
      
      timer();
      offlineStorage.log('Categories fetched successfully', { count: categories.length });
      
      return categories;
    } catch (error) {
      offlineStorage.error('Failed to fetch categories', error);
      throw errorHandler.handle(error, 'ProductService.getCategories');
    }
  }

  /**
   * Get all products
   */
  async getProducts(params?: ProductSearchParams): Promise<Product[]> {
    const cacheKey = `products-${JSON.stringify(params || {})}`;
    const cached = this.getFromCache<Product[]>(cacheKey);
    if (cached) return cached;

    const timer = offlineStorage.startTimer('Fetch Products');
    
    try {
      const response = await apiClient.get<Product[]>(
        API_CONFIG.ENDPOINTS.PRODUCTS.LIST,
        params ? { params } : undefined
      );
      
      const products = response.data;
      this.setCache(cacheKey, products);
      
      timer();
      offlineStorage.log('Products fetched successfully', { 
        count: products.length,
        params 
      });
      
      return products;
    } catch (error) {
      offlineStorage.error('Failed to fetch products', error);
      throw errorHandler.handle(error, 'ProductService.getProducts');
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.getProducts({ category_id: categoryId });
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm: string, params?: Omit<ProductSearchParams, 'q'>): Promise<Product[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const timer = offlineStorage.startTimer('Search Products');
    
    try {
      const response = await apiClient.get<Product[]>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SEARCH,
        { 
          params: {
            q: searchTerm.trim(),
            ...params
          }
        }
      );
      
      const products = response.data;
      
      timer();
      offlineStorage.log('Products search completed', { 
        searchTerm,
        results: products.length 
      });
      
      return products;
    } catch (error) {
      offlineStorage.error('Failed to search products', error);
      throw errorHandler.handle(error, 'ProductService.searchProducts');
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product> {
    const cacheKey = `product-${productId}`;
    const cached = this.getFromCache<Product>(cacheKey);
    if (cached) return cached;

    const timer = offlineStorage.startTimer('Fetch Product Details');
    
    try {
      const response = await apiClient.get<Product>(
        API_CONFIG.ENDPOINTS.PRODUCTS.DETAIL(productId)
      );
      
      const product = response.data;
      this.setCache(cacheKey, product);
      
      timer();
      offlineStorage.log('Product details fetched', { productId, name: product.name });
      
      return product;
    } catch (error) {
      offlineStorage.error(`Failed to fetch product ${productId}`, error);
      
      if ((error as any)?.status === 404) {
        throw errorHandler.handleValidationError(
          'product',
          'Produto não encontrado',
          productId
        );
      }
      
      throw errorHandler.handle(error, 'ProductService.getProductById');
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(): Promise<Product[]> {
    return this.getProducts({ 
      tags: ['featured'],
      is_available: true,
      limit: 10 
    });
  }

  /**
   * Get popular products
   */
  async getPopularProducts(): Promise<Product[]> {
    return this.getProducts({ 
      sort_by: 'popularity',
      sort_order: 'desc',
      is_available: true,
      limit: 10 
    });
  }

  /**
   * Check product availability
   */
  async checkAvailability(productId: string): Promise<boolean> {
    try {
      const product = await this.getProductById(productId);
      return product.is_available;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    offlineStorage.log('Product cache cleared');
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      offlineStorage.debug(`Cache hit: ${key}`);
      return cached.data as T;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
}

// Export singleton instance
export const productService = new ProductService();

// Also export the class for testing
export { ProductService };