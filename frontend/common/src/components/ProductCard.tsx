import React from 'react';
import { formatCurrency } from '@common/utils/formatters';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category_id?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const handleClick = (): void => {
    onAddToCart(product);
  };

  return (
    <div className="product-card" onClick={handleClick}>
      {product.image_url && (
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="product-image"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/assets/placeholder-food.png';
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
