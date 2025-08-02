import { apiInterceptor } from './ApiInterceptor';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status: 'active' | 'inactive';
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status?: 'active' | 'inactive';
  image_url?: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  status?: 'active' | 'inactive';
  image_url?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
}

export class ProductService {
  private baseURL = 'http://localhost:8001/api/v1';

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/products`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Falha ao carregar produtos');
    }
  }

  async getProduct(id: string): Promise<Product> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error('Falha ao carregar produto');
    }
  }

  async createProduct(product: ProductCreate): Promise<Product> {
    try {
      const response = await apiInterceptor.post(`${this.baseURL}/products`, product);
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Falha ao criar produto');
    }
  }

  async updateProduct(id: string, product: ProductUpdate): Promise<Product> {
    try {
      const response = await apiInterceptor.put(`${this.baseURL}/products/${id}`, product);
      return response.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Falha ao atualizar produto');
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await apiInterceptor.delete(`${this.baseURL}/products/${id}`);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Falha ao excluir produto');
    }
  }

  // Category endpoints
  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/categories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Falha ao carregar categorias');
    }
  }

  async getCategory(id: string): Promise<ProductCategory> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw new Error('Falha ao carregar categoria');
    }
  }

  async createCategory(category: CategoryCreate): Promise<ProductCategory> {
    try {
      const response = await apiInterceptor.post(`${this.baseURL}/categories`, category);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Falha ao criar categoria');
    }
  }

  async updateCategory(id: string, category: CategoryUpdate): Promise<ProductCategory> {
    try {
      const response = await apiInterceptor.put(`${this.baseURL}/categories/${id}`, category);
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Falha ao atualizar categoria');
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await apiInterceptor.delete(`${this.baseURL}/categories/${id}`);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Falha ao excluir categoria');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await apiInterceptor.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking product service health:', error);
      throw new Error('Serviço de produtos indisponível');
    }
  }
}

export const productService = new ProductService();

