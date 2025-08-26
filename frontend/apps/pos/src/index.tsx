import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundaryModern from './components/ErrorBoundaryModern';
import { offlineStorage } from './services/OfflineStorage';

// Initialize offline storage
offlineStorage.init();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

// Global error handler
window.addEventListener('error', (event) => {
// console.error('Global error:', event.error);
  offlineStorage.log('error', event.error?.message || 'Unknown error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
// console.error('Unhandled promise rejection:', event.reason);
  offlineStorage.log('error', 'Unhandled promise rejection', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundaryModern>
      <App />
    </ErrorBoundaryModern>
  </React.StrictMode>
);