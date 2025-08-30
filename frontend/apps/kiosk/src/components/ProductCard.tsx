import { memo } from 'react';
import { ShoppingCart, Check, Clock, AlertCircle } from 'lucide-react';
import { Product } from '../services/productService';
import { formatCurrency } from '../utils/formatters';
import { CachedImage } from './ui/CachedImage';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  inCart?: boolean;
  className?: string;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({ 
  product, 
  onSelect,
  inCart = false,
  className = ''
}) => {
  const haptic = useHapticFeedback();
  
  const handleClick = (): void => {
    if (product.is_available) {
      haptic.light();
      onSelect(product);
    } else {
      haptic.error();
    }
  };

  // Format preparation time
  const formatPrepTime = (minutes?: number): string => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={!product.is_available}
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg shadow-md
        transition-all duration-200 p-4 text-left group w-full
        ${product.is_available 
          ? 'hover:shadow-lg hover:scale-105 active:scale-[0.98] cursor-pointer' 
          : 'opacity-60 cursor-not-allowed'
        }
        ${className}
      `}
      aria-label={`${product.is_available ? 'Adicionar' : 'Indisponível'} ${product.name}`}
    >
      {/* Availability badge */}
      {!product.is_available && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Indisponível
        </div>
      )}

      {/* In cart indicator */}
      {inCart && product.is_available && (
        <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" />
          No carrinho
        </div>
      )}

      {/* Featured badge */}
      {product.tags?.includes('featured') && (
        <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
          ⭐ Destaque
        </div>
      )}

      {/* Product image */}
      <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden">
        {product.image_url ? (
          <CachedImage
            src={product.image_url}
            alt={product.name}
            className={`
              w-full h-full
              ${!product.is_available ? 'filter grayscale' : ''}
            `}
            lazy
            blur
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-50">
              {product.category_id?.includes('bebida') ? '🥤' : 
               product.category_id?.includes('sobremesa') ? '🍰' : 
               product.category_id?.includes('combo') ? '🍱' : '🍔'}
            </span>
          </div>
        )}
      </div>
      
      {/* Product info */}
      <div className="flex flex-col">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Nutritional info preview */}
        {product.nutritional_info && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {product.nutritional_info.calories && (
              <span>{product.nutritional_info.calories} kcal</span>
            )}
          </div>
        )}

        {/* Preparation time */}
        {product.preparation_time && product.is_available && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <Clock className="w-3 h-3" />
            <span>{formatPrepTime(product.preparation_time)}</span>
          </div>
        )}
        
        {/* Price and action */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            {/* Variants price range */}
            {product.variants && product.variants.length > 0 ? (
              <>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  A partir de
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(Math.min(...product.variants.map(v => v.price)))}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          
          {product.is_available && (
            <span className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 font-medium">
              <ShoppingCart className="w-4 h-4" />
              {inCart ? 'Adicionar +' : 'Adicionar'}
            </span>
          )}
        </div>

        {/* Customizations indicator */}
        {product.customizations && product.customizations.length > 0 && (
          <div className="mt-2 pt-2 border-t dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ✨ Personalizável
            </span>
          </div>
        )}
      </div>
      
      {/* Hover effect */}
      {product.is_available && (
        <div className="absolute inset-0 bg-primary-500 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity pointer-events-none" />
      )}
    </button>
  );
};

export const ProductCard = memo(ProductCardComponent);
export default ProductCard;