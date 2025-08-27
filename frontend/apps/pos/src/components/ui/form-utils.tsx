import React from 'react';
import { cn } from '../../utils/cn';

export interface FormFieldBaseProps {
  id?: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
}

export const generateFieldId = (prefix: string) => 
  `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

export const FormLabel: React.FC<{
  htmlFor: string;
  label: string;
  required?: boolean;
}> = ({ htmlFor, label, required }) => (
  <label 
    htmlFor={htmlFor}
    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
  >
    {label}
    {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
  </label>
);

export const FormError: React.FC<{ error?: string }> = ({ error }) => 
  error ? (
    <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
      {error}
    </p>
  ) : null;

export const FormHint: React.FC<{ hint?: string }> = ({ hint }) => 
  hint ? (
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      {hint}
    </p>
  ) : null;

export const getFormFieldClasses = (
  variant: 'default' | 'filled' | 'ghost' = 'default',
  error?: string,
  disabled?: boolean
) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-md transition-all duration-200';
  
  const variantClasses = {
    default: cn(
      'border-gray-300 dark:border-gray-600',
      'bg-white dark:bg-gray-800',
      'text-gray-900 dark:text-gray-100',
      'placeholder-gray-500 dark:placeholder-gray-400',
      !error && !disabled && 'hover:border-gray-400 dark:hover:border-gray-500',
      !error && !disabled && 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400',
      error && 'border-red-500 dark:border-red-400 focus:ring-red-500 focus:border-red-500',
      disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-700'
    ),
    filled: cn(
      'border-transparent',
      'bg-gray-100 dark:bg-gray-700',
      'text-gray-900 dark:text-gray-100',
      !error && !disabled && 'hover:bg-gray-200 dark:hover:bg-gray-600',
      !error && !disabled && 'focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500',
      error && 'bg-red-50 dark:bg-red-900/20 focus:ring-red-500',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    ghost: cn(
      'border-transparent',
      'bg-transparent',
      'text-gray-900 dark:text-gray-100',
      !error && !disabled && 'hover:bg-gray-100 dark:hover:bg-gray-700',
      !error && !disabled && 'focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500',
      error && 'text-red-600 dark:text-red-400',
      disabled && 'opacity-50 cursor-not-allowed'
    )
  };

  return cn(baseClasses, variantClasses[variant]);
};