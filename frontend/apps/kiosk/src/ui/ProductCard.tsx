// /home/ubuntu/pos-modern/frontend/apps/kiosk/src/ui/ProductCard.jsx

import React from 'react';
import { formatCurrency } from '@common/utils/formatters';

const ProductCard = ({ product, onAddToCart }) => {
  const handleClick = () => {
    onAddToCart(product);
  };

  return (
    <div className="product-card" onClick={handleClick}>
      {product.image_url && (
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="product-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/assets/placeholder-food.png';
          }}
        />
      )}
      {!product.image_url && (
        <div className="product-image-placeholder">
          <span className="placeholder-icon">🍔</span>
        </div>
      )}
      <div className="product-info">
        <div className="product-name">{product.name}</div>
        <div className="product-description">{product.description}</div>
        <div className="product-price">{formatCurrency(product.price)}</div>
      </div>
      <button className="add-to-cart-button">Adicionar</button>
    </div>
  );
};

export default ProductCard;
