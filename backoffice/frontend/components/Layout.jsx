import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BrandSelector from './BrandSelector';
import RestaurantSelector from './RestaurantSelector';
import { useAuth } from '../utils/AuthContext';
import '../styles/Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle brand selection
  const handleBrandChange = (brandId) => {
    setSelectedBrand(brandId);
    setSelectedRestaurant(null); // Reset restaurant when brand changes
    
    // In a real app, you might want to update URL or fetch data based on selected brand
    // navigate(`${location.pathname}?brand=${brandId}`);
  };

  // Handle restaurant selection
  const handleRestaurantChange = (restaurantId) => {
    setSelectedRestaurant(restaurantId);
    
    // In a real app, you might want to update URL or fetch data based on selected restaurant
    // navigate(`${location.pathname}?brand=${selectedBrand}&restaurant=${restaurantId}`);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`layout-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        currentPath={location.pathname}
      />
      
      <div className="main-content">
        <Header 
          user={user}
          onLogout={handleLogout}
          toggleSidebar={toggleSidebar}
        />
        
        <div className="selectors-container">
          <BrandSelector 
            selectedBrand={selectedBrand}
            onBrandChange={handleBrandChange}
          />
          
          {selectedBrand && (
            <RestaurantSelector 
              brandId={selectedBrand}
              selectedRestaurant={selectedRestaurant}
              onRestaurantChange={handleRestaurantChange}
            />
          )}
        </div>
        
        <div className="content-area">
          <Outlet context={{ selectedBrand, selectedRestaurant }} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
