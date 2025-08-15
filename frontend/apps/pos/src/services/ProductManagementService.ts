// src/services/ProductManagementService.ts
import { 
  productApiService, 
  Product as BackendProduct, 
  ProductCategory as BackendCategory,
  Ingredient as BackendIngredient,
  ProductCreate,
  ProductUpdate,
  CategoryCreate,
  CategoryUpdate,
  IngredientCreate,
  IngredientUpdate,
  ProductFilters
} from './ProductApiService';

// Interfaces adaptadas para compatibilidade com o frontend existente
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_per_unit: number;
  supplier?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComboItem {
  productId: string;
  quantity: number;
  optional: boolean;
  additionalCost: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  category_id?: string;
  items: ComboItem[];
  basePrice: number;
  price: number;
  discount: number;
  discountPercentage: number;
  finalPrice: number;
  image_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  ingredient_id: string;
  quantity: number;
  is_required: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  price: number;
  cost: number;
  ingredients: ProductIngredient[];
  allergens: string[];
  preparation_time: number;
  calories?: number;
  image_url?: string;
  is_available: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

// Funções de conversão entre interfaces do backend e frontend
function convertBackendCategory(backendCategory: BackendCategory): Category {
  return {
    id: backendCategory.id,
    name: backendCategory.name,
    description: backendCategory.description,
    color: backendCategory.color || '#666666',
    icon: backendCategory.icon,
    is_active: backendCategory.is_active,
    created_at: backendCategory.created_at,
    updated_at: backendCategory.updated_at
  };
}

function convertBackendIngredient(backendIngredient: BackendIngredient): Ingredient {
  return {
    id: backendIngredient.id,
    name: backendIngredient.name,
    description: backendIngredient.description,
    unit: backendIngredient.unit,
    current_stock: backendIngredient.current_stock,
    minimum_stock: backendIngredient.minimum_stock,
    cost_per_unit: backendIngredient.cost_per_unit,
    supplier: backendIngredient.supplier,
    is_active: backendIngredient.is_active,
    created_at: backendIngredient.created_at,
    updated_at: backendIngredient.updated_at
  };
}

function convertBackendProduct(backendProduct: BackendProduct): Product {
  return {
    id: backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description,
    category_id: backendProduct.category_id,
    price: backendProduct.price,
    cost: backendProduct.price * 0.6, // Estimativa de custo (60% do preço)
    ingredients: backendProduct.ingredients?.map(ing => ({
      ingredient_id: ing.id,
      quantity: (ing as any).quantity || 1,
      is_required: ing.is_required
    })) || [],
    allergens: [], // Campo não implementado no backend ainda
    preparation_time: 15, // Campo não implementado no backend ainda
    calories: undefined, // Campo não implementado no backend ainda
    image_url: backendProduct.image_url,
    is_available: backendProduct.is_available,
    status: backendProduct.status,
    created_at: backendProduct.created_at,
    updated_at: backendProduct.updated_at
  };
}

function convertBackendCombo(backendProduct: BackendProduct): Combo {
  const basePrice = backendProduct.combo_items?.reduce((sum, item) => sum + item.price_adjustment, 0) || 0;
  const discount = basePrice * 0.1; // 10% de desconto
  return {
    id: backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description,
    items: backendProduct.combo_items?.map(item => ({
      productId: item.product_id,
      quantity: item.quantity,
      optional: item.is_optional,
      additionalCost: item.price_adjustment
    })) || [],
    basePrice: basePrice,
    price: backendProduct.price, // Adicionando propriedade price
    discount: discount, // Adicionando propriedade discount
    discountPercentage: discount > 0 ? Math.round((discount / basePrice) * 100) : 0, // Calcular desconto real
    finalPrice: backendProduct.price,
    image_url: backendProduct.image_url,
    status: backendProduct.status,
    created_at: backendProduct.created_at,
    updated_at: backendProduct.updated_at
  };
}

export class ProductManagementService {
  private static readonly STORAGE_KEYS = {
    CATEGORIES: 'pos_categories',
    INGREDIENTS: 'pos_ingredients',
    PRODUCTS: 'pos_products',
    COMBOS: 'pos_combos'
  };

  // Categorias
  static async getCategories(): Promise<Category[]> {
    try {
      const backendCategories = await productApiService.getActiveCategories();
      return backendCategories.map(convertBackendCategory);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return this.getFallbackCategories();
    }
  }

  private static getFallbackCategories(): Category[] {
    return [
      {
        id: '1',
        name: 'Hambúrgueres',
        description: 'Hambúrgueres artesanais e tradicionais',
        color: '#FF6B35',
        icon: '🍔',
        is_active: true,
        // sortOrder: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Pizzas',
        description: 'Pizzas tradicionais e especiais',
        color: '#4ECDC4',
        icon: '🍕',
        is_active: true,
        // sortOrder: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Bebidas',
        description: 'Refrigerantes, sucos e bebidas especiais',
        color: '#45B7D1',
        icon: '🥤',
        is_active: true,
        // sortOrder: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Sobremesas',
        description: 'Doces e sobremesas da casa',
        color: '#F7DC6F',
        icon: '🍰',
        is_active: true,
        // sortOrder: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  static async saveCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    try {
      const categoryData: CategoryCreate = {
        name: category.name!,
        description: category.description,
        color: category.color,
        icon: category.icon,
        is_active: category.is_active
      };
      
      const backendCategory = await productApiService.createCategory(categoryData);
      return convertBackendCategory(backendCategory);    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      throw error;
    }
  }

  static async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    try {
      const categoryData: CategoryUpdate = {
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        is_active: category.is_active
      };
      
      const backendCategory = await productApiService.updateCategory(id, categoryData);
      return convertBackendCategory(backendCategory);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }
  }

  static async deleteCategory(id: string): Promise<boolean> {
    try {
      const result = await productApiService.deleteCategory(id);
      return result.success;
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      throw error;
    }
  }

  // Ingredientes
  static async getIngredients(): Promise<Ingredient[]> {
    try {
      const backendIngredients = await productApiService.getActiveIngredients();
      return backendIngredients.map(convertBackendIngredient);
    } catch (error) {
      console.error('Erro ao buscar ingredientes:', error);
      return [];
    }
  }

  static async saveIngredient(ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ingredient> {
    try {
      const ingredientData: IngredientCreate = {
        name: ingredient.name,
        description: ingredient.description,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit,
        supplier: ingredient.supplier,
        is_active: ingredient.is_active
      };
      
      const backendIngredient = await productApiService.createIngredient(ingredientData);
      return convertBackendIngredient(backendIngredient);
    } catch (error) {
      console.error('Erro ao salvar ingrediente:', error);
      throw error;
    }
  }

  static async updateIngredient(id: string, ingredient: Partial<Ingredient>): Promise<Ingredient> {
    try {
      const ingredientData: IngredientUpdate = {
        name: ingredient.name,
        description: ingredient.description,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit,
        supplier: ingredient.supplier,
        is_active: ingredient.is_active
      };
      
      const backendIngredient = await productApiService.updateIngredient(id, ingredientData);
      return convertBackendIngredient(backendIngredient);
    } catch (error) {
      console.error('Erro ao atualizar ingrediente:', error);
      throw error;
    }
  }

  static async deleteIngredient(id: string): Promise<boolean> {
    try {
      const result = await productApiService.deleteIngredient(id);
      return result.success;
    } catch (error) {
      console.error('Erro ao excluir ingrediente:', error);
      throw error;
    }
  }

  // Produtos
  static async getProducts(): Promise<Product[]> {
    try {
      const backendProducts = await productApiService.getActiveProducts();
      return backendProducts.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        price: product.price,
        cost: product.price * 0.6, // Estimativa
        ingredients: [],
        allergens: [],
        preparation_time: 15,
        image_url: product.image_url,
        is_available: product.status === 'ACTIVE',
        status: product.status || 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  static async saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const productData: ProductCreate = {
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        status: product.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        type: 'SIMPLE',
        is_featured: false,
        weight_based: false
      };
      
      const backendProduct = await productApiService.createProduct(productData);
      return {
        id: backendProduct.id,
        name: backendProduct.name,
        description: backendProduct.description || '',
        category_id: backendProduct.category_id || '',
        price: backendProduct.price,
        cost: product.cost,
        ingredients: product.ingredients,
        allergens: product.allergens,
        preparation_time: product.preparation_time,
        image_url: backendProduct.images[0],
        is_available: backendProduct.status === 'ACTIVE',
        status: backendProduct.status,
        created_at: backendProduct.created_at,
        updated_at: backendProduct.updated_at
      };
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      throw error;
    }
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    try {
      const productData: ProductUpdate = {
        name: product.name,
        description: product.description,
        price: product.price,
        category_id: product.category_id,
        status: product.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
      };
      
      const backendProduct = await productApiService.updateProduct(id, productData);
      return {
        id: backendProduct.id,
        name: backendProduct.name,
        description: backendProduct.description || '',
        category_id: backendProduct.category_id || '',
        price: backendProduct.price,
        cost: product.cost || backendProduct.price * 0.6,
        ingredients: product.ingredients || [],
        allergens: product.allergens || [],
        preparation_time: product.preparation_time || 15,
        image_url: backendProduct.images[0],
        is_available: backendProduct.status === 'ACTIVE',
        status: backendProduct.status,
        created_at: backendProduct.created_at,
        updated_at: backendProduct.updated_at
      };
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  static async deleteProduct(id: string): Promise<boolean> {
    try {
      const result = await productApiService.deleteProduct(id);
      return result.success;
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      throw error;
    }
  }

  // Combos
  static async getCombos(): Promise<Combo[]> {
    try {
      const backendCombos = await productApiService.listProducts({ type: 'COMBO' });
      return backendCombos.map(convertBackendCombo);
    } catch (error) {
      console.error('Erro ao buscar combos:', error);
      return [];
    }
  }

  static async saveCombo(combo: Omit<Combo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Combo> {
    try {
      const productData: ProductCreate = {
        name: combo.name,
        description: combo.description,
        price: combo.finalPrice,
        category_id: combo.category_id || 'default-category', // Usar categoria do combo ou padrão
        image_url: combo.image_url,
        is_available: combo.status === 'ACTIVE',
        status: combo.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        type: 'COMBO'
      };

      const comboItems: any[] = combo.items.map(item => ({
        id: `combo-item-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        product_name: '', // Será preenchido pelo backend
        quantity: item.quantity,
        is_optional: item.optional,
        price_adjustment: item.additionalCost
      }));
      
      const backendCombo = await productApiService.createProduct(productData);
      return convertBackendCombo(backendCombo);
    } catch (error) {
      console.error('Erro ao salvar combo:', error);
      throw error;
    }
  }

  static async updateCombo(id: string, combo: Partial<Combo>): Promise<Combo> {
    try {
      const productData: ProductUpdate = {
        name: combo.name,
        description: combo.description,
        price: combo.finalPrice,
        image_url: combo.image_url,
        is_available: combo.status === 'ACTIVE',
        status: combo.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
      };

      const comboItems: any[] | undefined = combo.items?.map(item => ({
        id: `combo-item-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        product_name: '',
        quantity: item.quantity,
        is_optional: item.optional,
        price_adjustment: item.additionalCost
      }));
      
      const backendCombo = await productApiService.updateProduct(id, productData);
      if (!backendCombo) {
        throw new Error('Combo não encontrado');
      }
      return convertBackendCombo(backendCombo);
    } catch (error) {
      console.error('Erro ao atualizar combo:', error);
      throw error;
    }
  }

  static async deleteCombo(id: string): Promise<boolean> {
    try {
      const result = await productApiService.deleteProduct(id);
      return result.success;
    } catch (error) {
      console.error('Erro ao excluir combo:', error);
      throw error;
    }
  }

  // Métodos auxiliares
  static async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      const backendProducts = await productApiService.listProducts({ 
        category_id: categoryId,
        type: 'SIMPLE'
      });
      return backendProducts.map(convertBackendProduct);
    } catch (error) {
      console.error('Erro ao buscar produtos por categoria:', error);
      return [];
    }
  }

  static async searchProducts(query: string): Promise<Product[]> {
    try {
      const backendProducts = await productApiService.listProducts({ 
        search: query,
        type: 'SIMPLE'
      });
      return backendProducts.map(convertBackendProduct);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  }

  static async getAvailableProducts(): Promise<Product[]> {
    try {
      const backendProducts = await productApiService.listProducts({ type: 'SIMPLE' });
      return backendProducts
        .filter(p => p.is_available && p.status === 'ACTIVE')
        .map(convertBackendProduct);
    } catch (error) {
      console.error('Erro ao buscar produtos disponíveis:', error);
      return [];
    }
  }

  static async getUnavailableProducts(): Promise<Product[]> {
    try {
      const backendProducts = await productApiService.listProducts({ type: 'SIMPLE' });
      return backendProducts
        .filter(p => !p.is_available || p.status === 'INACTIVE')
        .map(convertBackendProduct);
    } catch (error) {
      console.error('Erro ao buscar produtos indisponíveis:', error);
      return [];
    }
  }

  static async toggleProductAvailability(id: string): Promise<Product> {
    try {
      const product = await productApiService.getProduct(id);
      if (!product) {
        throw new Error('Produto não encontrado');
      }

      const updatedProduct = await productApiService.updateProduct(id, {
        is_available: !product.is_available
      });

      if (!updatedProduct) {
        throw new Error('Erro ao atualizar produto');
      }

      return convertBackendProduct(updatedProduct);
    } catch (error) {
      console.error('Erro ao alterar disponibilidade do produto:', error);
      throw error;
    }
  }
}

