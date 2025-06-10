import React, { useState, useEffect } from 'react';
import { fetchProducts, fetchCategories } from '../services/menuService';
import { Product, Category } from '../models/types';

/**
 * Main component for the Digital Menu application
 */
const MenuApp: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories and products on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch categories first
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
        
        // Set first category as selected if available
        if (categoriesData.length > 0 && !selectedCategory) {
          setSelectedCategory(categoriesData[0].id);
        }
        
        // Fetch all products
        const productsData = await fetchProducts();
        setProducts(productsData);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading menu data:', err);
        setError('Falha ao carregar o cardápio. Por favor, tente novamente.');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter products by selected category
  const filteredProducts = selectedCategory 
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  if (isLoading) {
    return <div className="loading">Carregando cardápio...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="menu-app">
      <header className="menu-header">
        <h1>Cardápio Digital</h1>
        <p>Conheça nossas deliciosas opções</p>
      </header>
      
      <nav className="category-nav">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => handleCategorySelect(category.id)}
          >
            {category.name}
          </button>
        ))}
      </nav>
      
      <div className="products-grid">
        {filteredProducts.map(product => (
          <div key={product.id} className="product-card">
            {product.imageUrl && (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="product-image" 
              />
            )}
            <div className="product-info">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <p className="product-price">R$ {product.price.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuApp;
