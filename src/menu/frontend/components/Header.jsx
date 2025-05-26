import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFilter } from '@fortawesome/free-solid-svg-icons';

const Header = ({ title, showBackButton = true, logoUrl = null, onFilterToggle = null }) => {
  const handleBack = () => {
    window.history.back();
  };
  
  return (
    <header className="menu-header">
      <div className="header-left">
        {showBackButton && (
          <button className="back-button" onClick={handleBack} aria-label="Voltar">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        )}
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="header-logo" />
        )}
      </div>
      
      <h1 className="header-title">{title}</h1>
      
      <div className="header-right">
        {onFilterToggle && (
          <button className="filter-toggle" onClick={onFilterToggle} aria-label="Filtrar">
            <FontAwesomeIcon icon={faFilter} />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
