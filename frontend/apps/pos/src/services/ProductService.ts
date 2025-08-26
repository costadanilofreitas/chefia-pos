import { apiInterceptor } from './ApiInterceptor';

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
  private baseURL = 'http://localhost:8001/api/v1';

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    
    const response = await apiInterceptor.get<Product[]>(`${this.baseURL}/products`);
    return response.data;
  
  }

  async getProduct(id: string): Promise<Product> {
    
    const response = await apiInterceptor.get<Product>(`${this.baseURL}/products/${id}`);
    return response.data;
  
  }

  async createProduct(product: ProductCreate): Promise<Product> {
    
    const response = await apiInterceptor.post<Product>(`${this.baseURL}/products`, product);
    return response.data;
  
  }

  async updateProduct(id: string, product: ProductUpdate): Promise<Product> {
    
    const response = await apiInterceptor.put<Product>(`${this.baseURL}/products/${id}`, product);
    return response.data;
  
  }

  async deleteProduct(id: string): Promise<void> {
    
    await apiInterceptor.delete(`${this.baseURL}/products/${id}`);
  
  }

  // Category endpoints
  async getCategories(): Promise<ProductCategory[]> {
    
    const response = await apiInterceptor.get<ProductCategory[]>(`${this.baseURL}/categories`);
    return response.data;
  
  }

  async getCategory(id: string): Promise<ProductCategory> {
    
    const response = await apiInterceptor.get<ProductCategory>(`${this.baseURL}/categories/${id}`);
    return response.data;
  
  }

  async createCategory(category: CategoryCreate): Promise<ProductCategory> {
    
    const response = await apiInterceptor.post<ProductCategory>(`${this.baseURL}/categories`, category);
    return response.data;
  
  }

  async updateCategory(id: string, category: CategoryUpdate): Promise<ProductCategory> {
    
    const response = await apiInterceptor.put<ProductCategory>(`${this.baseURL}/categories/${id}`, category);
    return response.data;
  
  }

  async deleteCategory(id: string): Promise<void> {
    
    await apiInterceptor.delete(`${this.baseURL}/categories/${id}`);
  
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string }> {
    
    const response = await apiInterceptor.get<{ status: string; service: string }>(`${this.baseURL}/health`);
    return response.data;
  
  }
}

export const productService = new ProductService();

