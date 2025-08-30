import { memo } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';
import { formatCurrency } from '../../utils/formatters';

export interface CartItemData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: Array<{
    name: string;
    price_adjustment?: number;
  }>;
  notes?: string;
}

interface CartItemProps {
  item: CartItemData;
  itemTotal: number;
  onQuantityChange: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
}

/**
 * Cart item component for displaying individual items in the cart
 */
export const CartItem = memo<CartItemProps>(({ 
  item, 
  itemTotal,
  onQuantityChange, 
  onRemove 
}) => {
  // Calculate customizations cost
  const customizationsCost = item.customizations?.reduce((total, c) => 
    total + (c.price_adjustment || 0), 0) || 0;

  // Format item subtitle
  const subtitle = [
    item.customizations?.map(c => c.name).join(', '),
    item.notes && `Obs: ${item.notes}`
  ].filter(Boolean).join(' • ');

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      {/* Item header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <Text variant="body" className="font-semibold">
            {item.name}
          </Text>
          {subtitle && (
            <Text variant="small" className="text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </Text>
          )}
        </div>
        <TouchButton
          onClick={() => onRemove(item.id)}
          variant="ghost"
          size="small"
          aria-label={`Remover ${item.name}`}
        >
          <X className="w-4 h-4 text-red-500" />
        </TouchButton>
      </div>

      {/* Price breakdown */}
      <div className="text-sm space-y-1 mb-3">
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Preço unitário:</span>
          <span>{formatCurrency(item.price)}</span>
        </div>
        {customizationsCost > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Personalizações:</span>
            <span>+{formatCurrency(customizationsCost)}</span>
          </div>
        )}
      </div>

      {/* Quantity controls and total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TouchButton
            onClick={() => onQuantityChange(item.id, -1)}
            variant="outline"
            size="small"
            aria-label="Diminuir quantidade"
          >
            <Minus className="w-4 h-4" />
          </TouchButton>
          <Text variant="body" className="w-12 text-center">
            {item.quantity}
          </Text>
          <TouchButton
            onClick={() => onQuantityChange(item.id, 1)}
            variant="outline"
            size="small"
            aria-label="Aumentar quantidade"
          >
            <Plus className="w-4 h-4" />
          </TouchButton>
        </div>
        <Text variant="body" className="font-bold text-green-600 dark:text-green-400">
          {formatCurrency(itemTotal)}
        </Text>
      </div>
    </div>
  );
});