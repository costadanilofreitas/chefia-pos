import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Button, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { fetchTables, updateTableStatus } from '../services/tableService';
import { Table, HomeScreenProps } from '../types';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load tables on component mount and when refreshing
  useEffect(() => {
    loadTables();
  }, []);

  // Function to load tables from API
  const loadTables = async (): Promise<void> => {
    if (!refreshing) setIsLoading(true);
    setError(null);
    
    try {
      const tablesData = await fetchTables();
      setTables(tablesData);
    } catch (err) {
      console.error('Error loading tables:', err);
      setError('Falha ao carregar mesas. Puxe para baixo para tentar novamente.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = (): void => {
    setRefreshing(true);
    loadTables();
  };

  // Handle table selection
  const handleTableSelect = (table: Table): void => {
    navigation.navigate('Table', { 
      tableId: table.id, 
      tableNumber: table.number 
    });
  };

  // Get color based on table status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return '#4CAF50'; // Green
      case 'occupied':
        return '#F44336'; // Red
      case 'reserved':
        return '#FFC107'; // Yellow
      case 'dirty':
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E';
    }
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'occupied':
        return 'Ocupada';
      case 'reserved':
        return 'Reservada';
      case 'dirty':
        return 'Suja';
      default:
        return 'Desconhecido';
    }
  };

  // Render table item
  const renderTableItem = ({ item }: { item: Table }): React.ReactElement => (
    <TouchableOpacity onPress={() => handleTableSelect(item)}>
      <Card style={styles.tableCard}>
        <Card.Content>
          <Title>Mesa {item.number}</Title>
          <View style={styles.tableInfo}>
            <Paragraph>Capacidade: {item.capacity} pessoas</Paragraph>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: getStatusColor(item.status) }
                ]} 
              />
              <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Show loading indicator
  if (isLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Carregando mesas...</Text>
      </View>
    );
  }

  // Show error message
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadTables}
          style={styles.retryButton}
        >
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tables}
        renderItem={renderTableItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF5722',
  },
  listContent: {
    padding: 16,
  },
  tableCard: {
    marginBottom: 16,
    elevation: 2,
  },
  tableInfo: {
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#757575',
  },
});

export default HomeScreen;
