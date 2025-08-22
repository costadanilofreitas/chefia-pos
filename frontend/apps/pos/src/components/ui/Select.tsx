import React from 'react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className,
    label,
    error,
    helperText,
    options,
    placeholder = 'Selecione...',
    fullWidth = false,
    size = 'md',
    id,
    required,
    disabled,
    value,
    ...props
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg'
    };
    
    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            className={cn(
              'block w-full border rounded-lg shadow-sm transition-all duration-75',
              'appearance-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800',
              error 
                ? 'border-red-500 text-red-900 dark:text-red-400' 
                : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
              'bg-white dark:bg-gray-700',
              sizes[size],
              'pr-10',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Dropdown icon */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;