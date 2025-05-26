// /home/ubuntu/pos-modern/src/kiosk/ui/CartSidebar.jsx

import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const CartSidebar = ({ 
  cart, 
  orderTotal, 
  onUpdateQuantity, 
  onRemoveItem, 
  onContinueShopping, 
  onCheckout 
}) => {
  return (
    <div className="cart-sidebar">
      <div className="cart-header">
        <button className="back-button" onClick={onContinueShopping}>
          ←
        </button>
        <h2>Seu Pedido</h2>
        <div></div> {/* Empty div for flex spacing */}
      </div>
      
      <div className="cart-items">
        {cart.length === 0 ? (
          <div className="empty-cart-message">
            <p>Seu carrinho está vazio</p>
            <button className="continue-shopping-button" onClick={onContinueShopping}>
              Adicionar Produtos
            </button>
          </div>
        ) : (
          cart.map((item, index) => (
            <div className="cart-item" key={index}>
              <div className="cart-item-info">
                <div className="cart-item-name">{item.product_name}</div>
                {item.customizations && item.customizations.length > 0 && (
                  <div className="cart-item-customizations">
                    {item.customizations.map((customization, i) => (
                      <div key={i}>
                        {customization.name}
                        {customization.price_adjustment > 0 && 
                          ` (+${formatCurrency(customization.price_adjustment)})`
                        }
                      </div>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <div className="cart-item-notes">
                    Obs: {item.notes}
                  </div>
                )}
                <div className="cart-item-price">
                  {formatCurrency(item.unit_price)}
                </div>
              </div>
              
              <div className="cart-item-quantity">
                <button 
                  className="quantity-button" 
                  onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <span className="quantity-value">{item.quantity}</span>
                <button 
                  className="quantity-button" 
                  onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              
              <button 
                className="remove-item-button" 
                onClick={() => onRemoveItem(index)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      
      {cart.length > 0 && (
        <>
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(orderTotal.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Taxa de serviço</span>
              <span>{formatCurrency(orderTotal.tax)}</span>
            </div>
            {orderTotal.discount > 0 && (
              <div className="summary-row discount">
                <span>Desconto</span>
                <span>-{formatCurrency(orderTotal.discount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatCurrency(orderTotal.total)}</span>
            </div>
          </div>
          
          <div className="cart-actions">
            <button 
              className="continue-shopping-button" 
              onClick={onContinueShopping}
            >
              Continuar Comprando
            </button>
            <button 
              className="checkout-button" 
              onClick={onCheckout}
            >
              Finalizar Pedido
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartSidebar;
