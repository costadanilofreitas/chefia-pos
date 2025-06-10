import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCartPlus } from '@fortawesome/free-solid-svg-icons';

const PopularItems = ({ items, onItemClick, onAddToCart }) => {
  return (
    <div className="popular-items-section">
      <h2 className="section-title">
        <FontAwesomeIcon icon={faStar} className="popular-icon" /> Mais Populares
      </h2>
      
      <div className="popular-items-grid">
        {items.map(item => (
          <div 
            key={item.id} 
            className="popular-item-card"
            onClick={() => onItemClick(item)}
          >
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="popular-item-image" 
              />
            ) : (
              <div className="popular-item-image-placeholder"></div>
            )}
            
            <div className="popular-item-content">
              <h3 className="popular-item-name">{item.name}</h3>
              <p className="popular-item-price">R$ {item.price.toFixed(2)}</p>
              
              <button 
                className="add-to-cart-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(item);
                }}
                aria-label="Adicionar ao carrinho"
              >
                <FontAwesomeIcon icon={faCartPlus} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularItems;
