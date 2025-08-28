import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  fullWidth?: boolean;
  error?: boolean;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  fullWidth = false,
  error = false,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = `
    min-h-[44px] px-3 py-2 rounded-lg border
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    transition-colors duration-150
  `;
  
  const borderClasses = error
    ? 'border-danger-500 focus:ring-danger-500'
    : 'border-gray-300 dark:border-gray-600';
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`${baseClasses} ${borderClasses} ${widthClass}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-danger-600' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};