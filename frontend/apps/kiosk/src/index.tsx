import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { offlineStorage } from './services/offlineStorage';
import * as serviceWorker from './services/serviceWorker';
import './index.css';
import './styles/animations.css';
import './styles/responsive.css';
import App from './App';

// Initialize logging
offlineStorage.log('Kiosk application starting', {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for PWA capabilities
serviceWorker.register({
  onUpdate: () => {
    offlineStorage.log('New version available');
    // Show update notification to user
    serviceWorker.showUpdateNotification();
  },
  onSuccess: () => {
    offlineStorage.log('Content cached for offline use');
  }
});
