// /home/ubuntu/pos-modern/src/kiosk/ui/WelcomeScreen.jsx

import React from 'react';

const WelcomeScreen = ({ welcomeMessage, logoUrl, onStart }) => {
  return (
    <div className="welcome-screen">
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="welcome-logo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/assets/default-logo.png';
          }}
        />
      )}
      <h1>Bem-vindo ao Autoatendimento</h1>
      <p>{welcomeMessage}</p>
      <button className="start-order-button" onClick={onStart}>
        Toque para Começar
      </button>
    </div>
  );
};

export default WelcomeScreen;
