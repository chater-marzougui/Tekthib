import { useCallback, useRef, useState } from 'react';

interface SoundOptions {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
}

export const useSoundManager = () => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('soundMuted');
    return saved === 'true';
  });
  
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved ? parseFloat(saved) : 0.7;
  });

  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Preload sounds
  const preloadSound = useCallback((path: string) => {
    if (!audioCache.current.has(path)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioCache.current.set(path, audio);
    }
  }, []);

  // Play sound
  const playSound = useCallback((
    path: string,
    options: SoundOptions = {}
  ) => {
    if (isMuted) return;

    const audio = audioCache.current.get(path) || new Audio(path);
    
    audio.volume = (options.volume ?? 1) * volume;
    audio.loop = options.loop ?? false;
    audio.playbackRate = options.playbackRate ?? 1;
    
    // Clone for overlapping sounds
    const soundToPlay = audio.cloneNode() as HTMLAudioElement;
    soundToPlay.volume = audio.volume;
    soundToPlay.playbackRate = audio.playbackRate;
    
    soundToPlay.play().catch(err => {
      console.warn('Sound play failed:', err);
    });

    return soundToPlay;
  }, [isMuted, volume]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      localStorage.setItem('soundMuted', String(newValue));
      return newValue;
    });
  }, []);

  // Update volume
  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    localStorage.setItem('soundVolume', String(clampedVolume));
  }, []);

  return {
    playSound,
    preloadSound,
    isMuted,
    toggleMute,
    volume,
    updateVolume,
  };
};