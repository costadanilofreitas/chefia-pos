import React from 'react';

const CategoryCard = ({ category, onClick }) => {
  return (
    <div className="category-card" onClick={onClick}>
      {category.image_url ? (
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="category-image" 
        />
      ) : (
        <div className="category-image-placeholder"></div>
      )}
      <div className="category-overlay">
        <h3 className="category-name">{category.name}</h3>
        <div className="category-item-count">
          {category.items.length} {category.items.length === 1 ? 'item' : 'itens'}
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
