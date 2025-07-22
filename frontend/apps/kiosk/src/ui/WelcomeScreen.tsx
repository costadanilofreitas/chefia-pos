// /home/ubuntu/pos-modern/src/kiosk/ui/WelcomeScreen.tsx

import React from 'react';

type WelcomeScreenProps = {
  welcomeMessage: string;
  logoUrl?: string;
  onStart: () => void;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ welcomeMessage, logoUrl, onStart }) => {
  return (
    <div className="welcome-screen">
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="welcome-logo"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/assets/default-logo.png';
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
