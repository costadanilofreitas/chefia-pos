import { memo, useRef, useEffect } from 'react';
import { Home, Search as SearchIcon, X, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TouchButton } from '../ui/TouchButton';
import { Text } from '../ui/Text';
import { formatCurrency } from '../../utils/formatters';
import { useTerminalConfig } from '../../contexts/TerminalConfigContext';

interface KioskHeaderProps {
  title?: string;
  cartItemCount: number;
  cartTotal: number;
  isDarkMode: boolean;
  showSearch: boolean;
  searchTerm: string;
  onHome: () => void;
  onToggleSearch: () => void;
  onToggleDarkMode: () => void;
  onCartClick: () => void;
  onSearchChange: (term: string) => void;
  className?: string;
}

/**
 * Kiosk application header component
 */
export const KioskHeader = memo<KioskHeaderProps>(({ 
  title: _title = 'Kiosk Self-Service',
  cartItemCount,
  cartTotal,
  isDarkMode: _isDarkMode,
  showSearch,
  searchTerm,
  onHome,
  onToggleSearch,
  onToggleDarkMode: _onToggleDarkMode,
  onCartClick,
  onSearchChange,
  className = ''
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { config: terminalConfig } = useTerminalConfig();
  const bannerConfig = terminalConfig?.ui?.layout?.headerBanner;

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <header className={`bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40 ${className}`}>
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Home Button */}
          <TouchButton
            onClick={onHome}
            variant="ghost"
            size="medium"
            aria-label="Início"
            className="p-2 sm:p-3 flex-shrink-0"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          </TouchButton>

          {/* Center Area - Banner or Search */}
          <div className="flex-1 flex items-center">
            <AnimatePresence mode="wait">
              {showSearch ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar produtos..."
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg 
                              text-gray-900 dark:text-white placeholder-gray-500 
                              focus:outline-none focus:ring-2 focus:ring-primary-500
                              text-sm sm:text-base"
                  />
                  <TouchButton
                    onClick={onToggleSearch}
                    variant="ghost"
                    size="small"
                    aria-label="Fechar busca"
                    className="p-2"
                  >
                    <X className="w-5 h-5" />
                  </TouchButton>
                </motion.div>
              ) : (
                <motion.div
                  key="banner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  {bannerConfig?.enabled ? (
                    <div 
                      className="w-full px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: bannerConfig.backgroundColor || '#ef4444',
                        color: bannerConfig.textColor || '#ffffff'
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {bannerConfig.icon && <span className="text-sm sm:text-base">{bannerConfig.icon}</span>}
                        <Text variant="small" className="font-semibold text-xs sm:text-sm lg:text-base">
                          {bannerConfig.text}
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      {/* Empty space when no banner */}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search Toggle */}
            {!showSearch && (
              <TouchButton
                onClick={onToggleSearch}
                variant="ghost"
                size="medium"
                aria-label="Buscar"
                className="p-2 sm:p-3"
              >
                <SearchIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </TouchButton>
            )}

            {/* Cart Button */}
            <TouchButton
              onClick={onCartClick}
              variant="primary"
              size="medium"
              className="relative p-2 sm:p-3"
              aria-label="Carrinho"
            >
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
              <span className="ml-1 sm:ml-2 text-sm sm:text-base">{formatCurrency(cartTotal)}</span>
            </TouchButton>
          </div>
        </div>
      </div>
    </header>
  );
});