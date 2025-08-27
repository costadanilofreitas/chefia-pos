import React, { memo } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  available?: boolean;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isHighlighted?: boolean;
  speedMode?: boolean;
  className?: string;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isHighlighted = false,
  speedMode = false,
  className = ''
}) => {
  const handleClick = () => {
    if (product.available) {
      onAddToCart(product);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={product.available === false}
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg
        transition-all duration-200 p-4 text-left group
        ${product.available === false ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${isHighlighted ? 'ring-2 ring-green-500 animate-pulse' : ''}
        ${className}
      `}
    >
      {/* Quick add indicator for speed mode */}
      {speedMode && product.available && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
          Adição rápida
        </div>
      )}
      
      {/* Product image */}
      {product.image_url && (
        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      
      {/* Product info */}
      <div className="flex flex-col">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(product.price)}
          </span>
          
          {product.available === false && (
            <span className="text-xs text-red-500 dark:text-red-400">
              Indisponível
            </span>
          )}
        </div>
      </div>
      
      {/* Hover effect */}
      {product.available && (
        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity" />
      )}
    </button>
  );
};

export const ProductCard = memo(ProductCardComponent);
export default ProductCard;