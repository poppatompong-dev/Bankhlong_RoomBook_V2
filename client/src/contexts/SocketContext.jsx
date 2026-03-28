import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Detect if we're using the Sheets backend (no Socket.io support)
const SOCKET_ENABLED = import.meta.env.VITE_SOCKET_ENABLED !== 'false';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Dynamically import socket.io-client only when needed
    import('socket.io-client').then(({ io }) => {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const socketUrl = apiUrl.replace('/api', '');
      
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 5000
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('🔌 Socket connected via v2 backend');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket.io connection error:', err);
        newSocket.close();
      });

      setSocket(newSocket);
      return () => newSocket.close();
    });
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
