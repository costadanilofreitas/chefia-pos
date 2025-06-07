// src/services/ProductManagementService.ts
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
  available: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ProductManagementService {
  private static readonly STORAGE_KEYS = {
    CATEGORIES: 'pos_categories',
    INGREDIENTS: 'pos_ingredients',
    PRODUCTS: 'pos_products',
    COMBOS: 'pos_combos'
  };

  // Categorias
  static getCategories(): Category[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.CATEGORIES);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Dados padrão
    const defaultCategories: Category[] = [
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
    
    this.saveCategories(defaultCategories);
    return defaultCategories;
  }

  static saveCategories(categories: Category[]): void {
    localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  static addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const categories = this.getCategories();
    const newCategory: Category = {
      ...category,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    this.saveCategories(categories);
    return newCategory;
  }

  static updateCategory(id: string, updates: Partial<Category>): Category | null {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === id);
    
    if (index === -1) return null;
    
    categories[index] = {
      ...categories[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveCategories(categories);
    return categories[index];
  }

  // Ingredientes
  static getIngredients(): Ingredient[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.INGREDIENTS);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Dados padrão
    const defaultIngredients: Ingredient[] = [
      {
        id: '1',
        name: 'Carne Bovina 150g',
        description: 'Hambúrguer de carne bovina premium',
        unit: 'unidade',
        currentStock: 50,
        minimumStock: 10,
        cost: 8.50,
        supplier: 'Frigorífico Premium',
        active: true,
        outOfStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Pão Brioche',
        description: 'Pão brioche artesanal',
        unit: 'unidade',
        currentStock: 30,
        minimumStock: 5,
        cost: 2.50,
        supplier: 'Padaria Artesanal',
        active: true,
        outOfStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Queijo Cheddar',
        description: 'Fatia de queijo cheddar',
        unit: 'fatia',
        currentStock: 100,
        minimumStock: 20,
        cost: 1.20,
        supplier: 'Laticínios São Paulo',
        active: true,
        outOfStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Alface',
        description: 'Folhas de alface fresca',
        unit: 'folha',
        currentStock: 200,
        minimumStock: 50,
        cost: 0.30,
        supplier: 'Hortifruti Central',
        active: true,
        outOfStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '5',
        name: 'Tomate',
        description: 'Fatias de tomate fresco',
        unit: 'fatia',
        currentStock: 80,
        minimumStock: 20,
        cost: 0.50,
        supplier: 'Hortifruti Central',
        active: true,
        outOfStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '6',
        name: 'Molho Especial',
        description: 'Molho especial da casa',
        unit: 'ml',
        currentStock: 2000,
        minimumStock: 500,
        cost: 0.05,
        supplier: 'Produção Própria',
        active: true,
        outOfStock: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    this.saveIngredients(defaultIngredients);
    return defaultIngredients;
  }

  static saveIngredients(ingredients: Ingredient[]): void {
    localStorage.setItem(this.STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
  }

  static addIngredient(ingredient: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>): Ingredient {
    const ingredients = this.getIngredients();
    const newIngredient: Ingredient = {
      ...ingredient,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    ingredients.push(newIngredient);
    this.saveIngredients(ingredients);
    return newIngredient;
  }

  static updateIngredient(id: string, updates: Partial<Ingredient>): Ingredient | null {
    const ingredients = this.getIngredients();
    const index = ingredients.findIndex(i => i.id === id);
    
    if (index === -1) return null;
    
    ingredients[index] = {
      ...ingredients[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveIngredients(ingredients);
    
    // Se o ingrediente ficou em falta, desabilitar produtos que o usam
    if (updates.outOfStock === true) {
      this.disableProductsWithIngredient(id);
    } else if (updates.outOfStock === false) {
      this.enableProductsWithIngredient(id);
    }
    
    return ingredients[index];
  }

  // Produtos
  static getProducts(): Product[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.PRODUCTS);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Dados padrão
    const defaultProducts: Product[] = [
      {
        id: '1',
        name: 'Hambúrguer Clássico',
        description: 'Hambúrguer artesanal com carne bovina, alface, tomate e molho especial',
        categoryId: '1',
        price: 25.90,
        cost: 12.50,
        ingredients: [
          { ingredientId: '1', quantity: 1, required: true },
          { ingredientId: '2', quantity: 1, required: true },
          { ingredientId: '3', quantity: 1, required: false },
          { ingredientId: '4', quantity: 2, required: false },
          { ingredientId: '5', quantity: 2, required: false },
          { ingredientId: '6', quantity: 30, required: true }
        ],
        allergens: ['Glúten', 'Lactose'],
        preparationTime: 15,
        calories: 650,
        available: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Pizza Margherita',
        description: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
        categoryId: '2',
        price: 35.00,
        cost: 15.00,
        ingredients: [],
        allergens: ['Glúten', 'Lactose'],
        preparationTime: 20,
        calories: 850,
        available: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    this.saveProducts(defaultProducts);
    return defaultProducts;
  }

  static saveProducts(products: Product[]): void {
    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  static addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const products = this.getProducts();
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    this.saveProducts(products);
    return newProduct;
  }

  static updateProduct(id: string, updates: Partial<Product>): Product | null {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveProducts(products);
    return products[index];
  }

  // Combos
  static getCombos(): Combo[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.COMBOS);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Dados padrão
    const defaultCombos: Combo[] = [
      {
        id: '1',
        name: 'Combo Clássico',
        description: 'Hambúrguer Clássico + Batata Frita + Refrigerante',
        items: [
          { productId: '1', quantity: 1, optional: false, additionalCost: 0 },
          { productId: '3', quantity: 1, optional: false, additionalCost: 0 },
          { productId: '4', quantity: 1, optional: true, additionalCost: 2.00 }
        ],
        basePrice: 35.90,
        discountPercentage: 15,
        finalPrice: 30.52,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    this.saveCombos(defaultCombos);
    return defaultCombos;
  }

  static saveCombos(combos: Combo[]): void {
    localStorage.setItem(this.STORAGE_KEYS.COMBOS, JSON.stringify(combos));
  }

  // Funções auxiliares
  static disableProductsWithIngredient(ingredientId: string): void {
    const products = this.getProducts();
    const updatedProducts = products.map(product => {
      const hasIngredient = product.ingredients.some(ing => 
        ing.ingredientId === ingredientId && ing.required
      );
      
      if (hasIngredient) {
        return { ...product, available: false, updatedAt: new Date().toISOString() };
      }
      
      return product;
    });
    
    this.saveProducts(updatedProducts);
  }

  static enableProductsWithIngredient(ingredientId: string): void {
    const products = this.getProducts();
    const ingredients = this.getIngredients();
    
    const updatedProducts = products.map(product => {
      const hasIngredient = product.ingredients.some(ing => 
        ing.ingredientId === ingredientId && ing.required
      );
      
      if (hasIngredient) {
        // Verificar se todos os ingredientes obrigatórios estão disponíveis
        const allIngredientsAvailable = product.ingredients.every(ing => {
          if (!ing.required) return true;
          const ingredient = ingredients.find(i => i.id === ing.ingredientId);
          return ingredient && !ingredient.outOfStock;
        });
        
        if (allIngredientsAvailable) {
          return { ...product, available: true, updatedAt: new Date().toISOString() };
        }
      }
      
      return product;
    });
    
    this.saveProducts(updatedProducts);
  }

  static getProductsUsingIngredient(ingredientId: string): Product[] {
    const products = this.getProducts();
    return products.filter(product => 
      product.ingredients.some(ing => ing.ingredientId === ingredientId)
    );
  }

  static calculateProductCost(productId: string): number {
    const products = this.getProducts();
    const ingredients = this.getIngredients();
    const product = products.find(p => p.id === productId);
    
    if (!product) return 0;
    
    return product.ingredients.reduce((total, productIngredient) => {
      const ingredient = ingredients.find(i => i.id === productIngredient.ingredientId);
      if (!ingredient) return total;
      
      return total + (ingredient.cost * productIngredient.quantity);
    }, 0);
  }
}

