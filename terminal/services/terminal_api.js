import axios from 'axios';

// API base URL
const API_BASE_URL = '/api/waiter/terminal';

// Configuração do terminal
export const getTerminalConfig = async (terminalId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/configs/${terminalId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter configuração do terminal:', error);
    throw error;
  }
};

export const createTerminalConfig = async (config) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/configs`, config);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar configuração do terminal:', error);
    throw error;
  }
};

export const updateTerminalConfig = async (config) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/configs/${config.id}`, config);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar configuração do terminal:', error);
    throw error;
  }
};

// Sessões do terminal
export const createTerminalSession = async (terminalId, waiterId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sessions`, null, {
      params: { terminal_id: terminalId, waiter_id: waiterId }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar sessão do terminal:', error);
    throw error;
  }
};

export const getTerminalSession = async (sessionId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter sessão do terminal:', error);
    throw error;
  }
};

export const updateTerminalStatus = async (sessionId, status, batteryLevel, signalStrength) => {
  try {
    const params = { status };
    if (batteryLevel !== null && batteryLevel !== undefined) {
      params.battery_level = batteryLevel;
    }
    if (signalStrength !== null && signalStrength !== undefined) {
      params.signal_strength = signalStrength;
    }
    
    const response = await axios.put(`${API_BASE_URL}/sessions/${sessionId}/status`, null, { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar status do terminal:', error);
    throw error;
  }
};

// Pedidos offline
export const createOfflineOrder = async (order) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/offline/orders`, order);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar pedido offline:', error);
    throw error;
  }
};

export const getOfflineOrders = async (terminalId, synced) => {
  try {
    const params = { terminal_id: terminalId };
    if (synced !== null && synced !== undefined) {
      params.synced = synced;
    }
    
    const response = await axios.get(`${API_BASE_URL}/offline/orders`, { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao obter pedidos offline:', error);
    throw error;
  }
};

// Sincronização
export const syncTerminalData = async (terminalId, sessionId) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/sync`, null, {
      params: { terminal_id: terminalId, session_id: sessionId }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao sincronizar dados do terminal:', error);
    throw error;
  }
};

// Funções para operação offline
export const storeOfflineData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Erro ao armazenar dados offline:', error);
    return false;
  }
};

export const getOfflineData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Erro ao obter dados offline:', error);
    return null;
  }
};

export const removeOfflineData = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Erro ao remover dados offline:', error);
    return false;
  }
};

// Função para verificar conectividade
export const checkConnectivity = async () => {
  try {
    // Tenta fazer uma requisição simples para verificar conectividade
    await axios.get(`${API_BASE_URL}/ping`);
    return true;
  } catch (error) {
    return false;
  }
};

// Função para sincronizar dados pendentes quando a conexão for restaurada
export const syncPendingData = async (terminalId, sessionId) => {
  try {
    // Obter pedidos pendentes do armazenamento local
    const pendingOrders = getOfflineData(`pending_orders_${terminalId}`) || [];
    
    if (pendingOrders.length === 0) {
      return { success: true, synced: 0 };
    }
    
    // Enviar cada pedido pendente para o servidor
    let syncedCount = 0;
    for (const order of pendingOrders) {
      try {
        await createOfflineOrder(order);
        syncedCount++;
      } catch (error) {
        console.error('Erro ao sincronizar pedido pendente:', error);
      }
    }
    
    // Limpar pedidos sincronizados
    if (syncedCount > 0) {
      removeOfflineData(`pending_orders_${terminalId}`);
    }
    
    // Sincronizar dados do terminal
    await syncTerminalData(terminalId, sessionId);
    
    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error('Erro ao sincronizar dados pendentes:', error);
    return { success: false, error: error.message };
  }
};
