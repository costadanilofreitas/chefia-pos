/**
 * ThemeContext Test Suite
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';

describe('ThemeContext', () => {
  // Store original matchMedia
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear document classes
    document.documentElement.classList.remove('dark');
    
    // Remove any existing meta tags
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach(tag => tag.remove());
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))
    });
  });

  afterEach(() => {
    // Restore matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia
    });
  });

  describe('ThemeProvider', () => {
    test('should provide theme context to children', () => {
      const TestComponent = () => {
        const { mode } = useTheme();
        return <div>Theme: {mode}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByText(/Theme:/)).toBeInTheDocument();
    });

    test('should throw error when useTheme is used outside provider', () => {
      const TestComponent = () => {
        const { mode } = useTheme();
        return <div>{mode}</div>;
      };

      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => render(<TestComponent />)).toThrow(
        'useTheme must be used within a ThemeProvider'
      );
      
      spy.mockRestore();
    });
  });

  describe('Theme Initialization', () => {
    test('should initialize with light theme by default', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('light');
    });

    test('should load theme from localStorage if available', () => {
      localStorage.setItem('kds-theme-mode', 'dark');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('dark');
    });

    test('should use system preference when no stored theme', () => {
      // Mock system preference for dark mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        }))
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('dark');
    });

    test('should validate stored theme value', () => {
      // Store invalid theme value
      localStorage.setItem('kds-theme-mode', 'invalid');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Should fallback to light theme
      expect(result.current.mode).toBe('light');
    });
  });

  describe('Theme Toggle', () => {
    test('should toggle between light and dark modes', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('light');
    });

    test('should persist theme to localStorage on toggle', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.getItem('kds-theme-mode')).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.getItem('kds-theme-mode')).toBe('light');
    });
  });

  describe('Set Theme Mode', () => {
    test('should set specific theme mode', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(result.current.mode).toBe('dark');

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(result.current.mode).toBe('light');
    });

    test('should persist specific theme mode to localStorage', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(localStorage.getItem('kds-theme-mode')).toBe('dark');
    });
  });

  describe('DOM Manipulation', () => {
    test('should add dark class to document element in dark mode', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    test('should remove dark class from document element in light mode', () => {
      // Start with dark class
      document.documentElement.classList.add('dark');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    test('should create meta theme-color tag if not exists', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      renderHook(() => useTheme(), { wrapper });

      const metaTag = document.querySelector('meta[name="theme-color"]');
      expect(metaTag).toBeInTheDocument();
      expect(metaTag?.getAttribute('content')).toBe('#f5f5f5'); // light theme color
    });

    test('should update existing meta theme-color tag', () => {
      // Create existing meta tag
      const existingMeta = document.createElement('meta');
      existingMeta.setAttribute('name', 'theme-color');
      existingMeta.setAttribute('content', '#ffffff');
      document.head.appendChild(existingMeta);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Check light mode color
      expect(existingMeta.getAttribute('content')).toBe('#f5f5f5');

      act(() => {
        result.current.setThemeMode('dark');
      });

      // Check dark mode color
      expect(existingMeta.getAttribute('content')).toBe('#0a0e1a');
    });

    test('should update meta tag on theme change', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      const metaTag = document.querySelector('meta[name="theme-color"]');

      // Light mode
      expect(metaTag?.getAttribute('content')).toBe('#f5f5f5');

      act(() => {
        result.current.toggleTheme();
      });

      // Dark mode
      expect(metaTag?.getAttribute('content')).toBe('#0a0e1a');

      act(() => {
        result.current.toggleTheme();
      });

      // Back to light mode
      expect(metaTag?.getAttribute('content')).toBe('#f5f5f5');
    });
  });

  describe('Context Memoization', () => {
    test('should memoize context value', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result, rerender } = renderHook(() => useTheme(), { wrapper });

      const contextValue1 = result.current;

      // Rerender without changes
      rerender();

      const contextValue2 = result.current;

      // Functions should remain the same
      expect(contextValue1.toggleTheme).toBe(contextValue2.toggleTheme);
      expect(contextValue1.setThemeMode).toBe(contextValue2.setThemeMode);
    });

    test('should update context value when mode changes', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      const initialMode = result.current.mode;

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).not.toBe(initialMode);
    });
  });

  describe('Type Guard', () => {
    test('isThemeMode should validate theme values', () => {
      // Store various values in localStorage
      const testCases = [
        { value: 'dark', expected: 'dark' },
        { value: 'light', expected: 'light' },
        { value: 'auto', expected: 'light' }, // Invalid, should fallback
        { value: 'blue', expected: 'light' }, // Invalid, should fallback
        { value: '', expected: 'light' }, // Invalid, should fallback
        { value: null, expected: 'light' } // Invalid, should fallback
      ];

      testCases.forEach(({ value, expected }) => {
        localStorage.clear();
        if (value !== null) {
          localStorage.setItem('kds-theme-mode', value as string);
        }

        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <ThemeProvider>{children}</ThemeProvider>
        );

        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.mode).toBe(expected);
      });
    });
  });

  describe('Integration', () => {
    test('should work with multiple consumers', () => {
      const Consumer1 = () => {
        const { mode, toggleTheme } = useTheme();
        return (
          <div>
            <span data-testid="consumer1-mode">{mode}</span>
            <button onClick={toggleTheme}>Toggle 1</button>
          </div>
        );
      };

      const Consumer2 = () => {
        const { mode, setThemeMode } = useTheme();
        return (
          <div>
            <span data-testid="consumer2-mode">{mode}</span>
            <button onClick={() => setThemeMode('dark')}>Set Dark</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <Consumer1 />
          <Consumer2 />
        </ThemeProvider>
      );

      const mode1 = screen.getByTestId('consumer1-mode');
      const mode2 = screen.getByTestId('consumer2-mode');

      // Both should show the same mode
      expect(mode1.textContent).toBe('light');
      expect(mode2.textContent).toBe('light');

      // Toggle from Consumer1
      const toggleButton = screen.getByText('Toggle 1');
      act(() => {
        toggleButton.click();
      });

      // Both should update
      expect(mode1.textContent).toBe('dark');
      expect(mode2.textContent).toBe('dark');

      // Set from Consumer2
      const setButton = screen.getByText('Set Dark');
      act(() => {
        setButton.click();
      });

      // Should remain dark
      expect(mode1.textContent).toBe('dark');
      expect(mode2.textContent).toBe('dark');
    });

    test('should persist across remounts', () => {
      const TestComponent = () => {
        const { mode, toggleTheme } = useTheme();
        return (
          <div>
            <span data-testid="mode">{mode}</span>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Toggle to dark
      const toggleButton = screen.getByText('Toggle');
      act(() => {
        toggleButton.click();
      });

      expect(screen.getByTestId('mode').textContent).toBe('dark');

      // Unmount
      unmount();

      // Remount
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Should restore from localStorage
      expect(screen.getByTestId('mode').textContent).toBe('dark');
    });
  });
});