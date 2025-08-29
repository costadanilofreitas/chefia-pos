import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Toast, { useToast } from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import '../index.css'; // Import Tailwind CSS
import { DocumentWithVendorFullscreen, HTMLElementWithVendorFullscreen } from '../types/browser';
import NumericLoginModal from './NumericLoginModal';
import ThemeToggle from './ThemeToggle';
import { SimpleTooltip } from './Tooltip';

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
  const { user, logout, hasRole, isAuthenticated, login } = useAuth();
  const { toasts, removeToast, success } = useToast();
  const { mode: themeMode } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isDarkMode = themeMode === 'dark';

  // Menu items
  const menuItems: MenuItem[] = [
    { label: 'POS Principal', path: `/pos/${terminalId}/main`, icon: '🏪', shortcut: 'Alt+H' },
    { label: 'Balcão', path: `/pos/${terminalId}/counter-orders`, icon: '🛒', shortcut: 'Alt+B' },
    { label: 'Mesas', path: `/pos/${terminalId}/tables`, icon: '🪑', shortcut: 'Alt+M' },
    { label: 'Delivery', path: `/pos/${terminalId}/delivery`, icon: '🛵', shortcut: 'Alt+D' },
    { label: 'Pedidos Remotos', path: `/pos/${terminalId}/remote-orders`, icon: '📱' , shortcut: 'Alt+R'},
    { label: 'Fidelidade', path: `/pos/${terminalId}/loyalty`, icon: '⭐', shortcut: 'Alt+F' },
    { label: 'Fiscal', path: `/pos/${terminalId}/fiscal`, icon: '📊', shortcut: 'Alt+I' },
    { label: 'Caixa', path: `/pos/${terminalId}/cashier`, icon: '💰', shortcut: 'Alt+C' },
    { label: 'Sangria', path: `/pos/${terminalId}/cash-withdrawal`, icon: '💸', shortcut: 'Alt+S' },
    { label: 'Dia Operacional', path: `/pos/${terminalId}/business-day`, icon: '📅', shortcut: 'Alt+O' },
    { label: 'Gerencial', path: `/pos/${terminalId}/manager`, icon: '👔', shortcut: 'Alt+G', permission: 'manager' },
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

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

  // Fullscreen management
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      (document.documentElement as HTMLElementWithVendorFullscreen)?.webkitRequestFullscreen?.();
      (document.documentElement as HTMLElementWithVendorFullscreen)?.mozRequestFullScreen?.();
      (document.documentElement as HTMLElementWithVendorFullscreen)?.msRequestFullscreen?.();
    } else {
      document.exitFullscreen?.();
      (document as DocumentWithVendorFullscreen)?.webkitExitFullscreen?.();
      (document as DocumentWithVendorFullscreen)?.mozCancelFullScreen?.();
      (document as DocumentWithVendorFullscreen)?.msExitFullscreen?.();
    }
  }, []);

  const handleLogout = () => {
    logout();
    success('Logout realizado com sucesso!');
    navigate(`/pos/${terminalId}/cashier`);
  };

  const handleLogin = async (operatorId: string, password: string) => {
    
    await login({ operator_id: operatorId, password });
    success('Login realizado com sucesso!');
    // Pequeno delay para garantir que o estado seja atualizado
    setTimeout(() => {
      navigate(`/pos/${terminalId}/main`);
    }, 100);
  
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
  // Theme toggle is handled by ThemeContext now
  useHotkeys('f11', () => {
    toggleFullscreen();
  });

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter(item => {
    if (item.permission === 'manager') {
      // Check if user is manager or admin
      return hasRole('manager') || hasRole('admin');
    }
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
              {/* Unified Menu Button for all screen sizes */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Menu"
              >
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              
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
              {/* Fullscreen Toggle */}
              <SimpleTooltip 
                title={isFullscreen ? "Sair da tela cheia (F11)" : "Tela cheia (F11)"}
                position="bottom"
              >
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 active:scale-95"
                  aria-label="Toggle fullscreen"
                >
                  {isFullscreen ? (
                    /* Exit fullscreen icon */
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <g strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        {/* Top left corner - arrow pointing inward */}
                        <path d="M8 3v5H3" />
                        <path d="M3 3l5 5" />
                        
                        {/* Top right corner - arrow pointing inward */}
                        <path d="M16 3v5h5" />
                        <path d="M21 3l-5 5" />
                        
                        {/* Bottom left corner - arrow pointing inward */}
                        <path d="M8 21v-5H3" />
                        <path d="M3 21l5-5" />
                        
                        {/* Bottom right corner - arrow pointing inward */}
                        <path d="M16 21v-5h5" />
                        <path d="M21 21l-5-5" />
                      </g>
                    </svg>
                  ) : (
                    /* Enter fullscreen icon */
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <g strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        {/* Top left corner - arrow pointing outward */}
                        <path d="M3 8V3h5" />
                        <path d="M3 3l5 5" />
                        
                        {/* Top right corner - arrow pointing outward */}
                        <path d="M21 8V3h-5" />
                        <path d="M21 3l-5 5" />
                        
                        {/* Bottom left corner - arrow pointing outward */}
                        <path d="M3 16v5h5" />
                        <path d="M3 21l5-5" />
                        
                        {/* Bottom right corner - arrow pointing outward */}
                        <path d="M21 16v5h-5" />
                        <path d="M21 21l-5-5" />
                      </g>
                    </svg>
                  )}
                </button>
              </SimpleTooltip>
              
              {/* Theme Toggle */}
              <div className="flex items-center">
                <ThemeToggle showTooltip={true} size="medium" />
              </div>
              
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
                  <SimpleTooltip title="Sair do sistema" position="bottom">
                    <button
                      onClick={handleLogout}
                      className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200 hover:scale-105 active:scale-95"
                      aria-label="Logout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </SimpleTooltip>
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
          <div 
            ref={menuRef}
            className="absolute top-14 left-4 lg:left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[280px] max-h-[calc(100vh-5rem)] overflow-y-auto animate-scale-up">
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

      {/* Login Modal */}
      <NumericLoginModal
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLogin={handleLogin}
      />

      {/* Toast Messages */}
      <Toast messages={toasts} onRemove={removeToast} />
    </div>
  );
};

export default POSLayout;