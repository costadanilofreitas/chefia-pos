import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Card, Title, Paragraph } from 'react-native-paper';
import { useConfig } from '../contexts/ConfigContext';
import { useSync } from '../contexts/SyncContext';

const ConfigScreen = () => {
  const { setServerConfig, isLoading } = useConfig();
  const { isOnline } = useSync();
  
  const [serverUrl, setServerUrl] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const handleConfigure = async () => {
    if (!serverUrl.trim()) {
      setError('URL do servidor é obrigatória');
      return;
    }

    if (!restaurantId.trim()) {
      setError('ID do restaurante é obrigatório');
      return;
    }

    if (!isOnline) {
      setError('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
      return;
    }

    try {
      setError(null);
      await setServerConfig(serverUrl, restaurantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao configurar aplicativo');
    }
  };

  const handleQrCodeScanned = (data: string) => {
    try {
      // Formato esperado: {"url":"https://example.com","id":"123"}
      const scannedData = JSON.parse(data);
      
      if (scannedData.url && scannedData.id) {
        setServerUrl(scannedData.url);
        setRestaurantId(scannedData.id);
        setShowQrScanner(false);
      } else {
        setError('QR Code inválido. Formato esperado não encontrado.');
      }
    } catch (err) {
      setError('QR Code inválido. Não foi possível processar os dados.');
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
            <Title style={styles.cardTitle}>Configuração Inicial</Title>
            <Paragraph style={styles.cardSubtitle}>
              Configure o aplicativo para se conectar ao seu restaurante
            </Paragraph>

            {!isOnline && (
              <View style={styles.offlineWarning}>
                <Text style={styles.offlineText}>
                  Você está offline. Conecte-se à internet para configurar o aplicativo.
                </Text>
              </View>
            )}

            <TextInput
              label="URL do Servidor"
              value={serverUrl}
              onChangeText={setServerUrl}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="url"
              style={styles.input}
              disabled={isLoading}
              placeholder="exemplo: https://seurestaurante.posmodern.com"
            />

            <TextInput
              label="ID do Restaurante"
              value={restaurantId}
              onChangeText={setRestaurantId}
              mode="outlined"
              style={styles.input}
              disabled={isLoading}
              placeholder="Exemplo: rest_12345"
            />

            {error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleConfigure}
              loading={isLoading}
              disabled={isLoading || !isOnline}
              style={styles.button}
            >
              Configurar
            </Button>

            <Button
              mode="outlined"
              onPress={() => setShowQrScanner(true)}
              disabled={isLoading}
              style={styles.button}
            >
              Escanear QR Code
            </Button>
          </Card.Content>
        </Card>

        {/* QR Code Scanner Modal - Implementação simplificada */}
        {showQrScanner && (
          <View style={styles.qrScannerContainer}>
            <View style={styles.qrScanner}>
              <Text>Scanner de QR Code</Text>
              {/* Aqui seria implementado o componente real de scanner */}
              <Button onPress={() => setShowQrScanner(false)}>Fechar</Button>
            </View>
          </View>
        )}
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
    marginBottom: 8,
  },
  cardSubtitle: {
    marginBottom: 16,
    color: '#757575',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 8,
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
  qrScannerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  qrScanner: {
    width: '80%',
    height: '60%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConfigScreen;
