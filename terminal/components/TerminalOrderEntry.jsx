import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus, faTrash, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const TerminalOrderEntry = ({ tableId, onOrderCreated, onCancel }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Carregar categorias e produtos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Simular atraso de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Dados simulados
        const mockCategories = [
          { id: 'cat-1', name: 'Bebidas' },
          { id: 'cat-2', name: 'Entradas' },
          { id: 'cat-3', name: 'Pratos Principais' },
          { id: 'cat-4', name: 'Sobremesas' }
        ];
        
        const mockProducts = [
          { id: 'prod-1', name: 'Água', price: 5.00, category_id: 'cat-1' },
          { id: 'prod-2', name: 'Refrigerante', price: 7.00, category_id: 'cat-1' },
          { id: 'prod-3', name: 'Suco', price: 9.00, category_id: 'cat-1' },
          { id: 'prod-4', name: 'Batata Frita', price: 15.00, category_id: 'cat-2' },
          { id: 'prod-5', name: 'Isca de Frango', price: 20.00, category_id: 'cat-2' },
          { id: 'prod-6', name: 'Filé', price: 45.00, category_id: 'cat-3' },
          { id: 'prod-7', name: 'Peixe', price: 40.00, category_id: 'cat-3' },
          { id: 'prod-8', name: 'Pudim', price: 12.00, category_id: 'cat-4' },
          { id: 'prod-9', name: 'Sorvete', price: 10.00, category_id: 'cat-4' }
        ];
        
        setCategories(mockCategories);
        setProducts(mockProducts);
        setSelectedCategory(mockCategories[0].id);
      } catch (err) {
        setError('Erro ao carregar dados: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filtrar produtos por categoria selecionada
  const filteredProducts = products.filter(
    product => !selectedCategory || product.category_id === selectedCategory
  );
  
  // Adicionar item ao pedido
  const addItemToOrder = (product) => {
    const existingItemIndex = orderItems.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      // Item já existe, incrementar quantidade
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Novo item
      setOrderItems([
        ...orderItems,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        }
      ]);
    }
  };
  
  // Atualizar quantidade de um item
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    setOrderItems(updatedItems);
  };
  
  // Remover item do pedido
  const removeItem = (index) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };
  
  // Calcular total do pedido
  const orderTotal = orderItems.reduce(
    (total, item) => total + (item.price * item.quantity),
    0
  );
  
  // Salvar pedido
  const saveOrder = async () => {
    if (orderItems.length === 0) {
      setError('Adicione pelo menos um item ao pedido');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Simular atraso de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Em um ambiente real, enviaríamos para a API
      console.log('Pedido salvo:', {
        table_id: tableId,
        items: orderItems,
        total: orderTotal
      });
      
      onOrderCreated();
    } catch (err) {
      setError('Erro ao salvar pedido: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <div className="terminal-loading">Carregando...</div>;
  }
  
  if (error) {
    return <div className="terminal-error">{error}</div>;
  }
  
  return (
    <div className="terminal-order-entry">
      <div className="terminal-order-header">
        <div className="terminal-order-title">Novo Pedido - Mesa {tableId}</div>
      </div>
      
      <div className="terminal-categories">
        {categories.map(category => (
          <div
            key={category.id}
            className={`terminal-category ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </div>
        ))}
      </div>
      
      <div className="terminal-products">
        {filteredProducts.map(product => (
          <div
            key={product.id}
            className="terminal-product"
            onClick={() => addItemToOrder(product)}
          >
            <div className="terminal-product-name">{product.name}</div>
            <div className="terminal-product-price">R$ {product.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
      
      <div className="terminal-order-items">
        {orderItems.length === 0 ? (
          <div className="terminal-empty-message">Nenhum item adicionado</div>
        ) : (
          orderItems.map((item, index) => (
            <div key={index} className="terminal-order-item">
              <div className="terminal-order-item-name">{item.name}</div>
              <div className="terminal-order-item-quantity">
                <button
                  className="terminal-quantity-button"
                  onClick={() => updateItemQuantity(index, item.quantity - 1)}
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <span className="terminal-quantity-value">{item.quantity}</span>
                <button
                  className="terminal-quantity-button"
                  onClick={() => updateItemQuantity(index, item.quantity + 1)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
              <div className="terminal-order-item-price">
                R$ {(item.price * item.quantity).toFixed(2)}
              </div>
              <button
                className="terminal-quantity-button"
                onClick={() => removeItem(index)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="terminal-order-total">
        <span>Total:</span>
        <span>R$ {orderTotal.toFixed(2)}</span>
      </div>
      
      <div className="terminal-order-actions">
        <button
          className="terminal-button terminal-button-secondary"
          onClick={onCancel}
        >
          <FontAwesomeIcon icon={faTimes} /> Cancelar
        </button>
        <button
          className="terminal-button terminal-button-primary"
          onClick={saveOrder}
          disabled={isSaving || orderItems.length === 0}
        >
          <FontAwesomeIcon icon={faSave} /> {isSaving ? 'Salvando...' : 'Salvar Pedido'}
        </button>
      </div>
    </div>
  );
};

export default TerminalOrderEntry;
