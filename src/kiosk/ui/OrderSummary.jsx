// /home/ubuntu/pos-modern/src/kiosk/ui/OrderSummary.jsx

import React from 'react';

const OrderSummary = ({ orderNumber, estimatedTime, onNewOrder }) => {
  return (
    <div className="confirmation-screen">
      <div className="confirmation-icon">✓</div>
      <h1 className="confirmation-title">Pedido Confirmado!</h1>
      <p className="confirmation-message">
        Seu pedido foi recebido e está sendo preparado.
      </p>
      
      <div className="order-details">
        <div className="order-number">
          Pedido #{orderNumber}
        </div>
        <div className="estimated-time">
          Tempo estimado: {estimatedTime} minutos
        </div>
      </div>
      
      <button className="new-order-button" onClick={onNewOrder}>
        Fazer Novo Pedido
      </button>
    </div>
  );
};

export default OrderSummary;
