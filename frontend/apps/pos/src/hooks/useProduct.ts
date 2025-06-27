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
      // Por enquanto, usar dados mock até implementar endpoints de produtos
      const mockProducts: Product[] = [
        { id: '1', name: 'Hambúrguer Clássico', price: 15.90, category_id: 'cat-1' },
        { id: '2', name: 'Pizza Margherita', price: 32.50, category_id: 'cat-2' },
        { id: '3', name: 'Refrigerante Cola', price: 5.50, category_id: 'cat-3' },
        { id: '4', name: 'Batata Frita', price: 8.90, category_id: 'cat-1' },
      ];
      
      setProducts(mockProducts);
      
      // Testar conectividade com backend
      await productService.healthCheck();
      console.log('✅ Products service conectado');
      
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
      const mockCategories: Category[] = [
        { id: 'cat-1', name: 'Lanches', description: 'Hambúrgueres e sanduíches' },
        { id: 'cat-2', name: 'Pizzas', description: 'Pizzas tradicionais e especiais' },
        { id: 'cat-3', name: 'Bebidas', description: 'Refrigerantes e sucos' },
      ];
      
      setCategories(mockCategories);
      
    } catch (err: any) {
      console.error('❌ Erro ao carregar categorias:', err);
      setError(err.message);
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

