import { memo } from 'react';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';

interface EmptyCartProps {
  onAddProducts: () => void;
  className?: string;
}

/**
 * Empty cart state component
 */
export const EmptyCart = memo<EmptyCartProps>(({ 
  onAddProducts,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center h-full p-8 ${className}`}>
      <ShoppingBag className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
      <Text variant="h3" className="text-gray-500 dark:text-gray-400 mb-2">
        Carrinho vazio
      </Text>
      <Text variant="body" className="text-gray-400 dark:text-gray-500 text-center mb-6">
        Adicione produtos ao seu carrinho para continuar
      </Text>
      <TouchButton
        onClick={onAddProducts}
        variant="primary"
        size="medium"
        className="flex items-center gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        Adicionar Produtos
      </TouchButton>
    </div>
  );
});