import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { useAuth } from '@common/contexts/auth/hooks/useAuth';
import { posService, CashierSession, Product, Category, Order, OrderItem } from '../services/posService';
import './POSMainPage.css';

interface AlertInfo {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

type CashierStatus = 'closed' | 'opening' | 'open' | 'closing';

/**
 * Página principal do POS com todas as funcionalidades de venda
 * 
 * Inclui gerenciamento de caixa, catálogo de produtos, carrinho,
 * pagamento e integração com impressoras.
 */
const POSMainPage: React.FC = () => {
  // Estados para autenticação e caixa
  const [cashierStatus, setCashierStatus] = useState<CashierStatus>('closed');
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [showOpenCashierModal, setShowOpenCashierModal] = useState<boolean>(false);
  const [initialAmount, setInitialAmount] = useState<string>('');
  
  // Estados para produtos e categorias
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Estados para pedido atual
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  
  // Estados para UI
  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Hooks
  const { user } = useAuth();
  
  // Efeito para carregar configuração inicial e verificar sessão de caixa
  useEffect(() => {
    const initializePOS = async (): Promise<void> => {
      try {
        setLoading(true);
        
        // Verificar se há uma sessão de caixa aberta
        const session = await posService.getCurrentCashierSession();
        
        if (session) {
          setCashierSession(session);
          setCashierStatus('open');
          
          // Carregar categorias e produtos
          await loadCategoriesAndProducts();
        } else {
          setCashierStatus('closed');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao inicializar POS:', error);
        setAlert({
          type: 'danger',
          message: 'Falha ao inicializar o sistema. Verifique sua conexão e tente novamente.'
        });
        setLoading(false);
      }
    };
    
    initializePOS();
  }, []);
  
  // Função para carregar categorias e produtos
  const loadCategoriesAndProducts = async (): Promise<void> => {
    try {
      // Carregar categorias
      const categoriesData = await posService.getCategories();
      setCategories(categoriesData);
      
      // Carregar todos os produtos
      const productsData = await posService.getProducts();
      setProducts(productsData);
      setFilteredProducts(productsData);
      
      // Selecionar primeira categoria se existir
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
        
        // Filtrar produtos pela primeira categoria
        const categoryProducts = await posService.getProductsByCategory(categoriesData[0].id);
        setFilteredProducts(categoryProducts);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias e produtos:', error);
      setAlert({
        type: 'warning',
        message: 'Falha ao carregar produtos. Alguns recursos podem estar indisponíveis.'
      });
    }
  };
  
  // Função para abrir o caixa
  const handleOpenCashier = async (): Promise<void> => {
    if (!user || !initialAmount) return;
    
    try {
      setCashierStatus('opening');
      
      const amount = parseFloat(initialAmount);
      const session = await posService.openCashierSession(user.id, amount);
      
      setCashierSession(session);
      setCashierStatus('open');
      setShowOpenCashierModal(false);
      setAlert({
        type: 'success',
        message: 'Caixa aberto com sucesso!'
      });
      
      // Carregar categorias e produtos
      await loadCategoriesAndProducts();
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      setCashierStatus('closed');
      setAlert({
        type: 'danger',
        message: 'Falha ao abrir o caixa. Tente novamente.'
      });
    }
  };
  
  // Função para fechar o caixa
  const handleCloseCashier = async (): Promise<void> => {
    if (!cashierSession) return;
    
    try {
      setCashierStatus('closing');
      
      // Em um cenário real, pediríamos confirmação e o valor final
      const finalAmount = cashierSession.current_amount;
      await posService.closeCashierSession(cashierSession.id, finalAmount);
      
      setCashierSession(null);
      setCashierStatus('closed');
      setAlert({
        type: 'success',
        message: 'Caixa fechado com sucesso!'
      });
      
      // Limpar dados
      setCart([]);
      setCurrentOrder(null);
      setFilteredProducts([]);
      setProducts([]);
      setCategories([]);
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      setCashierStatus('open');
      setAlert({
        type: 'danger',
        message: 'Falha ao fechar o caixa. Tente novamente.'
      });
    }
  };
  
  // Função para selecionar categoria
  const handleCategorySelect = async (categoryId: string): Promise<void> => {
    setSelectedCategory(categoryId);
    
    try {
      const categoryProducts = await posService.getProductsByCategory(categoryId);
      setFilteredProducts(categoryProducts);
    } catch (error) {
      console.error(`Erro ao carregar produtos da categoria ${categoryId}:`, error);
      
      // Fallback para filtro local
      const filtered = products.filter(product => product.category_id === categoryId);
      setFilteredProducts(filtered);
    }
  };
  
  // Função para buscar produtos
  const handleSearch = async (): Promise<void> => {
    if (!searchTerm.trim()) {
      // Se a busca estiver vazia, mostrar produtos da categoria selecionada
      if (selectedCategory) {
        handleCategorySelect(selectedCategory);
      } else {
        setFilteredProducts(products);
      }
      return;
    }
    
    try {
      const searchResults = await posService.searchProducts(searchTerm);
      setFilteredProducts(searchResults);
    } catch (error) {
      console.error(`Erro ao buscar produtos com termo "${searchTerm}":`, error);
      
      // Fallback para busca local
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };
  
  // Função para adicionar produto ao carrinho
  const handleAddToCart = (product: Product): void => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      // Se o produto já estiver no carrinho, aumentar a quantidade
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price } 
          : item
      ));
    } else {
      // Se o produto não estiver no carrinho, adicioná-lo com quantidade 1
      const newItem: OrderItem = {
        id: `temp-${Date.now()}`,
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
        status: 'pending'
      };
      
      setCart([...cart, newItem]);
    }
  };
  
  // Função para remover item do carrinho
  const handleRemoveFromCart = (itemId: string): void => {
    setCart(cart.filter(item => item.id !== itemId));
  };
  
  // Função para atualizar quantidade de item no carrinho
  const handleUpdateQuantity = (itemId: string, quantity: number): void => {
    if (quantity < 1) return;
    
    setCart(cart.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          total_price: quantity * item.unit_price
        };
      }
      return item;
    }));
  };
  
  // Função para limpar o carrinho
  const handleClearCart = (): void => {
    setCart([]);
    setCustomerName('');
    setTableNumber('');
  };
  
  // Função para criar um novo pedido
  const handleCreateOrder = async (): Promise<void> => {
    if (cart.length === 0 || !cashierSession) return;
    
    try {
      // Calcular valores
      const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * 0.1; // 10% de imposto (exemplo)
      const total = subtotal + tax;
      
      // Criar objeto de pedido
      const orderData = {
        terminal_id: cashierSession.terminal_id,
        cashier_id: cashierSession.employee_id,
        cashier_name: cashierSession.employee_name,
        customer_name: customerName || undefined,
        table_number: tableNumber || undefined,
        items: cart,
        subtotal,
        tax,
        total,
        payment_status: 'pending' as const,
        order_status: 'new' as const,
        source: 'pos' as const
      };
      
      // Criar pedido via API
      const newOrder = await posService.createOrder(orderData);
      
      setCurrentOrder(newOrder);
      setAlert({
        type: 'success',
        message: `Pedido #${newOrder.order_number} criado com sucesso!`
      });
      
      // Em um cenário real, aqui abriríamos a tela de pagamento
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setAlert({
        type: 'danger',
        message: 'Falha ao criar pedido. Tente novamente.'
      });
    }
  };
  
  // Função para processar pagamento
  const handleProcessPayment = async (paymentMethod: string): Promise<void> => {
    if (!currentOrder) return;
    
    try {
      // Processar pagamento via API
      const payment = await posService.processPayment(currentOrder.id, {
        amount: currentOrder.total,
        payment_method: paymentMethod
      });
      
      // Atualizar status do pedido
      await posService.updateOrderStatus(currentOrder.id, 'in_progress');
      
      // Imprimir recibo
      await posService.printReceipt(currentOrder.id);
      
      setAlert({
        type: 'success',
        message: `Pagamento processado com sucesso! Método: ${paymentMethod}`
      });
      
      // Limpar carrinho e pedido atual
      setCart([]);
      setCurrentOrder(null);
      setCustomerName('');
      setTableNumber('');
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setAlert({
        type: 'danger',
        message: 'Falha ao processar pagamento. Tente novamente.'
      });
    }
  };
  
  // Calcular total do carrinho
  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  
  // Renderizar modal de abertura de caixa
  const renderOpenCashierModal = (): JSX.Element => (
    <Modal show={showOpenCashierModal} onHide={() => setShowOpenCashierModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Abrir Caixa</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Valor Inicial (R$)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              placeholder="0.00"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowOpenCashierModal(false)}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleOpenCashier}
          disabled={!initialAmount || parseFloat(initialAmount) < 0}
        >
          Abrir Caixa
        </Button>
      </Modal.Footer>
    </Modal>
  );
  
  // Renderizar tela de caixa fechado
  if (cashierStatus === 'closed') {
    return (
      <Container fluid className="pos-main py-4">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title className="mb-4">Caixa Fechado</Card.Title>
                <p>O caixa precisa ser aberto para iniciar as vendas.</p>
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={() => setShowOpenCashierModal(true)}
                >
                  Abrir Caixa
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {alert && (
          <Row className="mt-3 justify-content-center">
            <Col md={6}>
              <Alert variant={alert.type} dismissible onClose={() => setAlert(null)}>
                {alert.message}
              </Alert>
            </Col>
          </Row>
        )}
        
        {renderOpenCashierModal()}
      </Container>
    );
  }
  
  // Renderizar tela de carregamento
  if (loading || cashierStatus === 'opening' || cashierStatus === 'closing') {
    return (
      <Container fluid className="pos-main py-4">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">
              {cashierStatus === 'opening' ? 'Abrindo caixa...' : 
               cashierStatus === 'closing' ? 'Fechando caixa...' : 
               'Carregando...'}
            </p>
          </Col>
        </Row>
      </Container>
    );
  }
  
  // Renderizar tela principal do POS
  return (
    <Container fluid className="pos-main py-3">
      {/* Cabeçalho */}
      <Row className="mb-3">
        <Col>
          <Card>
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-0">Terminal de Vendas</h2>
                {cashierSession && (
                  <small className="text-muted">
                    Operador: {cashierSession.employee_name} | 
                    Terminal: {cashierSession.terminal_id}
                  </small>
                )}
              </div>
              <div>
                <Button 
                  variant="outline-danger" 
                  onClick={handleCloseCashier}
                >
                  Fechar Caixa
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Alerta */}
      {alert && (
        <Row className="mb-3">
          <Col>
            <Alert variant={alert.type} dismissible onClose={() => setAlert(null)}>
              {alert.message}
            </Alert>
          </Col>
        </Row>
      )}
      
      <Row>
        {/* Catálogo de Produtos */}
        <Col md={8}>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Produtos</h4>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="me-2"
                  />
                  <Button variant="primary" onClick={handleSearch}>
                    Buscar
                  </Button>
                </div>
              </div>
              
              {/* Categorias */}
              <div className="categories-scroll mb-3">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'primary' : 'outline-secondary'}
                    className="me-2 mb-2"
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
              
              {/* Lista de Produtos */}
              <div className="products-grid">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <Card 
                      key={product.id} 
                      className="product-card"
                      onClick={() => handleAddToCart(product)}
                    >
                      {product.image_url && (
                        <div className="product-image-container">
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="product-image"
                          />
                        </div>
                      )}
                      <Card.Body>
                        <Card.Title>{product.name}</Card.Title>
                        <Card.Text className="product-price">
                          R$ {product.price.toFixed(2)}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p>Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Carrinho */}
        <Col md={4}>
          <Card>
            <Card.Header>
              <h4 className="mb-0">Carrinho</h4>
            </Card.Header>
            <Card.Body>
              {/* Informações do Cliente */}
              <div className="mb-3">
                <Form.Group className="mb-2">
                  <Form.Label>Nome do Cliente</Form.Label>
                  <Form.Control
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Opcional"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Mesa</Form.Label>
                  <Form.Control
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Opcional"
                  />
                </Form.Group>
              </div>
              
              {/* Itens do Carrinho */}
              <div className="cart-items">
                {cart.length > 0 ? (
                  cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6>{item.name}</h6>
                          <div className="item-price">R$ {item.unit_price.toFixed(2)}</div>
                        </div>
                        <Button 
                          variant="link" 
                          className="text-danger p-0"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          <i className="bi bi-x-circle"></i>
                        </Button>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <div className="quantity-control">
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="mx-2">{item.quantity}</span>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="item-total">
                          R$ {item.total_price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p>Carrinho vazio</p>
                  </div>
                )}
              </div>
            </Card.Body>
            <Card.Footer>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Subtotal:</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Impostos (10%):</span>
                <span>R$ {(cartTotal * 0.1).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 fw-bold">
                <span>Total:</span>
                <span>R$ {(cartTotal * 1.1).toFixed(2)}</span>
              </div>
              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  size="lg"
                  disabled={cart.length === 0}
                  onClick={handleCreateOrder}
                >
                  Finalizar Pedido
                </Button>
                <Button 
                  variant="outline-secondary"
                  disabled={cart.length === 0}
                  onClick={handleClearCart}
                >
                  Limpar Carrinho
                </Button>
              </div>
            </Card.Footer>
          </Card>
          
          {/* Opções de Pagamento (visíveis apenas quando há um pedido atual) */}
          {currentOrder && (
            <Card className="mt-3">
              <Card.Header>
                <h4 className="mb-0">Pagamento</h4>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <Button 
                    variant="success" 
                    onClick={() => handleProcessPayment('cash')}
                  >
                    Dinheiro
                  </Button>
                  <Button 
                    variant="info" 
                    onClick={() => handleProcessPayment('credit_card')}
                  >
                    Cartão de Crédito
                  </Button>
                  <Button 
                    variant="warning" 
                    onClick={() => handleProcessPayment('debit_card')}
                  >
                    Cartão de Débito
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => handleProcessPayment('pix')}
                  >
                    PIX
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default POSMainPage;
