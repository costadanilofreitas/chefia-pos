import { useCallback, useEffect, useState } from "react";
import { productService } from "../services/ProductService";
import { getErrorMessage } from "../types/error";
import { Product } from "../types/product";

// Re-export Product type for backward compatibility
export type { Product } from "../types/product";

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Singleton para garantir que os dados sejam carregados apenas uma vez
let globalLoadPromise: Promise<void> | null = null;
let globalHasLoaded = false;

export const useProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      // Carregar produtos do backend (backend já gerencia cache)
      const products = await productService.getProducts();
      setProducts(products);
    } catch (error) {
      setError(getErrorMessage(error));
      setProducts([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      // Carregar categorias do backend (backend já gerencia cache)
      const backendCategories = await productService.getCategories();

      // Converter para formato esperado pelo frontend
      const convertedCategories: Category[] = backendCategories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: getIconForCategory(c.name),
      }));

      setCategories(convertedCategories);
    } catch (error) {
      setError(getErrorMessage(error));
      setCategories([]);
    }
  }, []);

  // Função para mapear ícones baseado no nome da categoria
  const getIconForCategory = (categoryName: string): string => {
    const name = categoryName.toLowerCase();
    if (name.includes("burger") || name.includes("hambur")) return "🍔";
    if (name.includes("batata") || name.includes("fries")) return "🍟";
    if (
      name.includes("bebida") ||
      name.includes("drink") ||
      name.includes("refri")
    )
      return "🥤";
    if (name.includes("pizza")) return "🍕";
    if (name.includes("sobremesa") || name.includes("doce")) return "🍰";
    if (name.includes("salada") || name.includes("verde")) return "🥗";
    if (name.includes("lanche") || name.includes("snack")) return "🥪";
    if (name.includes("café") || name.includes("coffee")) return "☕";
    return "🍽️"; // Ícone padrão
  };

  const getProductsByCategory = useCallback(
    async (categoryId: string) => {
      setLoading(true);
      setError(null);
      try {
        // Filtrar produtos por categoria
        const filteredProducts = products.filter(
          (p) => p.category_id === categoryId
        );
        return filteredProducts;
      } catch (error) {
        setError(getErrorMessage(error));
        return [];
      } finally {
        setLoading(false);
      }
    },
    [products]
  );

  const getProductById = useCallback(
    async (productId: string) => {
      setLoading(true);
      setError(null);
      try {
        const product = products.find((p) => p.id === productId);
        return product;
      } catch (error) {
        setError(getErrorMessage(error));
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [products]
  );

  const searchProducts = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);
      try {
        const filteredProducts = products.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
        return filteredProducts;
      } catch (error) {
        setError(getErrorMessage(error));
        return [];
      } finally {
        setLoading(false);
      }
    },
    [products]
  );

  // Carregar dados automaticamente quando o hook é inicializado
  useEffect(() => {
    // Evitar múltiplas chamadas simultâneas
    let isCancelled = false;
    
    const loadData = async () => {
      // Se já carregou globalmente, apenas pegar os dados do cache
      if (globalHasLoaded) {
        try {
          const cachedProducts = await productService.getProducts();
          const cachedCategories = await productService.getCategories();
          
          if (!isCancelled) {
            setProducts(cachedProducts);
            setCategories(cachedCategories);
            setHasLoaded(true);
            setLoading(false);
          }
        } catch (error) {
          if (!isCancelled) {
            setError(getErrorMessage(error));
            setLoading(false);
          }
        }
        return;
      }
      
      // Se já existe uma promise global de carregamento, aguardar ela
      if (globalLoadPromise) {
        setLoading(true);
        try {
          await globalLoadPromise;
          
          // Após a promise global, pegar os dados do cache
          const cachedProducts = await productService.getProducts();
          const cachedCategories = await productService.getCategories();
          
          if (!isCancelled) {
            setProducts(cachedProducts);
            setCategories(cachedCategories);
            setHasLoaded(true);
          }
        } catch (error) {
          if (!isCancelled) {
            setError(getErrorMessage(error));
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
        return;
      }
      
      // Primeira vez carregando - criar promise global
      setLoading(true);
      setError(null);
      
      globalLoadPromise = Promise.all([
        loadProducts(),
        loadCategories()
      ]).then(() => {
        globalHasLoaded = true;
      });
      
      try {
        await globalLoadPromise;
        
        // Só marcar como carregado se não foi cancelado
        if (!isCancelled) {
          setHasLoaded(true);
        }
      } catch (error) {
        if (!isCancelled) {
          setError(getErrorMessage(error));
        }
        // Em caso de erro, resetar para permitir retry
        globalLoadPromise = null;
        globalHasLoaded = false;
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // Cleanup function para evitar updates em componente desmontado
    return () => {
      isCancelled = true;
    };
  }, []); // Empty dependency array - load only once

  return {
    products,
    categories,
    loading,
    error,
    loadProducts,
    loadCategories,
    getProductsByCategory,
    getProductById,
    searchProducts,
  };
};
