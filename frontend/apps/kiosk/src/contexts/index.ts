/**
 * Central export file for all contexts and hooks
 * Import hooks from here instead of AppProvider to avoid Fast Refresh issues
 */

// Export providers
export { AppProvider } from './AppProvider';
export { ThemeProvider, useTheme } from './ThemeContext';
export { AuthProvider, useAuth } from './AuthContext';
export { CartProvider, useCart } from './CartContext';
export { OrderProvider, useOrder } from './OrderContext';
export { TerminalConfigProvider, useTerminalConfig } from './TerminalConfigContext';

// Export types
export type { User } from './AuthContext';
export type { CartItem, Cart } from './CartContext';
export type { Order, OrderStatus, PaymentMethod, OrderType } from './OrderContext';