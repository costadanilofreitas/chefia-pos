import { useState, useEffect, useCallback, useMemo } from 'react';
import { productService, Product, Category, ProductSearchParams } from '../services/productService';
import { offlineStorage } from '../services/offlineStorage';
import { errorHandler } from '../services/errorHandler';

interface UseProductsState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  selectedCategory: string | null;
  searchTerm: string;
}

interface UseProductsReturn extends UseProductsState {
  // Actions
  loadProducts: (params?: ProductSearchParams) => Promise<void>;
  loadCategories: () => Promise<void>;
  selectCategory: (categoryId: string | null) => void;
  searchProducts: (term: string) => Promise<void>;
  clearSearch: () => void;
  refresh: () => Promise<void>;
  // Computed
  filteredProducts: Product[];
  availableProducts: Product[];
  featuredProducts: Product[];
  categorizedProducts: Map<string, Product[]>;
}

/**
 * Custom hook for managing products and categories
 */
export function useProducts(): UseProductsReturn {
  const [state, setState] = useState<UseProductsState>({
    products: [],
    categories: [],
    isLoading: false,
    error: null,
    selectedCategory: null,
    searchTerm: ''
  });

  // Load categories
  const loadCategories = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const categories = await productService.getCategories();
      setState(prev => ({ ...prev, categories, isLoading: false }));
      offlineStorage.log('Categories loaded', { count: categories.length });
    } catch (error) {
      const appError = errorHandler.handle(error, 'useProducts.loadCategories');
      setState(prev => ({ ...prev, error: appError, isLoading: false }));
    }
  }, []);

  // Load products
  const loadProducts = useCallback(async (params?: ProductSearchParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const products = await productService.getProducts(params);
      setState(prev => ({ ...prev, products, isLoading: false }));
      offlineStorage.log('Products loaded', { count: products.length });
    } catch (error) {
      const appError = errorHandler.handle(error, 'useProducts.loadProducts');
      setState(prev => ({ ...prev, error: appError, isLoading: false }));
    }
  }, []);

  // Select category
  const selectCategory = useCallback((categoryId: string | null) => {
    setState(prev => ({ ...prev, selectedCategory: categoryId }));
    
    if (categoryId) {
      loadProducts({ category_id: categoryId });
      offlineStorage.trackAction('category_selected', { categoryId });
    } else {
      loadProducts();
    }
  }, [loadProducts]);

  // Search products
  const searchProducts = useCallback(async (term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
    
    if (term.trim().length < 2) {
      // If search term is too short, load all products
      await loadProducts();
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const products = await productService.searchProducts(term);
      setState(prev => ({ ...prev, products, isLoading: false }));
      offlineStorage.trackAction('product_search', { term, results: products.length });
    } catch (error) {
      const appError = errorHandler.handle(error, 'useProducts.searchProducts');
      setState(prev => ({ ...prev, error: appError, isLoading: false }));
    }
  }, [loadProducts]);

  // Clear search
  const clearSearch = useCallback(() => {
    setState(prev => ({ ...prev, searchTerm: '', selectedCategory: null }));
    loadProducts();
  }, [loadProducts]);

  // Refresh all data
  const refresh = useCallback(async () => {
    productService.clearCache();
    await Promise.all([
      loadCategories(),
      loadProducts()
    ]);
  }, [loadCategories, loadProducts]);

  // Computed: filtered products
  const filteredProducts = useMemo(() => {
    let filtered = state.products;
    
    // Filter by category
    if (state.selectedCategory) {
      filtered = filtered.filter(p => p.category_id === state.selectedCategory);
    }
    
    // Filter by search term
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [state.products, state.selectedCategory, state.searchTerm]);

  // Computed: available products only
  const availableProducts = useMemo(() => {
    return filteredProducts.filter(p => p.is_available);
  }, [filteredProducts]);

  // Computed: featured products
  const featuredProducts = useMemo(() => {
    return state.products.filter(p => 
      p.is_available && p.tags?.includes('featured')
    ).slice(0, 6);
  }, [state.products]);

  // Computed: products grouped by category
  const categorizedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    
    state.products.forEach(product => {
      const categoryId = product.category_id;
      if (!map.has(categoryId)) {
        map.set(categoryId, []);
      }
      map.get(categoryId)!.push(product);
    });
    
    return map;
  }, [state.products]);

  // Initial load - Only run once on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        await Promise.all([
          loadCategories(),
          loadProducts()
        ]);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  return {
    ...state,
    loadProducts,
    loadCategories,
    selectCategory,
    searchProducts,
    clearSearch,
    refresh,
    filteredProducts,
    availableProducts,
    featuredProducts,
    categorizedProducts
  };
}