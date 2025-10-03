import type { Player } from "shared";
interface VoiceChatConfig {
    roomId: string;
    localPlayerId: string;
    players: Player[];
    isHost?: boolean;
}
export declare function useVoiceChat({ localPlayerId, players, isHost, }: VoiceChatConfig): {
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
};
export {};
