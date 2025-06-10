import React from 'react';
import tokens from '../styles/tokens';

/**
 * Sidebar component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Navigation items array
 * @param {string} [props.activeItemId] - ID of the active item
 * @param {Function} [props.onItemClick] - Item click handler
 * @param {boolean} [props.collapsed=false] - Whether sidebar is collapsed
 * @param {Function} [props.onToggleCollapse] - Collapse toggle handler
 * @param {string} [props.className] - Additional CSS class names
 */
const Sidebar = ({
  items = [],
  activeItemId,
  onItemClick,
  collapsed = false,
  onToggleCollapse,
  className = '',
  ...rest
}) => {
  // Base styles
  const sidebarStyles = {
    display: 'flex',
    flexDirection: 'column',
    width: collapsed ? '64px' : '240px',
    height: '100%',
    backgroundColor: tokens.colors.neutral.gray800,
    color: tokens.colors.neutral.white,
    transition: `width ${tokens.transitions.duration.standard}ms ${tokens.transitions.easing.easeInOut}`,
    overflow: 'hidden',
    boxShadow: tokens.shadows.md,
  };

  const headerStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    padding: collapsed ? tokens.spacing.sm : `${tokens.spacing.md} ${tokens.spacing.lg}`,
    borderBottom: `1px solid ${tokens.colors.neutral.gray700}`,
    minHeight: '64px',
  };

  const logoStyles = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.primary.main,
    whiteSpace: 'nowrap',
  };

  const toggleButtonStyles = {
    background: 'none',
    border: 'none',
    color: tokens.colors.neutral.gray400,
    cursor: 'pointer',
    padding: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `color ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    '&:hover': {
      color: tokens.colors.neutral.white,
    },
  };

  const navStyles = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: collapsed ? `${tokens.spacing.sm} 0` : tokens.spacing.md,
    overflowY: 'auto',
  };

  const navItemStyles = (active) => ({
    display: 'flex',
    alignItems: 'center',
    padding: collapsed ? tokens.spacing.sm : `${tokens.spacing.sm} ${tokens.spacing.md}`,
    marginBottom: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.md,
    cursor: 'pointer',
    backgroundColor: active ? tokens.colors.primary.main : 'transparent',
    color: active ? tokens.colors.primary.contrastText : tokens.colors.neutral.gray300,
    transition: `all ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
    '&:hover': {
      backgroundColor: active ? tokens.colors.primary.main : tokens.colors.neutral.gray700,
      color: tokens.colors.neutral.white,
    },
  });

  const iconStyles = {
    marginRight: collapsed ? 0 : tokens.spacing.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.typography.fontSize.lg,
  };

  const labelStyles = {
    fontSize: tokens.typography.fontSize.md,
    fontWeight: tokens.typography.fontWeightMedium,
    whiteSpace: 'nowrap',
    opacity: collapsed ? 0 : 1,
    transition: `opacity ${tokens.transitions.duration.short}ms ${tokens.transitions.easing.easeInOut}`,
  };

  const footerStyles = {
    padding: collapsed ? tokens.spacing.sm : tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.neutral.gray700}`,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.neutral.gray400,
    textAlign: collapsed ? 'center' : 'left',
  };

  // Create class names
  const sidebarClass = `pos-sidebar ${collapsed ? 'pos-sidebar-collapsed' : ''} ${className}`;
  const headerClass = 'pos-sidebar-header';
  const navClass = 'pos-sidebar-nav';
  const footerClass = 'pos-sidebar-footer';

  return (
    <div className={sidebarClass} style={sidebarStyles} {...rest}>
      <div className={headerClass} style={headerStyles}>
        {!collapsed && <div style={logoStyles}>POS Modern</div>}
        {collapsed && <div style={logoStyles}>PM</div>}
        <button
          type="button"
          onClick={onToggleCollapse}
          style={toggleButtonStyles}
          className="pos-sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {collapsed ? (
              <path
                d="M8 4l8 8-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M16 4l-8 8 8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
      </div>
      <nav className={navClass} style={navStyles}>
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          return (
            <div
              key={item.id}
              className={`pos-sidebar-item ${isActive ? 'pos-sidebar-item-active' : ''}`}
              style={navItemStyles(isActive)}
              onClick={() => onItemClick && onItemClick(item)}
            >
              <div className="pos-sidebar-item-icon" style={iconStyles}>
                {item.icon}
              </div>
              {!collapsed && (
                <div className="pos-sidebar-item-label" style={labelStyles}>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className={footerClass} style={footerStyles}>
        {!collapsed && <span>v1.0.0</span>}
        {collapsed && <span>v1</span>}
      </div>
    </div>
  );
};

export default Sidebar;
