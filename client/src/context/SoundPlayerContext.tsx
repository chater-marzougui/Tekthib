import React, { createContext, useEffect } from 'react';
import { useSoundManager } from '../hooks/useSoundManager';
import { CRITICAL_SOUNDS } from '../lib/sounds';

interface SoundContextType {
  playSound: (path: string, options?: any) => HTMLAudioElement | undefined;
  playRandomSound: (soundArray: string[], options?: any) => HTMLAudioElement | undefined;
  isMuted: boolean;
  toggleMute: () => void;
  soundEffectsEnabled: boolean;
  toggleSoundEffects: () => void;
  volume: number;
  updateVolume: (volume: number) => void;
}

export const SoundContext = createContext<SoundContextType | null>(null);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const soundManager = useSoundManager();

  // Preload critical sounds on mount
  useEffect(() => {
    for(const sound of CRITICAL_SOUNDS) {
      soundManager.preloadSound(sound);
    }
  }, [soundManager]);

  return (
    <SoundContext.Provider value={soundManager}>
      {children}
    </SoundContext.Provider>
  );
};