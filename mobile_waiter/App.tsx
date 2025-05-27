import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import TableScreen from './src/screens/TableScreen';
import OrderScreen from './src/screens/OrderScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider>
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName="Login"
              screenOptions={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: '#FF5722',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            >
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ title: 'Mesas' }}
              />
              <Stack.Screen 
                name="Table" 
                component={TableScreen} 
                options={({ route }) => ({ title: `Mesa ${route.params.tableNumber}` })}
              />
              <Stack.Screen 
                name="Order" 
                component={OrderScreen} 
                options={{ title: 'Pedido' }}
              />
              <Stack.Screen 
                name="Payment" 
                component={PaymentScreen} 
                options={{ title: 'Pagamento' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </ReduxProvider>
  );
};

export default App;
