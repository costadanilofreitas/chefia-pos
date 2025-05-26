import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import '../styles/Sidebar.css';

// Icons (you would use a proper icon library in a real app)
const DashboardIcon = () => <span className="icon">📊</span>;
const RestaurantsIcon = () => <span className="icon">🍽️</span>;
const BrandsIcon = () => <span className="icon">🏢</span>;
const UsersIcon = () => <span className="icon">👥</span>;
const ReportsIcon = () => <span className="icon">📈</span>;
const SystemIcon = () => <span className="icon">⚙️</span>;
const SettingsIcon = () => <span className="icon">🔧</span>;

const Sidebar = ({ isOpen, toggleSidebar, currentPath }) => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  // Navigation items with permission checks
  const navItems = [
    {
      path: '/',
      name: 'Dashboard',
      icon: <DashboardIcon />,
      permission: null // Everyone can access
    },
    {
      path: '/restaurants',
      name: 'Restaurantes',
      icon: <RestaurantsIcon />,
      permission: 'VIEW_RESTAURANTS'
    },
    {
      path: '/brands',
      name: 'Marcas',
      icon: <BrandsIcon />,
      permission: 'VIEW_BRANDS'
    },
    {
      path: '/users',
      name: 'Usuários',
      icon: <UsersIcon />,
      permission: 'VIEW_USERS'
    },
    {
      path: '/reports',
      name: 'Relatórios',
      icon: <ReportsIcon />,
      permission: 'VIEW_REPORTS'
    },
    {
      path: '/system',
      name: 'Status do Sistema',
      icon: <SystemIcon />,
      permission: 'VIEW_SYSTEM_STATUS'
    },
    {
      path: '/settings',
      name: 'Configurações',
      icon: <SettingsIcon />,
      permission: null // Everyone can access their settings
    }
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>POS Modern</h2>
        <button className="toggle-button" onClick={toggleSidebar}>
          {isOpen ? '◀' : '▶'}
        </button>
      </div>
      
      <div className="user-info">
        {user && (
          <>
            <div className="avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <p className="username">{user.username}</p>
              <p className="role">{user.role}</p>
            </div>
          </>
        )}
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            // Skip items the user doesn't have permission for
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }
            
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  {isOpen && <span className="nav-text">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        {isOpen && <p>v1.0.0</p>}
      </div>
    </div>
  );
};

export default Sidebar;
