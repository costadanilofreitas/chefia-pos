import React from 'react';
import { StyleSheet, View, Text, Button, ScrollView } from 'react-native';
import TerminalSimulator from './TerminalSimulator';

class SimulatorApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeSimulator: 'cielo_lio_v3',
      simulators: {
        cielo_lio_v3: {
          name: 'Cielo LIO V3',
          terminalId: 'SIM-CIELO-001',
          merchantId: 'MERCH-001',
          webViewUrl: 'http://localhost:3000/terminal'
        },
        rede_smart_1: {
          name: 'Rede Smart 1',
          terminalId: 'SIM-REDE-001',
          merchantId: 'MERCH-001',
          webViewUrl: 'http://localhost:3000/terminal'
        }
      },
      testScenarios: [
        {
          id: 'login_flow',
          name: 'Login Flow',
          description: 'Test garçom login process',
          steps: [
            'Enter valid credentials',
            'Verify successful login',
            'Verify table layout is displayed'
          ]
        },
        {
          id: 'order_creation',
          name: 'Order Creation',
          description: 'Create a new order for a table',
          steps: [
            'Select an available table',
            'Add items to the order',
            'Submit the order',
            'Verify order appears in kitchen'
          ]
        },
        {
          id: 'payment_processing',
          name: 'Payment Processing',
          description: 'Process payment for an order',
          steps: [
            'Select an occupied table',
            'Request payment',
            'Select payment method',
            'Process payment',
            'Verify receipt is printed'
          ]
        },
        {
          id: 'offline_operation',
          name: 'Offline Operation',
          description: 'Test functionality when device is offline',
          steps: [
            'Disconnect from network',
            'Create a new order',
            'Verify order is stored locally',
            'Reconnect to network',
            'Verify order is synchronized'
          ]
        }
      ],
      activeScenario: null,
      testResults: {},
      logs: []
    };
  }
  
  addLog(message) {
    const timestamp = new Date().toISOString();
    this.setState(prevState => ({
      logs: [...prevState.logs, `${timestamp}: ${message}`].slice(-100) // Keep last 100 logs
    }));
  }
  
  selectSimulator = (simulatorId) => {
    this.setState({ activeSimulator: simulatorId });
    this.addLog(`Switched to ${this.state.simulators[simulatorId].name} simulator`);
  }
  
  selectScenario = (scenarioId) => {
    const scenario = this.state.testScenarios.find(s => s.id === scenarioId);
    this.setState({ activeScenario: scenario });
    this.addLog(`Selected test scenario: ${scenario.name}`);
  }
  
  startTest = () => {
    const { activeScenario } = this.state;
    if (!activeScenario) return;
    
    this.addLog(`Starting test: ${activeScenario.name}`);
    
    // In a real implementation, we would automate the test steps
    // For now, we'll just mark it as started for manual testing
    this.setState(prevState => ({
      testResults: {
        ...prevState.testResults,
        [activeScenario.id]: {
          status: 'in_progress',
          startTime: new Date().toISOString(),
          endTime: null,
          passed: null,
          notes: ''
        }
      }
    }));
  }
  
  completeTest = (passed, notes = '') => {
    const { activeScenario } = this.state;
    if (!activeScenario) return;
    
    this.addLog(`Completed test: ${activeScenario.name} - ${passed ? 'PASSED' : 'FAILED'}`);
    
    this.setState(prevState => ({
      testResults: {
        ...prevState.testResults,
        [activeScenario.id]: {
          ...prevState.testResults[activeScenario.id],
          status: 'completed',
          endTime: new Date().toISOString(),
          passed,
          notes
        }
      }
    }));
  }
  
  render() {
    const { activeSimulator, simulators, testScenarios, activeScenario, testResults, logs } = this.state;
    const simulator = simulators[activeSimulator];
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>POS Modern - Terminal Simulator</Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.sidebar}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Simulators</Text>
              {Object.entries(simulators).map(([id, sim]) => (
                <Button
                  key={id}
                  title={sim.name}
                  onPress={() => this.selectSimulator(id)}
                  color={activeSimulator === id ? '#2196F3' : '#888'}
                />
              ))}
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Scenarios</Text>
              <ScrollView style={styles.scenarioList}>
                {testScenarios.map(scenario => {
                  const result = testResults[scenario.id];
                  let statusIndicator = '⚪'; // Not started
                  
                  if (result) {
                    if (result.status === 'in_progress') {
                      statusIndicator = '🔵'; // In progress
                    } else if (result.passed) {
                      statusIndicator = '🟢'; // Passed
                    } else {
                      statusIndicator = '🔴'; // Failed
                    }
                  }
                  
                  return (
                    <View key={scenario.id} style={styles.scenarioItem}>
                      <Text style={styles.statusIndicator}>{statusIndicator}</Text>
                      <Button
                        title={scenario.name}
                        onPress={() => this.selectScenario(scenario.id)}
                        color={activeScenario?.id === scenario.id ? '#2196F3' : '#888'}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
            
            {activeScenario && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Test Controls</Text>
                <Text style={styles.scenarioDescription}>{activeScenario.description}</Text>
                
                <View style={styles.steps}>
                  <Text style={styles.stepsTitle}>Steps:</Text>
                  {activeScenario.steps.map((step, index) => (
                    <Text key={index} style={styles.step}>
                      {index + 1}. {step}
                    </Text>
                  ))}
                </View>
                
                <View style={styles.testControls}>
                  <Button
                    title="Start Test"
                    onPress={this.startTest}
                    disabled={testResults[activeScenario.id]?.status === 'in_progress'}
                  />
                  <View style={styles.resultButtons}>
                    <Button
                      title="Pass"
                      onPress={() => this.completeTest(true)}
                      color="green"
                      disabled={!testResults[activeScenario.id] || testResults[activeScenario.id]?.status !== 'in_progress'}
                    />
                    <Button
                      title="Fail"
                      onPress={() => this.completeTest(false)}
                      color="red"
                      disabled={!testResults[activeScenario.id] || testResults[activeScenario.id]?.status !== 'in_progress'}
                    />
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Logs</Text>
              <ScrollView style={styles.logs}>
                {logs.map((log, index) => (
                  <Text key={index} style={styles.logEntry}>{log}</Text>
                ))}
              </ScrollView>
            </View>
          </View>
          
          <View style={styles.simulatorContainer}>
            <TerminalSimulator
              model={simulator.name}
              terminalId={simulator.terminalId}
              merchantId={simulator.merchantId}
              webViewUrl={simulator.webViewUrl}
            />
          </View>
        </View>
      </View>
    );
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 300,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scenarioList: {
    maxHeight: 200,
  },
  scenarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    marginRight: 8,
    fontSize: 16,
  },
  scenarioDescription: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  steps: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  stepsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  step: {
    marginBottom: 4,
  },
  testControls: {
    marginBottom: 8,
  },
  resultButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  logs: {
    backgroundColor: '#222',
    padding: 8,
    borderRadius: 4,
    height: 150,
  },
  logEntry: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  simulatorContainer: {
    flex: 1,
  },
});

export default SimulatorApp;
