import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useApi } from '../../core/hooks/useApi';

// Interfaces
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_combo?: boolean;
  calories?: number;
  ingredients?: Ingredient[];
}

interface Ingredient {
  id: string;
  name: string;
  extra_price?: number;
}

interface Category {
  id: string;
  name: string;
}

interface ProductContextValue {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  getProductsByCategory: (categoryId: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { get } = useApi('http://localhost:8001/api/v1'); // URL base do backend de produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await get<Product[]>('/products');
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar produtos');
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await get<Category[]>('/categories');
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar categorias');
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  const getProductsByCategory = useCallback(async (categoryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await get<Product[]>(`/categories/${categoryId}/products`);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar produtos por categoria');
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchCategories();
        await fetchProducts();
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();
  }, []); // Executa apenas uma vez na montagem do componente

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isLoading,
        error,
        fetchProducts,
        fetchCategories,
        getProductsByCategory,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = (): ProductContextValue => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct deve ser usado dentro de um ProductProvider');
  }
  return context;
};