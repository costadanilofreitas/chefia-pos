import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Divider, ActivityIndicator, Chip, TextInput, Switch, List } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { useConfig } from '../contexts/ConfigContext';
import { useSync } from '../contexts/SyncContext';
import { logout } from '../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { serverUrl, restaurantId, resetConfig } = useConfig();
  const { isOnline, isSyncing, lastSyncTime, pendingOperations, syncNow } = useSync();
  
  const [darkMode, setDarkMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showNutritionalInfo, setShowNutritionalInfo] = useState(true);
  
  const handleLogout = async () => {
    try {
      // Verificar se há operações pendentes
      if (pendingOperations > 0) {
        // Aqui poderia mostrar um diálogo de confirmação
        console.log('Há operações pendentes. Deseja sincronizar antes de sair?');
        return;
      }
      
      dispatch(logout());
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };
  
  const handleResetConfig = async () => {
    try {
      // Aqui poderia mostrar um diálogo de confirmação
      await resetConfig();
    } catch (error) {
      console.error('Erro ao resetar configuração:', error);
    }
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Perfil do usuário */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarText}>{user?.name.charAt(0) || '?'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Title style={styles.profileName}>{user?.name || 'Usuário'}</Title>
              <Paragraph style={styles.profileRole}>{user?.role || 'Garçom'}</Paragraph>
            </View>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            icon="logout"
          >
            Sair
          </Button>
        </Card.Actions>
      </Card>
      
      {/* Informações de conexão */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Conexão</Title>
          
          <View style={styles.connectionStatus}>
            <View style={styles.statusItem}>
              <Icon 
                name={isOnline ? "wifi" : "wifi-off"} 
                size={24} 
                color={isOnline ? "#4CAF50" : "#F44336"} 
              />
              <Text style={styles.statusText}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Icon 
                name="server" 
                size={24} 
                color={isOnline ? "#4CAF50" : "#9E9E9E"} 
              />
              <Text style={styles.statusText}>
                {serverUrl || 'Não configurado'}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoLabel}>Última sincronização:</Text>
            <Text style={styles.syncInfoValue}>{formatDate(lastSyncTime)}</Text>
          </View>
          
          <View style={styles.syncInfo}>
            <Text style={styles.syncInfoLabel}>Operações pendentes:</Text>
            <Text style={styles.syncInfoValue}>{pendingOperations}</Text>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="contained" 
            onPress={syncNow}
            icon="sync"
            loading={isSyncing}
            disabled={!isOnline || isSyncing}
          >
            Sincronizar Agora
          </Button>
        </Card.Actions>
      </Card>
      
      {/* Configurações do aplicativo */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Configurações do Aplicativo</Title>
          
          <List.Item
            title="Modo Escuro"
            description="Ativar tema escuro no aplicativo"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={props => <Switch value={darkMode} onValueChange={setDarkMode} />}
          />
          
          <Divider />
          
          <List.Item
            title="Modo Offline"
            description="Trabalhar sem conexão com o servidor"
            left={props => <List.Icon {...props} icon="wifi-off" />}
            right={props => <Switch value={offlineMode} onValueChange={setOfflineMode} />}
          />
          
          <Divider />
          
          <List.Item
            title="Notificações"
            description="Receber alertas de novos pedidos e atualizações"
            left={props => <List.Icon {...props} icon="bell" />}
            right={props => <Switch value={notifications} onValueChange={setNotifications} />}
          />
          
          <Divider />
          
          <List.Item
            title="Informações Nutricionais"
            description="Mostrar calorias e alérgenos no cardápio"
            left={props => <List.Icon {...props} icon="food-variant" />}
            right={props => <Switch value={showNutritionalInfo} onValueChange={setShowNutritionalInfo} />}
          />
        </Card.Content>
      </Card>
      
      {/* Sobre o aplicativo */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Sobre</Title>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Aplicativo:</Text>
            <Text style={styles.aboutValue}>POS Modern - Garçom</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Versão:</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Restaurante:</Text>
            <Text style={styles.aboutValue}>{restaurantId || 'Não configurado'}</Text>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={handleResetConfig}
            icon="refresh"
          >
            Resetar Configuração
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    marginBottom: 0,
  },
  profileRole: {
    color: '#757575',
  },
  connectionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
  },
  divider: {
    marginVertical: 16,
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncInfoLabel: {
    color: '#757575',
  },
  syncInfoValue: {
    fontWeight: 'bold',
  },
  aboutItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  aboutLabel: {
    width: 100,
    color: '#757575',
  },
  aboutValue: {
    flex: 1,
    fontWeight: '500',
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});

export default SettingsScreen;
