import { createContext, useContext, useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useWebSocket } from "../hooks/useWebsocket";
import type { WSMessage } from "shared";

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  autoPlayTimeout: number | null;
  sendMessage: (message: WSMessage) => void;
  registerHandler: (
    id: string,
    handler: (message: WSMessage) => void,
  ) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export function WebSocketProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const websocket = useWebSocket();
  const [autoPlayTimeout, setAutoPlayTimeout] = useState<number | null>(null);

  // Extract autoPlayTimeout from incoming messages
  useEffect(() => {
    if (websocket.lastMessage?.autoPlayTimeout !== undefined) {
      setAutoPlayTimeout(websocket.lastMessage.autoPlayTimeout);
    }
  }, [websocket.lastMessage]);

  const contextValue = useMemo(
    () => ({ ...websocket, autoPlayTimeout }),
    [websocket, autoPlayTimeout],
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
}
