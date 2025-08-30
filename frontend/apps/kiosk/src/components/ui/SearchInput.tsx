import { memo, forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  fullWidth?: boolean;
}

const SearchInputComponent = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, fullWidth = false, className, placeholder = 'Buscar...', ...props }, ref) => {
    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        const event = {
          target: { value: '' }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }
    };

    return (
      <div className={clsx('relative', fullWidth && 'w-full', className)}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={clsx(
            'block pl-10 pr-10 py-3',
            'border border-gray-300 dark:border-gray-600',
            'rounded-lg',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'placeholder-gray-500 dark:placeholder-gray-400',
            'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'transition-colors duration-200',
            'min-h-[44px]',
            fullWidth && 'w-full'
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label="Limpar busca"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>
    );
  }
);

SearchInputComponent.displayName = 'SearchInput';

export const SearchInput = memo(SearchInputComponent);
export default SearchInput;