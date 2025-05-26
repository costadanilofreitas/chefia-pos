import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faMinus, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

const CartDrawer = ({ isOpen, items, total, onClose, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  return (
    <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
      <div className="cart-header">
        <h2 className="cart-title">Seu Pedido</h2>
        <button className="close-cart" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      {items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <FontAwesomeIcon icon={faShoppingCart} />
          </div>
          <p className="empty-cart-message">Seu carrinho está vazio</p>
          <button className="continue-shopping" onClick={onClose}>
            Continuar Comprando
          </button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item, index) => (
              <div className="cart-item" key={`${item.id}-${index}`}>
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="cart-item-image" 
                  />
                )}
                <div className="cart-item-details">
                  <h3 className="cart-item-name">{item.name}</h3>
                  {item.variant && (
                    <div className="cart-item-options">
                      Variante: {item.variant.name}
                    </div>
                  )}
                  {item.options && item.options.length > 0 && (
                    <div className="cart-item-options">
                      Opções: {item.options.map(opt => opt.name).join(', ')}
                    </div>
                  )}
                  <div className="cart-item-price">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </div>
                  <div className="cart-item-quantity">
                    <button 
                      className="cart-quantity-btn"
                      onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <FontAwesomeIcon icon={faMinus} />
                    </button>
                    <span className="cart-quantity-value">{item.quantity}</span>
                    <button 
                      className="cart-quantity-btn"
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                  <button 
                    className="cart-item-remove"
                    onClick={() => onRemoveItem(index)}
                  >
                    <FontAwesomeIcon icon={faTrash} /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <button className="checkout-btn" onClick={onCheckout}>
              Finalizar Pedido
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartDrawer;
