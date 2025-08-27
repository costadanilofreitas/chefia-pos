import React, { memo } from 'react';

interface NumericKeypadProps {
  onNumberClick?: (num: string) => void;
  onClear?: () => void;
  onBackspace?: () => void;
  onEnter?: () => void;
  onDecimal?: () => void;
  showClear?: boolean;
  showBackspace?: boolean;
  showEnter?: boolean;
  showDecimal?: boolean;
  enterText?: string;
  enterDisabled?: boolean;
  disabled?: boolean;
  className?: string;
  layout?: 'calculator' | 'phone' | 'custom';
  customKeys?: string[][];
}

const NumericKeypadComponent: React.FC<NumericKeypadProps> = ({
  onNumberClick,
  onClear,
  onBackspace,
  onEnter,
  onDecimal,
  showClear = true,
  showBackspace = true,
  showEnter = false,
  showDecimal = true,
  enterText = 'Enter',
  enterDisabled = false,
  disabled = false,
  className = '',
  layout = 'calculator',
  customKeys
}) => {
  // Define key layouts
  const getKeys = () => {
    if (customKeys) return customKeys;
    
    switch (layout) {
      case 'phone': {
        const leftButton = showClear ? 'C' : '';
        const rightButton = showBackspace ? '⌫' : '';
        return [
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          [leftButton, '0', rightButton]
        ];
      }
      case 'calculator':
      default: {
        let leftButton = '';
        if (showClear) {
          leftButton = 'C';
        } else if (showDecimal) {
          leftButton = '.';
        }
        
        let rightButton = '';
        if (showBackspace) {
          rightButton = '⌫';
        } else if (showDecimal && !showClear) {
          rightButton = '.';
        }
        
        return [
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          [leftButton, '0', rightButton]
        ];
      }
    }
  };

  const handleKeyPress = (key: string) => {
    if (disabled) return;
    
    switch (key) {
      case 'C':
        onClear?.();
        break;
      case '⌫':
      case '←':
        onBackspace?.();
        break;
      case '.':
        if (onDecimal) {
          onDecimal();
        } else {
          onNumberClick?.('.');
        }
        break;
      case '':
        // Empty key, do nothing
        break;
      default:
        onNumberClick?.(key);
    }
  };

  const getButtonClass = (key: string) => {
    const baseClass = "h-14 rounded-xl font-bold text-lg transition-all transform active:scale-95";
    
    if (disabled) {
      return `${baseClass} opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500`;
    }
    
    switch (key) {
      case 'C':
        return `${baseClass} bg-red-500 hover:bg-red-600 text-white shadow-lg`;
      case '⌫':
      case '←':
        return `${baseClass} bg-orange-500 hover:bg-orange-600 text-white shadow-lg`;
      case '':
        return `${baseClass} invisible`;
      default:
        return `${baseClass} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white shadow-md`;
    }
  };

  const keys = getKeys();

  return (
    <div className={className} role="group" aria-label="Teclado numérico">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((row, rowIndex) => (
          row.map((key, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}-${key}`}
              type="button"
              onClick={() => handleKeyPress(key)}
              disabled={disabled || key === ''}
              className={getButtonClass(key)}
              aria-label={
                key === 'C' ? 'Limpar' : 
                key === '⌫' ? 'Apagar' : 
                key === '.' ? 'Ponto decimal' :
                `Número ${key}`
              }
            >
              {key}
            </button>
          ))
        ))}
      </div>
      
      {showEnter && (
        <button
          type="button"
          onClick={onEnter}
          disabled={disabled || enterDisabled}
          className={`
            w-full mt-3 h-14 rounded-xl font-bold text-lg text-white transition-all transform active:scale-95
            ${disabled || enterDisabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 shadow-lg'
            }
          `}
        >
          {enterText}
        </button>
      )}
    </div>
  );
};

export const NumericKeypad = memo(NumericKeypadComponent);
export default NumericKeypad;