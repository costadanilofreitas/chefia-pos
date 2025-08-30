import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Types
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: {
    additions?: Array<{ id: string; name: string; price: number }>;
    removals?: Array<{ id: string; name: string }>;
    notes?: string;
  };
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
}

interface CartContextType {
  cart: Cart;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getItemById: (itemId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;
  getItemTotal: (item: CartItem) => number;
  updateCustomizations: (itemId: string, customizations: CartItem['customizations']) => void;
  updateNotes: (itemId: string, notes: string) => void;
}

interface CartProviderProps {
  children: ReactNode;
  taxRate?: number;
}

// Constants
const CART_STORAGE_KEY = 'kiosk-cart';
const DEFAULT_TAX_RATE = 0.1; // 10%

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper function to calculate cart totals
const calculateCartTotals = (items: CartItem[], taxRate: number): Cart => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * taxRate;
  const discount = 0; // Can be calculated based on business rules
  const total = subtotal + tax - discount;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    subtotal,
    tax,
    discount,
    total,
    itemCount
  };
};

// Provider component
export const CartProvider: React.FC<CartProviderProps> = ({ 
  children, 
  taxRate = DEFAULT_TAX_RATE 
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // Load cart from session storage on mount
    try {
      const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Silent fail - remove corrupted cart data
      sessionStorage.removeItem(CART_STORAGE_KEY);
    }
    return [];
  });

  // Save cart to session storage when it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } else {
      sessionStorage.removeItem(CART_STORAGE_KEY);
    }
  }, [cartItems]);

  const addItem = useCallback((item: Omit<CartItem, 'id' | 'subtotal'>) => {
    setCartItems(prevItems => {
      // Check if item with same product and customizations exists
      const existingItemIndex = prevItems.findIndex(
        cartItem => 
          cartItem.productId === item.productId &&
          JSON.stringify(cartItem.customizations) === JSON.stringify(item.customizations)
      );

      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        if (!existingItem) return prevItems;
        
        const customizationsCost = item.customizations?.additions?.reduce((sum, add) => sum + add.price, 0) || 0;
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + item.quantity,
          subtotal: (existingItem.quantity + item.quantity) * (item.price + customizationsCost)
        };
        return updatedItems;
      }

      // Add new item
      const customizationsCost = item.customizations?.additions?.reduce((sum, add) => sum + add.price, 0) || 0;
      const itemPrice = item.price + customizationsCost;
      const newItem: CartItem = {
        id: `cart-item-${Date.now()}-${Math.random()}`,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        ...(item.customizations && { customizations: item.customizations }),
        subtotal: itemPrice * item.quantity
      };

      return [...prevItems, newItem];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          const customizationsCost = item.customizations?.additions?.reduce((sum, add) => sum + add.price, 0) || 0;
          const itemPrice = item.price + customizationsCost;
          return {
            ...item,
            quantity,
            subtotal: itemPrice * quantity
          };
        }
        return item;
      })
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    sessionStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const getItemById = useCallback((itemId: string): CartItem | undefined => {
    return cartItems.find(item => item.id === itemId);
  }, [cartItems]);

  const isInCart = useCallback((productId: string): boolean => {
    return cartItems.some(item => item.productId === productId);
  }, [cartItems]);

  const getItemTotal = useCallback((item: CartItem): number => {
    return item.subtotal;
  }, []);

  const updateCustomizations = useCallback((itemId: string, customizations: CartItem['customizations']) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          const customizationsCost = customizations?.additions?.reduce((sum, add) => sum + add.price, 0) || 0;
          const itemPrice = item.price + customizationsCost;
          return {
            ...item,
            ...(customizations ? { customizations } : {}),
            subtotal: itemPrice * item.quantity
          };
        }
        return item;
      })
    );
  }, []);

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            customizations: {
              ...item.customizations,
              notes
            }
          };
        }
        return item;
      })
    );
  }, []);

  // Calculate cart totals
  const cart = calculateCartTotals(cartItems, taxRate);

  const value: CartContextType = {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItemById,
    isInCart,
    getItemTotal,
    updateCustomizations,
    updateNotes
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Export context for testing purposes
export { CartContext };