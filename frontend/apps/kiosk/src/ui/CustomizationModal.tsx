// /home/ubuntu/pos-modern/src/kiosk/ui/CustomizationModal.tsx

import React, { useState } from 'react';

type Customization = {
  name: string;
  price_adjustment?: number;
};

type CustomizationSection = {
  name: string;
  items: Customization[];
};

type Product = {
  name: string;
  customizations?: Customization[];
  customization_sections?: CustomizationSection[];
  [key: string]: any; // permite outras propriedades dinâmicas do produto
};

type Props = {
  product: Product;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    customizations: Customization[],
    quantity: number,
    notes: string | null
  ) => void;
};

const CustomizationModal: React.FC<Props> = ({
  product,
  onClose,
  onAddToCart
}) => {
  const [selectedCustomizations, setSelectedCustomizations] = useState<Customization[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const customizationSections: CustomizationSection[] = product.customizations
    ? product.customization_sections || [{ name: 'Opções', items: product.customizations }]
    : [];

  const handleCustomizationToggle = (customization: Customization) => {
    const existingIndex = selectedCustomizations.findIndex(
      c => c.name === customization.name
    );

    if (existingIndex >= 0) {
      const updated = [...selectedCustomizations];
      updated.splice(existingIndex, 1);
      setSelectedCustomizations(updated);
    } else {
      setSelectedCustomizations([
        ...selectedCustomizations,
        {
          name: customization.name,
          price_adjustment: customization.price_adjustment || 0
        }
      ]);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedCustomizations, quantity, notes || null);
  };

  return (
    <div className="customization-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Personalizar {product.name}</h2>
          <button className="close-modal-button" onClick={onClose}>×</button>
        </div>

        <div className="customization-options">
          {customizationSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="customization-section">
              <h3 className="customization-section-title">{section.name}</h3>

              {section.items.map((customization, index) => {
                const isSelected = selectedCustomizations.some(
                  c => c.name === customization.name
                );

                return (
                  <div key={index} className="customization-option">
                    <input
                      type="checkbox"
                      id={`customization-${sectionIndex}-${index}`}
                      className="customization-checkbox"
                      checked={isSelected}
                      onChange={() => handleCustomizationToggle(customization)}
                    />
                    <label
                      htmlFor={`customization-${sectionIndex}-${index}`}
                      className="customization-label"
                    >
                      {customization.name}
                    </label>
                    {customization.price_adjustment && customization.price_adjustment > 0 && (
                      <span className="customization-price">
                        +R$ {customization.price_adjustment.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="notes-section">
            <h3 className="customization-section-title">Observações</h3>
            <textarea
              className="notes-input"
              placeholder="Alguma observação especial? Ex: sem cebola, bem passado, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="quantity-section">
            <span className="quantity-section-label">Quantidade:</span>
            <div className="cart-item-quantity">
              <button
                className="quantity-button"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-value">{quantity}</span>
              <button
                className="quantity-button"
                onClick={() => handleQuantityChange(1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="add-to-cart-modal-button" onClick={handleAddToCart}>
            Adicionar ao Pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;
