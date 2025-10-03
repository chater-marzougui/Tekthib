import type { ReactNode } from "react";
import type { Player } from "shared";
interface VoiceChatContextType {
    isVoiceEnabled: boolean;
    isMuted: boolean;
    audioError: string | null;
    mutedPlayers: Set<string>;
    hostMutedPlayers: Set<string>;
    hostMuted: boolean;
    isHost: boolean;
    enableVoiceChat: () => Promise<void>;
    disableVoiceChat: () => void;
    toggleMute: () => void;
    togglePlayerMute: (playerId: string) => void;
    kickPlayer: (playerId: string) => void;
    mutePlayerMic: (playerId: string, mute: boolean) => void;
}
interface VoiceChatProviderProps {
    children: ReactNode;
    roomId: string;
    localPlayerId: string;
    players: Player[];
    isHost?: boolean;
}
export declare function VoiceChatProvider({ children, roomId, localPlayerId, players, isHost, }: Readonly<VoiceChatProviderProps>): import("react/jsx-runtime").JSX.Element;
export declare function useVoiceChatContext(): VoiceChatContextType;
export {};
