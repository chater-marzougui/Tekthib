import { useCallback, useRef, useState } from 'react';

interface SoundOptions {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
  probability?: number; // Probability of playing the sound (0-1)
}

export const useSoundManager = () => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('soundMuted');
    return saved === 'true';
  });

  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEffectsEnabled');
    return saved !== 'false'; // Default to true
  });
  
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved ? Number.parseFloat(saved) : 0.7;
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
    if (isMuted || !soundEffectsEnabled) return;

    // Check probability
    const probability = options.probability ?? 1;
    if (Math.random() > probability) return;

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
  }, [isMuted, soundEffectsEnabled, volume]);

  // Play random sound from array
  const playRandomSound = useCallback((
    soundArray: string[],
    options: SoundOptions = {}
  ) => {
    if (soundArray.length === 0) return;
    const randomSound = soundArray[Math.floor(Math.random() * soundArray.length)];
    return playSound(randomSound, options);
  }, [playSound]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      localStorage.setItem('soundMuted', String(newValue));
      return newValue;
    });
  }, []);

  // Toggle sound effects
  const toggleSoundEffects = useCallback(() => {
    setSoundEffectsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('soundEffectsEnabled', String(newValue));
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
    playRandomSound,
    preloadSound,
    isMuted,
    toggleMute,
    soundEffectsEnabled,
    toggleSoundEffects,
    volume,
    updateVolume,
  };
};