interface ChatMessage {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
    isSystem?: boolean;
}
interface ChatBoxProps {
    playerName: string;
    playerId: string;
    systemMessages?: ChatMessage[];
}
export default function ChatBox({ playerName, playerId, systemMessages, }: Readonly<ChatBoxProps>): import("react/jsx-runtime").JSX.Element;
export {};
