import React, { memo } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface CartItemData {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onAddNote?: (itemId: string, note: string) => void;
  className?: string;
}

const CartItemComponent: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onAddNote,
  className = ''
}) => {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(0, item.quantity + delta);
    if (newQuantity === 0) {
      onRemove(item.id);
    } else {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${className}`}>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {item.name}
        </h4>
        {item.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            📝 {item.notes}
          </p>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {formatCurrency(item.price)} x {item.quantity}
        </p>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <div className="flex items-center bg-white dark:bg-gray-600 rounded-lg">
          <button
            onClick={() => handleQuantityChange(-1)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-l-lg transition-colors"
            aria-label="Diminuir quantidade"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <span className="px-3 py-1 min-w-[40px] text-center font-semibold text-gray-900 dark:text-white">
            {item.quantity}
          </span>
          
          <button
            onClick={() => handleQuantityChange(1)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-r-lg transition-colors"
            aria-label="Aumentar quantidade"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          aria-label="Remover item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
        {onAddNote && (
          <button
            onClick={() => {
              const note = prompt('Adicionar observação:', item.notes || '');
              if (note !== null) {
                onAddNote(item.id, note);
              }
            }}
            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            aria-label="Adicionar observação"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="ml-3 text-right">
        <p className="font-bold text-gray-900 dark:text-white">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>
    </div>
  );
};

export const CartItem = memo(CartItemComponent);
export default CartItem;