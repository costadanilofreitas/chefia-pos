import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import CategoryCard from '../components/CategoryCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import CartFab from '../components/CartFab';
import CartDrawer from '../components/CartDrawer';
import ThemeToggle from '../components/ThemeToggle';
import PopularItems from '../components/PopularItems';
import '../styles/menu.css';

const MenuPage = ({ menu }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: null,
    minPrice: null,
    maxPrice: null,
    allergensExclude: [],
    tagsInclude: []
  });
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [popularItems, setPopularItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch popular items on component mount
  useEffect(() => {
    const fetchPopularItems = async () => {
      if (!menu || !menu.restaurant_id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/menu/public/${menu.restaurant_id}/popular`);
        if (response.ok) {
          const data = await response.json();
          setPopularItems(data);
        }
      } catch (error) {
        console.error('Error fetching popular items:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPopularItems();
  }, [menu]);
  
  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);
  
  // Filter items based on search query and filters
  const getFilteredCategories = () => {
    if (!menu || !menu.categories) return [];
    
    let filteredCategories = [...menu.categories];
    
    // Apply category filter
    if (filters.category) {
      filteredCategories = filteredCategories.filter(category => 
        category.name === filters.category
      );
    }
    
    // Apply search query and other filters to items within categories
    filteredCategories = filteredCategories.map(category => ({
      ...category,
      items: category.items.filter(item => {
        // Search query filter
        const matchesSearch = !searchQuery || 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
        
        // Price filters
        const matchesMinPrice = filters.minPrice === null || item.price >= filters.minPrice;
        const matchesMaxPrice = filters.maxPrice === null || item.price <= filters.maxPrice;
        
        // Allergen exclusion filter
        const matchesAllergens = filters.allergensExclude.length === 0 || 
          !item.allergens.some(allergen => 
            filters.allergensExclude.includes(allergen)
          );
        
        // Tags inclusion filter
        const matchesTags = filters.tagsInclude.length === 0 || 
          filters.tagsInclude.every(tag => 
            item.tags.includes(tag)
          );
        
        return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesAllergens && matchesTags;
      })
    })).filter(category => category.items.length > 0);
    
    return filteredCategories;
  };
  
  const filteredCategories = getFilteredCategories();
  
  const handleCategoryClick = (category) => {
    navigate(`/category/${category.name}`);
  };
  
  const handleSearch = (query) => {
    setSearchQuery(query);
  };
  
  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };
  
  const handleFilterClear = () => {
    setFilters({
      category: null,
      minPrice: null,
      maxPrice: null,
      allergensExclude: [],
      tagsInclude: []
    });
  };
  
  const handleAddToCart = (item, quantity = 1, options = [], variant = null) => {
    const existingItemIndex = cartItems.findIndex(cartItem => 
      cartItem.id === item.id && 
      JSON.stringify(cartItem.options) === JSON.stringify(options) &&
      cartItem.variant === variant
    );
    
    if (existingItemIndex >= 0) {
      // Item already in cart, update quantity
      const updatedCartItems = [...cartItems];
      updatedCartItems[existingItemIndex].quantity += quantity;
      setCartItems(updatedCartItems);
    } else {
      // Add new item to cart
      setCartItems([...cartItems, {
        id: item.id,
        name: item.name,
        price: variant ? variant.price : item.price,
        image_url: item.image_url,
        quantity,
        options,
        variant
      }]);
    }
    
    // Show cart drawer after adding item
    setShowCart(true);
  };
  
  const handleRemoveFromCart = (index) => {
    const updatedCartItems = [...cartItems];
    updatedCartItems.splice(index, 1);
    setCartItems(updatedCartItems);
  };
  
  const handleUpdateCartItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCartItems = [...cartItems];
    updatedCartItems[index].quantity = newQuantity;
    setCartItems(updatedCartItems);
  };
  
  const handleCartToggle = () => {
    setShowCart(!showCart);
  };
  
  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };
  
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    try {
      // Create order object
      const order = {
        restaurant_id: menu.restaurant_id,
        menu_id: menu.id,
        items: cartItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          options: item.options.map(opt => opt.id),
          variant_id: item.variant ? item.variant.id : null,
          unit_price: item.price,
          total_price: item.price * item.quantity
        })),
        total_amount: cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      };
      
      // Submit order to API
      const response = await fetch('/api/menu/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      });
      
      if (response.ok) {
        const createdOrder = await response.json();
        // Clear cart
        setCartItems([]);
        // Close cart drawer
        setShowCart(false);
        // Navigate to order confirmation page (would be implemented in a real app)
        alert(`Pedido enviado com sucesso! Número do pedido: ${createdOrder.id}`);
      } else {
        throw new Error('Falha ao enviar pedido');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Ocorreu um erro ao enviar seu pedido. Por favor, tente novamente.');
    }
  };
  
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  return (
    <div className="menu-page">
      <Header 
        title={menu.name} 
        showBackButton={false}
        logoUrl={menu.theme.logo_url}
        onFilterToggle={handleFilterToggle}
      />
      
      {menu.description && (
        <div className="menu-description">
          <p>{menu.description}</p>
        </div>
      )}
      
      <SearchBar onSearch={handleSearch} />
      
      {showFilters && (
        <FilterPanel 
          filters={filters}
          categories={menu.categories.map(cat => cat.name)}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
        />
      )}
      
      {!searchQuery && !filters.category && popularItems.length > 0 && (
        <PopularItems 
          items={popularItems} 
          onItemClick={(item) => navigate(`/item/${item.id}`)}
          onAddToCart={handleAddToCart}
        />
      )}
      
      <div className="categories-grid">
        {filteredCategories.map(category => (
          <CategoryCard 
            key={category.name}
            category={category}
            onClick={() => handleCategoryClick(category)}
          />
        ))}
        
        {filteredCategories.length === 0 && (
          <div className="no-results">
            <p>Nenhum item encontrado para "{searchQuery}"</p>
            <button onClick={() => {
              setSearchQuery('');
              handleFilterClear();
            }} className="clear-search">
              Limpar filtros
            </button>
          </div>
        )}
      </div>
      
      <CartFab count={cartItemCount} onClick={handleCartToggle} />
      
      <CartDrawer 
        isOpen={showCart}
        items={cartItems}
        total={cartTotal}
        onClose={() => setShowCart(false)}
        onUpdateQuantity={handleUpdateCartItemQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />
      
      <ThemeToggle isDark={darkMode} onToggle={handleThemeToggle} />
    </div>
  );
};

export default MenuPage;
