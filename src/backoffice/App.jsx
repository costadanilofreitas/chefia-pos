import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Login from '../auth/Login';
import RestaurantSelector from '../auth/RestaurantSelector';
import Layout from '../common/Layout';
import Dashboard from '../dashboard/Dashboard';
import ConfigurationPanel from '../dashboard/ConfigurationPanel';
import ReportsPanel from '../dashboard/ReportsPanel';

/**
 * Main App component for the POS Modern Backoffice
 */
const App = () => {
  // Authentication and app state
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  // Mock restaurant data
  const mockRestaurants = [
    { id: '1', name: 'Restaurante Central', address: 'Av. Paulista, 1000', phone: '(11) 3456-7890', email: 'central@example.com' },
    { id: '2', name: 'Filial Zona Sul', address: 'Av. Ibirapuera, 500', phone: '(11) 3456-7891', email: 'zonasul@example.com' },
    { id: '3', name: 'Filial Zona Norte', address: 'Av. Santana, 200', phone: '(11) 3456-7892', email: 'zonanorte@example.com' },
  ];

  // Handle login
  const handleLogin = (userData) => {
    setUser({
      id: '1',
      name: 'Administrador',
      email: userData.email,
      role: 'admin',
    });
    setAuthenticated(true);
  };

  // Handle restaurant selection
  const handleRestaurantSelect = (selectedRestaurant) => {
    setRestaurant(selectedRestaurant);
  };

  // Handle sidebar navigation
  const handleSidebarItemClick = (item) => {
    setCurrentView(item.id);
  };

  // Sidebar navigation items
  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'menu',
      label: 'Cardápio',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 22h10a1 1 0 001-1V7l-6-6H7a1 1 0 00-1 1v19a1 1 0 001 1zm10-18.586V20H7V3h7.586L17 6.414zM15 14H9v-2h6v2zm0-4H9V8h6v2z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8 4c0 .55-.45 1-1 1s-1-.45-1-1V8h2v2zm4 0c0 .55-.45 1-1 1s-1-.45-1-1V8h2v2z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'config',
      label: 'Configurações',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor" />
        </svg>
      ),
    },
  ];

  // Render current view based on state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard restaurant={restaurant} />;
      case 'config':
        return <ConfigurationPanel restaurant={restaurant} />;
      case 'reports':
        return <ReportsPanel restaurant={restaurant} />;
      case 'menu':
        return (
          <div style={{ padding: tokens.spacing.lg }}>
            <h2>Gerenciamento de Cardápio</h2>
            <p>Funcionalidade em desenvolvimento.</p>
          </div>
        );
      case 'orders':
        return (
          <div style={{ padding: tokens.spacing.lg }}>
            <h2>Gerenciamento de Pedidos</h2>
            <p>Funcionalidade em desenvolvimento.</p>
          </div>
        );
      default:
        return <Dashboard restaurant={restaurant} />;
    }
  };

  // If not authenticated, show login screen
  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // If authenticated but no restaurant selected, show restaurant selector
  if (!restaurant) {
    return <RestaurantSelector restaurants={mockRestaurants} onSelect={handleRestaurantSelect} />;
  }

  // Main application with layout
  return (
    <Layout
      user={user}
      title={getViewTitle(currentView)}
      breadcrumbs={getBreadcrumbs(currentView, restaurant)}
      sidebarItems={sidebarItems}
      activeItemId={currentView}
      onSidebarItemClick={handleSidebarItemClick}
    >
      {renderCurrentView()}
    </Layout>
  );
};

// Helper function to get view title
const getViewTitle = (view) => {
  switch (view) {
    case 'dashboard':
      return 'Dashboard';
    case 'menu':
      return 'Gerenciamento de Cardápio';
    case 'orders':
      return 'Gerenciamento de Pedidos';
    case 'reports':
      return 'Relatórios';
    case 'config':
      return 'Configurações';
    default:
      return 'Dashboard';
  }
};

// Helper function to get breadcrumbs
const getBreadcrumbs = (view, restaurant) => {
  const baseBreadcrumbs = [
    { label: 'Início', href: '#' },
    { label: restaurant.name, href: '#' },
  ];

  switch (view) {
    case 'dashboard':
      return [...baseBreadcrumbs, { label: 'Dashboard' }];
    case 'menu':
      return [...baseBreadcrumbs, { label: 'Gerenciamento de Cardápio' }];
    case 'orders':
      return [...baseBreadcrumbs, { label: 'Gerenciamento de Pedidos' }];
    case 'reports':
      return [...baseBreadcrumbs, { label: 'Relatórios' }];
    case 'config':
      return [...baseBreadcrumbs, { label: 'Configurações' }];
    default:
      return baseBreadcrumbs;
  }
};

export default App;
