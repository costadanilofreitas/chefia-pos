import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TerminalApp from '../TerminalApp';
import * as terminalApi from '../services/terminal_api';

// Mock das APIs
jest.mock('../services/terminal_api', () => ({
  getTerminalConfig: jest.fn(),
  createTerminalSession: jest.fn(),
  updateTerminalStatus: jest.fn(),
  syncTerminalData: jest.fn(),
  createOfflineOrder: jest.fn(),
  getOfflineOrders: jest.fn(),
  checkConnectivity: jest.fn()
}));

describe('TerminalApp Component', () => {
  const mockTerminalConfig = {
    id: 'terminal-1',
    name: 'Terminal de Teste',
    type: 'cielo_lio_v3',
    capabilities: {
      screen_size: '5.0',
      resolution: '720x1280',
      touch_screen: true,
      printer: true,
      nfc: true
    }
  };

  const mockSession = {
    id: 'session-1',
    terminal_id: 'terminal-1',
    waiter_id: 'waiter-1',
    status: 'online',
    started_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    last_sync: new Date().toISOString(),
    pending_orders: []
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock das implementações
    terminalApi.getTerminalConfig.mockResolvedValue(mockTerminalConfig);
    terminalApi.createTerminalSession.mockResolvedValue(mockSession);
    terminalApi.updateTerminalStatus.mockResolvedValue({...mockSession, status: 'online'});
    terminalApi.syncTerminalData.mockResolvedValue({success: true, synced_at: new Date().toISOString()});
    terminalApi.checkConnectivity.mockResolvedValue(true);
    
    // Mock do navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Mock do getBattery
    if (!navigator.getBattery) {
      navigator.getBattery = jest.fn().mockResolvedValue({
        level: 0.75,
        addEventListener: jest.fn()
      });
    }
  });

  test('renderiza a tela de login inicialmente', async () => {
    render(
      <BrowserRouter>
        <TerminalApp terminalId="terminal-1" />
      </BrowserRouter>
    );
    
    // Verificar se está carregando inicialmente
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
    
    // Esperar o carregamento terminar
    await waitFor(() => {
      expect(terminalApi.getTerminalConfig).toHaveBeenCalledWith('terminal-1');
    });
    
    // Verificar se a tela de login é exibida
    await waitFor(() => {
      expect(screen.getByText(/Login do Terminal/i)).toBeInTheDocument();
    });
  });

  test('realiza login com sucesso', async () => {
    render(
      <BrowserRouter>
        <TerminalApp terminalId="terminal-1" />
      </BrowserRouter>
    );
    
    // Esperar o carregamento terminar
    await waitFor(() => {
      expect(screen.getByText(/Login do Terminal/i)).toBeInTheDocument();
    });
    
    // Preencher o formulário de login
    fireEvent.change(screen.getByPlaceholderText(/ID do Garçom/i), {
      target: { value: 'waiter-1' }
    });
    
    fireEvent.change(screen.getByPlaceholderText(/Senha/i), {
      target: { value: '123456' }
    });
    
    // Enviar o formulário
    fireEvent.click(screen.getByText(/Entrar/i));
    
    // Verificar se a API foi chamada
    await waitFor(() => {
      expect(terminalApi.createTerminalSession).toHaveBeenCalledWith('terminal-1', 'waiter-1');
    });
    
    // Verificar se a tela de mesas é exibida
    await waitFor(() => {
      expect(terminalApi.updateTerminalStatus).toHaveBeenCalled();
    });
  });

  test('exibe indicador offline quando sem conexão', async () => {
    // Simular dispositivo offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    render(
      <BrowserRouter>
        <TerminalApp terminalId="terminal-1" />
      </BrowserRouter>
    );
    
    // Esperar o carregamento terminar
    await waitFor(() => {
      expect(screen.getByText(/Login do Terminal/i)).toBeInTheDocument();
    });
    
    // Verificar se o indicador offline é exibido
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    
    // Simular retorno da conexão
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Disparar evento online
    window.dispatchEvent(new Event('online'));
    
    // Verificar se o indicador offline não é mais exibido
    await waitFor(() => {
      expect(screen.queryByText(/Offline/i)).not.toBeInTheDocument();
    });
  });

  // Mais testes seriam adicionados para cobrir outros cenários:
  // - Navegação entre telas
  // - Criação de pedidos
  // - Funcionamento offline
  // - Sincronização de dados
  // - Processamento de pagamentos
  // etc.
});
