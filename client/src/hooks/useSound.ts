import { SoundContext } from "@/context/SoundPlayerContext";
import { useContext } from "react";


export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within SoundProvider');
  }
  return context;
};