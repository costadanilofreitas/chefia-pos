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
  color: string;
  icon?: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string; // kg, g, l, ml, unidade, etc.
  currentStock: number;
  minimumStock: number;
  cost: number; // custo por unidade
  supplier?: string;
  active: boolean;
  outOfStock: boolean;
  createdAt: string;
  updatedAt: string;
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
  items: ComboItem[];
  basePrice: number;
  price: number; // Adicionando propriedade price
  discount: number; // Adicionando propriedade discount
  discountPercentage: number;
  finalPrice: number;
  image?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductIngredient {
  ingredientId: string;
  quantity: number;
  required: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  cost: number;
  ingredients: ProductIngredient[];
  allergens: string[];
  preparationTime: number;
  calories?: number;
  image?: string;
  imageUrl?: string; // Adicionando propriedade imageUrl
  available: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Funções de conversão entre interfaces do backend e frontend
function convertBackendCategory(backendCategory: BackendCategory): Category {
  return {
    id: backendCategory.id,
    name: backendCategory.name,
    description: backendCategory.description,
    color: backendCategory.color || '#666666',
    icon: backendCategory.icon,
    active: backendCategory.is_active,
    sortOrder: backendCategory.sort_order,
    createdAt: backendCategory.created_at,
    updatedAt: backendCategory.updated_at
  };
}

function convertBackendIngredient(backendIngredient: BackendIngredient): Ingredient {
  return {
    id: backendIngredient.id,
    name: backendIngredient.name,
    description: backendIngredient.description,
    unit: backendIngredient.unit,
    currentStock: backendIngredient.current_stock,
    minimumStock: backendIngredient.minimum_stock,
    cost: backendIngredient.cost_per_unit,
    supplier: backendIngredient.supplier_name,
    active: !backendIngredient.is_out_of_stock,
    outOfStock: backendIngredient.is_out_of_stock,
    createdAt: backendIngredient.created_at,
    updatedAt: backendIngredient.updated_at
  };
}

function convertBackendProduct(backendProduct: BackendProduct): Product {
  return {
    id: backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description,
    categoryId: backendProduct.category_id,
    price: backendProduct.price,
    cost: backendProduct.price * 0.6, // Estimativa de custo (60% do preço)
    ingredients: backendProduct.ingredients?.map(ing => ({
      ingredientId: ing.id,
      quantity: (ing as any).quantity || 1,
      required: ing.is_required
    })) || [],
    allergens: [], // TODO: Implementar no backend
    preparationTime: 15, // TODO: Implementar no backend
    calories: undefined, // TODO: Implementar no backend
    image: backendProduct.image_url,
    imageUrl: backendProduct.image_url, // Adicionando imageUrl
    available: backendProduct.is_available,
    active: backendProduct.status === 'ACTIVE',
    createdAt: backendProduct.created_at,
    updatedAt: backendProduct.updated_at
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
    discountPercentage: 10, // TODO: Calcular desconto real
    finalPrice: backendProduct.price,
    image: backendProduct.image_url,
    active: backendProduct.status === 'ACTIVE',
    createdAt: backendProduct.created_at,
    updatedAt: backendProduct.updated_at
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
        active: true,
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Pizzas',
        description: 'Pizzas tradicionais e especiais',
        color: '#4ECDC4',
        icon: '🍕',
        active: true,
        sortOrder: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Bebidas',
        description: 'Refrigerantes, sucos e bebidas especiais',
        color: '#45B7D1',
        icon: '🥤',
        active: true,
        sortOrder: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Sobremesas',
        description: 'Doces e sobremesas da casa',
        color: '#F7DC6F',
        icon: '🍰',
        active: true,
        sortOrder: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        is_active: category.active
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
        is_active: category.active
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
        cost_per_unit: ingredient.cost,
        supplier: ingredient.supplier,
        is_active: ingredient.active
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
        cost_per_unit: ingredient.cost,
        supplier: ingredient.supplier,
        is_active: ingredient.active
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
        categoryId: product.category_id || '',
        price: product.price,
        cost: product.price * 0.6, // Estimativa
        ingredients: [],
        allergens: [],
        preparationTime: 15,
        image: product.image_url,
        imageUrl: product.image_url,
        available: product.status === 'ACTIVE',
        active: product.status === 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        category_id: product.categoryId,
        status: product.active ? 'ACTIVE' : 'INACTIVE',
        type: 'SIMPLE',
        is_featured: false,
        weight_based: false
      };
      
      const backendProduct = await productApiService.createProduct(productData);
      return {
        id: backendProduct.id,
        name: backendProduct.name,
        description: backendProduct.description || '',
        categoryId: backendProduct.category_id || '',
        price: backendProduct.price,
        cost: product.cost,
        ingredients: product.ingredients,
        allergens: product.allergens,
        preparationTime: product.preparationTime,
        image: backendProduct.images[0],
        imageUrl: backendProduct.images[0],
        available: backendProduct.status === 'ACTIVE',
        active: backendProduct.status === 'ACTIVE',
        createdAt: backendProduct.created_at,
        updatedAt: backendProduct.updated_at
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
        category_id: product.categoryId,
        status: product.active ? 'ACTIVE' : 'INACTIVE'
      };
      
      const backendProduct = await productApiService.updateProduct(id, productData);
      return {
        id: backendProduct.id,
        name: backendProduct.name,
        description: backendProduct.description || '',
        categoryId: backendProduct.category_id || '',
        price: backendProduct.price,
        cost: product.cost || backendProduct.price * 0.6,
        ingredients: product.ingredients || [],
        allergens: product.allergens || [],
        preparationTime: product.preparationTime || 15,
        image: backendProduct.images[0],
        imageUrl: backendProduct.images[0],
        available: backendProduct.status === 'ACTIVE',
        active: backendProduct.status === 'ACTIVE',
        createdAt: backendProduct.created_at,
        updatedAt: backendProduct.updated_at
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
      const backendCombos = await productApiService.getProducts({ type: 'COMBO' });
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
        category_id: 'cat-1', // TODO: Permitir seleção de categoria
        image_url: combo.image,
        is_available: combo.active,
        status: combo.active ? 'ACTIVE' : 'INACTIVE',
        type: 'COMBO',
        is_combo: true
      };

      const comboItems: BackendComboItem[] = combo.items.map(item => ({
        id: `combo-item-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        product_name: '', // Será preenchido pelo backend
        quantity: item.quantity,
        is_optional: item.optional,
        price_adjustment: item.additionalCost
      }));
      
      const backendCombo = await productApiService.createCombo(productData, comboItems);
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
        image_url: combo.image,
        is_available: combo.active,
        status: combo.active ? 'ACTIVE' : 'INACTIVE'
      };

      const comboItems: BackendComboItem[] | undefined = combo.items?.map(item => ({
        id: `combo-item-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        product_name: '',
        quantity: item.quantity,
        is_optional: item.optional,
        price_adjustment: item.additionalCost
      }));
      
      const backendCombo = await productApiService.updateCombo(id, productData, comboItems);
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
      return await productApiService.deleteProduct(id);
    } catch (error) {
      console.error('Erro ao excluir combo:', error);
      throw error;
    }
  }

  // Métodos auxiliares
  static async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      const backendProducts = await productApiService.getProducts({ 
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
      const backendProducts = await productApiService.getProducts({ 
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
      const backendProducts = await productApiService.getProducts({ type: 'SIMPLE' });
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
      const backendProducts = await productApiService.getProducts({ type: 'SIMPLE' });
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

