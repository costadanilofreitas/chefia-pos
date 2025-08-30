import React, { memo, useCallback } from 'react';
import { ArrowLeft, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { TouchButton } from '../components/ui/TouchButton';
import { Text } from '../components/ui/Text';
import { Badge } from '../components/ui/Badge';
import { CartItem } from '../components/cart/CartItem';
import { CartSummary } from '../components/cart/CartSummary';
import { EmptyCart } from '../components/cart/EmptyCart';
import { offlineStorage } from '../services/offlineStorage';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

/**
 * Cart sidebar component integrated with CartContext
 * Provides cart management functionality in a slide-out panel
 */
const CartSidebarComponent: React.FC<CartSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onCheckout 
}) => {
  const { cart, updateQuantity, removeItem, clearCart, getItemTotal } = useCart();

  // Handle quantity update
  const handleQuantityUpdate = useCallback((itemId: string, delta: number) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    
    if (newQuantity <= 0) {
      removeItem(itemId);
      offlineStorage.trackAction('cart_item_removed', { 
        itemId, 
        productName: item.name 
      });
    } else {
      updateQuantity(itemId, newQuantity);
      offlineStorage.trackAction('cart_quantity_updated', { 
        itemId, 
        productName: item.name,
        oldQuantity: item.quantity,
        newQuantity 
      });
    }
  }, [cart.items, updateQuantity, removeItem]);

  // Handle item removal
  const handleRemoveItem = useCallback((itemId: string) => {
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
      removeItem(itemId);
      offlineStorage.trackAction('cart_item_removed', { 
        itemId, 
        productName: item.name 
      });
    }
  }, [cart.items, removeItem]);

  // Handle clear cart
  const handleClearCart = useCallback(() => {
    if (cart.itemCount > 0 && window.confirm('Deseja limpar o carrinho?')) {
      clearCart();
      offlineStorage.trackAction('cart_cleared', { 
        itemCount: cart.itemCount,
        total: cart.total 
      });
    }
  }, [cart.itemCount, cart.total, clearCart]);

  // Handle checkout
  const handleCheckout = useCallback(() => {
    if (cart.itemCount === 0) return;
    
    offlineStorage.trackAction('checkout_initiated', { 
      itemCount: cart.itemCount,
      total: cart.total 
    });
    onCheckout();
  }, [cart.itemCount, cart.total, onCheckout]);


  // Render empty state
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black transition-opacity z-40
          ${isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Sidebar - Responsive width */}
      <div className={`
        fixed right-0 top-0 h-full w-full sm:w-96 md:w-[400px] lg:w-[450px] xl:w-[500px]
        bg-white dark:bg-gray-800 
        shadow-xl z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <TouchButton
              onClick={onClose}
              variant="ghost"
              size="small"
              aria-label="Fechar carrinho"
            >
              <ArrowLeft className="w-5 h-5" />
            </TouchButton>
            <Text variant="h3" className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Seu Carrinho
              {cart.itemCount > 0 && (
                <Badge variant="primary">{cart.itemCount}</Badge>
              )}
            </Text>
          </div>
          
          {cart.itemCount > 0 && (
            <TouchButton
              onClick={handleClearCart}
              variant="ghost"
              size="small"
              aria-label="Limpar carrinho"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </TouchButton>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          {cart.itemCount === 0 ? (
            <EmptyCart onAddProducts={onClose} />
          ) : (
            <div className="p-4 space-y-4">
              {cart.items.map((item) => {
                // Transform customizations to match CartItemData format
                const transformedItem = {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  customizations: [
                    ...(item.customizations?.additions?.map(a => ({
                      name: a.name,
                      price_adjustment: a.price
                    })) || []),
                    ...(item.customizations?.removals?.map(r => ({
                      name: `Sem ${r.name}`,
                      price_adjustment: 0
                    })) || [])
                  ],
                  ...(item.customizations?.notes && { notes: item.customizations.notes })
                };
                
                return (
                  <CartItem
                    key={item.id}
                    item={transformedItem}
                    itemTotal={getItemTotal(item)}
                    onQuantityChange={handleQuantityUpdate}
                    onRemove={handleRemoveItem}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with totals and actions */}
        {cart.itemCount > 0 && (
          <div className="border-t dark:border-gray-700 p-4">
            <CartSummary
              subtotal={cart.subtotal}
              tax={cart.tax}
              discount={cart.discount}
              total={cart.total}
              className="mb-4"
            />

            {/* Actions */}
            <div className="flex gap-2">
              <TouchButton
                onClick={onClose}
                variant="outline"
                size="large"
                className="flex-1"
              >
                Continuar Comprando
              </TouchButton>
              <TouchButton
                onClick={handleCheckout}
                variant="primary"
                size="large"
                className="flex-1"
                disabled={cart.itemCount === 0}
              >
                Finalizar Pedido
              </TouchButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export const CartSidebar = memo(CartSidebarComponent);
export default CartSidebar;