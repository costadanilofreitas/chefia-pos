import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactNode } from 'react';
import { CartProvider, useCart, CartItem } from '../../src/contexts/CartContext';

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('CartContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  beforeEach(() => {
    sessionStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('initializes with empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.subtotal).toBe(0);
      expect(result.current.cart.tax).toBe(0);
      expect(result.current.cart.discount).toBe(0);
      expect(result.current.cart.total).toBe(0);
      expect(result.current.cart.itemCount).toBe(0);
    });

    test('loads cart from sessionStorage if available', () => {
      const savedCart: CartItem[] = [
        {
          id: 'cart-1',
          productId: 'prod-1',
          name: 'Saved Product',
          price: 10,
          quantity: 2,
          subtotal: 20,
        },
      ];

      sessionStorageMock.setItem('kiosk-cart', JSON.stringify(savedCart));

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].name).toBe('Saved Product');
      expect(result.current.cart.itemCount).toBe(2);
    });

    test('handles corrupted sessionStorage data gracefully', () => {
      sessionStorageMock.setItem('kiosk-cart', 'invalid json');

      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.cart.items).toHaveLength(0);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('kiosk-cart');
    });
  });

  describe('Adding Items', () => {
    test('adds new item to cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].name).toBe('Pizza');
      expect(result.current.cart.items[0].quantity).toBe(1);
      expect(result.current.cart.items[0].subtotal).toBe(25);
      expect(result.current.cart.itemCount).toBe(1);
    });

    test('adds item with customizations', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Burger',
          price: 20,
          quantity: 1,
          customizations: {
            additions: [
              { id: 'add-1', name: 'Extra Cheese', price: 3 },
              { id: 'add-2', name: 'Bacon', price: 5 },
            ],
            removals: [{ id: 'rem-1', name: 'Pickles' }],
            notes: 'Well done',
          },
        });
      });

      const item = result.current.cart.items[0];
      expect(item.customizations?.additions).toHaveLength(2);
      expect(item.customizations?.removals).toHaveLength(1);
      expect(item.customizations?.notes).toBe('Well done');
      expect(item.subtotal).toBe(28); // 20 + 3 + 5
    });

    test('increases quantity when adding same item without customizations', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 2,
        });
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].quantity).toBe(3);
      expect(result.current.cart.items[0].subtotal).toBe(75);
    });

    test('adds as separate item when customizations differ', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Burger',
          price: 20,
          quantity: 1,
          customizations: {
            additions: [{ id: 'add-1', name: 'Cheese', price: 3 }],
          },
        });
      });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Burger',
          price: 20,
          quantity: 1,
          customizations: {
            additions: [{ id: 'add-2', name: 'Bacon', price: 5 }],
          },
        });
      });

      expect(result.current.cart.items).toHaveLength(2);
    });

    test('generates unique IDs for cart items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Item 1',
          price: 10,
          quantity: 1,
        });
        result.current.addItem({
          productId: 'prod-2',
          name: 'Item 2',
          price: 15,
          quantity: 1,
        });
      });

      const ids = result.current.cart.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(2); // All IDs should be unique
    });
  });

  describe('Updating Quantity', () => {
    test('updates item quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 3);
      });

      expect(result.current.cart.items[0].quantity).toBe(3);
      expect(result.current.cart.items[0].subtotal).toBe(75);
      expect(result.current.cart.itemCount).toBe(3);
    });

    test('removes item when quantity is set to 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 2,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 0);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });

    test('removes item when quantity is negative', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 2,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, -1);
      });

      expect(result.current.cart.items).toHaveLength(0);
    });

    test('updates subtotal with customizations when quantity changes', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Burger',
          price: 20,
          quantity: 1,
          customizations: {
            additions: [{ id: 'add-1', name: 'Cheese', price: 5 }],
          },
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateQuantity(itemId, 2);
      });

      expect(result.current.cart.items[0].subtotal).toBe(50); // (20 + 5) * 2
    });
  });

  describe('Removing Items', () => {
    test('removes item from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 2,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.removeItem(itemId);
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.itemCount).toBe(0);
    });

    test('only removes specified item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
        result.current.addItem({
          productId: 'prod-2',
          name: 'Burger',
          price: 20,
          quantity: 1,
        });
      });

      const firstItemId = result.current.cart.items[0].id;

      act(() => {
        result.current.removeItem(firstItemId);
      });

      expect(result.current.cart.items).toHaveLength(1);
      expect(result.current.cart.items[0].name).toBe('Burger');
    });
  });

  describe('Clearing Cart', () => {
    test('clears all items from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 2,
        });
        result.current.addItem({
          productId: 'prod-2',
          name: 'Burger',
          price: 20,
          quantity: 1,
        });
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart.items).toHaveLength(0);
      expect(result.current.cart.itemCount).toBe(0);
      expect(result.current.cart.total).toBe(0);
    });

    test('removes cart from sessionStorage when cleared', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      act(() => {
        result.current.clearCart();
      });

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('kiosk-cart');
    });
  });

  describe('Utility Functions', () => {
    test('getItemById returns correct item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      const itemId = result.current.cart.items[0].id;
      const item = result.current.getItemById(itemId);

      expect(item?.name).toBe('Pizza');
    });

    test('getItemById returns undefined for non-existent item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const item = result.current.getItemById('non-existent-id');
      expect(item).toBeUndefined();
    });

    test('isInCart returns true for existing product', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      expect(result.current.isInCart('prod-1')).toBe(true);
    });

    test('isInCart returns false for non-existent product', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.isInCart('non-existent')).toBe(false);
    });

    test('getItemTotal returns correct total', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const item: CartItem = {
        id: 'test-1',
        productId: 'prod-1',
        name: 'Pizza',
        price: 25,
        quantity: 2,
        subtotal: 50,
      };

      expect(result.current.getItemTotal(item)).toBe(50);
    });
  });

  describe('Customizations', () => {
    test('updateCustomizations updates item customizations', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Burger',
          price: 20,
          quantity: 1,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateCustomizations(itemId, {
          additions: [{ id: 'add-1', name: 'Cheese', price: 3 }],
          notes: 'No onions',
        });
      });

      const item = result.current.cart.items[0];
      expect(item.customizations?.additions).toHaveLength(1);
      expect(item.customizations?.notes).toBe('No onions');
      expect(item.subtotal).toBe(23); // 20 + 3
    });

    test('updateNotes updates item notes', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.updateNotes(itemId, 'Extra crispy');
      });

      expect(result.current.cart.items[0].customizations?.notes).toBe('Extra crispy');
    });
  });

  describe('Cart Calculations', () => {
    test('calculates cart totals correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 2,
        });
        result.current.addItem({
          productId: 'prod-2',
          name: 'Burger',
          price: 20,
          quantity: 1,
        });
      });

      expect(result.current.cart.subtotal).toBe(70); // (25*2) + 20
      expect(result.current.cart.tax).toBe(7); // 10% of 70
      expect(result.current.cart.discount).toBe(0);
      expect(result.current.cart.total).toBe(77); // 70 + 7
      expect(result.current.cart.itemCount).toBe(3); // 2 + 1
    });

    test('calculates with custom tax rate', () => {
      const customWrapper = ({ children }: { children: ReactNode }) => (
        <CartProvider taxRate={0.15}>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper: customWrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 100,
          quantity: 1,
        });
      });

      expect(result.current.cart.subtotal).toBe(100);
      expect(result.current.cart.tax).toBe(15); // 15% of 100
      expect(result.current.cart.total).toBe(115);
    });
  });

  describe('Session Storage Persistence', () => {
    test('saves cart to sessionStorage when items are added', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'kiosk-cart',
        expect.stringContaining('"name":"Pizza"')
      );
    });

    test('removes from sessionStorage when cart is empty', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          productId: 'prod-1',
          name: 'Pizza',
          price: 25,
          quantity: 1,
        });
      });

      const itemId = result.current.cart.items[0].id;

      act(() => {
        result.current.removeItem(itemId);
      });

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('kiosk-cart');
    });
  });

  describe('Error Handling', () => {
    test('throws error when useCart is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useCart());
      }).toThrow('useCart must be used within a CartProvider');

      consoleError.mockRestore();
    });
  });
});