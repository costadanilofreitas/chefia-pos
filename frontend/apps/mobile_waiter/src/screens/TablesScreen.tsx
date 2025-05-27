import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, FAB, Badge, ActivityIndicator, Chip, Searchbar } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSync } from '../contexts/SyncContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Tipos
interface Table {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'reserved' | 'billing';
  capacity: number;
  occupiedSeats?: number;
  waiter?: string;
  orders?: number;
  timeOccupied?: string;
}

// Dados de exemplo
const MOCK_TABLES: Table[] = [
  { id: '1', number: 1, status: 'free', capacity: 4 },
  { id: '2', number: 2, status: 'occupied', capacity: 4, occupiedSeats: 3, waiter: 'Garçom Demo', orders: 2, timeOccupied: '00:45' },
  { id: '3', number: 3, status: 'reserved', capacity: 2 },
  { id: '4', number: 4, status: 'billing', capacity: 6, occupiedSeats: 5, waiter: 'Garçom Demo', orders: 3, timeOccupied: '01:20' },
  { id: '5', number: 5, status: 'free', capacity: 8 },
  { id: '6', number: 6, status: 'occupied', capacity: 4, occupiedSeats: 4, waiter: 'Maria', orders: 1, timeOccupied: '00:15' },
  { id: '7', number: 7, status: 'free', capacity: 2 },
  { id: '8', number: 8, status: 'occupied', capacity: 4, occupiedSeats: 2, waiter: 'João', orders: 2, timeOccupied: '00:30' },
];

const TablesScreen = ({ navigation }: any) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { isOnline, isSyncing, syncNow } = useSync();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  
  // Carregar mesas
  useEffect(() => {
    const loadTables = async () => {
      try {
        // Em produção, isso seria uma chamada API real
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTables(MOCK_TABLES);
      } catch (error) {
        console.error('Erro ao carregar mesas:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTables();
  }, []);
  
  // Filtrar mesas
  const filteredTables = tables.filter(table => {
    const matchesSearch = searchQuery === '' || 
                         table.number.toString().includes(searchQuery) ||
                         (table.waiter && table.waiter.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterStatus === null || table.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });
  
  // Renderizar item da mesa
  const renderTableItem = ({ item }: { item: Table }) => {
    const isMyTable = item.waiter === user?.name;
    
    // Definir cor com base no status
    let statusColor = '#4CAF50'; // Verde para livre
    let statusText = 'Livre';
    
    if (item.status === 'occupied') {
      statusColor = '#2196F3'; // Azul para ocupada
      statusText = 'Ocupada';
    } else if (item.status === 'reserved') {
      statusColor = '#FF9800'; // Laranja para reservada
      statusText = 'Reservada';
    } else if (item.status === 'billing') {
      statusColor = '#F44336'; // Vermelho para em fechamento
      statusText = 'Em Fechamento';
    }
    
    return (
      <TouchableOpacity 
        onPress={() => navigation.navigate('Order', { tableId: item.id })}
        style={styles.tableItem}
      >
        <Card style={[styles.tableCard, isMyTable && styles.myTableCard]}>
          <View style={styles.tableHeader}>
            <Title style={styles.tableNumber}>Mesa {item.number}</Title>
            <Badge size={24} style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              {statusText}
            </Badge>
          </View>
          
          <Card.Content>
            <View style={styles.tableInfo}>
              <View style={styles.infoItem}>
                <Icon name="account-group" size={20} color="#757575" />
                <Text style={styles.infoText}>
                  {item.status !== 'free' && item.occupiedSeats ? 
                    `${item.occupiedSeats}/${item.capacity}` : 
                    `${item.capacity}`}
                </Text>
              </View>
              
              {item.status !== 'free' && item.status !== 'reserved' && (
                <>
                  <View style={styles.infoItem}>
                    <Icon name="clock-outline" size={20} color="#757575" />
                    <Text style={styles.infoText}>{item.timeOccupied}</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Icon name="food" size={20} color="#757575" />
                    <Text style={styles.infoText}>{item.orders} pedidos</Text>
                  </View>
                </>
              )}
            </View>
            
            {item.waiter && (
              <Chip 
                icon="account" 
                style={[styles.waiterChip, isMyTable && styles.myWaiterChip]}
              >
                {item.waiter}
              </Chip>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Barra de pesquisa */}
      <Searchbar
        placeholder="Buscar mesa ou garçom"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip 
            selected={filterStatus === null}
            onPress={() => setFilterStatus(null)}
            style={styles.filterChip}
          >
            Todas
          </Chip>
          <Chip 
            selected={filterStatus === 'free'}
            onPress={() => setFilterStatus('free')}
            style={styles.filterChip}
          >
            Livres
          </Chip>
          <Chip 
            selected={filterStatus === 'occupied'}
            onPress={() => setFilterStatus('occupied')}
            style={styles.filterChip}
          >
            Ocupadas
          </Chip>
          <Chip 
            selected={filterStatus === 'reserved'}
            onPress={() => setFilterStatus('reserved')}
            style={styles.filterChip}
          >
            Reservadas
          </Chip>
          <Chip 
            selected={filterStatus === 'billing'}
            onPress={() => setFilterStatus('billing')}
            style={styles.filterChip}
          >
            Em Fechamento
          </Chip>
        </ScrollView>
      </View>
      
      {/* Status de sincronização */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Icon name="cloud-off-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
      
      {/* Lista de mesas */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando mesas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTables}
          renderItem={renderTableItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tablesList}
          numColumns={2}
        />
      )}
      
      {/* Botão de sincronização */}
      <FAB
        icon={isSyncing ? "sync" : "sync"}
        label={isSyncing ? "Sincronizando..." : "Sincronizar"}
        onPress={syncNow}
        loading={isSyncing}
        disabled={!isOnline || isSyncing}
        style={styles.syncButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 8,
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  filterChip: {
    marginHorizontal: 4,
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
  tablesList: {
    padding: 8,
  },
  tableItem: {
    width: '50%',
    padding: 4,
  },
  tableCard: {
    elevation: 2,
  },
  myTableCard: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableNumber: {
    fontSize: 18,
    marginBottom: 0,
  },
  statusBadge: {
    color: 'white',
  },
  tableInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 4,
    color: '#757575',
  },
  waiterChip: {
    marginTop: 8,
  },
  myWaiterChip: {
    backgroundColor: '#E3F2FD',
  },
  syncButton: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default TablesScreen;
