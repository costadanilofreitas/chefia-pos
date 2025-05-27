import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar conexões WebSocket
 * @param url URL do WebSocket
 * @param options Opções adicionais
 * @returns Objeto com estado e métodos para interagir com o WebSocket
 */
export const useWebSocket = (url: string, options: any = {}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  // Inicializar conexão WebSocket
  useEffect(() => {
    // Implementação simulada - em produção, isso seria uma conexão WebSocket real
    console.log(`Simulando conexão WebSocket para: ${url}`);
    
    const ws = {
      send: (data: string) => {
        console.log(`Simulando envio de dados: ${data}`);
      },
      close: () => {
        console.log('Simulando fechamento de conexão WebSocket');
        setIsConnected(false);
      }
    } as unknown as WebSocket;
    
    setSocket(ws as WebSocket);
    setIsConnected(true);
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [url]);

  // Método para enviar mensagens
  const sendMessage = useCallback((data: any) => {
    if (socket && isConnected) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socket.send(message);
      return true;
    }
    return false;
  }, [socket, isConnected]);

  // Método para fechar conexão
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    lastMessage,
    error,
    sendMessage,
    disconnect
  };
};
