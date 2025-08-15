/**
 * Hook para gerenciar produtos com cache otimizado para performance offline
 */

import { useState, useEffect, useCallback } from 'react';
import { APIResponse } from '../types';
import { offlineStorage } from '../utils/offline-storage';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  stock_quantity: number;
  is_combo: boolean;
  combo_items: any[];
  created_at: string;
  updated_at: string;
}

interface UseOfflineProductsReturn {
  products: Product[];
  categories: string[];
  loading: boolean;
  error: string | null;
  getProductsByCategory: (category: string) => Product[];
  getProduct: (productId: string) => Product | null;
  searchProducts: (query: string) => Product[];
  refreshProducts: () => Promise<void>;
  isConnected: boolean;
}

export function useOfflineProducts(): UseOfflineProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar produtos do cache
  const loadCachedProducts = useCallback(async () => {
    try {
      setLoading(true);
      const cachedProducts = await offlineStorage.getCache<Product[]>('products:all');
      if (cachedProducts) {
        setProducts(cachedProducts);
      }
    } catch (err) {
      setError(`Erro ao carregar produtos: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar produtos do servidor (com fallback para cache)
  const fetchProducts = useCallback(async () => {
    try {
      if (!offlineStorage.isConnected) {
        // Se offline, usar apenas cache
        await loadCachedProducts();
        return;
      }

      setLoading(true);
      const response = await fetch('/api/products');
      
      if (response.ok) {
        const apiResponse: APIResponse<Product[]> = await response.json();
        if (apiResponse.success && apiResponse.data) {
          setProducts(apiResponse.data);
          
          // Cache com TTL de 30 minutos para produtos
          await offlineStorage.setCache('products:all', apiResponse.data, 'products', 1800000);
          
          // Cache individual de cada produto
          for (const product of apiResponse.data) {
            await offlineStorage.setCache(`product:${product.id}`, product, 'products', 1800000);
          }
        }
      } else {
        // Fallback para cache se request falhou
        await loadCachedProducts();
      }
    } catch (err) {
      setError(`Erro ao buscar produtos: ${err}`);
      // Fallback para cache em caso de erro
      await loadCachedProducts();
    } finally {
      setLoading(false);
    }
  }, [loadCachedProducts]);

  // Obter produtos por categoria
  const getProductsByCategory = useCallback((category: string): Product[] => {
    return products.filter(product => product.category === category && product.is_available);
  }, [products]);

  // Obter produto específico
  const getProduct = useCallback((productId: string): Product | null => {
    return products.find(product => product.id === productId) || null;
  }, [products]);

  // Buscar produtos por texto
  const searchProducts = useCallback((query: string): Product[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return products.filter(p => p.is_available);

    return products.filter(product => 
      product.is_available && (
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      )
    );
  }, [products]);

  // Forçar refresh dos produtos
  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  // Calcular categorias disponíveis
  const categories = useCallback(() => {
    const uniqueCategories = [...new Set(products.filter(p => p.is_available).map(p => p.category))];
    return uniqueCategories.sort();
  }, [products])();

  // Carregar produtos na inicialização
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Listener para mudanças de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setError(null);
      fetchProducts(); // Tentar buscar dados atualizados quando voltar online
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchProducts]);

  return {
    products: products.filter(p => p.is_available),
    categories,
    loading,
    error,
    getProductsByCategory,
    getProduct,
    searchProducts,
    refreshProducts,
    isConnected: offlineStorage.isConnected
  };
}