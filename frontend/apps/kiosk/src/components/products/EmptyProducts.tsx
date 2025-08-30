import { memo } from 'react';
import { Package } from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';

interface EmptyProductsProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  className?: string;
}

/**
 * Empty products state component
 */
export const EmptyProducts = memo<EmptyProductsProps>(({ 
  searchTerm,
  onClearSearch,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <Package className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <Text variant="h3" className="text-gray-500 dark:text-gray-400 mb-4">
        {searchTerm 
          ? `Nenhum produto encontrado para "${searchTerm}"`
          : 'Nenhum produto disponível no momento'}
      </Text>
      {searchTerm && onClearSearch && (
        <TouchButton
          onClick={onClearSearch}
          variant="outline"
          size="medium"
        >
          Limpar busca
        </TouchButton>
      )}
    </div>
  );
});