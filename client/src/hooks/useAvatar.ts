import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";

// Hook to get a deterministic avatar SVG per player
export function useAvatar(playerId: string | null, size = 64) {
  const avatarSvg = useMemo(() => {
    if (!playerId) return null;

    const svg = createAvatar(lorelei, {
      seed: playerId,
      size: size, // optional, default 64
      backgroundColor: ["transparent"], // optional
    }).toString();

    return svg;
  }, [playerId, size]);

  return avatarSvg;
}
