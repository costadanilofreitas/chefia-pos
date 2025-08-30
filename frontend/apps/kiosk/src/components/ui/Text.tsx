import { memo } from 'react';
import { clsx } from 'clsx';

interface TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'small' | 'caption' | 'overline';
  component?: keyof JSX.IntrinsicElements;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'inherit';
  align?: 'left' | 'center' | 'right' | 'justify';
  noWrap?: boolean;
  gutterBottom?: boolean;
  className?: string;
  children: React.ReactNode;
}

const TextComponent: React.FC<TextProps> = ({
  variant = 'body',
  component,
  color = 'inherit',
  align = 'left',
  noWrap = false,
  gutterBottom = false,
  className,
  children
}) => {
  const variantStyles = {
    h1: 'text-4xl font-bold tracking-tight',
    h2: 'text-3xl font-bold tracking-tight',
    h3: 'text-2xl font-semibold',
    h4: 'text-xl font-semibold',
    h5: 'text-lg font-medium',
    h6: 'text-base font-medium',
    body: 'text-base',
    small: 'text-sm',
    caption: 'text-xs text-gray-600 dark:text-gray-400',
    overline: 'text-xs uppercase tracking-wider font-medium'
  };

  const colorStyles = {
    primary: 'text-primary-600 dark:text-primary-400',
    secondary: 'text-secondary-600 dark:text-secondary-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
    inherit: ''
  };

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  };

  const defaultComponents: Record<string, keyof JSX.IntrinsicElements> = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    body: 'p',
    small: 'span',
    caption: 'span',
    overline: 'span'
  };

  const Component = component || defaultComponents[variant] || 'span';

  return (
    <Component
      className={clsx(
        variantStyles[variant],
        colorStyles[color],
        alignStyles[align],
        noWrap && 'truncate',
        gutterBottom && 'mb-4',
        className
      )}
    >
      {children}
    </Component>
  );
};

export const Text = memo(TextComponent);
export default Text;