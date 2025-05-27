import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ResponsiveWrapper from './components/ResponsiveWrapper';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ResponsiveWrapper>
      <App />
    </ResponsiveWrapper>
  </React.StrictMode>
);
