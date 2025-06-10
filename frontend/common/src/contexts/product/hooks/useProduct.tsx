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

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const api = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Product[]>('/products');
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar produtos');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Category[]>('/categories');
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar categorias');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const getProductsByCategory = useCallback(async (categoryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Product[]>(`/categories/${categoryId}/products`);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar produtos por categoria');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

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