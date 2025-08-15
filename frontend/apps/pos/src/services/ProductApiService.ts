import axios from 'axios';

// API Base URL
const API_BASE_URL = 'http://localhost:8002/api/v1';

// Interfaces que correspondem ao backend
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  sku?: string;
  barcode?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  type: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured: boolean;
  weight_based: boolean;
  pricing_strategy: 'FIXED' | 'WEIGHT_BASED' | 'DYNAMIC';
  image_url?: string;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
  images: string[];
  ingredients: any[];
  combo_items: any[];
}

export interface ProductSummary {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  type: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured: boolean;
  image_url?: string;
  is_available?: boolean;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  sku?: string;
  barcode?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured?: boolean;
  weight_based?: boolean;
  pricing_strategy?: 'FIXED' | 'WEIGHT_BASED' | 'DYNAMIC';
  image_url?: string;
  is_available?: boolean;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  sku?: string;
  barcode?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured?: boolean;
  weight_based?: boolean;
  pricing_strategy?: 'FIXED' | 'WEIGHT_BASED' | 'DYNAMIC';
  image_url?: string;
  is_available?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  is_active: boolean;
  current_stock: number;
  minimum_stock: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientCreate {
  name: string;
  description?: string;
  unit?: string;
  cost_per_unit?: number;
  supplier?: string;
  is_active?: boolean;
}

export interface IngredientUpdate {
  name?: string;
  description?: string;
  unit?: string;
  cost_per_unit?: number;
  supplier?: string;
  is_active?: boolean;
}

// Filtros para listagem de produtos
export interface ProductFilters {
  category_id?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Filtros para listagem de categorias
export interface CategoryFilters {
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// Filtros para listagem de ingredientes
export interface IngredientFilters {
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

class ProductApiService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token de autenticação se disponível
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor para tratamento de erros
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  // ===== PRODUTOS =====
  
  async createProduct(product: ProductCreate): Promise<Product> {
    const response = await this.axiosInstance.post('/products', product);
    return response.data;
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.axiosInstance.get(`/products/${productId}`);
    return response.data;
  }

  async listProducts(filters: ProductFilters = {}): Promise<ProductSummary[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await this.axiosInstance.get(`/products?${params.toString()}`);
    return response.data;
  }

  async updateProduct(productId: string, update: ProductUpdate): Promise<Product> {
    const response = await this.axiosInstance.put(`/products/${productId}`, update);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<{ success: boolean }> {
    const response = await this.axiosInstance.delete(`/products/${productId}`);
    return response.data;
  }

  // ===== CATEGORIAS =====
  
  async createCategory(category: CategoryCreate): Promise<ProductCategory> {
    const response = await this.axiosInstance.post('/categories', category);
    return response.data;
  }

  async getCategory(categoryId: string): Promise<ProductCategory> {
    const response = await this.axiosInstance.get(`/categories/${categoryId}`);
    return response.data;
  }

  async listCategories(filters: CategoryFilters = {}): Promise<ProductCategory[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await this.axiosInstance.get(`/categories?${params.toString()}`);
    return response.data;
  }

  async updateCategory(categoryId: string, update: CategoryUpdate): Promise<ProductCategory> {
    const response = await this.axiosInstance.put(`/categories/${categoryId}`, update);
    return response.data;
  }

  async deleteCategory(categoryId: string): Promise<{ success: boolean }> {
    const response = await this.axiosInstance.delete(`/categories/${categoryId}`);
    return response.data;
  }

  // ===== INGREDIENTES =====
  
  async createIngredient(ingredient: IngredientCreate): Promise<Ingredient> {
    const response = await this.axiosInstance.post('/ingredients', ingredient);
    return response.data;
  }

  async listIngredients(filters: IngredientFilters = {}): Promise<Ingredient[]> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await this.axiosInstance.get(`/ingredients?${params.toString()}`);
    return response.data;
  }

  async updateIngredient(ingredientId: string, update: IngredientUpdate): Promise<Ingredient> {
    const response = await this.axiosInstance.put(`/ingredients/${ingredientId}`, update);
    return response.data;
  }

  async deleteIngredient(ingredientId: string): Promise<{ success: boolean }> {
    const response = await this.axiosInstance.delete(`/ingredients/${ingredientId}`);
    return response.data;
  }

  // ===== MÉTODOS DE CONVENIÊNCIA =====
  
  async getActiveProducts(): Promise<ProductSummary[]> {
    return this.listProducts({ status: 'ACTIVE' });
  }

  async getFeaturedProducts(): Promise<ProductSummary[]> {
    return this.listProducts({ is_featured: true, status: 'ACTIVE' });
  }

  async getProductsByCategory(categoryId: string): Promise<ProductSummary[]> {
    return this.listProducts({ category_id: categoryId, status: 'ACTIVE' });
  }

  async searchProducts(query: string): Promise<ProductSummary[]> {
    return this.listProducts({ search: query, status: 'ACTIVE' });
  }

  async getActiveCategories(): Promise<ProductCategory[]> {
    return this.listCategories({ is_active: true });
  }

  async getActiveIngredients(): Promise<Ingredient[]> {
    return this.listIngredients({ is_active: true });
  }
}

// Instância singleton do serviço
export const productApiService = new ProductApiService();

// Export default para compatibilidade
export default productApiService;

