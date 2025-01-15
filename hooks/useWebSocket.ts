import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const sendMessage = (data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  useEffect(() => {
    if (!user) return;

    const connect = () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = new WebSocket(`ws://localhost:3001?token=${token}`);
        
        socket.onopen = () => {
          console.log('WebSocket connected');
          ws.current = socket;
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ONLINE_USERS') {
              setOnlineUsers(data.users);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        socket.onclose = () => {
          console.log('WebSocket disconnected');
          ws.current = null;
          setIsConnected(false);
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          socket.close();
        };
      } catch (error) {
        console.error('Error establishing connection:', error);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [user]);

  return { ws: ws.current, onlineUsers, isConnected, sendMessage };
}