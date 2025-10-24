import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Player } from "shared";
import { useWebRTC } from "@/hooks/useWebRTC";

interface WebRTCContextType {
  isVoiceEnabled: boolean;
  isMuted: boolean;
  audioError: string | null;
  mutedPlayers: Set<string>;
  hostMutedPlayers: Set<string>;
  hostMuted: boolean;
  isHost: boolean;
  audioLevels: Map<string, number>;
  enableVoiceChat: () => Promise<void>;
  disableVoiceChat: () => void;
  toggleMute: () => void;
  togglePlayerMute: (playerId: string) => void;
  kickPlayer: (playerId: string) => void;
  mutePlayerMic: (playerId: string, mute: boolean) => void;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

interface WebRTCProviderProps {
  children: ReactNode;
  roomId: string;
  localPlayerId: string;
  players: Player[];
  isHost?: boolean;
}

/**
 * Provider for WebRTC functionality (voice chat + data channels)
 */
export function WebRTCProvider({
  children,
  roomId,
  localPlayerId,
  players,
  isHost = false,
}: Readonly<WebRTCProviderProps>) {
  const webrtc = useWebRTC({ roomId, localPlayerId, players, isHost });

  return (
    <WebRTCContext.Provider value={webrtc}>
      {children}
    </WebRTCContext.Provider>
  );
}

/**
 * Hook to access WebRTC context (voice + data channels)
 */
export function useWebRTCContext() {
  const context = useContext(WebRTCContext);
  if (!context) {
    // Return default context when not within provider
    return {
      isVoiceEnabled: false,
      isMuted: false,
      audioError: null,
      mutedPlayers: new Set<string>(),
      hostMutedPlayers: new Set<string>(),
      hostMuted: false,
      isHost: false,
      audioLevels: new Map<string, number>(),
      enableVoiceChat: async () => {},
      disableVoiceChat: () => {},
      toggleMute: () => {},
      togglePlayerMute: () => {},
      kickPlayer: () => {},
      mutePlayerMic: () => {},
    };
  }
  return context;
}

/**
 * Alias for backward compatibility with VoiceChat components
 */
export const useVoiceChatContext = useWebRTCContext;
