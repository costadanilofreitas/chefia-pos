import { memo } from 'react';
import { Text } from '../ui/Text';
import { ProductGrid } from './ProductGrid';
import { Product } from '../../services/productService';

interface ProductSectionProps {
  title: string;
  products: Product[];
  onProductSelect: (product: Product) => void;
  isInCart?: (productId: string) => boolean;
  className?: string;
}

/**
 * Product section component with title and grid
 */
export const ProductSection = memo<ProductSectionProps>(({ 
  title,
  products, 
  onProductSelect,
  isInCart,
  className = ''
}) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className={`mb-8 ${className}`}>
      <Text variant="h3" className="mb-4 text-gray-900 dark:text-white">
        {title}
      </Text>
      <ProductGrid
        products={products}
        onProductSelect={onProductSelect}
        {...(isInCart && { isInCart })}
      />
    </section>
  );
});