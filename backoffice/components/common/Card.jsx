import React from 'react';
import tokens from '../styles/tokens';

/**
 * Card component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} [props.title] - Card title
 * @param {React.ReactNode} [props.subtitle] - Card subtitle
 * @param {React.ReactNode} [props.actions] - Card actions
 * @param {boolean} [props.elevated=false] - Whether card has elevation
 * @param {string} [props.className] - Additional CSS class names
 */
const Card = ({
  children,
  title,
  subtitle,
  actions,
  elevated = false,
  className = '',
  ...rest
}) => {
  // Base styles
  const cardStyles = {
    backgroundColor: tokens.colors.background.paper,
    borderRadius: tokens.borderRadius.lg,
    boxShadow: elevated ? tokens.shadows.md : tokens.shadows.sm,
    overflow: 'hidden',
    transition: `box-shadow ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    border: `1px solid ${tokens.colors.border.light}`,
  };

  const headerStyles = {
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    borderBottom: title || subtitle ? `1px solid ${tokens.colors.border.light}` : 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyles = {
    margin: 0,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeightMedium,
    color: tokens.colors.text.primary,
  };

  const subtitleStyles = {
    margin: `${tokens.spacing.xs} 0 0 0`,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
  };

  const contentStyles = {
    padding: `${tokens.spacing.lg}`,
  };

  const actionsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  // Create class names
  const cardClass = `pos-card ${elevated ? 'pos-card-elevated' : ''} ${className}`;
  const headerClass = 'pos-card-header';
  const titleClass = 'pos-card-title';
  const subtitleClass = 'pos-card-subtitle';
  const contentClass = 'pos-card-content';
  const actionsClass = 'pos-card-actions';

  return (
    <div className={cardClass} style={cardStyles} {...rest}>
      {(title || subtitle || actions) && (
        <div className={headerClass} style={headerStyles}>
          <div>
            {title && <h3 className={titleClass} style={titleStyles}>{title}</h3>}
            {subtitle && <p className={subtitleClass} style={subtitleStyles}>{subtitle}</p>}
          </div>
          {actions && <div className={actionsClass} style={actionsStyles}>{actions}</div>}
        </div>
      )}
      <div className={contentClass} style={contentStyles}>
        {children}
      </div>
    </div>
  );
};

export default Card;
