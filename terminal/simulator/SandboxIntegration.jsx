import React from 'react';
import { StyleSheet, View, Text, Button, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';

class SandboxIntegration extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeProvider: 'cielo',
      sandboxUrl: {
        cielo: 'https://developercielo.github.io/api-sandbox/',
        rede: 'https://www.userede.com.br/desenvolvedores/sandbox/'
      },
      apiKey: {
        cielo: '',
        rede: ''
      },
      apiSecret: {
        cielo: '',
        rede: ''
      },
      merchantId: {
        cielo: '',
        rede: ''
      },
      terminalId: {
        cielo: '',
        rede: ''
      },
      testTransaction: {
        amount: '10.00',
        paymentMethod: 'credit',
        installments: '1',
        cardNumber: '4111111111111111',
        cardHolder: 'USUARIO DE TESTE',
        expirationDate: '12/2030',
        cvv: '123'
      },
      testResults: null,
      isLoading: false,
      logs: []
    };
  }
  
  addLog(message) {
    const timestamp = new Date().toISOString();
    this.setState(prevState => ({
      logs: [...prevState.logs, `${timestamp}: ${message}`].slice(-50) // Keep last 50 logs
    }));
  }
  
  handleProviderChange = (provider) => {
    this.setState({ activeProvider: provider });
    this.addLog(`Switched to ${provider.toUpperCase()} sandbox`);
  }
  
  handleInputChange = (field, value) => {
    this.setState(prevState => ({
      [field]: {
        ...prevState[field],
        [prevState.activeProvider]: value
      }
    }));
  }
  
  handleTransactionInputChange = (field, value) => {
    this.setState(prevState => ({
      testTransaction: {
        ...prevState.testTransaction,
        [field]: value
      }
    }));
  }
  
  testConnection = async () => {
    const { activeProvider, apiKey, apiSecret, sandboxUrl } = this.state;
    
    this.setState({ isLoading: true, testResults: null });
    this.addLog(`Testing connection to ${activeProvider.toUpperCase()} sandbox...`);
    
    try {
      // In a real implementation, we would make an actual API call
      // For simulation purposes, we'll just wait and return a success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const testResults = {
        success: true,
        timestamp: new Date().toISOString(),
        message: `Successfully connected to ${activeProvider.toUpperCase()} sandbox`,
        details: {
          url: sandboxUrl[activeProvider],
          apiKeyValid: true,
          apiSecretValid: true
        }
      };
      
      this.setState({ testResults });
      this.addLog(`Connection test successful: ${testResults.message}`);
    } catch (error) {
      const testResults = {
        success: false,
        timestamp: new Date().toISOString(),
        message: `Failed to connect to ${activeProvider.toUpperCase()} sandbox: ${error.message}`,
        details: {
          error: error.message
        }
      };
      
      this.setState({ testResults });
      this.addLog(`Connection test failed: ${error.message}`);
    } finally {
      this.setState({ isLoading: false });
    }
  }
  
  testPayment = async () => {
    const { activeProvider, apiKey, apiSecret, merchantId, terminalId, testTransaction } = this.state;
    
    this.setState({ isLoading: true, testResults: null });
    this.addLog(`Testing payment transaction on ${activeProvider.toUpperCase()} sandbox...`);
    
    try {
      // In a real implementation, we would make an actual API call
      // For simulation purposes, we'll just wait and return a success
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simulate a 90% success rate
      const success = Math.random() < 0.9;
      
      if (success) {
        const testResults = {
          success: true,
          timestamp: new Date().toISOString(),
          message: `Payment transaction successful on ${activeProvider.toUpperCase()} sandbox`,
          details: {
            transactionId: `${activeProvider.toUpperCase()}-${Date.now()}`,
            amount: testTransaction.amount,
            paymentMethod: testTransaction.paymentMethod,
            authorizationCode: Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
            cardBrand: 'Visa',
            cardLastDigits: testTransaction.cardNumber.slice(-4)
          }
        };
        
        this.setState({ testResults });
        this.addLog(`Payment test successful: ${testResults.details.transactionId}`);
      } else {
        const errorCodes = {
          cielo: ['05', '51', '57', '62'],
          rede: ['05', '51', '57', '62']
        };
        
        const errorCode = errorCodes[activeProvider][Math.floor(Math.random() * errorCodes[activeProvider].length)];
        const errorMessages = {
          '05': 'Transaction not authorized',
          '51': 'Insufficient funds',
          '57': 'Transaction not permitted for this card',
          '62': 'Invalid card'
        };
        
        const testResults = {
          success: false,
          timestamp: new Date().toISOString(),
          message: `Payment transaction failed on ${activeProvider.toUpperCase()} sandbox`,
          details: {
            errorCode,
            errorMessage: errorMessages[errorCode],
            amount: testTransaction.amount,
            paymentMethod: testTransaction.paymentMethod,
            cardLastDigits: testTransaction.cardNumber.slice(-4)
          }
        };
        
        this.setState({ testResults });
        this.addLog(`Payment test failed: ${testResults.details.errorCode} - ${testResults.details.errorMessage}`);
      }
    } catch (error) {
      const testResults = {
        success: false,
        timestamp: new Date().toISOString(),
        message: `Error during payment test on ${activeProvider.toUpperCase()} sandbox: ${error.message}`,
        details: {
          error: error.message
        }
      };
      
      this.setState({ testResults });
      this.addLog(`Payment test error: ${error.message}`);
    } finally {
      this.setState({ isLoading: false });
    }
  }
  
  render() {
    const { activeProvider, apiKey, apiSecret, merchantId, terminalId, testTransaction, testResults, isLoading, logs } = this.state;
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Payment Gateway Sandbox Integration</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>Sandbox Configuration</Text>
            
            <View style={styles.providerSelector}>
              <Text style={styles.label}>Provider:</Text>
              <Picker
                selectedValue={activeProvider}
                style={styles.picker}
                onValueChange={this.handleProviderChange}
              >
                <Picker.Item label="Cielo" value="cielo" />
                <Picker.Item label="Rede" value="rede" />
              </Picker>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>API Key:</Text>
              <TextInput
                style={styles.input}
                value={apiKey[activeProvider]}
                onChangeText={(value) => this.handleInputChange('apiKey', value)}
                placeholder="Enter API Key"
                secureTextEntry
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>API Secret:</Text>
              <TextInput
                style={styles.input}
                value={apiSecret[activeProvider]}
                onChangeText={(value) => this.handleInputChange('apiSecret', value)}
                placeholder="Enter API Secret"
                secureTextEntry
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Merchant ID:</Text>
              <TextInput
                style={styles.input}
                value={merchantId[activeProvider]}
                onChangeText={(value) => this.handleInputChange('merchantId', value)}
                placeholder="Enter Merchant ID"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Terminal ID:</Text>
              <TextInput
                style={styles.input}
                value={terminalId[activeProvider]}
                onChangeText={(value) => this.handleInputChange('terminalId', value)}
                placeholder="Enter Terminal ID"
              />
            </View>
            
            <Button
              title="Test Connection"
              onPress={this.testConnection}
              disabled={isLoading}
            />
          </View>
          
          <View style={styles.testSection}>
            <Text style={styles.sectionTitle}>Payment Test</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount:</Text>
              <TextInput
                style={styles.input}
                value={testTransaction.amount}
                onChangeText={(value) => this.handleTransactionInputChange('amount', value)}
                placeholder="Enter Amount"
                keyboardType="decimal-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Method:</Text>
              <Picker
                selectedValue={testTransaction.paymentMethod}
                style={styles.picker}
                onValueChange={(value) => this.handleTransactionInputChange('paymentMethod', value)}
              >
                <Picker.Item label="Credit Card" value="credit" />
                <Picker.Item label="Debit Card" value="debit" />
              </Picker>
            </View>
            
            {testTransaction.paymentMethod === 'credit' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Installments:</Text>
                <Picker
                  selectedValue={testTransaction.installments}
                  style={styles.picker}
                  onValueChange={(value) => this.handleTransactionInputChange('installments', value)}
                >
                  <Picker.Item label="1x" value="1" />
                  <Picker.Item label="2x" value="2" />
                  <Picker.Item label="3x" value="3" />
                  <Picker.Item label="4x" value="4" />
                  <Picker.Item label="5x" value="5" />
                  <Picker.Item label="6x" value="6" />
                </Picker>
              </View>
            )}
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Card Number:</Text>
              <TextInput
                style={styles.input}
                value={testTransaction.cardNumber}
                onChangeText={(value) => this.handleTransactionInputChange('cardNumber', value)}
                placeholder="Enter Card Number"
                keyboardType="number-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Card Holder:</Text>
              <TextInput
                style={styles.input}
                value={testTransaction.cardHolder}
                onChangeText={(value) => this.handleTransactionInputChange('cardHolder', value)}
                placeholder="Enter Card Holder Name"
              />
            </View>
            
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Expiration Date:</Text>
                <TextInput
                  style={styles.input}
                  value={testTransaction.expirationDate}
                  onChangeText={(value) => this.handleTransactionInputChange('expirationDate', value)}
                  placeholder="MM/YYYY"
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>CVV:</Text>
                <TextInput
                  style={styles.input}
                  value={testTransaction.cvv}
                  onChangeText={(value) => this.handleTransactionInputChange('cvv', value)}
                  placeholder="CVV"
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>
            </View>
            
            <Button
              title="Test Payment"
              onPress={this.testPayment}
              disabled={isLoading}
            />
          </View>
          
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            
            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
            
            {!isLoading && testResults && (
              <View style={[
                styles.resultsContainer,
                { backgroundColor: testResults.success ? '#e6ffe6' : '#ffe6e6' }
              ]}>
                <Text style={[
                  styles.resultsStatus,
                  { color: testResults.success ? 'green' : 'red' }
                ]}>
                  {testResults.success ? 'SUCCESS' : 'FAILED'}
                </Text>
                
                <Text style={styles.resultsMessage}>{testResults.message}</Text>
                
                <View style={styles.resultsDetails}>
                  {Object.entries(testResults.details).map(([key, value]) => (
                    <Text key={key} style={styles.resultsDetailItem}>
                      <Text style={styles.resultsDetailKey}>{key}: </Text>
                      <Text style={styles.resultsDetailValue}>{value.toString()}</Text>
                    </Text>
                  ))}
                </View>
                
                <Text style={styles.resultsTimestamp}>
                  Timestamp: {new Date(testResults.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
            
            <View style={styles.logsContainer}>
              <Text style={styles.logsTitle}>Logs</Text>
              <ScrollView style={styles.logs}>
                {logs.map((log, index) => (
                  <Text key={index} style={styles.logEntry}>{log}</Text>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  configSection: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  testSection: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  resultsSection: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  providerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    height: 40,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultsStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultsMessage: {
    fontSize: 14,
    marginBottom: 16,
  },
  resultsDetails: {
    marginBottom: 16,
  },
  resultsDetailItem: {
    marginBottom: 4,
  },
  resultsDetailKey: {
    fontWeight: '500',
  },
  resultsDetailValue: {
    fontWeight: 'normal',
  },
  resultsTimestamp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  logsContainer: {
    flex: 1,
  },
  logsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logs: {
    backgroundColor: '#222',
    padding: 8,
    borderRadius: 4,
    flex: 1,
  },
  logEntry: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default SandboxIntegration;
