// /home/ubuntu/pos-modern/src/utils/ErrorMessage.jsx

import React from 'react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="error-message">
      <div className="error-icon">⚠️</div>
      <h2 className="error-title">Ops! Algo deu errado</h2>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Tentar Novamente
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
