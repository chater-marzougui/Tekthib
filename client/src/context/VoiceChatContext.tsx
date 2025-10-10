import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Player } from "shared";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface VoiceChatContextType {
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

const VoiceChatContext = createContext<VoiceChatContextType | null>(null);

interface VoiceChatProviderProps {
  children: ReactNode;
  roomId: string;
  localPlayerId: string;
  players: Player[];
  isHost?: boolean;
}

export function VoiceChatProvider({
  children,
  roomId,
  localPlayerId,
  players,
  isHost = false,
}: Readonly<VoiceChatProviderProps>) {
  const voiceChat = useVoiceChat({ roomId, localPlayerId, players, isHost });

  return (
    <VoiceChatContext.Provider value={voiceChat}>
      {children}
    </VoiceChatContext.Provider>
  );
}

export function useVoiceChatContext() {
  const context = useContext(VoiceChatContext);
  if (!context) {
    // Return a default context when not within provider
    // This allows components to render without errors while provider is initializing
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
