import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import ItemDetailPage from './pages/ItemDetailPage';
import CategoryPage from './pages/CategoryPage';
import QRCodeGenerator from './pages/QRCodeGenerator';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import './styles/main.css';
import './styles/menu.css';
import './styles/qrcode.css';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Extract restaurant and menu IDs from URL
  const getIdsFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('r') || window.location.pathname.split('/r/')[1]?.split('/')[0];
    const menuId = urlParams.get('m') || window.location.pathname.split('/m/')[1]?.split('/')[0];
    
    return { restaurantId, menuId };
  };
  
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const { restaurantId, menuId } = getIdsFromUrl();
        
        if (!restaurantId) {
          throw new Error('Restaurante não especificado');
        }
        
        // Fetch menu data from API
        const url = menuId 
          ? `/api/menu/${menuId}`
          : `/api/menu/public/${restaurantId}`;
          
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Falha ao carregar o cardápio');
        }
        
        const data = await response.json();
        setMenuData(data);
      } catch (err) {
        console.error('Error fetching menu data:', err);
        setError(err.message || 'Ocorreu um erro ao carregar o cardápio');
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch menu data if we're on a menu page
    const path = window.location.pathname;
    if (!path.includes('/admin/') && !path.includes('/qrcode/')) {
      fetchMenuData();
    } else {
      setLoading(false);
    }
  }, []);
  
  // Apply theme from menu data
  useEffect(() => {
    if (menuData?.theme) {
      const { theme } = menuData;
      
      // Apply theme colors to CSS variables
      document.documentElement.style.setProperty('--primary-color', theme.primary_color);
      document.documentElement.style.setProperty('--secondary-color', theme.secondary_color);
      document.documentElement.style.setProperty('--background-color', theme.background_color);
      document.documentElement.style.setProperty('--text-color', theme.text_color);
      
      // Apply font family
      if (theme.font_family) {
        document.documentElement.style.setProperty('--font-family', theme.font_family);
      }
      
      // Set page title
      document.title = `Cardápio - ${menuData.name || 'Restaurante'}`;
    }
  }, [menuData]);
  
  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);
  
  // Check if we're on an admin page
  const isAdminPage = window.location.pathname.includes('/admin/') || 
                      window.location.pathname.includes('/qrcode/');
  
  if (loading && !isAdminPage) {
    return <LoadingScreen />;
  }
  
  if (error && !isAdminPage) {
    return <ErrorScreen message={error} />;
  }
  
  if (!menuData && !isAdminPage) {
    return <ErrorScreen message="Cardápio não encontrado" />;
  }
  
  return (
    <Router>
      <Routes>
        {/* Menu routes */}
        <Route path="/" element={<MenuPage menu={menuData} />} />
        <Route path="/r/:restaurantId" element={<MenuPage menu={menuData} />} />
        <Route path="/r/:restaurantId/m/:menuId" element={<MenuPage menu={menuData} />} />
        <Route path="/category/:categoryId" element={<CategoryPage menu={menuData} />} />
        <Route path="/item/:itemId" element={<ItemDetailPage menu={menuData} />} />
        
        {/* Admin routes */}
        <Route path="/admin/qrcode/:restaurantId" element={<QRCodeGenerator />} />
      </Routes>
    </Router>
  );
};

export default App;
