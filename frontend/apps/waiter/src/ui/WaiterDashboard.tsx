import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  message,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  Badge,
  Dropdown,
  Menu,
} from 'antd';
import {
  PlusOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  DollarOutlined,
  PrinterOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import TableLayoutEditor from './TableLayoutEditor';
import './WaiterDashboard.css';

const { TabPane } = Tabs;
const { Option } = Select;

interface Table {
  id: number;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'dirty';
  layout_id: number;
  current_order_id?: number;
}

interface Order {
  id: number;
  order_number: string | number;
  created_at: string;
  table_number: string;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'completed';
  items: any[]; // Ajuste conforme a estrutura real dos itens
  total: number;
}

interface WaiterDashboardProps {
  restaurantId: number | string;
  storeId: number | string;
  waiterId: number | string;
}

const WaiterDashboard: React.FC<WaiterDashboardProps> = ({
  restaurantId,
  storeId,
  waiterId,
}) => {
  const [activeTab, setActiveTab] = useState<string>('tables');
  const [loading, setLoading] = useState<boolean>(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showBillModal, setShowBillModal] = useState<boolean>(false);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [orderForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [billForm] = Form.useForm();
  const [viewMode, setViewMode] = useState<'list' | 'layout'>('list');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeTab === 'tables') {
      fetchTables();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }

    const interval = setInterval(() => {
      if (activeTab === 'tables') {
        fetchTables(false);
      } else if (activeTab === 'orders') {
        fetchOrders(false);
      }
    }, 30000);

    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, restaurantId, storeId]);

  const fetchTables = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get<Table[]>(
        `/api/waiter/tables/by-status?restaurant_id=${restaurantId}&store_id=${storeId}`
      );
      setTables(response.data);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      message.error('Não foi possível carregar as mesas');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get<Order[]>(
        `/api/orders?restaurant_id=${restaurantId}&store_id=${storeId}&waiter_id=${waiterId}`
      );
      setOrders(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      message.error('Não foi possível carregar os pedidos');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleOpenOrderModal = (table: Table) => {
    setCurrentTable(table);
    setShowOrderModal(true);

    orderForm.setFieldsValue({
      table_id: table.id,
      table_number: table.number,
      customer_count: 1,
    });
  };

  const handleOpenTransferModal = (table: Table) => {
    setCurrentTable(table);
    setShowTransferModal(true);

    const availableTablesFiltered = tables.filter(
      (t) => t.status === 'available' && t.id !== table.id
    );
    setAvailableTables(availableTablesFiltered);

    transferForm.setFieldsValue({
      source_table_id: table.id,
      source_table_number: table.number,
    });
  };

  const handleOpenBillModal = (table: Table) => {
    setCurrentTable(table);
    setShowBillModal(true);

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Order>(`/api/orders/${table.current_order_id}`);
        const order = response.data;

        billForm.setFieldsValue({
          order_id: order.id,
          table_number: table.number,
          total_amount: order.total,
          payment_method: 'cash',
          split_count: 1,
        });
      } catch (error) {
        console.error('Erro ao carregar detalhes do pedido:', error);
        message.error('Não foi possível carregar os detalhes do pedido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  };

  const handleCreateOrder = async () => {
    try {
      const values = await orderForm.validateFields();

      if (!currentTable) {
        message.error('Mesa inválida');
        return;
      }

      setLoading(true);
      const response = await axios.post('/api/orders', {
        restaurant_id: restaurantId,
        store_id: storeId,
        waiter_id: waiterId,
        table_id: currentTable.id,
        customer_count: values.customer_count,
        notes: values.notes,
        items: [],
        payment_status: 'pending',
      });

      await axios.put(
        `/api/waiter/tables/layouts/${currentTable.layout_id}/tables/${currentTable.id}/status`,
        {
          status: 'occupied',
          order_id: response.data.id,
          waiter_id: waiterId,
        }
      );

      setShowOrderModal(false);
      orderForm.resetFields();

      window.location.href = `/orders/edit/${response.data.id}`;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      message.error('Não foi possível criar o pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferTable = async () => {
    try {
      const values = await transferForm.validateFields();

      if (!currentTable) {
        message.error('Mesa inválida');
        return;
      }

      setLoading(true);

      const sourceTable = tables.find((t) => t.id === values.source_table_id);
      const targetTable = tables.find((t) => t.id === values.target_table_id);

      if (!sourceTable || !targetTable) {
        message.error('Mesa de origem ou destino não encontrada');
        return;
      }

      await axios.put(`/api/orders/${sourceTable.current_order_id}/transfer`, {
        new_table_id: targetTable.id,
        new_table_number: targetTable.number,
      });

      await axios.put(
        `/api/waiter/tables/layouts/${sourceTable.layout_id}/tables/${sourceTable.id}/status`,
        {
          status: 'dirty',
          order_id: null,
          waiter_id: null,
        }
      );

      await axios.put(
        `/api/waiter/tables/layouts/${targetTable.layout_id}/tables/${targetTable.id}/status`,
        {
          status: 'occupied',
          order_id: sourceTable.current_order_id,
          waiter_id: waiterId,
        }
      );

      setShowTransferModal(false);
      transferForm.resetFields();

      message.success(
        `Pedido transferido da mesa ${sourceTable.number} para a mesa ${targetTable.number}`
      );

      fetchTables();
    } catch (error) {
      console.error('Erro ao transferir mesa:', error);
      message.error('Não foi possível transferir a mesa');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBill = async () => {
    try {
      const values = await billForm.validateFields();

      if (!currentTable) {
        message.error('Mesa inválida');
        return;
      }

      setLoading(true);

      await axios.put(`/api/orders/${values.order_id}/status`, {
        status: 'completed',
        payment_status: 'paid',
        payment_method: values.payment_method,
        split_count: values.split_count,
      });

      await axios.put(
        `/api/waiter/tables/layouts/${currentTable.layout_id}/tables/${currentTable.id}/status`,
        {
          status: 'dirty',
          order_id: null,
          waiter_id: null,
        }
      );

      setShowBillModal(false);
      billForm.resetFields();

      message.success(`Conta da mesa ${currentTable.number} fechada com sucesso`);

      fetchTables();
    } catch (error) {
      console.error('Erro ao fechar conta:', error);
      message.error('Não foi possível fechar a conta');
    } finally {
      setLoading(false);
    }
  };

  const renderTablesList = (): JSX.Element => {
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

    const tablesByStatus: Record<
      'available' | 'occupied' | 'reserved' | 'dirty',
      Table[]
    > = {
      available: tables.filter((table) => table.status === 'available'),
      occupied: tables.filter((table) => table.status === 'occupied'),
      reserved: tables.filter((table) => table.status === 'reserved'),
      dirty: tables.filter((table) => table.status === 'dirty'),
    };

    return (
      <div className="tables-container">
        <div className="tables-section">
          <h3>Mesas Disponíveis</h3>
          <div className="tables-grid">
            {tablesByStatus.available.map((table) => (
              <Card
                key={table.id}
                className="table-card available"
                actions={[
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenOrderModal(table)}
                    key="start-order"
                  >
                    Iniciar Pedido
                  </Button>,
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
            {tablesByStatus.occupied.map((table) => (
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
                          onClick={() =>
                            window.location.href = `/orders/edit/${table.current_order_id}`
                          }
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
                    key="actions"
                  >
                    <Button type="primary" icon={<MoreOutlined />}>
                      Ações
                    </Button>
                  </Dropdown>,
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
            {tablesByStatus.reserved.map((table) => (
              <Card
                key={table.id}
                className="table-card reserved"
                actions={[
                  <Button
                    type="primary"
                    onClick={() => handleOpenOrderModal(table)}
                    key="start-order"
                  >
                    Iniciar Pedido
                  </Button>,
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
            {tablesByStatus.dirty.map((table) => (
              <Card
                key={table.id}
                className="table-card dirty"
                actions={[
                  <Button
                    type="primary"
                    onClick={async () => {
                      try {
                        await axios.put(
                          `/api/waiter/tables/layouts/${table.layout_id}/tables/${table.id}/status`,
                          {
                            status: 'available',
                          }
                        );
                        message.success(`Mesa ${table.number} marcada como disponível`);
                        fetchTables();
                      } catch (error) {
                        console.error('Erro ao atualizar status da mesa:', error);
                        message.error('Não foi possível atualizar o status da mesa');
                      }
                    }}
                    key="mark-clean"
                  >
                    Marcar como Limpa
                  </Button>,
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

  const renderTablesLayout = (): JSX.Element => {
    return (
      <div className="tables-layout-container">
        <TableLayoutEditor restaurantId={restaurantId} storeId={storeId} mode="view" />
      </div>
    );
  };

  const renderOrdersList = (): JSX.Element => {
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
          <p>Nenhum pedido encontrado</p>
        </div>
      );
    }

    return (
      <div className="orders-list">
        {orders.map((order) => (
          <Card
            key={order.id}
            title={`Pedido #${order.order_number} - Mesa ${order.table_number}`}
            extra={
              <Badge
                status={
                  order.status === 'pending'
                    ? 'default'
                    : order.status === 'in_progress'
                    ? 'processing'
                    : order.status === 'ready'
                    ? 'warning'
                    : order.status === 'delivered'
                    ? 'success'
                    : 'default'
                }
                text={order.status.replace('_', ' ')}
              />
            }
            style={{ marginBottom: 16 }}
            actions={[
              <Button
                type="link"
                onClick={() => (window.location.href = `/orders/edit/${order.id}`)}
                key="edit"
              >
                Editar
              </Button>,
            ]}
          >
            <p>Itens: {order.items.length}</p>
            <p>Total: R$ {order.total.toFixed(2)}</p>
            <p>Criado em: {new Date(order.created_at).toLocaleString()}</p>
          </Card>
        ))}
      </div>
    );
  };

  const renderOrderModal = (): JSX.Element => (
    <Modal
      title={`Iniciar Pedido - Mesa ${currentTable?.number ?? ''}`}
      visible={showOrderModal}
      onCancel={() => {
        setShowOrderModal(false);
        orderForm.resetFields();
      }}
      onOk={handleCreateOrder}
      confirmLoading={loading}
      okText="Criar Pedido"
      cancelText="Cancelar"
    >
      <Form form={orderForm} layout="vertical">
        <Form.Item name="table_number" label="Número da Mesa">
          <Input disabled />
        </Form.Item>

        <Form.Item
          name="customer_count"
          label="Número de Clientes"
          rules={[{ required: true, message: 'Informe o número de clientes' }]}
        >
          <Input type="number" min={1} />
        </Form.Item>

        <Form.Item name="notes" label="Observações">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderTransferModal = (): JSX.Element => (
    <Modal
      title={`Transferir Pedido - Mesa ${currentTable?.number ?? ''}`}
      visible={showTransferModal}
      onCancel={() => {
        setShowTransferModal(false);
        transferForm.resetFields();
      }}
      onOk={handleTransferTable}
      confirmLoading={loading}
      okText="Transferir"
      cancelText="Cancelar"
    >
      <Form form={transferForm} layout="vertical">
        <Form.Item name="source_table_number" label="Mesa Origem">
          <Input disabled />
        </Form.Item>

        <Form.Item
          name="target_table_id"
          label="Mesa Destino"
          rules={[{ required: true, message: 'Selecione a mesa destino' }]}
        >
          <Select placeholder="Selecione uma mesa disponível">
            {availableTables.map((table) => (
              <Option key={table.id} value={table.id}>
                {table.number} (Capacidade: {table.capacity})
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );

  const renderBillModal = (): JSX.Element => (
    <Modal
      title={`Fechar Conta - Mesa ${currentTable?.number ?? ''}`}
      visible={showBillModal}
      onCancel={() => {
        setShowBillModal(false);
        billForm.resetFields();
      }}
      onOk={handleCloseBill}
      confirmLoading={loading}
      okText="Fechar Conta"
      cancelText="Cancelar"
    >
      <Form form={billForm} layout="vertical">
        <Form.Item name="table_number" label="Número da Mesa">
          <Input disabled />
        </Form.Item>

        <Form.Item name="total_amount" label="Valor Total">
          <Input disabled prefix="R$" />
        </Form.Item>

        <Form.Item
          name="payment_method"
          label="Forma de Pagamento"
          rules={[{ required: true, message: 'Selecione a forma de pagamento' }]}
        >
          <Select>
            <Option value="cash">Dinheiro</Option>
            <Option value="credit_card">Cartão de Crédito</Option>
            <Option value="debit_card">Cartão de Débito</Option>
            <Option value="pix">PIX</Option>
            <Option value="other">Outro</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="split_count"
          label="Número de divisões da conta"
          rules={[{ required: true, message: 'Informe o número de divisões' }]}
        >
          <Input type="number" min={1} />
        </Form.Item>
      </Form>
    </Modal>
  );

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
                  onClick={() =>
                    (window.location.href = `/waiter/tables/layout?restaurant_id=${restaurantId}&store_id=${storeId}`)
                  }
                >
                  Editar Layout
                </Button>
                <Button onClick={() => fetchTables()}>Atualizar</Button>
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
                <Button onClick={() => fetchOrders()}>Atualizar</Button>
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
