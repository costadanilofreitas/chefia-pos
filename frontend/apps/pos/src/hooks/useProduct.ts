import { useState, useCallback } from 'react';
import { productService } from '../services/ProductService';

export interface Product {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  is_combo?: boolean;
  combo_items?: any[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export const useProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carregar produtos reais do backend
      const backendProducts = await productService.getProducts();
      
      // Converter para formato esperado pelo frontend
      const convertedProducts: Product[] = backendProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category_id: p.category_id,
        is_combo: p.type === 'COMBO',
        combo_items: p.combo_items || []
      }));
      
      setProducts(convertedProducts);
      console.log('✅ Produtos carregados do backend:', convertedProducts.length);
      
    } catch (err: any) {
      console.error('❌ Erro ao carregar produtos:', err);
      setError(err.message);
      
      // Fallback para dados mock em caso de erro
      const fallbackProducts: Product[] = [
        { id: '1', name: 'Produto Mock 1', price: 10.0, category_id: 'cat-1' },
        { id: '2', name: 'Produto Mock 2', price: 20.0, category_id: 'cat-2' },
      ];
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carregar categorias reais do backend
      const backendCategories = await productService.getCategories();
      
      // Converter para formato esperado pelo frontend
      const convertedCategories: Category[] = backendCategories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description
      }));
      
      setCategories(convertedCategories);
      console.log('✅ Categorias carregadas do backend:', convertedCategories.length);
      
    } catch (err: any) {
      console.error('❌ Erro ao carregar categorias:', err);
      setError(err.message);
      
      // Fallback para dados mock em caso de erro
      const fallbackCategories: Category[] = [
        { id: 'cat-1', name: 'Lanches', description: 'Hambúrgueres e sanduíches' },
        { id: 'cat-2', name: 'Pizzas', description: 'Pizzas tradicionais e especiais' },
        { id: 'cat-3', name: 'Bebidas', description: 'Refrigerantes e sucos' },
      ];
      setCategories(fallbackCategories);
    } finally {
      setLoading(false);
    }
  }, []);

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

