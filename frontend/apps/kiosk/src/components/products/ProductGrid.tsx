import { memo } from 'react';
import { ProductCard } from '../ProductCard';
import { Product } from '../../services/productService';

interface ProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  isInCart?: (productId: string) => boolean;
  className?: string;
}

/**
 * Product grid layout component
 */
export const ProductGrid = memo<ProductGridProps>(({ 
  products, 
  onProductSelect,
  isInCart,
  className = ''
}) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 ${className}`}>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={() => onProductSelect(product)}
          inCart={isInCart ? isInCart(product.id) : false}
        />
      ))}
    </div>
  );
});