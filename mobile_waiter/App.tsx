import React from 'react';
import { AppRegistry } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { SyncProvider } from './src/contexts/SyncContext';
import { ConfigProvider } from './src/contexts/ConfigContext';

const App = () => {
  return (
    <StoreProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <NavigationContainer>
              <ConfigProvider>
                <SyncProvider>
                  <AppNavigator />
                </SyncProvider>
              </ConfigProvider>
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </PersistGate>
    </StoreProvider>
  );
};

AppRegistry.registerComponent('MobileWaiter', () => App);

export default App;
