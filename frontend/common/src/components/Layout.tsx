import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import Breadcrumbs from '../common/Breadcrumbs';

/**
 * Layout component for the POS Modern Backoffice
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Layout content
 * @param {Object} props.user - User information
 * @param {string} props.title - Page title
 * @param {Array} props.breadcrumbs - Breadcrumb items
 * @param {React.ReactNode} [props.actions] - Header actions
 * @param {Array} [props.sidebarItems] - Sidebar navigation items
 * @param {string} [props.activeItemId] - ID of the active sidebar item
 * @param {Function} [props.onSidebarItemClick] - Sidebar item click handler
 * @param {string} [props.className] - Additional CSS class names
 */
const Layout = ({
  children,
  user,
  title,
  breadcrumbs = [],
  actions,
  sidebarItems = [],
  activeItemId,
  onSidebarItemClick,
  className = '',
  ...rest
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle sidebar collapse toggle
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Styles
  const layoutStyles = {
    display: 'flex',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
  };

  const mainStyles = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: `margin-left ${tokens.transitions.duration.standard}ms ${tokens.transitions.easing.easeInOut}`,
  };

  const contentContainerStyles = {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.background.default,
  };

  // Create class names
  const layoutClass = `pos-layout ${className}`;
  const mainClass = 'pos-layout-main';
  const contentClass = 'pos-layout-content';

  return (
    <div className={layoutClass} style={layoutStyles} {...rest}>
      <Sidebar
        items={sidebarItems}
        activeItemId={activeItemId}
        onItemClick={onSidebarItemClick}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
      
      <main className={mainClass} style={mainStyles}>
        <Header
          title={title}
          actions={actions}
          user={user}
          breadcrumbs={breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} />
          )}
        />
        
        <div className={contentClass} style={contentContainerStyles}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
