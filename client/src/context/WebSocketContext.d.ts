import type { ReactNode } from "react";
import type { WSMessage } from "shared";
interface WebSocketContextType {
    isConnected: boolean;
    lastMessage: WSMessage | null;
    sendMessage: (message: WSMessage) => void;
    registerHandler: (id: string, handler: (message: WSMessage) => void) => () => void;
}
export declare function WebSocketProvider({ children, }: Readonly<{
    children: ReactNode;
}>): import("react/jsx-runtime").JSX.Element;
export declare function useWebSocketContext(): WebSocketContextType;
export {};
