/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../common/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Custom Colors for POS System
      colors: {
        // Brand Colors
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
          950: '#0a3d8f'
        },
        // Semantic Colors
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          dark: '#065f46'
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fed7aa',
          dark: '#92400e'
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          dark: '#991b1b'
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          dark: '#1e40af'
        },
        // Surface Colors
        surface: {
          DEFAULT: '#ffffff',
          hover: '#f9fafb',
          active: '#f3f4f6',
          dark: '#1e293b',
          'dark-hover': '#334155',
          'dark-active': '#475569'
        }
      },
      
      // Custom Font Families
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      },
      
      // Custom Font Sizes for Touch
      fontSize: {
        'touch-sm': ['16px', '24px'],
        'touch-base': ['18px', '28px'],
        'touch-lg': ['20px', '30px'],
        'touch-xl': ['24px', '32px'],
      },
      
      // Custom Spacing for Touch Targets
      spacing: {
        'touch': '44px', // Minimum touch target
        'touch-lg': '56px',
        'touch-xl': '64px',
      },
      
      // Fast Animations for POS
      transitionDuration: {
        'instant': '50ms',
        'fast': '150ms',
        'normal': '250ms',
      },
      
      // Custom Shadows
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'inner-lg': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      },
      
      // Custom Border Radius
      borderRadius: {
        'card': '12px',
        'button': '10px',
      },
      
      // Custom Animations
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-right': 'slideRight 0.25s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-fast': 'spin 0.5s linear infinite',
        'ripple': 'ripple 0.6s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      
      // Grid Template Columns for Product Grid
      gridTemplateColumns: {
        'products-sm': 'repeat(auto-fill, minmax(150px, 1fr))',
        'products-md': 'repeat(auto-fill, minmax(180px, 1fr))',
        'products-lg': 'repeat(auto-fill, minmax(200px, 1fr))',
        'products-xl': 'repeat(auto-fill, minmax(220px, 1fr))',
      },
      
      // Custom Screens for POS Devices
      screens: {
        'tablet': '768px',
        'pos': '1024px',
        'pos-lg': '1280px',
        'pos-xl': '1536px',
      },
      
      // Z-Index Scale
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      
      // Backdrop Filters
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [
    // Forms plugin for better form styles
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    
    // Typography plugin
    require('@tailwindcss/typography'),
    
    // Aspect ratio plugin
    require('@tailwindcss/aspect-ratio'),
    
    // Container queries plugin
    require('@tailwindcss/container-queries'),
    
    // Custom plugin for POS-specific utilities
    function({ addUtilities, addComponents, theme }) {
      // Touch-friendly utilities
      addUtilities({
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        '.touch-target-lg': {
          minHeight: '56px',
          minWidth: '56px',
        },
        '.no-tap-highlight': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.smooth-scroll': {
          'scroll-behavior': 'smooth',
        },
        '.hide-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      });
      
      // POS-specific components
      addComponents({
        '.btn-pos': {
          '@apply inline-flex items-center justify-center px-6 py-3 text-touch-base font-medium rounded-button transition-all duration-fast no-tap-highlight touch-target': {},
          '&:hover': {
            '@apply transform -translate-y-0.5 shadow-card-hover': {},
          },
          '&:active': {
            '@apply transform translate-y-0': {},
          },
        },
        '.btn-pos-primary': {
          '@apply btn-pos bg-primary-500 text-white hover:bg-primary-600': {},
        },
        '.btn-pos-success': {
          '@apply btn-pos bg-success text-white hover:bg-success-dark': {},
        },
        '.btn-pos-danger': {
          '@apply btn-pos bg-danger text-white hover:bg-danger-dark': {},
        },
        '.card-pos': {
          '@apply bg-white dark:bg-surface-dark rounded-card shadow-card overflow-hidden transition-all duration-fast': {},
          '&:hover': {
            '@apply shadow-card-hover transform -translate-y-1': {},
          },
        },
        '.product-card': {
          '@apply card-pos cursor-pointer min-h-[240px] flex flex-col': {},
          '&:active': {
            '@apply transform scale-95': {},
          },
        },
        '.input-pos': {
          '@apply w-full px-4 py-3 text-touch-base bg-surface-hover dark:bg-surface-dark-hover rounded-button border-2 border-transparent focus:border-primary-500 focus:outline-none transition-all duration-fast': {},
        },
        '.badge-pos': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium': {},
        },
        '.sidebar-pos': {
          '@apply w-20 lg:w-24 bg-surface dark:bg-surface-dark border-r border-gray-200 dark:border-gray-700 flex flex-col': {},
        },
      });
    },
  ],
}