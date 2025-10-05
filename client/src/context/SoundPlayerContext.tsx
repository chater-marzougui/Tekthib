import React, { createContext, useContext, useEffect } from 'react';
import { useSoundManager } from '../hooks/useSoundManager';
import { SOUNDS, CRITICAL_SOUNDS } from '../lib/sounds';

interface SoundContextType {
  playSound: (path: string, options?: any) => void;
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  updateVolume: (volume: number) => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const soundManager = useSoundManager();

  // Preload critical sounds on mount
  useEffect(() => {
    CRITICAL_SOUNDS.forEach(sound => {
      soundManager.preloadSound(sound);
    });
  }, [soundManager]);

  return (
    <SoundContext.Provider value={soundManager}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within SoundProvider');
  }
  return context;
};