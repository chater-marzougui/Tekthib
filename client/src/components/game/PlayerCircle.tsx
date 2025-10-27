import { motion } from "framer-motion";
import { PlayerBadge } from "../PlayerBadge";
import { Icon } from "@iconify/react";
import { useRef, useEffect, useState } from "react";
import type { Player as BasePlayer } from "shared";

interface Player extends BasePlayer {
  isCurrentTurn: boolean;
}

interface PlayerCircleProps {
  players: Player[];
  currentPlayerId: string;
  radius: number;
  centerPile?: React.ReactNode;
}

export default function PlayerCircle({
  players,
  currentPlayerId,
  radius,
  centerPile,
}: Readonly<PlayerCircleProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCenter({
        x: rect.width / 2,
        y: rect.height / 2,
      });
    }
  }, []);
  // Find the current player's index in the array
  const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);

  // Reorder players so the current player is first (will be positioned at bottom)
  // Then arrange others in play order
  const reorderedPlayers =
    currentPlayerIndex === -1
      ? players
      : [
          ...players.slice(currentPlayerIndex),
          ...players.slice(0, currentPlayerIndex),
        ];

  const totalPlayers = reorderedPlayers.length;

  // Calculate positions for each player in a circle
  // Start angle at bottom (270 degrees or 3π/2 radians)
  // Then go clockwise
  const getPlayerPosition = (index: number) => {
    // Start at bottom (270°) and go clockwise
    const startAngle = Math.PI / 2; // 90 degrees in radians
    const angleStep = (2 * Math.PI) / totalPlayers;
    const angle = startAngle - angleStep * index; // Subtract to go clockwise

    const x = center.x * 0.8 + radius * Math.cos(angle);
    const y = center.y * 0.75 + radius * Math.sin(angle);

    return { x, y };
  };

  return (
    <div
      ref={containerRef}
      className="player-circle-container w-full flex justify-center items-center"
      style={{
        pointerEvents: "none",
        position: "relative",
        minHeight: "360px",
      }}
    >
      {/* Center content - always centered using flex */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
        {centerPile}
      </div>

      {/* Player positions around the circle */}
      {reorderedPlayers.map((player, index) => {
        const position = getPlayerPosition(index);
        const isCurrentPlayer = player.id === currentPlayerId;

        return (
          <motion.div
            key={player.id}
            className={`player-avatar absolute`}
            data-player-id={player.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: position.x,
              y: position.y,
            }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              type: "spring",
              stiffness: 200,
            }}
            style={{
              left: 0,
              top: 0,
              pointerEvents: "auto",
            }}
          >
            <div
              className={`
              flex flex-col items-center gap-1 p-2 rounded-lg
              transition-all duration-300 w-20
              ${
                player.isCurrentTurn
                  ? "bg-blue-500/20 ring-2 ring-blue-500 shadow-lg shadow-blue-500/50"
                  : "bg-background/80 backdrop-blur-sm"
              }
              ${isCurrentPlayer ? "ring-2 ring-green-500" : ""}
            `}
            >
              {/* Player Badge */}
              <div className="relative">
                <PlayerBadge player={player} playerId={player.id} size="sm" />
                {player.isCurrentTurn && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Player Info */}
              <div className="text-center">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span className="overflow-hidden whitespace-nowrap max-w-[60px] block">
                    {player.name}
                  </span>
                  {player.isBot && (
                    <Icon
                      icon="mdi:robot"
                      className="w-3 h-3 text-purple-500"
                    />
                  )}
                </div>

                {/* Card count */}
                {(player.cardCount ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {player.cardCount} 🃏
                  </div>
                )}
              </div>

              {/* Winner indicator */}
              {player.cardCount === 0 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-yellow-500 flex items-center gap-0.5">
                  <Icon icon="mdi:trophy" className="w-5 h-5" />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
