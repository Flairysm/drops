import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: 'feed_update' | 'user_update' | 'pack_opened' | 'card_refunded';
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get WebSocket URL
    const getWebSocketUrl = () => {
      if (import.meta.env.PROD) {
        return 'wss://drops-backend-production-b145.up.railway.app/ws';
      }
      return 'ws://localhost:3000/ws';
    };

    const connect = () => {
      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionError(null);
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('WebSocket message received:', message);

            // Handle different message types
            switch (message.type) {
              case 'feed_update':
                // Invalidate and refetch global feed
                queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
                break;
              
              case 'user_update':
                // Invalidate user data
                queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                break;
              
              case 'pack_opened':
                // Invalidate packs and vault
                queryClient.invalidateQueries({ queryKey: ['/api/packs'] });
                queryClient.invalidateQueries({ queryKey: ['/api/vault'] });
                queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
                break;
              
              case 'card_refunded':
                // Invalidate vault and user data
                queryClient.invalidateQueries({ queryKey: ['/api/vault'] });
                queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                break;
              
              default:
                console.log('Unknown WebSocket message type:', message.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              console.log('Attempting to reconnect WebSocket...');
              connect();
            }
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection error');
          setIsConnected(false);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionError('Failed to connect');
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient]);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  };

  return {
    isConnected,
    connectionError,
    sendMessage,
  };
}

