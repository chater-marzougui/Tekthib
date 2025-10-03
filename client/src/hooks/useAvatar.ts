import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import type { Player } from "shared";

// Hook to get a deterministic avatar SVG per player
export function useAvatar(player: Player) {
  const avatarSvg = useMemo(() => {
    if (!player?.id) return null;

    const svg = createAvatar(lorelei, {
      seed: player.id,
      size: 64, // optional, default 64
      backgroundColor: ["transparent"], // optional
    }).toString();

    return svg;
  }, [player?.id]);

  return avatarSvg;
}
