import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/ProductService';
import { cacheService } from '../services/CacheService';

export interface Product {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  is_combo?: boolean;
  combo_items?: any[];
  type?: string;
  description?: string;
  image?: string;
  available?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export const useProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (useCache: boolean = true) => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar cache primeiro
      if (useCache) {
        const cachedProducts = cacheService.getProducts();
        if (cachedProducts) {
          console.log('🗄️ Products loaded from cache');
          setProducts(cachedProducts);
          setLoading(false);
          return;
        }
      }

      console.log('🌐 Loading products from backend...');
      // Carregar produtos reais do backend
      const backendProducts = await productService.getProducts();
      
      // Converter para formato esperado pelo frontend
      const convertedProducts = backendProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category_id: p.category_id,
        is_combo: (p as any).type === 'COMBO',
        combo_items: (p as any).combo_items || [],
        description: (p as any).description || '',
        image: (p as any).image || '',
        available: (p as any).available !== false
      }));
      
      setProducts(convertedProducts);
      
      // Salvar no cache
      cacheService.setProducts(convertedProducts);
      console.log(`✅ Products loaded: ${convertedProducts.length} items`);
      
    } catch (err: any) {
      console.error('❌ Error loading products:', err);
      setError(err.message);
      setProducts([]); // Sem fallback mock - mostrar erro real
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async (useCache: boolean = true) => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar cache primeiro
      if (useCache) {
        const cachedCategories = cacheService.getCategories();
        if (cachedCategories) {
          console.log('🗄️ Categories loaded from cache');
          setCategories(cachedCategories);
          setLoading(false);
          return;
        }
      }

      console.log('🌐 Loading categories from backend...');
      // Carregar categorias reais do backend
      const backendCategories = await productService.getCategories();
      
      // Converter para formato esperado pelo frontend
      const convertedCategories: Category[] = backendCategories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: getIconForCategory(c.name) // Função para mapear ícones
      }));
      
      setCategories(convertedCategories);
      
      // Salvar no cache
      cacheService.setCategories(convertedCategories);
      console.log(`✅ Categories loaded: ${convertedCategories.length} items`);
      
    } catch (err: any) {
      console.error('❌ Error loading categories:', err);
      setError(err.message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para mapear ícones baseado no nome da categoria
  const getIconForCategory = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    if (name.includes('burger') || name.includes('hambur')) return '🍔';
    if (name.includes('batata') || name.includes('fries')) return '🍟';
    if (name.includes('bebida') || name.includes('drink') || name.includes('refri')) return '🥤';
    if (name.includes('pizza')) return '🍕';
    if (name.includes('sobremesa') || name.includes('doce')) return '🍰';
    if (name.includes('salada') || name.includes('verde')) return '🥗';
    if (name.includes('lanche') || name.includes('snack')) return '🥪';
    if (name.includes('café') || name.includes('coffee')) return '☕';
    return '🍽️'; // Ícone padrão
  };

  const getProductsByCategory = useCallback(async (categoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Filtrar produtos por categoria
      const filteredProducts = products.filter(p => p.category_id === categoryId);
      return filteredProducts;
    } catch (err: any) {
      console.error('❌ Erro ao buscar produtos por categoria:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [products]);

  const getProductById = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);
    try {
      const product = products.find(p => p.id === productId);
      return product;
    } catch (err: any) {
      console.error('❌ Erro ao buscar produto:', err);
      setError(err.message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [products]);

  const searchProducts = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      return filteredProducts;
    } catch (err: any) {
      console.error('❌ Erro ao pesquisar produtos:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [products]);

  // Carregar dados automaticamente quando o hook é inicializado
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  return {
    products,
    categories,
    loading,
    error,
    loadProducts,
    loadCategories,
    getProductsByCategory,
    getProductById,
    searchProducts
  };
};

