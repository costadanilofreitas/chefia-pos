import React from 'react';
import { render } from 'react-native';
import { StyleSheet, View, Text, TouchScreen, Button } from 'react-native';
import WebView from 'react-native-webview';

class TerminalSimulator extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      model: 'Cielo LIO V3', // Default model
      batteryLevel: 85,
      isOnline: true,
      isCharging: false,
      signalStrength: 4, // 0-4
      orientation: 'portrait',
      terminalId: 'SIM-TERM-001',
      merchantId: 'SIM-MERCH-001',
      webViewUrl: 'http://localhost:3000/terminal',
      logs: [],
      showDevTools: false,
    };
    
    this.webViewRef = React.createRef();
  }
  
  componentDidMount() {
    // Simulate battery drain
    this.batteryInterval = setInterval(() => {
      if (!this.state.isCharging) {
        this.setState(prevState => ({
          batteryLevel: Math.max(0, prevState.batteryLevel - 1)
        }));
      } else {
        this.setState(prevState => ({
          batteryLevel: Math.min(100, prevState.batteryLevel + 2)
        }));
      }
    }, 60000); // Every minute
    
    // Simulate network fluctuations
    this.networkInterval = setInterval(() => {
      // 10% chance of network change
      if (Math.random() < 0.1) {
        const newSignalStrength = Math.floor(Math.random() * 5);
        const isOnline = newSignalStrength > 0;
        
        this.setState({
          signalStrength: newSignalStrength,
          isOnline
        });
        
        // Notify webview of network change
        if (this.webViewRef.current) {
          this.webViewRef.current.injectJavaScript(`
            window.dispatchEvent(new Event('${isOnline ? 'online' : 'offline'}'));
            true;
          `);
        }
        
        this.addLog(`Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
      }
    }, 30000); // Every 30 seconds
  }
  
  componentWillUnmount() {
    clearInterval(this.batteryInterval);
    clearInterval(this.networkInterval);
  }
  
  addLog(message) {
    const timestamp = new Date().toISOString();
    this.setState(prevState => ({
      logs: [...prevState.logs, `${timestamp}: ${message}`].slice(-100) // Keep last 100 logs
    }));
  }
  
  handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'log':
          this.addLog(`App: ${data.message}`);
          break;
          
        case 'payment_request':
          this.simulatePayment(data.amount, data.method);
          break;
          
        case 'print_request':
          this.simulatePrinting(data.content);
          break;
          
        default:
          this.addLog(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      this.addLog(`Error handling message: ${error.message}`);
    }
  }
  
  simulatePayment(amount, method) {
    this.addLog(`Payment requested: ${amount} via ${method}`);
    
    // Simulate payment processing
    setTimeout(() => {
      const success = Math.random() < 0.9; // 90% success rate
      
      if (success) {
        this.addLog('Payment approved');
        this.webViewRef.current.injectJavaScript(`
          window.postMessage(
            JSON.stringify({
              type: 'payment_response',
              success: true,
              transactionId: 'SIM-TX-${Date.now()}',
              message: 'Payment approved'
            }),
            '*'
          );
          true;
        `);
      } else {
        this.addLog('Payment declined');
        this.webViewRef.current.injectJavaScript(`
          window.postMessage(
            JSON.stringify({
              type: 'payment_response',
              success: false,
              message: 'Card declined'
            }),
            '*'
          );
          true;
        `);
      }
    }, 2000); // 2 second delay
  }
  
  simulatePrinting(content) {
    this.addLog('Print requested');
    this.addLog(`Content: ${content.substring(0, 50)}...`);
    
    // Simulate printing process
    setTimeout(() => {
      this.addLog('Printing completed');
      this.webViewRef.current.injectJavaScript(`
        window.postMessage(
          JSON.stringify({
            type: 'print_response',
            success: true
          }),
          '*'
        );
        true;
      `);
    }, 1500);
  }
  
  toggleOrientation = () => {
    this.setState(prevState => ({
      orientation: prevState.orientation === 'portrait' ? 'landscape' : 'portrait'
    }));
  }
  
  toggleCharging = () => {
    this.setState(prevState => ({
      isCharging: !prevState.isCharging
    }));
  }
  
  toggleNetwork = () => {
    this.setState(prevState => ({
      isOnline: !prevState.isOnline,
      signalStrength: prevState.isOnline ? 0 : 4
    }), () => {
      // Notify webview of network change
      if (this.webViewRef.current) {
        this.webViewRef.current.injectJavaScript(`
          window.dispatchEvent(new Event('${this.state.isOnline ? 'online' : 'offline'}'));
          true;
        `);
      }
    });
  }
  
  toggleDevTools = () => {
    this.setState(prevState => ({
      showDevTools: !prevState.showDevTools
    }));
  }
  
  changeModel = (model) => {
    this.setState({ model });
  }
  
  render() {
    const { model, batteryLevel, isOnline, isCharging, signalStrength, orientation, showDevTools } = this.state;
    
    // Determine dimensions based on model and orientation
    let width, height;
    
    switch (model) {
      case 'Rede Pop':
        width = 320;
        height = 480;
        break;
      case 'Cielo Flash':
        width = 480;
        height = 800;
        break;
      case 'Rede Smart 1':
        width = 720;
        height = 1280;
        break;
      case 'Cielo LIO V3':
        width = 720;
        height = 1280;
        break;
      case 'Cielo LIO+':
      case 'Rede Smart 2':
        width = 1080;
        height = 1920;
        break;
      default:
        width = 720;
        height = 1280;
    }
    
    // Swap dimensions if in landscape
    if (orientation === 'landscape') {
      [width, height] = [height, width];
    }
    
    // Scale down for display
    const scale = 0.5;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Terminal Simulator - {model}</Text>
          <View style={styles.controls}>
            <Button title="Change Model" onPress={() => this.changeModel(this.getNextModel())} />
            <Button title={`Orientation: ${orientation}`} onPress={this.toggleOrientation} />
            <Button title={`Network: ${isOnline ? 'Online' : 'Offline'}`} onPress={this.toggleNetwork} />
            <Button title={`Battery: ${batteryLevel}% ${isCharging ? '(Charging)' : ''}`} onPress={this.toggleCharging} />
            <Button title={showDevTools ? 'Hide DevTools' : 'Show DevTools'} onPress={this.toggleDevTools} />
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={[
            styles.terminal,
            {
              width: scaledWidth,
              height: scaledHeight,
              borderRadius: model.includes('Rede') ? 8 : 16
            }
          ]}>
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>
                {isOnline ? `Signal: ${signalStrength}/4` : 'Offline'}
              </Text>
              <Text style={styles.statusText}>
                {batteryLevel}% {isCharging ? '⚡' : ''}
              </Text>
            </View>
            
            <WebView
              ref={this.webViewRef}
              source={{ uri: `${this.state.webViewUrl}?terminal_id=${this.state.terminalId}` }}
              style={styles.webView}
              onMessage={this.handleMessage}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              injectedJavaScript={`
                // Inject terminal info
                window.TERMINAL_INFO = {
                  model: '${model}',
                  terminalId: '${this.state.terminalId}',
                  merchantId: '${this.state.merchantId}',
                  isOnline: ${isOnline},
                  batteryLevel: ${batteryLevel},
                  width: ${width},
                  height: ${height}
                };
                
                // Override navigator.onLine
                Object.defineProperty(navigator, 'onLine', {
                  get: function() { return ${isOnline}; }
                });
                
                // Setup communication channel
                window.androidTerminal = {
                  requestPayment: function(amount, method) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'payment_request',
                      amount: amount,
                      method: method
                    }));
                  },
                  requestPrint: function(content) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'print_request',
                      content: content
                    }));
                  },
                  log: function(message) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'log',
                      message: message
                    }));
                  }
                };
                
                true;
              `}
            />
          </View>
          
          {showDevTools && (
            <View style={styles.devTools}>
              <Text style={styles.devToolsTitle}>Device Logs</Text>
              <View style={styles.logs}>
                {this.state.logs.map((log, index) => (
                  <Text key={index} style={styles.logEntry}>{log}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  getNextModel() {
    const models = [
      'Rede Pop',
      'Cielo Flash',
      'Rede Smart 1',
      'Cielo LIO V3',
      'Cielo LIO+',
      'Rede Smart 2'
    ];
    
    const currentIndex = models.indexOf(this.state.model);
    const nextIndex = (currentIndex + 1) % models.length;
    return models[nextIndex];
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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
  controls: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  terminal: {
    backgroundColor: 'black',
    overflow: 'hidden',
    margin: 20,
    borderWidth: 8,
    borderColor: '#333',
  },
  statusBar: {
    height: 20,
    backgroundColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
  },
  webView: {
    flex: 1,
    backgroundColor: 'white',
  },
  devTools: {
    flex: 1,
    backgroundColor: '#222',
    padding: 16,
    margin: 20,
    borderRadius: 8,
  },
  devToolsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logs: {
    flex: 1,
    backgroundColor: '#111',
    padding: 8,
    borderRadius: 4,
  },
  logEntry: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default TerminalSimulator;
