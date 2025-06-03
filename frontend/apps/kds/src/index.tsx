import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import KDSMainPage from './ui/KDSMainPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <KDSMainPage />
    </BrowserRouter>
  </React.StrictMode>
);
