import React from 'react';
import tokens from '../styles/tokens';

/**
 * Button component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {string} [props.variant='primary'] - Button variant (primary, secondary, text, outlined)
 * @param {string} [props.size='medium'] - Button size (small, medium, large)
 * @param {boolean} [props.fullWidth=false] - Whether button should take full width
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {boolean} [props.loading=false] - Whether button is in loading state
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.type='button'] - Button type attribute
 * @param {string} [props.className] - Additional CSS class names
 */
const Button = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) => {
  // Determine styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: tokens.colors.primary.main,
          color: tokens.colors.primary.contrastText,
          border: 'none',
          '&:hover': {
            backgroundColor: tokens.colors.primary.dark,
          },
          '&:active': {
            backgroundColor: tokens.colors.primary.dark,
          },
        };
      case 'secondary':
        return {
          backgroundColor: tokens.colors.secondary.main,
          color: tokens.colors.secondary.contrastText,
          border: 'none',
          '&:hover': {
            backgroundColor: tokens.colors.secondary.dark,
          },
          '&:active': {
            backgroundColor: tokens.colors.secondary.dark,
          },
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.primary.main,
          border: `1px solid ${tokens.colors.primary.main}`,
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
          '&:active': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.primary.main,
          border: 'none',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
          '&:active': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
        };
      default:
        return {
          backgroundColor: tokens.colors.primary.main,
          color: tokens.colors.primary.contrastText,
          border: 'none',
        };
    }
  };

  // Determine styles based on size
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '6px 16px',
          fontSize: tokens.typography.fontSize.sm,
        };
      case 'large':
        return {
          padding: '12px 24px',
          fontSize: tokens.typography.fontSize.lg,
        };
      case 'medium':
      default:
        return {
          padding: '8px 20px',
          fontSize: tokens.typography.fontSize.md,
        };
    }
  };

  // Base styles
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxSizing: 'border-box',
    outline: 0,
    margin: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    verticalAlign: 'middle',
    appearance: 'none',
    textDecoration: 'none',
    fontFamily: tokens.typography.fontFamily,
    fontWeight: tokens.typography.fontWeightMedium,
    lineHeight: 1.75,
    borderRadius: tokens.borderRadius.md,
    transition: `background-color ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
    ...getVariantStyles(),
    ...getSizeStyles(),
  };

  // Convert styles object to CSS string
  const styleToString = (style) => {
    return Object.entries(style).map(([key, value]) => {
      // Handle nested styles like &:hover
      if (typeof value === 'object' && value !== null) {
        return '';
      }
      // Convert camelCase to kebab-case
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabKey}: ${value};`;
    }).join(' ');
  };

  // Create class name
  const buttonClass = `pos-button pos-button-${variant} pos-button-${size} ${fullWidth ? 'pos-button-full-width' : ''} ${disabled ? 'pos-button-disabled' : ''} ${loading ? 'pos-button-loading' : ''} ${className}`;

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      style={baseStyles}
      {...rest}
    >
      {loading ? (
        <>
          <span className="pos-button-loading-indicator" />
          <span style={{ visibility: 'hidden' }}>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
