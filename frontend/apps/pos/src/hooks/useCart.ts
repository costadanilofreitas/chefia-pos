import { useState, useCallback, useMemo } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  image_url?: string;
  available?: boolean;
  description?: string;
}

export interface UseCartReturn {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNote: (itemId: string, note: string) => void;
  clearCart: () => void;
  isEmpty: boolean;
}

export const useCart = (): UseCartReturn => {
  const [items, setItems] = useState<CartItem[]>([]);

  const totalItems = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalAmount = useMemo(() => 
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [items]
  );

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.productId === product.id);
      
      if (existingItem) {
        return currentItems.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity
      };
      
      return [...currentItems, newItem];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const updateNote = useCallback((itemId: string, note: string) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === itemId ? { ...item, notes: note || undefined } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    totalItems,
    totalAmount,
    addItem,
    removeItem,
    updateQuantity,
    updateNote,
    clearCart,
    isEmpty: items.length === 0
  };
};

export default useCart;