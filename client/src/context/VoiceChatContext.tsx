import { createContext, useContext, ReactNode } from 'react';
import { useVoiceChatEnhanced } from '../hooks/useVoiceChatEnhanced';
import type { Player } from '../types';

interface VoiceChatContextType {
  isVoiceEnabled: boolean;
  isMuted: boolean;
  audioError: string | null;
  mutedPlayers: Set<string>;
  hostMuted: boolean;
  isHost: boolean;
  enableVoiceChat: () => Promise<void>;
  disableVoiceChat: () => void;
  toggleMute: () => void;
  togglePlayerMute: (playerId: string) => void;
  kickPlayer: (playerId: string) => void;
  mutePlayerMic: (playerId: string) => void;
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
  isHost = false 
}: VoiceChatProviderProps) {
  const voiceChat = useVoiceChatEnhanced({ roomId, localPlayerId, players, isHost });

  return (
    <VoiceChatContext.Provider value={voiceChat}>
      {children}
    </VoiceChatContext.Provider>
  );
}

export function useVoiceChatContext() {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChatContext must be used within a VoiceChatProvider');
  }
  return context;
}
