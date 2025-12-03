import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectionService, ConnectionStatus } from '../services/connectionService';

interface ConnectionContextType {
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
  isOffline: boolean;
  testConnection: () => Promise<boolean>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
}

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get initial status
    const initialStatus = connectionService.getConnectionStatus();
    setConnectionStatus(initialStatus);
    setIsOnline(initialStatus === 'online');

    // Listen for connection changes
    const unsubscribe = connectionService.addListener((status) => {
      setConnectionStatus(status);
      setIsOnline(status === 'online');
    });

    return unsubscribe;
  }, []);

  const testConnection = async (): Promise<boolean> => {
    try {
      const isServerOnline = await connectionService.testServerConnection();
      const isTallyOnline = await connectionService.testTallyConnection();
      
      // Consider online if either server or Tally is reachable
      const isConnected = isServerOnline || isTallyOnline;
      
      if (isConnected !== isOnline) {
        setConnectionStatus(isConnected ? 'online' : 'offline');
        setIsOnline(isConnected);
      }
      
      return isConnected;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      setConnectionStatus('offline');
      setIsOnline(false);
      return false;
    }
  };

  const value: ConnectionContextType = {
    connectionStatus,
    isOnline,
    isOffline: !isOnline,
    testConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextType {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}


