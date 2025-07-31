// src/services/ProductService.ts
import { ApiInterceptor } from './ApiInterceptor';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status: 'active' | 'inactive';
  type: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  combo_items?: ComboItem[];
  images?: ProductImage[];
  created_at?: string;
  updated_at?: string;
}

export interface ComboItem {
  product_id: string;
  quantity: number;
  price_override?: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  status?: 'active' | 'inactive';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  combo_items?: ComboItem[];
}

export interface ProductUpdate extends Partial<ProductCreate> {
  id: string;
}

class ProductService {
  private static instance: ProductService;
  private apiInterceptor: ApiInterceptor;
  private baseUrl = 'http://localhost:8001/api/v1';

  private constructor() {
    this.apiInterceptor = ApiInterceptor.getInstance();
  }

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Buscar todos os produtos
   */
  public async getProducts(): Promise<Product[]> {
    try {
      console.log('🔍 Buscando produtos do backend...');
      
      const response = await this.apiInterceptor.get(`${this.baseUrl}/products`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar produtos: ${response.status}`);
      }

      const products = await response.json();
      console.log('✅ Produtos encontrados:', products.length);
      
      return products;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      throw error;
    }
  }

  /**
   * Buscar produto por ID
   */
  public async getProduct(id: string): Promise<Product> {
    try {
      console.log(`🔍 Buscando produto ${id}...`);
      
      const response = await this.apiInterceptor.get(`${this.baseUrl}/products/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar produto: ${response.status}`);
      }

      const product = await response.json();
      console.log('✅ Produto encontrado:', product.name);
      
      return product;
    } catch (error) {
      console.error(`❌ Erro ao buscar produto ${id}:`, error);
      throw error;
    }
  }

  /**
   * Criar novo produto
   */
  public async createProduct(productData: ProductCreate): Promise<Product> {
    try {
      console.log('➕ Criando produto:', productData.name);
      
      const response = await this.apiInterceptor.post(`${this.baseUrl}/products`, productData);
      
      if (!response.ok) {
        throw new Error(`Erro ao criar produto: ${response.status}`);
      }

      const product = await response.json();
      console.log('✅ Produto criado:', product.name);
      
      return product;
    } catch (error) {
      console.error('❌ Erro ao criar produto:', error);
      throw error;
    }
  }

  /**
   * Atualizar produto
   */
  public async updateProduct(id: string, productData: Partial<ProductCreate>): Promise<Product> {
    try {
      console.log(`📝 Atualizando produto ${id}...`);
      
      const response = await this.apiInterceptor.put(`${this.baseUrl}/products/${id}`, productData);
      
      if (!response.ok) {
        throw new Error(`Erro ao atualizar produto: ${response.status}`);
      }

      const product = await response.json();
      console.log('✅ Produto atualizado:', product.name);
      
      return product;
    } catch (error) {
      console.error(`❌ Erro ao atualizar produto ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deletar produto
   */
  public async deleteProduct(id: string): Promise<void> {
    try {
      console.log(`🗑️ Deletando produto ${id}...`);
      
      const response = await this.apiInterceptor.delete(`${this.baseUrl}/products/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao deletar produto: ${response.status}`);
      }

      console.log('✅ Produto deletado com sucesso');
    } catch (error) {
      console.error(`❌ Erro ao deletar produto ${id}:`, error);
      throw error;
    }
  }

  /**
   * Buscar todas as categorias
   */
  public async getCategories(): Promise<Category[]> {
    try {
      console.log('🔍 Buscando categorias do backend...');
      
      const response = await this.apiInterceptor.get(`${this.baseUrl}/categories`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar categorias: ${response.status}`);
      }

      const categories = await response.json();
      console.log('✅ Categorias encontradas:', categories.length);
      
      return categories;
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      throw error;
    }
  }

  /**
   * Buscar produtos por categoria
   */
  public async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      console.log(`🔍 Buscando produtos da categoria ${categoryId}...`);
      
      const response = await this.apiInterceptor.get(`${this.baseUrl}/products?category_id=${categoryId}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar produtos da categoria: ${response.status}`);
      }

      const products = await response.json();
      console.log('✅ Produtos da categoria encontrados:', products.length);
      
      return products;
    } catch (error) {
      console.error(`❌ Erro ao buscar produtos da categoria ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Buscar produtos ativos
   */
  public async getActiveProducts(): Promise<Product[]> {
    try {
      console.log('🔍 Buscando produtos ativos...');
      
      const response = await this.apiInterceptor.get(`${this.baseUrl}/products?status=active`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar produtos ativos: ${response.status}`);
      }

      const products = await response.json();
      console.log('✅ Produtos ativos encontrados:', products.length);
      
      return products;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos ativos:', error);
      throw error;
    }
  }
}

// Exportar instância singleton
export const productService = ProductService.getInstance();
export default ProductService;

