// src/components/POSLayout.tsx
import React, { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../index.css'; // Import Tailwind CSS
import LoginDialog from './LoginDialog';

interface POSLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  shortcut?: string;
  permission?: string;
}

export const POSLayout: React.FC<POSLayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId: string }>();
  const location = useLocation();
  const { user, logout, hasPermission, hasRole, isAuthenticated } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('pos-theme') === 'dark';
  });

  // Menu items
  const menuItems: MenuItem[] = [
    { label: 'POS Principal', path: `/pos/${terminalId}/main`, icon: '🏪', shortcut: 'Alt+H' },
    { label: 'Pedidos', path: `/pos/${terminalId}/order`, icon: '📋', shortcut: 'Alt+P' },
    { label: 'Balcão', path: `/pos/${terminalId}/counter-orders`, icon: '🛒', shortcut: 'Alt+B' },
    { label: 'Mesas', path: `/pos/${terminalId}/tables`, icon: '🪑', shortcut: 'Alt+M' },
    { label: 'Delivery', path: `/pos/${terminalId}/delivery`, icon: '🛵', shortcut: 'Alt+D' },
    { label: 'Pedidos Remotos', path: `/pos/${terminalId}/remote-orders`, icon: '📱' },
    { label: 'Fidelidade', path: `/pos/${terminalId}/loyalty`, icon: '⭐', shortcut: 'Alt+F' },
    { label: 'Fiscal', path: `/pos/${terminalId}/fiscal`, icon: '📊', shortcut: 'Alt+I' },
    { label: 'Caixa', path: `/pos/${terminalId}/cashier`, icon: '💰', shortcut: 'Alt+C' },
    { label: 'Sangria', path: `/pos/${terminalId}/cash-withdrawal`, icon: '💸', shortcut: 'Alt+S' },
    { label: 'Dia Operacional', path: `/pos/${terminalId}/business-day`, icon: '📅', shortcut: 'Alt+O' },
    { label: 'Gerencial', path: `/pos/${terminalId}/manager`, icon: '👔', shortcut: 'Alt+G', permission: 'admin' },
  ];

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Theme management
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pos-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pos-theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    logout();
    navigate(`/pos/${terminalId}/cashier`);
  };

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentPageTitle = () => {
    if (title) return title;
    
    const path = location.pathname;
    const menuItem = menuItems.find(item => path.includes(item.path.split('/').pop() || ''));
    return menuItem?.label || 'POS Modern';
  };

  // Keyboard shortcuts for navigation
  useHotkeys('alt+h', () => handleNavigation(`/pos/${terminalId}/main`));
  useHotkeys('alt+p', () => handleNavigation(`/pos/${terminalId}/order`));
  useHotkeys('alt+b', () => handleNavigation(`/pos/${terminalId}/counter-orders`));
  useHotkeys('alt+m', () => handleNavigation(`/pos/${terminalId}/tables`));
  useHotkeys('alt+d', () => handleNavigation(`/pos/${terminalId}/delivery`));
  useHotkeys('alt+f', () => handleNavigation(`/pos/${terminalId}/loyalty`));
  useHotkeys('alt+i', () => handleNavigation(`/pos/${terminalId}/fiscal`));
  useHotkeys('alt+g', () => handleNavigation(`/pos/${terminalId}/manager`));
  useHotkeys('alt+c', () => handleNavigation(`/pos/${terminalId}/cashier`));
  useHotkeys('alt+s', () => handleNavigation(`/pos/${terminalId}/cash-withdrawal`));
  useHotkeys('alt+o', () => handleNavigation(`/pos/${terminalId}/business-day`));
  useHotkeys('escape', () => setIsMenuOpen(false));
  useHotkeys('ctrl+d', () => setIsDarkMode(!isDarkMode));

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (item.permission && !hasRole(item.permission)) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors lg:hidden"
                aria-label="Menu"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              
              {/* Desktop Menu */}
              <nav className="hidden lg:flex items-center gap-2">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Menu"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </nav>
              
              {/* Page Title */}
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {getCurrentPageTitle()}
              </h1>
              
              {/* Terminal Badge */}
              <span className="hidden sm:inline-flex px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-full">
                Terminal {terminalId || '1'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle theme"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              
              {/* User Menu */}
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user?.name || user?.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role || 'Operador'}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    aria-label="Logout"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setLoginDialogOpen(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Navigation Menu Dropdown */}
        {isMenuOpen && (
          <div className="absolute top-16 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[280px] max-h-[calc(100vh-5rem)] overflow-y-auto">
            {visibleMenuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group ${
                  location.pathname === item.path ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between text-sm gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-600 dark:text-gray-400 text-center sm:text-left">
            <span className="flex items-center gap-1">
              📅 {formatDateTime(currentTime)}
            </span>
            <span className="flex items-center gap-1">
              👤 <strong>{user?.name || user?.username || 'Operador'}</strong>
            </span>
            <span className="flex items-center gap-1">
              🖥️ Terminal <strong>{terminalId || '1'}</strong>
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-500">
            Chefia POS v1.0.0 | © 2025
          </div>
        </div>
      </footer>

      {/* Login Dialog */}
      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onSuccess={() => {
          setLoginDialogOpen(false);
          navigate(`/pos/${terminalId}/main`);
        }}
      />
    </div>
  );
};

export default POSLayout;