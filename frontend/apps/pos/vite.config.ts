import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Build optimization
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: true,
    
    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-utils': ['axios', 'date-fns'],
          
          // Feature chunks
          'pos-core': [
            './src/ui/POSMainPage.tsx',
            './src/ui/POSOrderPage.tsx',
            './src/ui/POSPaymentPage.tsx'
          ],
          'management': [
            './src/ui/ManagerScreen.tsx',
            './src/ui/BusinessDayPage.tsx',
            './src/ui/CashierOpeningClosingPage.tsx'
          ],
          'restaurant': [
            './src/ui/TableLayoutScreen.tsx',
            './src/ui/DeliveryScreen.tsx',
            './src/ui/WaiterScreen.tsx'
          ],
          'loyalty-fiscal': [
            './src/ui/LoyaltyScreen.tsx',
            './src/ui/FiscalScreen.tsx'
          ],
          'services': [
            './src/services/OfflineStorage.ts',
            './src/services/SyncManager.ts',
            './src/services/ApiClient.ts'
          ]
        },
        
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') 
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        
        // Optimize asset names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          
          if (/\.(css)$/i.test(assetInfo.name || '')) {
            return `assets/styles/[name]-[hash].${ext}`;
          }
          
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  
  // Development optimization
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@services': resolve(__dirname, 'src/services'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT_HASH__: JSON.stringify(process.env.COMMIT_HASH || 'dev')
  },
  
  // CSS optimization
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // Preview configuration
  preview: {
    port: 4173,
    host: true
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  
  // Experimental features
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` };
      }
      return { relative: true };
    }
  }
});

