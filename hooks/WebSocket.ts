import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';


export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  const connect = useCallback(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const wsUrl = `ws://localhost:3000?token=${token}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [user]);

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return ws.current;
}