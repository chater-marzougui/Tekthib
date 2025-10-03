import type { WSMessage } from "shared";
export declare function useWebSocket(): {
    isConnected: boolean;
    lastMessage: WSMessage | null;
    sendMessage: (message: WSMessage) => void;
    registerHandler: (id: string, handler: (message: WSMessage) => void) => () => void;
    connect: () => void;
    disconnect: () => void;
};
