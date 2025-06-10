import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para gerenciar conexões WebSocket com suporte a múltiplos canais
 * @param url URL do WebSocket
 * @returns Objeto com estado e métodos para interagir com o WebSocket
 */
export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  // Mapa de listeners por canal
  const channelListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  useEffect(() => {
    try {
      const ws = new WebSocket(`ws://${window.location.host}${url}`);

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setSocket(ws);
      };

      ws.onmessage = (event) => {
        const parsed = parseJsonSafely(event.data);
        setLastMessage(parsed);

        // Identificar canal e notificar listeners
        const { channel, data } = parsed;
        if (channel && channelListeners.current.has(channel)) {
          const listeners = channelListeners.current.get(channel);
          listeners?.forEach((cb) => cb(data));
        }
      };

      ws.onerror = (event) => {
        console.error('Erro WebSocket', event);
        setError(new Error('Erro na conexão WebSocket'));
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      setError(err as Error);
    }
  }, [url]);

  const sendMessage = useCallback(
    (data: any): boolean => {
      if (socket && isConnected) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        socket.send(message);
        return true;
      }
      return false;
    },
    [socket, isConnected]
  );

  const disconnect = useCallback(() => {
    socket?.close();
  }, [socket]);

  /**
   * Inscreve um callback para um canal específico
   * @param channel Nome do canal
   * @param callback Função para tratar mensagens
   * @returns Função para cancelar a inscrição
   */
  const subscribe = useCallback(
    (channel: string, callback: (data: any) => void): () => void => {
      if (!channelListeners.current.has(channel)) {
        channelListeners.current.set(channel, new Set());
      }

      const listeners = channelListeners.current.get(channel)!;
      listeners.add(callback);

      return () => {
        listeners.delete(callback);
        if (listeners.size === 0) {
          channelListeners.current.delete(channel);
        }
      };
    },
    []
  );

  return {
    socket,
    isConnected,
    lastMessage,
    error,
    sendMessage,
    disconnect,
    subscribe,
  };
};

const parseJsonSafely = (input: string): any => {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
};
