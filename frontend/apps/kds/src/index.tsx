import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import KDSMainPage from './ui/KDSMainPage';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <KDSMainPage />
    </BrowserRouter>
  </React.StrictMode>
);
