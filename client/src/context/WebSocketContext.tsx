import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebsocket';
import type { WSMessage } from '../types';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  sendMessage: (message: WSMessage) => void;
  registerHandler: (id: string, handler: (message: WSMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocket = useWebSocket();

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
