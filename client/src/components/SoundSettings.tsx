import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

export const SoundSettings = () => {
  const { isMuted, toggleMute, volume, updateVolume } = useSound();

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX /> : <Volume2 />}
      </Button>
      
      <Slider
        value={[volume * 100]}
        onValueChange={([value]) => updateVolume(value / 100)}
        max={100}
        step={1}
        className="w-32"
        disabled={isMuted}
      />
    </div>
  );
};