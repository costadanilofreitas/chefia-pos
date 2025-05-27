import React from 'react';
import tokens from '../styles/tokens';

/**
 * Input component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {string} [props.type='text'] - Input type
 * @param {string} [props.label] - Input label
 * @param {string} [props.placeholder] - Input placeholder
 * @param {string} [props.value] - Input value
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Helper text
 * @param {boolean} [props.disabled=false] - Whether input is disabled
 * @param {boolean} [props.required=false] - Whether input is required
 * @param {boolean} [props.fullWidth=false] - Whether input should take full width
 * @param {string} [props.className] - Additional CSS class names
 */
const Input = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = false,
  className = '',
  ...rest
}) => {
  // Base styles
  const containerStyles = {
    display: 'inline-flex',
    flexDirection: 'column',
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: tokens.spacing.md,
  };

  const labelStyles = {
    marginBottom: tokens.spacing.xs,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeightMedium,
    color: error ? tokens.colors.semantic.error : tokens.colors.text.primary,
  };

  const inputStyles = {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.background.paper,
    border: `1px solid ${error ? tokens.colors.semantic.error : tokens.colors.border.medium}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    transition: `all ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    width: '100%',
    boxSizing: 'border-box',
    '&:focus': {
      borderColor: tokens.colors.primary.main,
      boxShadow: `0 0 0 2px ${tokens.colors.primary.light}`,
    },
    '&:disabled': {
      backgroundColor: tokens.colors.neutral.gray100,
      color: tokens.colors.text.disabled,
      cursor: 'not-allowed',
    },
  };

  const helperTextStyles = {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.fontSize.xs,
    color: error ? tokens.colors.semantic.error : tokens.colors.text.secondary,
  };

  // Create class names
  const containerClass = `pos-input-container ${fullWidth ? 'pos-input-full-width' : ''} ${className}`;
  const inputClass = `pos-input ${error ? 'pos-input-error' : ''} ${disabled ? 'pos-input-disabled' : ''}`;
  const labelClass = `pos-input-label ${error ? 'pos-input-label-error' : ''} ${required ? 'pos-input-label-required' : ''}`;
  const helperTextClass = `pos-input-helper-text ${error ? 'pos-input-error-text' : ''}`;

  return (
    <div className={containerClass} style={containerStyles}>
      {label && (
        <label className={labelClass} style={labelStyles}>
          {label}
          {required && <span style={{ color: tokens.colors.semantic.error }}> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClass}
        style={inputStyles}
        required={required}
        {...rest}
      />
      {(helperText || error) && (
        <div className={helperTextClass} style={helperTextStyles}>
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default Input;
