import { memo } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  className?: string;
}

/**
 * Cart summary component for displaying order totals
 */
export const CartSummary = memo<CartSummaryProps>(({ 
  subtotal, 
  tax, 
  discount = 0, 
  total,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      
      {tax > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Taxa de serviço:</span>
          <span>{formatCurrency(tax)}</span>
        </div>
      )}
      
      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
          <span>Desconto:</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      
      <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-gray-700">
        <span>Total:</span>
        <span className="text-green-600 dark:text-green-400">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
});