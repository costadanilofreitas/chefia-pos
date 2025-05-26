import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';

const FilterPanel = ({ filters, categories, onChange, onClear }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  
  const handleCategoryChange = (e) => {
    const category = e.target.value === "all" ? null : e.target.value;
    setLocalFilters({ ...localFilters, category });
  };
  
  const handleMinPriceChange = (e) => {
    const minPrice = e.target.value ? parseFloat(e.target.value) : null;
    setLocalFilters({ ...localFilters, minPrice });
  };
  
  const handleMaxPriceChange = (e) => {
    const maxPrice = e.target.value ? parseFloat(e.target.value) : null;
    setLocalFilters({ ...localFilters, maxPrice });
  };
  
  const handleAllergenToggle = (allergen) => {
    const allergensExclude = [...localFilters.allergensExclude];
    const index = allergensExclude.indexOf(allergen);
    
    if (index >= 0) {
      allergensExclude.splice(index, 1);
    } else {
      allergensExclude.push(allergen);
    }
    
    setLocalFilters({ ...localFilters, allergensExclude });
  };
  
  const handleTagToggle = (tag) => {
    const tagsInclude = [...localFilters.tagsInclude];
    const index = tagsInclude.indexOf(tag);
    
    if (index >= 0) {
      tagsInclude.splice(index, 1);
    } else {
      tagsInclude.push(tag);
    }
    
    setLocalFilters({ ...localFilters, tagsInclude });
  };
  
  const handleApplyFilters = () => {
    onChange(localFilters);
  };
  
  const handleClearFilters = () => {
    const clearedFilters = {
      category: null,
      minPrice: null,
      maxPrice: null,
      allergensExclude: [],
      tagsInclude: []
    };
    setLocalFilters(clearedFilters);
    onChange(clearedFilters);
    onClear();
  };
  
  // Common allergens
  const allergens = [
    { id: 'gluten', name: 'Glúten' },
    { id: 'dairy', name: 'Laticínios' },
    { id: 'nuts', name: 'Nozes' },
    { id: 'eggs', name: 'Ovos' },
    { id: 'soy', name: 'Soja' }
  ];
  
  // Common tags
  const tags = [
    { id: 'vegetarian', name: 'Vegetariano' },
    { id: 'vegan', name: 'Vegano' },
    { id: 'spicy', name: 'Picante' },
    { id: 'organic', name: 'Orgânico' },
    { id: 'sugar_free', name: 'Sem Açúcar' }
  ];
  
  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3 className="filter-title">Filtros</h3>
        <button className="filter-clear" onClick={handleClearFilters}>
          Limpar Todos
        </button>
      </div>
      
      <div className="filter-group">
        <h4 className="filter-group-title">Categoria</h4>
        <select 
          className="form-control"
          value={localFilters.category || "all"}
          onChange={handleCategoryChange}
        >
          <option value="all">Todas as Categorias</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      
      <div className="filter-group">
        <h4 className="filter-group-title">Faixa de Preço</h4>
        <div className="price-range">
          <input 
            type="number" 
            className="price-input"
            placeholder="Min"
            min="0"
            step="0.01"
            value={localFilters.minPrice || ''}
            onChange={handleMinPriceChange}
          />
          <span>até</span>
          <input 
            type="number" 
            className="price-input"
            placeholder="Max"
            min="0"
            step="0.01"
            value={localFilters.maxPrice || ''}
            onChange={handleMaxPriceChange}
          />
        </div>
      </div>
      
      <div className="filter-group">
        <h4 className="filter-group-title">Excluir Alérgenos</h4>
        {allergens.map(allergen => (
          <label key={allergen.id} className="filter-checkbox">
            <input 
              type="checkbox"
              checked={localFilters.allergensExclude.includes(allergen.id)}
              onChange={() => handleAllergenToggle(allergen.id)}
            />
            {allergen.name}
          </label>
        ))}
      </div>
      
      <div className="filter-group">
        <h4 className="filter-group-title">Preferências</h4>
        {tags.map(tag => (
          <label key={tag.id} className="filter-checkbox">
            <input 
              type="checkbox"
              checked={localFilters.tagsInclude.includes(tag.id)}
              onChange={() => handleTagToggle(tag.id)}
            />
            {tag.name}
          </label>
        ))}
      </div>
      
      <button className="apply-filters" onClick={handleApplyFilters}>
        Aplicar Filtros
      </button>
    </div>
  );
};

export default FilterPanel;
