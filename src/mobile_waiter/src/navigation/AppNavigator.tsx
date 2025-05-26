import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useConfig } from '../contexts/ConfigContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Telas de autenticação e configuração
import ConfigScreen from '../screens/ConfigScreen';
import LoginScreen from '../screens/LoginScreen';

// Telas principais
import TablesScreen from '../screens/TablesScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MenuScreen from '../screens/MenuScreen';
import PaymentScreen from '../screens/PaymentScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Tipos para navegação
export type RootStackParamList = {
  Config: undefined;
  Auth: undefined;
  Main: undefined;
  Order: { tableId: string; orderId?: string };
  Payment: { orderId: string };
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Tables: undefined;
  Orders: undefined;
  Menu: undefined;
  Settings: undefined;
};

// Navegadores
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Navegador de autenticação
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
};

// Navegador principal (tabs)
const MainNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Tables') {
            iconName = focused ? 'table-furniture' : 'table-furniture';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
          } else if (route.name === 'Menu') {
            iconName = focused ? 'food' : 'food-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return <Icon name={iconName || 'help'} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <MainTab.Screen 
        name="Tables" 
        component={TablesScreen} 
        options={{ title: 'Mesas' }}
      />
      <MainTab.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ title: 'Pedidos' }}
      />
      <MainTab.Screen 
        name="Menu" 
        component={MenuScreen} 
        options={{ title: 'Cardápio' }}
      />
      <MainTab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Configurações' }}
      />
    </MainTab.Navigator>
  );
};

// Navegador raiz
const AppNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isConfigured, isLoading } = useConfig();

  // Mostrar tela de carregamento enquanto verifica configuração
  if (isLoading) {
    return null; // Ou um componente de loading
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isConfigured ? (
        // Fluxo de configuração
        <Stack.Screen name="Config" component={ConfigScreen} />
      ) : !isAuthenticated ? (
        // Fluxo de autenticação
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        // Fluxo principal
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen 
            name="Order" 
            component={OrdersScreen} 
            options={{ headerShown: true, title: 'Pedido' }}
          />
          <Stack.Screen 
            name="Payment" 
            component={PaymentScreen} 
            options={{ headerShown: true, title: 'Pagamento' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
