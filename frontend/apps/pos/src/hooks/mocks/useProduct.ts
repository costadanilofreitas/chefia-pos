import { useState } from 'react';

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
  const [products] = useState<Product[]>([
    { id: '1', name: 'Product 1', price: 10.0, category_id: 'cat-1' },
    { id: '2', name: 'Product 2', price: 20.0, category_id: 'cat-2' },
  ]);

  const [categories] = useState<Category[]>([
    { id: 'cat-1', name: 'Category 1' },
    { id: 'cat-2', name: 'Category 2' },
  ]);

  const [loading, setLoading] = useState(false);

  const getProductsByCategory = async (categoryId: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return products.filter(p => p.category_id === categoryId);
    } finally {
      setLoading(false);
    }
  };

  const getProductById = async (productId: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return products.find(p => p.id === productId);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400));
      return products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    categories,
    loading,
    getProductsByCategory,
    getProductById,
    searchProducts
  };
};

