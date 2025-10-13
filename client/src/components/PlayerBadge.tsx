import type { Player } from "shared";
import { Badge } from "./ui/badge";
import { useAvatar } from "@/hooks/useAvatar";
import { Icon } from "@iconify/react";

interface PlayerBadgeProps {
  player: Player;
  playerId: string;
  size?: "sm" | "md";
}

function getRingColor(player: Player, playerId: string) {
  if (player.id === playerId) {
    return "ring-blue-500";
  }
  return player.isBot ? "ring-gray-300" : "ring-yellow-300";
}

function getBadgeClasses(player: Player, playerId: string) {
  if (player.id === playerId) {
    return "bg-blue-500 text-white";
  }
  return player.isBot
    ? "bg-purple-500 text-white"
    : "bg-gray-200 text-gray-800";
}

export const PlayerBadge = ({ player, playerId, size = "md" }: PlayerBadgeProps) => {
  const avatarSvg = useAvatar(playerId);
  const isBot = player.isBot || false;
  const sizeClasses = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const textSize = size === "sm" ? "text-sm" : "text-lg";
  
  if (avatarSvg) {
    return (
      <div
        className={`${sizeClasses} ring-2 ${getRingColor(player, playerId)} rounded-full overflow-hidden flex items-center justify-center bg-gray-300`}
        dangerouslySetInnerHTML={{ __html: avatarSvg }}
      />
    );
  }
  return (
    <Badge
      className={`${sizeClasses} ${getBadgeClasses(player, playerId)} flex items-center justify-center rounded-full ${textSize} font-bold`}
    >
      {isBot ? (
        <Icon icon="mdi:robot" className={iconSize} />
      ) : (
        player.name.charAt(0).toUpperCase()
      )}
    </Badge>
  );
};
