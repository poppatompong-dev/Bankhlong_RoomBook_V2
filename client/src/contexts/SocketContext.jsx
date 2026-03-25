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
    if (!SOCKET_ENABLED) return; // Sheets backend — skip WebSocket

    // Dynamically import socket.io-client only when needed
    import('socket.io-client').then(({ io }) => {
      const token = localStorage.getItem('token');
      const newSocket = io(window.location.origin, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 5000
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('🔌 Socket connected');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        // Silently ignore — Sheets backend doesn't support Socket.io
        console.info('ℹ️ Socket.io not available (Sheets backend mode)');
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
