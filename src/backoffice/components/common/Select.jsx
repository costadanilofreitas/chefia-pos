import React from 'react';
import tokens from '../styles/tokens';

/**
 * Select component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {string} [props.label] - Select label
 * @param {Array} props.options - Select options array of {value, label} objects
 * @param {string|number} [props.value] - Selected value
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.error] - Error message
 * @param {string} [props.helperText] - Helper text
 * @param {boolean} [props.disabled=false] - Whether select is disabled
 * @param {boolean} [props.required=false] - Whether select is required
 * @param {boolean} [props.fullWidth=false] - Whether select should take full width
 * @param {string} [props.className] - Additional CSS class names
 */
const Select = ({
  label,
  options = [],
  value,
  onChange,
  placeholder,
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

  const selectStyles = {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    paddingRight: tokens.spacing.xl, // Space for dropdown arrow
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily,
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.background.paper,
    border: `1px solid ${error ? tokens.colors.semantic.error : tokens.colors.border.medium}`,
    borderRadius: tokens.borderRadius.md,
    outline: 'none',
    appearance: 'none', // Remove default arrow
    transition: `all ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    width: '100%',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'pointer',
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

  // Arrow indicator styles
  const arrowStyles = {
    position: 'absolute',
    right: tokens.spacing.md,
    top: label ? 'calc(50% + 10px)' : '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: tokens.colors.text.secondary,
  };

  // Create class names
  const containerClass = `pos-select-container ${fullWidth ? 'pos-select-full-width' : ''} ${className}`;
  const selectClass = `pos-select ${error ? 'pos-select-error' : ''} ${disabled ? 'pos-select-disabled' : ''}`;
  const labelClass = `pos-select-label ${error ? 'pos-select-label-error' : ''} ${required ? 'pos-select-label-required' : ''}`;
  const helperTextClass = `pos-select-helper-text ${error ? 'pos-select-error-text' : ''}`;

  return (
    <div className={containerClass} style={containerStyles}>
      {label && (
        <label className={labelClass} style={labelStyles}>
          {label}
          {required && <span style={{ color: tokens.colors.semantic.error }}> *</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={selectClass}
          style={selectStyles}
          required={required}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div style={arrowStyles}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {(helperText || error) && (
        <div className={helperTextClass} style={helperTextStyles}>
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default Select;
