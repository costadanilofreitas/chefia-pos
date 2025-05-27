import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Divider, ActivityIndicator, Chip, TextInput, FAB, Portal, Dialog, IconButton } from 'react-native-paper';
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
  seats?: Seat[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'canceled';
  seatNumber?: number;
}

interface Seat {
  number: number;
  items: string[]; // IDs dos itens
  subtotal: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

// Dados de exemplo
const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'credit', name: 'Cartão de Crédito', icon: 'credit-card', enabled: true },
  { id: 'debit', name: 'Cartão de Débito', icon: 'credit-card-outline', enabled: true },
  { id: 'pix', name: 'PIX', icon: 'qrcode', enabled: true },
  { id: 'cash', name: 'Dinheiro', icon: 'cash', enabled: true },
  { id: 'voucher', name: 'Vale Refeição', icon: 'ticket', enabled: true },
];

const MOCK_ORDER: Order = {
  id: '2',
  tableId: '4',
  tableNumber: 4,
  status: 'delivered',
  items: [
    { id: '4', name: 'Pizza Margherita', quantity: 1, price: 45.90, status: 'delivered', seatNumber: 1 },
    { id: '5', name: 'Salada Caesar', quantity: 1, price: 22.90, status: 'delivered', seatNumber: 2 },
    { id: '6', name: 'Água Mineral', quantity: 3, price: 5.90, status: 'delivered', seatNumber: 3 }
  ],
  total: 86.50,
  createdAt: '2025-05-25T14:00:00Z',
  updatedAt: '2025-05-25T14:20:00Z',
  waiter: 'Garçom Demo',
  seats: [
    { number: 1, items: ['4'], subtotal: 45.90 },
    { number: 2, items: ['5'], subtotal: 22.90 },
    { number: 3, items: ['6'], subtotal: 17.70 }
  ]
};

const PaymentScreen = ({ navigation, route }: any) => {
  const { isOnline } = useSync();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [payments, setPayments] = useState<Array<{method: string, amount: number}>>([]);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'bySeat'>('equal');
  const [splitParts, setSplitParts] = useState<number>(2);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  
  // Carregar pedido e métodos de pagamento
  useEffect(() => {
    const loadData = async () => {
      try {
        // Em produção, isso seria uma chamada API real
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Carregar pedido
        setOrder(MOCK_ORDER);
        setRemainingAmount(MOCK_ORDER.total);
        
        // Carregar métodos de pagamento
        setPaymentMethods(MOCK_PAYMENT_METHODS);
        
        // Selecionar primeiro método por padrão
        if (MOCK_PAYMENT_METHODS.length > 0) {
          setSelectedPaymentMethod(MOCK_PAYMENT_METHODS[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [route.params?.orderId]);
  
  // Adicionar pagamento
  const handleAddPayment = () => {
    if (!selectedPaymentMethod || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      return;
    }
    
    const amount = parseFloat(paymentAmount);
    if (amount > remainingAmount) {
      // Mostrar erro ou troco
      return;
    }
    
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || selectedPaymentMethod;
    
    setPayments([...payments, { method, amount }]);
    setRemainingAmount(prev => parseFloat((prev - amount).toFixed(2)));
    setPaymentAmount('');
  };
  
  // Remover pagamento
  const handleRemovePayment = (index: number) => {
    const removedPayment = payments[index];
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    
    setPayments(newPayments);
    setRemainingAmount(prev => parseFloat((prev + removedPayment.amount).toFixed(2)));
  };
  
  // Finalizar pagamento
  const handleFinishPayment = async () => {
    if (remainingAmount > 0) {
      // Mostrar erro ou confirmar pagamento parcial
      return;
    }
    
    try {
      // Em produção, isso seria uma chamada API real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navegar de volta para a lista de pedidos
      navigation.navigate('Orders');
    } catch (error) {
      console.error('Erro ao finalizar pagamento:', error);
    }
  };
  
  // Dividir conta
  const handleSplitBill = () => {
    setShowSplitDialog(true);
  };
  
  // Aplicar divisão
  const handleApplySplit = () => {
    if (splitType === 'equal' && order) {
      const amountPerPerson = parseFloat((order.total / splitParts).toFixed(2));
      setPaymentAmount(amountPerPerson.toString());
    } else if (splitType === 'bySeat' && selectedSeat !== null && order?.seats) {
      const seat = order.seats.find(s => s.number === selectedSeat);
      if (seat) {
        setPaymentAmount(seat.subtotal.toString());
      }
    }
    
    setShowSplitDialog(false);
  };
  
  // Renderizar método de pagamento
  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedPaymentMethod === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        onPress={() => setSelectedPaymentMethod(method.id)}
        style={[styles.paymentMethodItem, isSelected && styles.selectedPaymentMethodItem]}
      >
        <Icon name={method.icon} size={24} color={isSelected ? '#2196F3' : '#757575'} />
        <Text style={[styles.paymentMethodText, isSelected && styles.selectedPaymentMethodText]}>
          {method.name}
        </Text>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Status de sincronização */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Icon name="cloud-off-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando dados do pagamento...</Text>
        </View>
      ) : !order ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Pedido não encontrado</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          >
            Voltar
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Informações do pedido */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.orderHeader}>
                <View>
                  <Title style={styles.orderTitle}>Mesa {order.tableNumber}</Title>
                  <Paragraph style={styles.orderSubtitle}>Pedido #{order.id}</Paragraph>
                </View>
                <Chip icon="account" style={styles.waiterChip}>
                  {order.waiter}
                </Chip>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.itemsList}>
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.seatNumber && (
                      <Chip size={20} style={styles.seatChip}>
                        Lugar {item.seatNumber}
                      </Chip>
                    )}
                    <Text style={styles.itemPrice}>
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>R$ {order.total.toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>
          
          {/* Métodos de pagamento */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Método de Pagamento</Title>
              
              <View style={styles.paymentMethodsContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.paymentMethodsScrollView}
                >
                  {paymentMethods.map(renderPaymentMethod)}
                </ScrollView>
              </View>
              
              <View style={styles.paymentInputContainer}>
                <TextInput
                  label="Valor"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.paymentInput}
                  left={<TextInput.Affix text="R$" />}
                />
                
                <Button
                  mode="contained"
                  onPress={handleAddPayment}
                  disabled={!selectedPaymentMethod || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > remainingAmount}
                  style={styles.addPaymentButton}
                >
                  Adicionar
                </Button>
              </View>
              
              <Button
                mode="outlined"
                onPress={handleSplitBill}
                icon="account-group"
                style={styles.splitButton}
              >
                Dividir Conta
              </Button>
            </Card.Content>
          </Card>
          
          {/* Pagamentos adicionados */}
          {payments.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.cardTitle}>Pagamentos</Title>
                
                {payments.map((payment, index) => (
                  <View key={index} style={styles.paymentRow}>
                    <Text style={styles.paymentMethod}>{payment.method}</Text>
                    <Text style={styles.paymentAmount}>R$ {payment.amount.toFixed(2)}</Text>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => handleRemovePayment(index)}
                    />
                  </View>
                ))}
                
                <Divider style={styles.divider} />
                
                <View style={styles.remainingRow}>
                  <Text style={styles.remainingLabel}>Restante:</Text>
                  <Text style={[styles.remainingValue, remainingAmount <= 0 && styles.remainingComplete]}>
                    R$ {remainingAmount.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}
          
          {/* Botão de finalizar */}
          <Button
            mode="contained"
            onPress={handleFinishPayment}
            disabled={remainingAmount > 0}
            style={styles.finishButton}
            icon="check-circle"
          >
            {remainingAmount <= 0 ? 'Finalizar Pagamento' : `Falta R$ ${remainingAmount.toFixed(2)}`}
          </Button>
        </ScrollView>
      )}
      
      {/* Diálogo de divisão */}
      <Portal>
        <Dialog visible={showSplitDialog} onDismiss={() => setShowSplitDialog(false)}>
          <Dialog.Title>Dividir Conta</Dialog.Title>
          <Dialog.Content>
            <View style={styles.splitTypeContainer}>
              <Chip
                selected={splitType === 'equal'}
                onPress={() => setSplitType('equal')}
                style={styles.splitTypeChip}
              >
                Igualmente
              </Chip>
              <Chip
                selected={splitType === 'custom'}
                onPress={() => setSplitType('custom')}
                style={styles.splitTypeChip}
              >
                Personalizado
              </Chip>
              <Chip
                selected={splitType === 'bySeat'}
                onPress={() => setSplitType('bySeat')}
                style={styles.splitTypeChip}
              >
                Por Lugar
              </Chip>
            </View>
            
            {splitType === 'equal' && (
              <View style={styles.splitPartsContainer}>
                <Text>Dividir em quantas partes:</Text>
                <View style={styles.splitPartsControls}>
                  <IconButton
                    icon="minus"
                    size={20}
                    onPress={() => setSplitParts(prev => Math.max(2, prev - 1))}
                  />
                  <Text style={styles.splitPartsValue}>{splitParts}</Text>
                  <IconButton
                    icon="plus"
                    size={20}
                    onPress={() => setSplitParts(prev => prev + 1)}
                  />
                </View>
                <Text style={styles.splitAmountText}>
                  R$ {order ? (order.total / splitParts).toFixed(2) : '0.00'} por pessoa
                </Text>
              </View>
            )}
            
            {splitType === 'bySeat' && order?.seats && (
              <View style={styles.seatsContainer}>
                <Text>Selecione o lugar:</Text>
                <View style={styles.seatsList}>
                  {order.seats.map(seat => (
                    <Chip
                      key={seat.number}
                      selected={selectedSeat === seat.number}
                      onPress={() => setSelectedSeat(seat.number)}
                      style={styles.seatChipLarge}
                    >
                      Lugar {seat.number} - R$ {seat.subtotal.toFixed(2)}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSplitDialog(false)}>Cancelar</Button>
            <Button 
              mode="contained" 
              onPress={handleApplySplit}
              disabled={(splitType === 'bySeat' && selectedSeat === null)}
            >
              Aplicar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    color: '#757575',
    fontSize: 16,
  },
  errorButton: {
    marginTop: 16,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderTitle: {
    fontSize: 18,
    marginBottom: 0,
  },
  orderSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  waiterChip: {
    backgroundColor: '#E3F2FD',
  },
  divider: {
    marginVertical: 16,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemQuantity: {
    width: 30,
    fontWeight: 'bold',
  },
  itemName: {
    flex: 1,
  },
  seatChip: {
    marginRight: 8,
    height: 24,
  },
  itemPrice: {
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentMethodsContainer: {
    marginBottom: 16,
  },
  paymentMethodsScrollView: {
    paddingVertical: 8,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedPaymentMethodItem: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  paymentMethodText: {
    marginLeft: 8,
    color: '#212121',
  },
  selectedPaymentMethodText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  paymentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentInput: {
    flex: 1,
    marginRight: 8,
  },
  addPaymentButton: {
    height: 56,
    justifyContent: 'center',
  },
  splitButton: {
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentMethod: {
    flex: 1,
  },
  paymentAmount: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  remainingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
  },
  remainingComplete: {
    color: '#4CAF50',
  },
  finishButton: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 8,
  },
  splitTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  splitTypeChip: {
    margin: 4,
  },
  splitPartsContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  splitPartsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  splitPartsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  splitAmountText: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  seatsContainer: {
    marginTop: 16,
  },
  seatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  seatChipLarge: {
    margin: 4,
  },
});

export default PaymentScreen;
