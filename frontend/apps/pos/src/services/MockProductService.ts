// Mock Backend Service para Produtos
// Simula as APIs do microserviço de produtos do backend

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  category_name?: string;
  image_url?: string;
  is_available: boolean;
  stock_quantity: number;
  is_combo: boolean;
  combo_items?: ComboItem[];
  ingredients?: Ingredient[];
  created_at: string;
  updated_at: string;
  status: 'ACTIVE' | 'INACTIVE';
  type: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured: boolean;
  sku?: string;
  barcode?: string;
  weight_based: boolean;
  has_ingredients: boolean;
}

export interface ProductCreate {
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_available?: boolean;
  stock_quantity?: number;
  is_combo?: boolean;
  combo_items?: ComboItem[];
  ingredients?: Ingredient[];
  status?: 'ACTIVE' | 'INACTIVE';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured?: boolean;
  sku?: string;
  barcode?: string;
  weight_based?: boolean;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  category_id?: string;
  image_url?: string;
  is_available?: boolean;
  stock_quantity?: number;
  is_combo?: boolean;
  combo_items?: ComboItem[];
  ingredients?: Ingredient[];
  status?: 'ACTIVE' | 'INACTIVE';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured?: boolean;
  sku?: string;
  barcode?: string;
  weight_based?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface ComboItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  is_optional: boolean;
  price_adjustment: number;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  cost_per_unit: number;
  current_stock: number;
  minimum_stock: number;
  supplier_id?: string;
  supplier_name?: string;
  is_out_of_stock: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface IngredientCreate {
  name: string;
  description?: string;
  unit: string;
  cost_per_unit: number;
  current_stock: number;
  minimum_stock: number;
  supplier_id?: string;
  is_required?: boolean;
}

export interface IngredientUpdate {
  name?: string;
  description?: string;
  unit?: string;
  cost_per_unit?: number;
  current_stock?: number;
  minimum_stock?: number;
  supplier_id?: string;
  is_out_of_stock?: boolean;
  is_required?: boolean;
}

export interface ProductFilters {
  category_id?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  type?: 'SIMPLE' | 'COMBO' | 'COMPOSITE';
  is_featured?: boolean;
  search?: string;
  has_ingredients?: boolean;
  weight_based?: boolean;
  limit?: number;
  offset?: number;
}

class MockProductService {
  private products: Product[] = [];
  private categories: ProductCategory[] = [];
  private ingredients: Ingredient[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Categorias mock
    this.categories = [
      {
        id: 'cat-1',
        name: 'Hambúrgueres',
        description: 'Deliciosos hambúrgueres artesanais',
        color: '#FF6B35',
        icon: '🍔',
        is_active: true,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'cat-2',
        name: 'Bebidas',
        description: 'Bebidas refrescantes',
        color: '#4ECDC4',
        icon: '🥤',
        is_active: true,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'cat-3',
        name: 'Sobremesas',
        description: 'Doces irresistíveis',
        color: '#FFE66D',
        icon: '🍰',
        is_active: true,
        sort_order: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'cat-4',
        name: 'Acompanhamentos',
        description: 'Acompanhamentos deliciosos',
        color: '#A8E6CF',
        icon: '🍟',
        is_active: true,
        sort_order: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Ingredientes mock
    this.ingredients = [
      {
        id: 'ing-1',
        name: 'Carne Bovina',
        description: 'Carne bovina premium 150g',
        unit: 'kg',
        cost_per_unit: 25.00,
        current_stock: 50,
        minimum_stock: 10,
        supplier_name: 'Frigorífico Premium',
        is_out_of_stock: false,
        is_required: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'ing-2',
        name: 'Queijo Cheddar',
        description: 'Queijo cheddar cremoso',
        unit: 'kg',
        cost_per_unit: 18.00,
        current_stock: 20,
        minimum_stock: 5,
        supplier_name: 'Laticínios Bom Gosto',
        is_out_of_stock: false,
        is_required: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'ing-3',
        name: 'Alface',
        description: 'Alface americana fresca',
        unit: 'unidade',
        cost_per_unit: 2.50,
        current_stock: 0,
        minimum_stock: 10,
        supplier_name: 'Hortifruti Verde',
        is_out_of_stock: true,
        is_required: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Produtos mock
    this.products = [
      {
        id: 'prod-1',
        name: 'Big Burger Classic',
        description: 'Hambúrguer artesanal com carne bovina, queijo, alface, tomate e molho especial',
        price: 24.90,
        category_id: 'cat-1',
        category_name: 'Hambúrgueres',
        image_url: '/images/big-burger-classic.jpg',
        is_available: true,
        stock_quantity: 100,
        is_combo: false,
        ingredients: [
          { ...this.ingredients[0], quantity: 1, is_required: true },
          { ...this.ingredients[1], quantity: 1, is_required: false },
          { ...this.ingredients[2], quantity: 2, is_required: false }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'ACTIVE',
        type: 'SIMPLE',
        is_featured: true,
        sku: 'BB001',
        barcode: '7891234567890',
        weight_based: false,
        has_ingredients: true
      },
      {
        id: 'prod-2',
        name: 'Coca-Cola 350ml',
        description: 'Refrigerante Coca-Cola gelado',
        price: 5.50,
        category_id: 'cat-2',
        category_name: 'Bebidas',
        image_url: '/images/coca-cola.jpg',
        is_available: true,
        stock_quantity: 200,
        is_combo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'ACTIVE',
        type: 'SIMPLE',
        is_featured: false,
        sku: 'CC001',
        barcode: '7891234567891',
        weight_based: false,
        has_ingredients: false
      },
      {
        id: 'prod-3',
        name: 'Combo Big Burger',
        description: 'Big Burger Classic + Batata Frita + Refrigerante',
        price: 32.90,
        category_id: 'cat-1',
        category_name: 'Hambúrgueres',
        image_url: '/images/combo-big-burger.jpg',
        is_available: true,
        stock_quantity: 50,
        is_combo: true,
        combo_items: [
          {
            id: 'combo-1-1',
            product_id: 'prod-1',
            product_name: 'Big Burger Classic',
            quantity: 1,
            is_optional: false,
            price_adjustment: 0
          },
          {
            id: 'combo-1-2',
            product_id: 'prod-4',
            product_name: 'Batata Frita Média',
            quantity: 1,
            is_optional: false,
            price_adjustment: 0
          },
          {
            id: 'combo-1-3',
            product_id: 'prod-2',
            product_name: 'Coca-Cola 350ml',
            quantity: 1,
            is_optional: true,
            price_adjustment: 0
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'ACTIVE',
        type: 'COMBO',
        is_featured: true,
        sku: 'CB001',
        weight_based: false,
        has_ingredients: false
      },
      {
        id: 'prod-4',
        name: 'Batata Frita Média',
        description: 'Batatas fritas crocantes temperadas',
        price: 8.90,
        category_id: 'cat-4',
        category_name: 'Acompanhamentos',
        image_url: '/images/batata-frita.jpg',
        is_available: false, // Indisponível por falta de ingrediente
        stock_quantity: 30,
        is_combo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'ACTIVE',
        type: 'SIMPLE',
        is_featured: false,
        sku: 'BF001',
        weight_based: false,
        has_ingredients: true
      }
    ];
  }

  // Simular delay de rede
  private async delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // PRODUTOS
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    await this.delay();
    
    let filtered = [...this.products];

    if (filters.category_id) {
      filtered = filtered.filter(p => p.category_id === filters.category_id);
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (filters.is_featured !== undefined) {
      filtered = filtered.filter(p => p.is_featured === filters.is_featured);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.barcode?.includes(search)
      );
    }

    if (filters.has_ingredients !== undefined) {
      filtered = filtered.filter(p => p.has_ingredients === filters.has_ingredients);
    }

    if (filters.weight_based !== undefined) {
      filtered = filtered.filter(p => p.weight_based === filters.weight_based);
    }

    // Paginação
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    
    return filtered.slice(offset, offset + limit);
  }

  async getProduct(id: string): Promise<Product | null> {
    await this.delay();
    return this.products.find(p => p.id === id) || null;
  }

  async createProduct(productData: ProductCreate): Promise<Product> {
    await this.delay();
    
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      ...productData,
      is_available: productData.is_available ?? true,
      stock_quantity: productData.stock_quantity ?? 0,
      is_combo: productData.is_combo ?? false,
      status: productData.status ?? 'ACTIVE',
      type: productData.type ?? 'SIMPLE',
      is_featured: productData.is_featured ?? false,
      weight_based: productData.weight_based ?? false,
      has_ingredients: (productData.ingredients?.length || 0) > 0,
      category_name: this.categories.find(c => c.id === productData.category_id)?.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, productData: ProductUpdate): Promise<Product | null> {
    await this.delay();
    
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updatedProduct = {
      ...this.products[index],
      ...productData,
      updated_at: new Date().toISOString()
    };

    if (productData.category_id) {
      updatedProduct.category_name = this.categories.find(c => c.id === productData.category_id)?.name;
    }

    if (productData.ingredients) {
      updatedProduct.has_ingredients = productData.ingredients.length > 0;
    }

    this.products[index] = updatedProduct;
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.delay();
    
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;

    // Soft delete - marca como inativo
    this.products[index] = {
      ...this.products[index],
      status: 'INACTIVE',
      is_available: false,
      updated_at: new Date().toISOString()
    };

    return true;
  }

  // CATEGORIAS
  async getCategories(): Promise<ProductCategory[]> {
    await this.delay();
    return [...this.categories].sort((a, b) => a.sort_order - b.sort_order);
  }

  async getCategory(id: string): Promise<ProductCategory | null> {
    await this.delay();
    return this.categories.find(c => c.id === id) || null;
  }

  async createCategory(categoryData: CategoryCreate): Promise<ProductCategory> {
    await this.delay();
    
    const newCategory: ProductCategory = {
      id: `cat-${Date.now()}`,
      ...categoryData,
      is_active: categoryData.is_active ?? true,
      sort_order: categoryData.sort_order ?? this.categories.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.categories.push(newCategory);
    return newCategory;
  }

  async updateCategory(id: string, categoryData: CategoryUpdate): Promise<ProductCategory | null> {
    await this.delay();
    
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) return null;

    this.categories[index] = {
      ...this.categories[index],
      ...categoryData,
      updated_at: new Date().toISOString()
    };

    return this.categories[index];
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.delay();
    
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) return false;

    // Soft delete
    this.categories[index] = {
      ...this.categories[index],
      is_active: false,
      updated_at: new Date().toISOString()
    };

    return true;
  }

  // INGREDIENTES
  async getIngredients(): Promise<Ingredient[]> {
    await this.delay();
    return [...this.ingredients];
  }

  async getIngredient(id: string): Promise<Ingredient | null> {
    await this.delay();
    return this.ingredients.find(i => i.id === id) || null;
  }

  async createIngredient(ingredientData: IngredientCreate): Promise<Ingredient> {
    await this.delay();
    
    const newIngredient: Ingredient = {
      id: `ing-${Date.now()}`,
      ...ingredientData,
      is_required: ingredientData.is_required ?? false,
      is_out_of_stock: ingredientData.current_stock <= 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.ingredients.push(newIngredient);
    return newIngredient;
  }

  async updateIngredient(id: string, ingredientData: IngredientUpdate): Promise<Ingredient | null> {
    await this.delay();
    
    const index = this.ingredients.findIndex(i => i.id === id);
    if (index === -1) return null;

    const updatedIngredient = {
      ...this.ingredients[index],
      ...ingredientData,
      updated_at: new Date().toISOString()
    };

    // Atualizar status de estoque se necessário
    if (ingredientData.current_stock !== undefined) {
      updatedIngredient.is_out_of_stock = updatedIngredient.current_stock <= 0;
    }

    this.ingredients[index] = updatedIngredient;

    // Atualizar disponibilidade de produtos que usam este ingrediente
    this.updateProductAvailabilityByIngredient(id, !updatedIngredient.is_out_of_stock);

    return updatedIngredient;
  }

  async deleteIngredient(id: string): Promise<boolean> {
    await this.delay();
    
    const index = this.ingredients.findIndex(i => i.id === id);
    if (index === -1) return false;

    this.ingredients.splice(index, 1);
    return true;
  }

  // Método auxiliar para atualizar disponibilidade de produtos baseado em ingredientes
  private updateProductAvailabilityByIngredient(ingredientId: string, isAvailable: boolean) {
    this.products.forEach(product => {
      if (product.ingredients) {
        const hasIngredient = product.ingredients.some(ing => 
          ing.id === ingredientId && ing.is_required
        );
        
        if (hasIngredient) {
          product.is_available = isAvailable;
          product.updated_at = new Date().toISOString();
        }
      }
    });
  }

  // COMBOS
  async createCombo(productData: ProductCreate, comboItems: ComboItem[]): Promise<Product> {
    await this.delay();
    
    const comboProduct = await this.createProduct({
      ...productData,
      is_combo: true,
      type: 'COMBO'
    });

    comboProduct.combo_items = comboItems;
    return comboProduct;
  }

  async updateCombo(id: string, productData?: ProductUpdate, comboItems?: ComboItem[]): Promise<Product | null> {
    await this.delay();
    
    const updateData: ProductUpdate = {
      ...productData,
      is_combo: true,
      type: 'COMBO'
    };

    if (comboItems) {
      updateData.combo_items = comboItems;
    }

    return this.updateProduct(id, updateData);
  }
}

// Singleton instance
export const mockProductService = new MockProductService();

