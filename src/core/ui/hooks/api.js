import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useApi } from './hooks/useApi';

/**
 * Hook personalizado para gerenciar WebSockets
 * @param {string} url - URL do endpoint WebSocket
 * @returns {Object} - Estado e funções do WebSocket
 */
export const useWebSocket = (url) => {
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState(WebSocket.CONNECTING);
  
  useEffect(() => {
    // Criar conexão WebSocket
    const ws = new WebSocket(`ws://${window.location.host}${url}`);
    
    // Configurar handlers
    ws.onopen = () => {
      console.log('WebSocket conectado');
      setReadyState(WebSocket.OPEN);
    };
    
    ws.onmessage = (event) => {
      setLastMessage(event);
    };
    
    ws.onclose = () => {
      console.log('WebSocket desconectado');
      setReadyState(WebSocket.CLOSED);
    };
    
    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
      setReadyState(WebSocket.CLOSED);
    };
    
    setSocket(ws);
    
    // Limpar ao desmontar
    return () => {
      ws.close();
    };
  }, [url]);
  
  // Função para enviar mensagens
  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
      return true;
    }
    return false;
  };
  
  return { lastMessage, sendMessage, readyState };
};

/**
 * Hook personalizado para chamadas de API
 * @returns {Object} - Funções para chamadas de API
 */
export const useApi = () => {
  const baseUrl = '';  // URL base vazia para usar caminhos relativos
  
  // Função para configurar headers padrão
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };
  
  // Função para fazer requisições GET
  const get = async (url, params = {}) => {
    try {
      // Construir query string
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const fullUrl = `${baseUrl}${url}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error(`Erro na requisição GET para ${url}:`, error);
      throw error;
    }
  };
  
  // Função para fazer requisições POST
  const post = async (url, body = {}) => {
    try {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error(`Erro na requisição POST para ${url}:`, error);
      throw error;
    }
  };
  
  // Função para fazer requisições PUT
  const put = async (url, body = {}) => {
    try {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error(`Erro na requisição PUT para ${url}:`, error);
      throw error;
    }
  };
  
  // Função para fazer requisições DELETE
  const del = async (url) => {
    try {
      const response = await fetch(`${baseUrl}${url}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error(`Erro na requisição DELETE para ${url}:`, error);
      throw error;
    }
  };
  
  return { get, post, put, delete: del };
};
