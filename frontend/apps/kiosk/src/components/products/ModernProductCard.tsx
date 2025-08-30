import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';
import { CachedImage } from '../ui/CachedImage';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { formatCurrency } from '../../utils/formatters';

interface ModernProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category?: string;
  prepTime?: number; // in minutes
  rating?: number;
  isPromotion?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isSoldOut?: boolean;
  onSelect: () => void;
  isInCart?: boolean;
  className?: string;
}

/**
 * Modern product card with Goomer-inspired design
 */
export const ModernProductCard = memo<ModernProductCardProps>(({
  id: _id,
  name,
  description,
  price,
  originalPrice,
  image,
  category,
  prepTime,
  rating,
  isPromotion,
  isFeatured,
  isNew,
  isSoldOut,
  onSelect,
  isInCart,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const haptic = useHapticFeedback();

  const handleClick = () => {
    if (!isSoldOut) {
      haptic.medium();
      onSelect();
    }
  };

  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <motion.article
      className={`
        relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden
        shadow-lg hover:shadow-2xl transition-all duration-300
        ${isSoldOut ? 'opacity-60' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={{ scale: isSoldOut ? 1 : 1.02 }}
      whileTap={{ scale: isSoldOut ? 1 : 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
        {isNew && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md"
          >
            NOVO
          </motion.div>
        )}
        {isFeatured && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1"
          >
            <Star className="w-3 h-3 fill-current" />
            DESTAQUE
          </motion.div>
        )}
        {isPromotion && discount > 0 && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md"
          >
            -{discount}%
          </motion.div>
        )}
      </div>

      {/* In Cart Indicator */}
      {isInCart && (
        <div className="absolute top-3 right-3 z-20 bg-primary-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
          <span className="text-xs font-bold">✓</span>
        </div>
      )}

      {/* Image Container */}
      <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-700">
        {image && !imageError ? (
          <CachedImage
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 dark:text-gray-500">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-2" />
              <Text variant="h4" className="font-bold">
                Esgotado
              </Text>
            </div>
          </div>
        )}

        {/* Hover Overlay with Quick Add */}
        {!isSoldOut && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-center p-4 opacity-0"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <TouchButton
              variant="primary"
              size="medium"
              className="bg-white text-primary-600 hover:bg-gray-100 shadow-xl"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <Plus className="w-5 h-5" />
              Adicionar
            </TouchButton>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {category && (
          <Text variant="small" className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {category}
          </Text>
        )}

        {/* Name */}
        <Text variant="h4" className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {name}
        </Text>

        {/* Description */}
        {description && (
          <Text variant="small" className="text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
            {description}
          </Text>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 mb-3">
          {prepTime && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <Text variant="small">{prepTime} min</Text>
            </div>
          )}
          {rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <Text variant="small" className="font-semibold text-gray-700 dark:text-gray-300">
                {rating.toFixed(1)}
              </Text>
            </div>
          )}
          {isPromotion && (
            <div className="flex items-center gap-1 text-red-500">
              <TrendingUp className="w-4 h-4" />
              <Text variant="small" className="font-semibold">
                Oferta
              </Text>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            {originalPrice && originalPrice > price && (
              <Text variant="small" className="text-gray-400 line-through">
                {formatCurrency(originalPrice)}
              </Text>
            )}
            <Text variant="h3" className="font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(price)}
            </Text>
          </div>
          
          {/* Quick Add Button for Desktop */}
          {!isSoldOut && (
            <TouchButton
              variant="primary"
              size="small"
              className="hidden md:flex items-center gap-2 rounded-full px-4"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <Plus className="w-4 h-4" />
              <span className="font-semibold">Adicionar</span>
            </TouchButton>
          )}
        </div>
      </div>
    </motion.article>
  );
});

ModernProductCard.displayName = 'ModernProductCard';