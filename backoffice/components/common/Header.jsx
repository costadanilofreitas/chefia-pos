import React from 'react';
import tokens from '../styles/tokens';

/**
 * Header component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {string} [props.title] - Page title
 * @param {React.ReactNode} [props.actions] - Header actions
 * @param {React.ReactNode} [props.breadcrumbs] - Breadcrumbs component
 * @param {React.ReactNode} [props.user] - User information
 * @param {string} [props.className] - Additional CSS class names
 */
const Header = ({
  title,
  actions,
  breadcrumbs,
  user,
  className = '',
  ...rest
}) => {
  // Base styles
  const headerStyles = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    backgroundColor: tokens.colors.background.paper,
    borderBottom: `1px solid ${tokens.colors.border.light}`,
    boxShadow: tokens.shadows.sm,
  };

  const topBarStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  };

  const titleStyles = {
    fontSize: tokens.typography.h4.fontSize,
    fontWeight: tokens.typography.h4.fontWeight,
    color: tokens.colors.text.primary,
    margin: 0,
  };

  const actionsStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
  };

  const breadcrumbsContainerStyles = {
    padding: `0 ${tokens.spacing.lg} ${tokens.spacing.md}`,
  };

  const userStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const userAvatarStyles = {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.primary.main,
    color: tokens.colors.primary.contrastText,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: tokens.typography.fontWeightMedium,
  };

  const userNameStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeightMedium,
  };

  // Create class names
  const headerClass = `pos-header ${className}`;
  const topBarClass = 'pos-header-top-bar';
  const titleClass = 'pos-header-title';
  const actionsClass = 'pos-header-actions';
  const breadcrumbsClass = 'pos-header-breadcrumbs';
  const userClass = 'pos-header-user';

  // Get user initials if user object is provided
  const getUserInitials = (user) => {
    if (!user || !user.name) return '';
    return user.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className={headerClass} style={headerStyles} {...rest}>
      <div className={topBarClass} style={topBarStyles}>
        <h1 className={titleClass} style={titleStyles}>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.lg }}>
          {actions && (
            <div className={actionsClass} style={actionsStyles}>
              {actions}
            </div>
          )}
          {user && (
            <div className={userClass} style={userStyles}>
              <div style={userAvatarStyles}>
                {getUserInitials(user)}
              </div>
              <span style={userNameStyles}>{user.name}</span>
            </div>
          )}
        </div>
      </div>
      {breadcrumbs && (
        <div className={breadcrumbsClass} style={breadcrumbsContainerStyles}>
          {breadcrumbs}
        </div>
      )}
    </header>
  );
};

export default Header;
