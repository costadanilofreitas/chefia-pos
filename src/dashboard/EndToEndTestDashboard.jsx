import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EndToEndTestDashboard.css';

const EndToEndTestDashboard = () => {
  const [testResults, setTestResults] = useState({
    running: false,
    completed: false,
    startTime: null,
    endTime: null,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0
    }
  });

  const [selectedTest, setSelectedTest] = useState(null);

  const runTests = async () => {
    setTestResults({
      ...testResults,
      running: true,
      completed: false,
      startTime: new Date().toISOString(),
      tests: []
    });

    try {
      // Simular execução de testes (em um ambiente real, isso chamaria a API)
      await simulateTestExecution();
    } catch (error) {
      console.error('Erro ao executar testes:', error);
      setTestResults({
        ...testResults,
        running: false,
        completed: true,
        endTime: new Date().toISOString(),
        summary: {
          ...testResults.summary,
          errors: testResults.summary.errors + 1
        }
      });
    }
  };

  const simulateTestExecution = async () => {
    // Simular testes end-to-end
    const testCases = [
      {
        id: 'test_complete_order_flow',
        name: 'Fluxo Completo de Pedido',
        description: 'Testa o fluxo completo de um pedido, do início ao fim',
        steps: [
          'Criar um pedido',
          'Processar o pedido no KDS',
          'Atualizar status dos itens',
          'Finalizar o pedido',
          'Processar pagamento',
          'Verificar status final do pedido'
        ],
        duration: 2.3,
        status: 'passed',
        logs: []
      },
      {
        id: 'test_remote_order_integration',
        name: 'Integração com Pedidos Remotos',
        description: 'Testa a integração com pedidos remotos (iFood, Rappi)',
        steps: [
          'Simular recebimento de pedido do iFood',
          'Processar pedido',
          'Atualizar status do pedido',
          'Simular recebimento de pedido do Rappi',
          'Verificar conversão correta'
        ],
        duration: 1.8,
        status: 'passed',
        logs: []
      },
      {
        id: 'test_waiter_table_layout',
        name: 'Layout de Mesas do Garçom',
        description: 'Testa o fluxo de trabalho do módulo de garçom com layout de mesas',
        steps: [
          'Criar um layout de mesas',
          'Atualizar uma mesa',
          'Criar um pedido para uma mesa',
          'Verificar associação do pedido à mesa',
          'Transferir pedido para outra mesa'
        ],
        duration: 1.5,
        status: 'passed',
        logs: []
      },
      {
        id: 'test_split_payment',
        name: 'Pagamento com Split',
        description: 'Testa o fluxo de pagamento com split (rateio)',
        steps: [
          'Configurar split payment',
          'Processar pagamento com split',
          'Verificar detalhes do split'
        ],
        duration: 1.9,
        status: 'passed',
        logs: []
      }
    ];

    // Simular execução de cada teste com atraso
    const updatedTests = [];
    for (const test of testCases) {
      await new Promise(resolve => setTimeout(resolve, test.duration * 1000));
      updatedTests.push(test);
      setTestResults(prev => ({
        ...prev,
        tests: [...updatedTests]
      }));
    }

    // Atualizar resultados finais
    setTestResults(prev => ({
      ...prev,
      running: false,
      completed: true,
      endTime: new Date().toISOString(),
      summary: {
        total: testCases.length,
        passed: testCases.filter(t => t.status === 'passed').length,
        failed: testCases.filter(t => t.status === 'failed').length,
        errors: testCases.filter(t => t.status === 'error').length
      }
    }));
  };

  const handleTestClick = (test) => {
    setSelectedTest(test);
  };

  return (
    <div className="test-dashboard">
      <header className="dashboard-header">
        <h1>POS Modern - Dashboard de Testes End-to-End</h1>
        <div className="actions">
          <button 
            className="run-button" 
            onClick={runTests} 
            disabled={testResults.running}
          >
            {testResults.running ? 'Executando...' : 'Executar Testes'}
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="test-list-container">
          <h2>Testes End-to-End</h2>
          {testResults.running && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Executando testes...</p>
            </div>
          )}
          <ul className="test-list">
            {testResults.tests.map(test => (
              <li 
                key={test.id} 
                className={`test-item ${test.status} ${selectedTest?.id === test.id ? 'selected' : ''}`}
                onClick={() => handleTestClick(test)}
              >
                <div className="test-status-indicator"></div>
                <div className="test-info">
                  <h3>{test.name}</h3>
                  <p>{test.description}</p>
                  <div className="test-meta">
                    <span className="duration">{test.duration.toFixed(1)}s</span>
                    <span className={`status ${test.status}`}>
                      {test.status === 'passed' ? 'Passou' : 
                       test.status === 'failed' ? 'Falhou' : 'Erro'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="test-details-container">
          {selectedTest ? (
            <>
              <h2>{selectedTest.name}</h2>
              <p className="test-description">{selectedTest.description}</p>
              
              <div className="test-steps">
                <h3>Passos do Teste</h3>
                <ol>
                  {selectedTest.steps.map((step, index) => (
                    <li key={index} className="step-item">
                      <div className="step-indicator">✓</div>
                      <div className="step-content">{step}</div>
                    </li>
                  ))}
                </ol>
              </div>
              
              <div className="test-logs">
                <h3>Logs</h3>
                <pre className="logs-content">
                  {selectedTest.logs.length > 0 
                    ? selectedTest.logs.join('\n') 
                    : 'Nenhum log disponível para este teste.'}
                </pre>
              </div>
            </>
          ) : (
            <div className="no-test-selected">
              <p>Selecione um teste para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {testResults.completed && (
        <div className="test-summary">
          <h2>Resumo dos Testes</h2>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{testResults.summary.total}</span>
            </div>
            <div className="stat-item passed">
              <span className="stat-label">Passou</span>
              <span className="stat-value">{testResults.summary.passed}</span>
            </div>
            <div className="stat-item failed">
              <span className="stat-label">Falhou</span>
              <span className="stat-value">{testResults.summary.failed}</span>
            </div>
            <div className="stat-item error">
              <span className="stat-label">Erros</span>
              <span className="stat-value">{testResults.summary.errors}</span>
            </div>
          </div>
          <div className="test-timing">
            <p>Início: {new Date(testResults.startTime).toLocaleString()}</p>
            <p>Fim: {new Date(testResults.endTime).toLocaleString()}</p>
            <p>Duração: {((new Date(testResults.endTime) - new Date(testResults.startTime)) / 1000).toFixed(1)}s</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndToEndTestDashboard;
