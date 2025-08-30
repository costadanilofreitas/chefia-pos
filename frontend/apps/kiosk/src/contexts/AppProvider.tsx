import React, { ReactNode } from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { OrderProvider } from './OrderContext';
import { TerminalConfigProvider } from './TerminalConfigContext';

interface AppProviderProps {
  children: ReactNode;
  taxRate?: number;
}

/**
 * AppProvider combines all context providers in the correct order.
 * The order matters when contexts depend on each other.
 * 
 * Note: Hooks should be imported directly from their respective context files
 * to avoid Fast Refresh issues in Vite.
 */
export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  taxRate = 0.1 
}) => {
  return (
    <TerminalConfigProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider taxRate={taxRate}>
            <OrderProvider>
              {children}
            </OrderProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </TerminalConfigProvider>
  );
};