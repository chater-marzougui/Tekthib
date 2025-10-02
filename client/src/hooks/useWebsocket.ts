import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const messageHandlersRef = useRef<Map<string, (message: WSMessage) => void>>(
    new Map()
  );
  // Use ref to avoid stale closure issues
  const storedIdRef = useRef<string | null>(localStorage.getItem("clientId") || null);
  const isConnectedRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      const currentStoredId = storedIdRef.current;
      console.log("Stored ID:", currentStoredId);
      if (currentStoredId) {
        // Tell server "hey, it's me again"
        ws.send(
          JSON.stringify({
            type: "CONNECT",
            payload: { clientId: currentStoredId },
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        setLastMessage(message);

        if ((message.type === "ROOM_JOINED" || message.type === "CONNECTED") && message.payload?.clientId && !storedIdRef.current) {
          localStorage.setItem("clientId", message.payload.clientId);
          storedIdRef.current = message.payload.clientId;
        }
        isConnectedRef.current = true;
        console.log("Connected");

        // Call registered handlers
        messageHandlersRef.current.forEach((handler) => {
          handler(message);
        });
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      isConnectedRef.current = false;
      if (reconnectTimeoutRef.current) return;

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log("Attempting to reconnect...");
        if (isConnectedRef.current) {
          console.log("Already reconnected, aborting reconnect attempt");
          return;
        }
        reconnectTimeoutRef.current = undefined;
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectedRef.current = false;
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }, []);

  const registerHandler = useCallback(
    (id: string, handler: (message: WSMessage) => void) => {
      messageHandlersRef.current.set(id, handler);

      return () => {
        messageHandlersRef.current.delete(id);
      };
    },
    []
  );

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    lastMessage,
    sendMessage,
    registerHandler,
    connect,
    disconnect,
  };
}
