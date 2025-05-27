import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import BackofficeApp from './ui/BackofficeApp';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <BackofficeApp />
    </BrowserRouter>
  </React.StrictMode>
);
