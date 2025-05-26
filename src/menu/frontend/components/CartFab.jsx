import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';

const CartFab = ({ count, onClick }) => {
  return (
    <div className="cart-fab" onClick={onClick}>
      <FontAwesomeIcon icon={faShoppingCart} />
      {count > 0 && (
        <div className="cart-badge">{count}</div>
      )}
    </div>
  );
};

export default CartFab;
