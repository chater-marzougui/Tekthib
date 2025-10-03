import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
import { useWebSocket } from "../hooks/useWebsocket";
const WebSocketContext = createContext(undefined);
export function WebSocketProvider({ children, }) {
    const websocket = useWebSocket();
    return (_jsx(WebSocketContext.Provider, { value: websocket, children: children }));
}
export function useWebSocketContext() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocketContext must be used within a WebSocketProvider");
    }
    return context;
}
