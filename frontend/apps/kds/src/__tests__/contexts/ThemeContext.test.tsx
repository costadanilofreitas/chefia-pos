/**
 * Comprehensive tests for ThemeContext
 * Tests theme persistence, toggle functionality, system preference detection
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

// Test component to access theme context
const TestComponent: React.FC = () => {
  const { mode, toggleTheme, setThemeMode } = useTheme();
  
  return (
    <div>
      <span data-testid="theme-mode">{mode}</span>
      <button onClick={toggleTheme} data-testid="toggle-button">
        Toggle Theme
      </button>
      <button onClick={() => setThemeMode('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setThemeMode('light')} data-testid="set-light">
        Set Light
      </button>
    </div>
  );
};

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('ThemeContext', () => {
  let originalMatchMedia: any;

  beforeEach(() => {
    // Save original matchMedia
    originalMatchMedia = window.matchMedia;
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset document classes
    document.documentElement.classList.remove('dark');
    
    // Remove any existing meta tags
    const existingMeta = document.querySelector('meta[name="theme-color"]');
    if (existingMeta) {
      existingMeta.remove();
    }
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  describe('Provider Setup', () => {
    it('should throw error when useTheme is used outside provider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      const TestComponentWithoutProvider = () => {
        try {
          useTheme();
          return <div>Should not render</div>;
        } catch (error) {
          return <div>{(error as Error).message}</div>;
        }
      };
      
      render(<TestComponentWithoutProvider />);
      
      expect(screen.getByText('useTheme must be used within a ThemeProvider')).toBeInTheDocument();
      
      spy.mockRestore();
    });

    it('should provide theme context to children', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-mode')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-button')).toBeInTheDocument();
    });
  });

  describe('Initial Theme Detection', () => {
    it('should use light theme by default when no preference', () => {
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    });

    it('should detect and use system dark mode preference', () => {
      mockMatchMedia(true);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    });

    it('should prioritize stored theme over system preference', () => {
      localStorage.setItem('kds-theme-mode', 'dark');
      mockMatchMedia(false); // System prefers light
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    });

    it('should handle invalid stored theme value', () => {
      localStorage.setItem('kds-theme-mode', 'invalid-theme');
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Should fallback to light theme
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle between light and dark themes', async () => {
      const user = userEvent.setup();
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      
      await user.click(screen.getByTestId('toggle-button'));
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      
      await user.click(screen.getByTestId('toggle-button'));
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    });

    it('should persist theme preference to localStorage', async () => {
      const user = userEvent.setup();
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      await user.click(screen.getByTestId('toggle-button'));
      
      expect(localStorage.getItem('kds-theme-mode')).toBe('dark');
    });
  });

  describe('Theme Mode Setter', () => {
    it('should set theme to dark mode', async () => {
      const user = userEvent.setup();
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      await user.click(screen.getByTestId('set-dark'));
      
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      expect(localStorage.getItem('kds-theme-mode')).toBe('dark');
    });

    it('should set theme to light mode', async () => {
      const user = userEvent.setup();
      localStorage.setItem('kds-theme-mode', 'dark');
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      await user.click(screen.getByTestId('set-light'));
      
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      expect(localStorage.getItem('kds-theme-mode')).toBe('light');
    });
  });

  describe('DOM Manipulation', () => {
    it('should add dark class to document element in dark mode', async () => {
      const user = userEvent.setup();
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      await user.click(screen.getByTestId('set-dark'));
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document element in light mode', async () => {
      const user = userEvent.setup();
      localStorage.setItem('kds-theme-mode', 'dark');
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Initially should have dark class
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
      
      await user.click(screen.getByTestId('set-light'));
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should create meta theme-color tag if not exists', () => {
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      const metaTag = document.querySelector('meta[name="theme-color"]');
      expect(metaTag).toBeInTheDocument();
      expect(metaTag?.getAttribute('content')).toBe('#f5f5f5'); // Light theme color
    });

    it('should update existing meta theme-color tag', async () => {
      const user = userEvent.setup();
      
      // Create existing meta tag
      const existingMeta = document.createElement('meta');
      existingMeta.setAttribute('name', 'theme-color');
      existingMeta.setAttribute('content', '#000000');
      document.head.appendChild(existingMeta);
      
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Should update to light theme color
      expect(existingMeta.getAttribute('content')).toBe('#f5f5f5');
      
      await user.click(screen.getByTestId('set-dark'));
      
      // Should update to dark theme color
      expect(existingMeta.getAttribute('content')).toBe('#0a0e1a');
    });
  });

  describe('Context Memoization', () => {
    it('should memoize context value to prevent unnecessary re-renders', () => {
      let renderCount = 0;
      
      const CountingComponent: React.FC = () => {
        const theme = useTheme();
        renderCount++;
        return <div>{theme.mode}</div>;
      };
      
      const { rerender } = render(
        <ThemeProvider>
          <CountingComponent />
        </ThemeProvider>
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render provider with same props
      rerender(
        <ThemeProvider>
          <CountingComponent />
        </ThemeProvider>
      );
      
      // Should not cause additional render if mode hasn't changed
      expect(renderCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      mockMatchMedia(false);
      
      // Should not throw when rendering
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Should not throw when toggling
      await user.click(screen.getByTestId('toggle-button'));
      
      // Theme should still change in memory
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      
      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should handle missing matchMedia gracefully', () => {
      // Remove matchMedia
      delete (window as any).matchMedia;
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Should default to light theme
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    });

    it('should handle rapid theme changes', async () => {
      const user = userEvent.setup();
      mockMatchMedia(false);
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Rapidly toggle theme
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId('toggle-button'));
      }
      
      // Should end up back at light (even number of toggles)
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      expect(localStorage.getItem('kds-theme-mode')).toBe('light');
    });
  });

  describe('Multiple Providers', () => {
    it('should isolate theme state between multiple providers', () => {
      const Component1 = () => {
        const { mode } = useTheme();
        return <div data-testid="component1">{mode}</div>;
      };
      
      const Component2 = () => {
        const { mode } = useTheme();
        return <div data-testid="component2">{mode}</div>;
      };
      
      localStorage.setItem('kds-theme-mode', 'dark');
      
      render(
        <div>
          <ThemeProvider>
            <Component1 />
          </ThemeProvider>
          <ThemeProvider>
            <Component2 />
          </ThemeProvider>
        </div>
      );
      
      // Both should read from same localStorage
      expect(screen.getByTestId('component1')).toHaveTextContent('dark');
      expect(screen.getByTestId('component2')).toHaveTextContent('dark');
    });
  });

  describe('Performance', () => {
    it('should not cause excessive localStorage reads', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Should read theme once on mount and userId once
      expect(getItemSpy).toHaveBeenCalledTimes(2);
      
      getItemSpy.mockRestore();
    });

    it('should batch DOM updates efficiently', async () => {
      const user = userEvent.setup();
      mockMatchMedia(false);
      
      const addSpy = jest.spyOn(document.documentElement.classList, 'add');
      const removeSpy = jest.spyOn(document.documentElement.classList, 'remove');
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      // Initial render shouldn't add dark class (light mode)
      expect(addSpy).not.toHaveBeenCalledWith('dark');
      
      await user.click(screen.getByTestId('set-dark'));
      
      // Should add dark class once
      expect(addSpy).toHaveBeenCalledWith('dark');
      expect(addSpy).toHaveBeenCalledTimes(1);
      
      await user.click(screen.getByTestId('set-light'));
      
      // Should remove dark class once
      expect(removeSpy).toHaveBeenCalledWith('dark');
      expect(removeSpy).toHaveBeenCalledTimes(1);
      
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});