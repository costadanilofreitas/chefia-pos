import { apiInterceptor } from './ApiInterceptor';
import { API_CONFIG, buildApiUrl } from '../config/api';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  image_url?: string;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  image_url?: string;
  is_available?: boolean;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  image_url?: string;
  is_available?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export class ProductService {
  // Cache simples para evitar chamadas duplicadas
  private static productCache: { data: Product[] | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };
  private static categoryCache: { data: ProductCategory[] | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };
  private static readonly CACHE_DURATION = 30000; // 30 segundos

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    // Verificar cache
    const now = Date.now();
    if (ProductService.productCache.data && 
        (now - ProductService.productCache.timestamp) < ProductService.CACHE_DURATION) {
      return ProductService.productCache.data;
    }
    
    const response = await apiInterceptor.get<Product[]>(buildApiUrl(API_CONFIG.ENDPOINTS.PRODUCTS.LIST));
    
    // Atualizar cache
    ProductService.productCache = {
      data: response.data,
      timestamp: now
    };
    
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    
    const response = await apiInterceptor.get<Product>(buildApiUrl(`/api/v1/products/${id}`));
    return response.data;
  
  }

  async createProduct(product: ProductCreate): Promise<Product> {
    
    const response = await apiInterceptor.post<Product>(buildApiUrl(API_CONFIG.ENDPOINTS.PRODUCTS.CREATE), product);
    return response.data;
  
  }

  async updateProduct(id: string, product: ProductUpdate): Promise<Product> {
    
    const response = await apiInterceptor.put<Product>(buildApiUrl(API_CONFIG.ENDPOINTS.PRODUCTS.UPDATE(id)), product);
    return response.data;
  
  }

  async deleteProduct(id: string): Promise<void> {
    
    await apiInterceptor.delete(buildApiUrl(API_CONFIG.ENDPOINTS.PRODUCTS.DELETE(id)));
  
  }

  // Category endpoints
  async getCategories(): Promise<ProductCategory[]> {
    // Verificar cache
    const now = Date.now();
    if (ProductService.categoryCache.data && 
        (now - ProductService.categoryCache.timestamp) < ProductService.CACHE_DURATION) {
      return ProductService.categoryCache.data;
    }
    
    const response = await apiInterceptor.get<ProductCategory[]>(buildApiUrl('/api/v1/categories'));
    
    // Atualizar cache
    ProductService.categoryCache = {
      data: response.data,
      timestamp: now
    };
    
    return response.data;
  }

  async getCategory(id: string): Promise<ProductCategory> {
    
    const response = await apiInterceptor.get<ProductCategory>(buildApiUrl(`/api/v1/categories/${id}`));
    return response.data;
  
  }

  async createCategory(category: CategoryCreate): Promise<ProductCategory> {
    
    const response = await apiInterceptor.post<ProductCategory>(buildApiUrl('/api/v1/categories'), category);
    return response.data;
  
  }

  async updateCategory(id: string, category: CategoryUpdate): Promise<ProductCategory> {
    
    const response = await apiInterceptor.put<ProductCategory>(buildApiUrl(`/api/v1/categories/${id}`), category);
    return response.data;
  
  }

  async deleteCategory(id: string): Promise<void> {
    
    await apiInterceptor.delete(buildApiUrl(`/api/v1/categories/${id}`));
  
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string }> {
    
    const response = await apiInterceptor.get<{ status: string; service: string }>(buildApiUrl('/api/v1/health'));
    return response.data;
  
  }

  // Métodos para gerenciar cache
  clearProductCache(): void {
    ProductService.productCache = { data: null, timestamp: 0 };
  }

  clearCategoryCache(): void {
    ProductService.categoryCache = { data: null, timestamp: 0 };
  }

  clearAllCache(): void {
    this.clearProductCache();
    this.clearCategoryCache();
  }
}

export const productService = new ProductService();

