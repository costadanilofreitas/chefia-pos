import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { useSync } from '../contexts/SyncContext';

const LoginScreen = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const { isOnline } = useSync();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim()) {
      dispatch(loginFailure('Nome de usuário é obrigatório'));
      return;
    }

    if (!password.trim()) {
      dispatch(loginFailure('Senha é obrigatória'));
      return;
    }

    try {
      dispatch(loginStart());
      
      // Simulação de login - em produção, isso seria uma chamada API real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (username === 'garcom' && password === '123456') {
        dispatch(loginSuccess({
          token: 'fake-jwt-token',
          user: {
            id: '1',
            name: 'Garçom Demo',
            role: 'waiter'
          }
        }));
      } else {
        dispatch(loginFailure('Credenciais inválidas'));
      }
    } catch (err) {
      dispatch(loginFailure(err instanceof Error ? err.message : 'Erro ao fazer login'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Title style={styles.title}>POS Modern</Title>
          <Paragraph style={styles.subtitle}>Aplicativo de Garçom</Paragraph>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Login</Title>

            {!isOnline && (
              <View style={styles.offlineWarning}>
                <Text style={styles.offlineText}>
                  Você está offline. O login offline está disponível se você já se autenticou anteriormente neste dispositivo.
                </Text>
              </View>
            )}

            <TextInput
              label="Nome de Usuário"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              style={styles.input}
              disabled={loading}
            />

            <TextInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              disabled={loading}
            />

            {error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Entrar
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
  },
  card: {
    borderRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  offlineWarning: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  offlineText: {
    color: '#E65100',
  },
});

export default LoginScreen;
