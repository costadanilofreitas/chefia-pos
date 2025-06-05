import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { useOrder } from '@common/contexts/order/hooks/useOrder';
import { useProduct } from '@common/contexts/product/hooks/useProduct';
import { useCashier } from '../hooks/mocks/useCashier';

const POSMainPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrder, addItemToOrder, removeItemFromOrder, createOrder } = useOrder();
  const { products, categories, getProductsByCategory } = useProduct();
  const { cashierStatus, openCashier } = useCashier();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    if (selectedCategory) {
      getProductsByCategory(selectedCategory);
    } else {
      setFilteredProducts(products);
    }
  }, [selectedCategory, products, getProductsByCategory]);

  const handleAddToCart = (product: any) => {
    addItemToOrder({
      id: `temp-${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      total_price: product.price,
      customizations: [],
    });
  };

  const handleProceedToPayment = async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      alert('Adicione itens ao pedido antes de prosseguir.');
      return;
    }
    const order = await createOrder(currentOrder);
    navigate(`/pos/payment/${order.id}`);
  };

  if (!cashierStatus || cashierStatus.status === 'closed') {
    return (
      <Container>
        <Row className="justify-content-center">
          <Col md={6}>
            <Card>
              <Card.Body>
                <h4>Caixa Fechado</h4>
                <Button onClick={() => openCashier({ terminal_id: '1', opening_balance: 100 })}>Abrir Caixa</Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container>
      <Row>
        <Col md={8}>
          <h4>Produtos</h4>
          <Form.Control
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div>
            {categories.map((category) => (
              <Button key={category.id} onClick={() => setSelectedCategory(category.id)}>
                {category.name}
              </Button>
            ))}
          </div>
          <div>
            {filteredProducts.map((product) => (
              <Card key={product.id} onClick={() => handleAddToCart(product)}>
                <Card.Body>
                  <h5>{product.name}</h5>
                  <p>R$ {product.price.toFixed(2)}</p>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Col>
        <Col md={4}>
          <h4>Carrinho</h4>
          <div>
            {currentOrder?.items.map((item) => (
              <div key={item.id}>
                <span>{item.product_name}</span>
                <Button onClick={() => removeItemFromOrder(item.id)}>Remover</Button>
              </div>
            ))}
          </div>
          <Button onClick={handleProceedToPayment}>Finalizar Pedido</Button>
        </Col>
      </Row>
    </Container>
  );
};

export default POSMainPage;
