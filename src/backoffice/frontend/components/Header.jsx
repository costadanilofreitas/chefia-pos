import React from 'react';
import { useAuth } from '../utils/AuthContext';
import '../styles/Header.css';

const Header = ({ user, onLogout, toggleSidebar }) => {
  return (
    <header className="main-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          ☰
        </button>
        <h1>Backoffice</h1>
      </div>
      
      <div className="header-right">
        <div className="notifications">
          <button className="notification-button">
            🔔
            <span className="notification-badge">3</span>
          </button>
        </div>
        
        <div className="user-dropdown">
          <button className="user-dropdown-button">
            <span className="user-avatar">{user?.username?.charAt(0).toUpperCase()}</span>
            <span className="user-name">{user?.username}</span>
            <span className="dropdown-arrow">▼</span>
          </button>
          
          <div className="dropdown-menu">
            <button className="dropdown-item">Perfil</button>
            <button className="dropdown-item">Preferências</button>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item logout" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
