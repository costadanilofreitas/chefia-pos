import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Divider, ActivityIndicator, Chip, Badge } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSync } from '../contexts/SyncContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Tipos
interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'canceled';
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
  waiter: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'canceled';
}

// Dados de exemplo
const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    tableId: '2',
    tableNumber: 2,
    status: 'preparing',
    items: [
      { id: '1', name: 'X-Burger', quantity: 2, price: 25.90, status: 'preparing' },
      { id: '2', name: 'Batata Frita', quantity: 1, price: 15.90, status: 'ready' },
      { id: '3', name: 'Refrigerante', quantity: 2, price: 8.90, status: 'delivered' }
    ],
    total: 85.50,
    createdAt: '2025-05-25T14:30:00Z',
    updatedAt: '2025-05-25T14:35:00Z',
    waiter: 'Garçom Demo'
  },
  {
    id: '2',
    tableId: '4',
    tableNumber: 4,
    status: 'ready',
    items: [
      { id: '4', name: 'Pizza Margherita', quantity: 1, price: 45.90, status: 'ready' },
      { id: '5', name: 'Salada Caesar', quantity: 1, price: 22.90, status: 'ready' },
      { id: '6', name: 'Água Mineral', quantity: 3, price: 5.90, status: 'delivered' }
    ],
    total: 86.50,
    createdAt: '2025-05-25T14:00:00Z',
    updatedAt: '2025-05-25T14:20:00Z',
    waiter: 'Garçom Demo'
  },
  {
    id: '3',
    tableId: '6',
    tableNumber: 6,
    status: 'pending',
    items: [
      { id: '7', name: 'Filé Mignon', quantity: 1, price: 65.90, status: 'pending' },
      { id: '8', name: 'Arroz', quantity: 1, price: 10.90, status: 'pending' },
      { id: '9', name: 'Vinho Tinto', quantity: 1, price: 89.90, status: 'pending' }
    ],
    total: 166.70,
    createdAt: '2025-05-25T14:40:00Z',
    updatedAt: '2025-05-25T14:40:00Z',
    waiter: 'Maria'
  }
];

const OrdersScreen = ({ navigation, route }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { isOnline } = useSync();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  
  // Carregar pedidos
  useEffect(() => {
    const loadOrders = async () => {
      try {
        // Em produção, isso seria uma chamada API real
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Se veio da tela de mesas com um tableId, filtrar por essa mesa
        if (route.params?.tableId) {
          const tableOrders = MOCK_ORDERS.filter(order => order.tableId === route.params.tableId);
          setOrders(tableOrders);
        } else {
          setOrders(MOCK_ORDERS);
        }
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, [route.params?.tableId]);
  
  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === null || order.status === filterStatus;
    const matchesMine = !filterMine || order.waiter === user?.name;
    
    return matchesStatus && matchesMine;
  });
  
  // Renderizar item do pedido
  const renderOrderItem = ({ item }: { item: Order }) => {
    const isMyOrder = item.waiter === user?.name;
    
    // Definir cor com base no status
    let statusColor = '#F44336'; // Vermelho para pendente
    let statusText = 'Pendente';
    
    if (item.status === 'preparing') {
      statusColor = '#FF9800'; // Laranja para em preparo
      statusText = 'Em Preparo';
    } else if (item.status === 'ready') {
      statusColor = '#4CAF50'; // Verde para pronto
      statusText = 'Pronto';
    } else if (item.status === 'delivered') {
      statusColor = '#2196F3'; // Azul para entregue
      statusText = 'Entregue';
    } else if (item.status === 'canceled') {
      statusColor = '#9E9E9E'; // Cinza para cancelado
      statusText = 'Cancelado';
    }
    
    // Calcular progresso dos itens
    const totalItems = item.items.length;
    const readyItems = item.items.filter(i => i.status === 'ready' || i.status === 'delivered').length;
    const deliveredItems = item.items.filter(i => i.status === 'delivered').length;
    
    return (
      <Card style={[styles.orderCard, isMyOrder && styles.myOrderCard]} onPress={() => navigation.navigate('Order', { orderId: item.id })}>
        <Card.Content>
          <View style={styles.orderHeader}>
            <View>
              <Title style={styles.orderTitle}>Mesa {item.tableNumber}</Title>
              <Paragraph style={styles.orderSubtitle}>Pedido #{item.id}</Paragraph>
            </View>
            <Badge size={24} style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              {statusText}
            </Badge>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.itemsList}>
            {item.items.slice(0, 3).map((orderItem) => (
              <View key={orderItem.id} style={styles.itemRow}>
                <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                <Text style={styles.itemName}>{orderItem.name}</Text>
                <Text style={styles.itemStatus}>
                  {orderItem.status === 'pending' && '⏳'}
                  {orderItem.status === 'preparing' && '🔥'}
                  {orderItem.status === 'ready' && '✅'}
                  {orderItem.status === 'delivered' && '🍽️'}
                  {orderItem.status === 'canceled' && '❌'}
                </Text>
              </View>
            ))}
            
            {item.items.length > 3 && (
              <Text style={styles.moreItems}>+ {item.items.length - 3} mais itens</Text>
            )}
          </View>
          
          <View style={styles.orderFooter}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {readyItems}/{totalItems} prontos • {deliveredItems}/{totalItems} entregues
              </Text>
            </View>
            <Text style={styles.totalText}>
              Total: R$ {item.total.toFixed(2)}
            </Text>
          </View>
          
          <Chip icon="account" style={[styles.waiterChip, isMyOrder && styles.myWaiterChip]}>
            {item.waiter}
          </Chip>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('Order', { orderId: item.id })}
            icon="eye"
          >
            Detalhes
          </Button>
          
          {item.status === 'ready' && (
            <Button 
              mode="contained" 
              onPress={() => console.log('Entregar pedido')}
              icon="check-circle"
            >
              Entregar
            </Button>
          )}
          
          {item.status === 'delivered' && (
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('Payment', { orderId: item.id })}
              icon="cash-register"
            >
              Pagamento
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip 
            selected={filterStatus === null}
            onPress={() => setFilterStatus(null)}
            style={styles.filterChip}
          >
            Todos
          </Chip>
          <Chip 
            selected={filterStatus === 'pending'}
            onPress={() => setFilterStatus('pending')}
            style={styles.filterChip}
          >
            Pendentes
          </Chip>
          <Chip 
            selected={filterStatus === 'preparing'}
            onPress={() => setFilterStatus('preparing')}
            style={styles.filterChip}
          >
            Em Preparo
          </Chip>
          <Chip 
            selected={filterStatus === 'ready'}
            onPress={() => setFilterStatus('ready')}
            style={styles.filterChip}
          >
            Prontos
          </Chip>
          <Chip 
            selected={filterStatus === 'delivered'}
            onPress={() => setFilterStatus('delivered')}
            style={styles.filterChip}
          >
            Entregues
          </Chip>
        </ScrollView>
        
        <Chip 
          selected={filterMine}
          onPress={() => setFilterMine(!filterMine)}
          icon={filterMine ? "check" : "account"}
          style={styles.myOrdersChip}
        >
          Meus Pedidos
        </Chip>
      </View>
      
      {/* Status de sincronização */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Icon name="cloud-off-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
      
      {/* Lista de pedidos */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando pedidos...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="food-off" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('Tables')}
            style={styles.newOrderButton}
          >
            Novo Pedido
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ordersList}
        />
      )}
      
      {/* Botão de novo pedido */}
      {!route.params?.tableId && (
        <FAB
          icon="plus"
          label="Novo Pedido"
          onPress={() => navigation.navigate('Tables')}
          style={styles.fab}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtersContainer: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 4,
  },
  myOrdersChip: {
    marginLeft: 8,
  },
  offlineBar: {
    backgroundColor: '#F44336',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    color: '#757575',
    fontSize: 16,
  },
  newOrderButton: {
    marginTop: 16,
  },
  ordersList: {
    padding: 8,
  },
  orderCard: {
    marginBottom: 8,
    elevation: 2,
  },
  myOrderCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    fontSize: 18,
    marginBottom: 0,
  },
  orderSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  statusBadge: {
    color: 'white',
  },
  divider: {
    marginVertical: 8,
  },
  itemsList: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemQuantity: {
    width: 30,
    fontWeight: 'bold',
  },
  itemName: {
    flex: 1,
  },
  itemStatus: {
    width: 24,
    textAlign: 'center',
  },
  moreItems: {
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#757575',
    fontSize: 12,
  },
  totalText: {
    fontWeight: 'bold',
  },
  waiterChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  myWaiterChip: {
    backgroundColor: '#E3F2FD',
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default OrdersScreen;
