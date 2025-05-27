import React from 'react';
import tokens from '../styles/tokens';

/**
 * Breadcrumbs component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Breadcrumb items array of {label, href} objects
 * @param {string} [props.separator='/'] - Separator between items
 * @param {string} [props.className] - Additional CSS class names
 */
const Breadcrumbs = ({
  items = [],
  separator = '/',
  className = '',
  ...rest
}) => {
  // Base styles
  const breadcrumbsStyles = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
  };

  const itemStyles = {
    display: 'inline-flex',
    alignItems: 'center',
  };

  const linkStyles = {
    color: tokens.colors.text.secondary,
    textDecoration: 'none',
    transition: `color ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    '&:hover': {
      color: tokens.colors.primary.main,
      textDecoration: 'underline',
    },
  };

  const currentItemStyles = {
    color: tokens.colors.text.primary,
    fontWeight: tokens.typography.fontWeightMedium,
  };

  const separatorStyles = {
    margin: `0 ${tokens.spacing.xs}`,
    color: tokens.colors.text.disabled,
  };

  // Create class names
  const breadcrumbsClass = `pos-breadcrumbs ${className}`;

  return (
    <nav className={breadcrumbsClass} style={breadcrumbsStyles} aria-label="breadcrumbs" {...rest}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            <div 
              className={`pos-breadcrumb-item ${isLast ? 'pos-breadcrumb-item-current' : ''}`}
              style={itemStyles}
            >
              {isLast ? (
                <span style={currentItemStyles}>{item.label}</span>
              ) : (
                <a 
                  href={item.href} 
                  style={linkStyles}
                  className="pos-breadcrumb-link"
                >
                  {item.label}
                </a>
              )}
            </div>
            {!isLast && (
              <div className="pos-breadcrumb-separator" style={separatorStyles}>
                {separator}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
