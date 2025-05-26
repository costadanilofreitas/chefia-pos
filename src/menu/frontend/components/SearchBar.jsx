import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';

const SearchBar = ({ onSearch, onFilterToggle }) => {
  const [query, setQuery] = useState('');
  
  const handleChange = (e) => {
    setQuery(e.target.value);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };
  
  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-container">
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar itens..."
          value={query}
          onChange={handleChange}
        />
        {onFilterToggle && (
          <button 
            type="button" 
            className="filter-button"
            onClick={onFilterToggle}
            aria-label="Filtrar"
          >
            <FontAwesomeIcon icon={faFilter} />
          </button>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
