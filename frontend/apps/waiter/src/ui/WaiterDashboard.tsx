import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, message, Spin, Modal, Form, Input, Select, Divider, Dropdown, Menu, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, 
         UserOutlined, ShoppingCartOutlined, ClockCircleOutlined, 
         CheckCircleOutlined, SwapOutlined, DollarOutlined, 
         PrinterOutlined, MoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import TableLayoutEditor from './TableLayoutEditor';
import './WaiterDashboard.css';

const { TabPane } = Tabs;
const { Option } = Select;

const WaiterDashboard = ({ restaurantId, storeId, waiterId }) => {
  const [activeTab, setActiveTab] = useState('tables');
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [orderForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [billForm] = Form.useForm();
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'layout'
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Carregar dados ao iniciar
  useEffect(() => {
    if (activeTab === 'tables') {
      fetchTables();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }

    // Configurar atualização automática a cada 30 segundos
    const interval = setInterval(() => {
      if (activeTab === 'tables') {
        fetchTables(false); // false = não mostrar loading
      } else if (activeTab === 'orders') {
        fetchOrders(false); // false = não mostrar loading
      }
    }, 30000);

    setRefreshInterval(interval);

    // Limpar intervalo ao desmontar
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [activeTab, restaurantId, storeId]);

  // Buscar mesas do servidor
  const fetchTables = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(`/api/waiter/tables/by-status?restaurant_id=${restaurantId}&store_id=${storeId}`);
      setTables(response.data);
      if (showLoading) setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      message.error('Não foi possível carregar as mesas');
      if (showLoading) setLoading(false);
    }
  };

  // Buscar pedidos do servidor
  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get(`/api/orders?restaurant_id=${restaurantId}&store_id=${storeId}&waiter_id=${waiterId}`);
      setOrders(response.data);
      if (showLoading) setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      message.error('Não foi possível carregar os pedidos');
      if (showLoading) setLoading(false);
    }
  };

  // Abrir modal de novo pedido
  const handleOpenOrderModal = (table) => {
    setCurrentTable(table);
    setShowOrderModal(true);
    
    // Preencher formulário com dados da mesa
    orderForm.setFieldsValue({
      table_id: table.id,
      table_number: table.number,
      customer_count: 1
    });
  };

  // Abrir modal de transferência de mesa
  const handleOpenTransferModal = (table) => {
    setCurrentTable(table);
    setShowTransferModal(true);
    
    // Buscar mesas disponíveis
    const availableTables = tables.filter(t => 
      t.status === 'available' && t.id !== table.id
    );
    setAvailableTables(availableTables);
    
    // Preencher formulário com dados da mesa atual
    transferForm.setFieldsValue({
      source_table_id: table.id,
      source_table_number: table.number
    });
  };

  // Abrir modal de fechamento de conta
  const handleOpenBillModal = (table) => {
    setCurrentTable(table);
    setShowBillModal(true);
    
    // Buscar detalhes do pedido atual
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/orders/${table.current_order_id}`);
        const order = response.data;
        
        // Preencher formulário com dados do pedido
        billForm.setFieldsValue({
          order_id: order.id,
          table_number: table.number,
          total_amount: order.total,
          payment_method: 'cash',
          split_count: 1
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar detalhes do pedido:', error);
        message.error('Não foi possível carregar os detalhes do pedido');
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  };

  // Criar novo pedido
  const handleCreateOrder = async () => {
    try {
      const values = await orderForm.validateFields();
      
      setLoading(true);
      const response = await axios.post('/api/orders', {
        restaurant_id: restaurantId,
        store_id: storeId,
        waiter_id: waiterId,
        table_id: currentTable.id,
        customer_count: values.customer_count,
        notes: values.notes,
        items: [],
        payment_status: 'pending' // Pedido sem pagamento imediato
      });
      
      // Atualizar status da mesa
      await axios.put(`/api/waiter/tables/layouts/${currentTable.layout_id}/tables/${currentTable.id}/status`, {
        status: 'occupied',
        order_id: response.data.id,
        waiter_id: waiterId
      });
      
      setShowOrderModal(false);
      orderForm.resetFields();
      
      // Redirecionar para a página de edição do pedido
      window.location.href = `/orders/edit/${response.data.id}`;
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      message.error('Não foi possível criar o pedido');
      setLoading(false);
    }
  };

  // Transferir mesa
  const handleTransferTable = async () => {
    try {
      const values = await transferForm.validateFields();
      
      setLoading(true);
      
      // Obter detalhes do pedido atual
      const sourceTable = tables.find(t => t.id === values.source_table_id);
      const targetTable = tables.find(t => t.id === values.target_table_id);
      
      if (!sourceTable || !targetTable) {
        throw new Error('Mesa de origem ou destino não encontrada');
      }
      
      // Transferir pedido para nova mesa
      await axios.put(`/api/orders/${sourceTable.current_order_id}/transfer`, {
        new_table_id: targetTable.id,
        new_table_number: targetTable.number
      });
      
      // Atualizar status das mesas
      await axios.put(`/api/waiter/tables/layouts/${sourceTable.layout_id}/tables/${sourceTable.id}/status`, {
        status: 'dirty',
        order_id: null,
        waiter_id: null
      });
      
      await axios.put(`/api/waiter/tables/layouts/${targetTable.layout_id}/tables/${targetTable.id}/status`, {
        status: 'occupied',
        order_id: sourceTable.current_order_id,
        waiter_id: waiterId
      });
      
      setShowTransferModal(false);
      transferForm.resetFields();
      
      message.success(`Pedido transferido da mesa ${sourceTable.number} para a mesa ${targetTable.number}`);
      
      // Atualizar lista de mesas
      fetchTables();
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao transferir mesa:', error);
      message.error('Não foi possível transferir a mesa');
      setLoading(false);
    }
  };

  // Fechar conta
  const handleCloseBill = async () => {
    try {
      const values = await billForm.validateFields();
      
      setLoading(true);
      
      // Atualizar pedido para finalizado
      await axios.put(`/api/orders/${values.order_id}/status`, {
        status: 'completed',
        payment_status: 'paid',
        payment_method: values.payment_method,
        split_count: values.split_count
      });
      
      // Atualizar status da mesa
      await axios.put(`/api/waiter/tables/layouts/${currentTable.layout_id}/tables/${currentTable.id}/status`, {
        status: 'dirty',
        order_id: null,
        waiter_id: null
      });
      
      setShowBillModal(false);
      billForm.resetFields();
      
      message.success(`Conta da mesa ${currentTable.number} fechada com sucesso`);
      
      // Atualizar lista de mesas
      fetchTables();
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao fechar conta:', error);
      message.error('Não foi possível fechar a conta');
      setLoading(false);
    }
  };

  // Renderizar lista de mesas
  const renderTablesList = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large" />
          <p>Carregando mesas...</p>
        </div>
      );
    }

    if (tables.length === 0) {
      return (
        <div className="empty-container">
          <p>Nenhuma mesa disponível</p>
        </div>
      );
    }

    // Agrupar mesas por status
    const tablesByStatus = {
      available: tables.filter(table => table.status === 'available'),
      occupied: tables.filter(table => table.status === 'occupied'),
      reserved: tables.filter(table => table.status === 'reserved'),
      dirty: tables.filter(table => table.status === 'dirty')
    };

    return (
      <div className="tables-container">
        <div className="tables-section">
          <h3>Mesas Disponíveis</h3>
          <div className="tables-grid">
            {tablesByStatus.available.map(table => (
              <Card 
                key={table.id}
                className="table-card available"
                actions={[
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenOrderModal(table)}
                  >
                    Iniciar Pedido
                  </Button>
                ]}
              >
                <div className="table-number">{table.number}</div>
                <div className="table-capacity">Capacidade: {table.capacity}</div>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="tables-section">
          <h3>Mesas Ocupadas</h3>
          <div className="tables-grid">
            {tablesByStatus.occupied.map(table => (
              <Card 
                key={table.id}
                className="table-card occupied"
                actions={[
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item 
                          key="view_order"
                          icon={<ShoppingCartOutlined />}
                          onClick={() => window.location.href = `/orders/edit/${table.current_order_id}`}
                        >
                          Ver Pedido
                        </Menu.Item>
                        <Menu.Item 
                          key="transfer"
                          icon={<SwapOutlined />}
                          onClick={() => handleOpenTransferModal(table)}
                        >
                          Transferir Mesa
                        </Menu.Item>
                        <Menu.Item 
                          key="close_bill"
                          icon={<DollarOutlined />}
                          onClick={() => handleOpenBillModal(table)}
                        >
                          Fechar Conta
                        </Menu.Item>
                        <Menu.Item 
                          key="print_bill"
                          icon={<PrinterOutlined />}
                          onClick={() => message.info('Funcionalidade de impressão em desenvolvimento')}
                        >
                          Imprimir Conta
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                  >
                    <Button 
                      type="primary"
                      icon={<MoreOutlined />}
                    >
                      Ações
                    </Button>
                  </Dropdown>
                ]}
              >
                <div className="table-number">{table.number}</div>
                <div className="table-capacity">Capacidade: {table.capacity}</div>
                <div className="table-order-info">
                  <Badge status="processing" text="Pedido em andamento" />
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="tables-section">
          <h3>Mesas Reservadas</h3>
          <div className="tables-grid">
            {tablesByStatus.reserved.map(table => (
              <Card 
                key={table.id}
                className="table-card reserved"
                actions={[
                  <Button 
                    type="primary"
                    onClick={() => handleOpenOrderModal(table)}
                  >
                    Iniciar Pedido
                  </Button>
                ]}
              >
                <div className="table-number">{table.number}</div>
                <div className="table-capacity">Capacidade: {table.capacity}</div>
                <div className="table-reservation-info">
                  <Badge status="warning" text="Reservada" />
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="tables-section">
          <h3>Mesas Sujas</h3>
          <div className="tables-grid">
            {tablesByStatus.dirty.map(table => (
              <Card 
                key={table.id}
                className="table-card dirty"
                actions={[
                  <Button 
                    type="primary"
                    onClick={async () => {
                      try {
                        await axios.put(`/api/waiter/tables/layouts/${table.layout_id}/tables/${table.id}/status`, {
                          status: 'available'
                        });
                        message.success(`Mesa ${table.number} marcada como disponível`);
                        fetchTables();
                      } catch (error) {
                        console.error('Erro ao atualizar status da mesa:', error);
                        message.error('Não foi possível atualizar o status da mesa');
                      }
                    }}
                  >
                    Marcar como Limpa
                  </Button>
                ]}
              >
                <div className="table-number">{table.number}</div>
                <div className="table-capacity">Capacidade: {table.capacity}</div>
                <div className="table-dirty-info">
                  <Badge status="error" text="Aguardando limpeza" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar visualização de layout
  const renderTablesLayout = () => {
    return (
      <div className="tables-layout-container">
        <TableLayoutEditor 
          restaurantId={restaurantId}
          storeId={storeId}
          mode="view"
        />
      </div>
    );
  };

  // Renderizar lista de pedidos
  const renderOrdersList = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Spin size="large" />
          <p>Carregando pedidos...</p>
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div className="empty-container">
          <p>Nenhum pedido disponível</p>
        </div>
      );
    }

    // Agrupar pedidos por status
    const ordersByStatus = {
      pending: orders.filter(order => order.status === 'pending'),
      in_progress: orders.filter(order => order.status === 'in_progress'),
      ready: orders.filter(order => order.status === 'ready'),
      delivered: orders.filter(order => order.status === 'delivered'),
      completed: orders.filter(order => order.status === 'completed')
    };

    return (
      <div className="orders-container">
        <div className="orders-section">
          <h3>Pedidos Pendentes</h3>
          <div className="orders-grid">
            {ordersByStatus.pending.map(order => (
              <Card 
                key={order.id}
                className="order-card pending"
                onClick={() => window.location.href = `/orders/edit/${order.id}`}
              >
                <div className="order-header">
                  <div className="order-number">Pedido #{order.order_number}</div>
                  <div className="order-time">{new Date(order.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="order-table">Mesa: {order.table_number}</div>
                <div className="order-items">Itens: {order.items.length}</div>
                <div className="order-total">Total: R$ {order.total.toFixed(2)}</div>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="orders-section">
          <h3>Pedidos em Preparo</h3>
          <div className="orders-grid">
            {ordersByStatus.in_progress.map(order => (
              <Card 
                key={order.id}
                className="order-card in-progress"
                onClick={() => window.location.href = `/orders/edit/${order.id}`}
              >
                <div className="order-header">
                  <div className="order-number">Pedido #{order.order_number}</div>
                  <div className="order-time">{new Date(order.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="order-table">Mesa: {order.table_number}</div>
                <div className="order-items">Itens: {order.items.length}</div>
                <div className="order-total">Total: R$ {order.total.toFixed(2)}</div>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="orders-section">
          <h3>Pedidos Prontos</h3>
          <div className="orders-grid">
            {ordersByStatus.ready.map(order => (
              <Card 
                key={order.id}
                className="order-card ready"
                onClick={() => window.location.href = `/orders/edit/${order.id}`}
              >
                <div className="order-header">
                  <div className="order-number">Pedido #{order.order_number}</div>
                  <div className="order-time">{new Date(order.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="order-table">Mesa: {order.table_number}</div>
                <div className="order-items">Itens: {order.items.length}</div>
                <div className="order-total">Total: R$ {order.total.toFixed(2)}</div>
                <Button 
                  type="primary"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await axios.put(`/api/orders/${order.id}/status`, {
                        status: 'delivered'
                      });
                      message.success(`Pedido #${order.order_number} marcado como entregue`);
                      fetchOrders();
                    } catch (error) {
                      console.error('Erro ao atualizar status do pedido:', error);
                      message.error('Não foi possível atualizar o status do pedido');
                    }
                  }}
                >
                  Marcar como Entregue
                </Button>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="orders-section">
          <h3>Pedidos Entregues</h3>
          <div className="orders-grid">
            {ordersByStatus.delivered.map(order => (
              <Card 
                key={order.id}
                className="order-card delivered"
                onClick={() => window.location.href = `/orders/edit/${order.id}`}
              >
                <div className="order-header">
                  <div className="order-number">Pedido #{order.order_number}</div>
                  <div className="order-time">{new Date(order.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="order-table">Mesa: {order.table_number}</div>
                <div className="order-items">Itens: {order.items.length}</div>
                <div className="order-total">Total: R$ {order.total.toFixed(2)}</div>
                <Button 
                  type="primary"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await axios.put(`/api/orders/${order.id}/status`, {
                        status: 'completed'
                      });
                      message.success(`Pedido #${order.order_number} finalizado`);
                      fetchOrders();
                    } catch (error) {
                      console.error('Erro ao atualizar status do pedido:', error);
                      message.error('Não foi possível atualizar o status do pedido');
                    }
                  }}
                >
                  Finalizar Pedido
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar modal de novo pedido
  const renderOrderModal = () => {
    return (
      <Modal
        title="Iniciar Novo Pedido"
        open={showOrderModal}
        onOk={handleCreateOrder}
        onCancel={() => setShowOrderModal(false)}
      >
        <Form form={orderForm} layout="vertical">
          <Form.Item name="table_id" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item label="Mesa" name="table_number">
            <Input disabled />
          </Form.Item>
          
          <Form.Item 
            label="Número de Clientes" 
            name="customer_count"
            rules={[{ required: true, message: 'Por favor, informe o número de clientes' }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          
          <Form.Item label="Observações" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  // Renderizar modal de transferência de mesa
  const renderTransferModal = () => {
    return (
      <Modal
        title="Transferir Mesa"
        open={showTransferModal}
        onOk={handleTransferTable}
        onCancel={() => setShowTransferModal(false)}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="source_table_id" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item label="Mesa de Origem" name="source_table_number">
            <Input disabled />
          </Form.Item>
          
          <Form.Item 
            label="Mesa de Destino" 
            name="target_table_id"
            rules={[{ required: true, message: 'Por favor, selecione a mesa de destino' }]}
          >
            <Select placeholder="Selecione a mesa de destino">
              {availableTables.map(table => (
                <Option key={table.id} value={table.id}>
                  Mesa {table.number} (Capacidade: {table.capacity})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="Motivo da Transferência" name="transfer_reason">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  // Renderizar modal de fechamento de conta
  const renderBillModal = () => {
    return (
      <Modal
        title="Fechar Conta"
        open={showBillModal}
        onOk={handleCloseBill}
        onCancel={() => setShowBillModal(false)}
      >
        <Form form={billForm} layout="vertical">
          <Form.Item name="order_id" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item label="Mesa" name="table_number">
            <Input disabled />
          </Form.Item>
          
          <Form.Item label="Valor Total" name="total_amount">
            <Input 
              prefix="R$" 
              disabled 
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          
          <Form.Item 
            label="Forma de Pagamento" 
            name="payment_method"
            rules={[{ required: true, message: 'Por favor, selecione a forma de pagamento' }]}
          >
            <Select>
              <Option value="cash">Dinheiro</Option>
              <Option value="credit_card">Cartão de Crédito</Option>
              <Option value="debit_card">Cartão de Débito</Option>
              <Option value="pix">PIX</Option>
            </Select>
          </Form.Item>
          
          <Form.Item 
            label="Dividir Conta" 
            name="split_count"
            rules={[{ required: true, message: 'Por favor, informe o número de divisões' }]}
          >
            <Input 
              type="number" 
              min={1} 
              addonAfter="pessoa(s)"
            />
          </Form.Item>
          
          <Form.Item label="Observações" name="bill_notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    );
  };

  return (
    <div className="waiter-dashboard">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Mesas" key="tables">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <h2>Gerenciamento de Mesas</h2>
              <div className="header-actions">
                <Button.Group>
                  <Button 
                    type={viewMode === 'list' ? 'primary' : 'default'} 
                    onClick={() => setViewMode('list')}
                  >
                    Lista
                  </Button>
                  <Button 
                    type={viewMode === 'layout' ? 'primary' : 'default'} 
                    onClick={() => setViewMode('layout')}
                  >
                    Layout
                  </Button>
                </Button.Group>
                <Button 
                  type="default" 
                  onClick={() => window.location.href = `/waiter/tables/layout?restaurant_id=${restaurantId}&store_id=${storeId}`}
                >
                  Editar Layout
                </Button>
                <Button onClick={fetchTables}>Atualizar</Button>
              </div>
            </div>
            {viewMode === 'list' ? renderTablesList() : renderTablesLayout()}
          </div>
        </TabPane>
        
        <TabPane tab="Pedidos" key="orders">
          <div className="dashboard-content">
            <div className="dashboard-header">
              <h2>Gerenciamento de Pedidos</h2>
              <div className="header-actions">
                <Button onClick={fetchOrders}>Atualizar</Button>
              </div>
            </div>
            {renderOrdersList()}
          </div>
        </TabPane>
      </Tabs>
      
      {renderOrderModal()}
      {renderTransferModal()}
      {renderBillModal()}
    </div>
  );
};

export default WaiterDashboard;
