import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { WebRTCProvider } from "@/context/WebRTCContext";
import type { Player } from "shared";
import { useWebSocketContext } from "@/context/WebSocketContext";

interface WebRTCWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides WebRTC context with live player data
 */
export function WebRTCWrapper({ children }: Readonly<WebRTCWrapperProps>) {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const { registerHandler } = useWebSocketContext();

  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  const localPlayerId = localStorage.getItem("clientId") || "";

  // Only provide WebRTC context on room and game pages
  const isInRoomOrGame =
    location.pathname.includes("/room/") ||
    location.pathname.includes("/game/");

  useEffect(() => {
    if (!isInRoomOrGame) return;

    // Listen for room updates
    const unregisterRoomCreated = registerHandler("room-created", (message) => {
      if (message.type === "ROOM_CREATED") {
        const { room } = message.payload;
        setPlayers(room.players || []);
        setIsHost(room.hostId === localPlayerId);
        console.log(
          "[WebRTC] Room created, players:",
          room.players?.length || 0
        );
      }
    });

    const unregisterRoomJoined = registerHandler("room-joined", (message) => {
      if (message.type === "ROOM_JOINED") {
        const { room } = message.payload;
        setPlayers(room.players || []);
        setIsHost(room.hostId === localPlayerId);
        console.log(
          "[WebRTC] Room joined, players:",
          room.players?.length || 0
        );
      }
    });

    const unregisterPlayerJoined = registerHandler(
      "player-joined",
      (message) => {
        if (message.type === "PLAYER_JOINED") {
          const { player } = message.payload;
          setPlayers((prev) => {
            // Avoid duplicates
            if (prev.some((p) => p.id === player.id)) {
              return prev;
            }
            const updated = [...prev, player];
            console.log(
              "[WebRTC] Player joined:",
              player.name,
              "Total:",
              updated.length
            );
            return updated;
          });
        }
      }
    );

    const unregisterPlayerLeft = registerHandler("player-left", (message) => {
      if (message.type === "PLAYER_LEFT") {
        const { playerId, newHostId } = message.payload;
        setPlayers((prev) => {
          const updated = prev.filter((p) => p.id !== playerId);
          console.log(
            "[WebRTC] Player left:",
            playerId,
            "Remaining:",
            updated.length
          );
          return updated;
        });
        if (newHostId === localPlayerId) {
          setIsHost(true);
        }
      }
    });

    const unregisterGameStateUpdate = registerHandler(
      "game-state-update",
      (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          const {
            playerId: updatedPlayerId,
            isReady,
            isConnected,
          } = message.payload;

          setPlayers((prev) =>
            prev.map((p) => {
              if (p.id === updatedPlayerId) {
                const updated = { ...p };
                if (isReady !== undefined) updated.isReady = isReady;
                if (isConnected !== undefined)
                  updated.isConnected = isConnected;
                return updated;
              }
              return p;
            })
          );
        }
      }
    );

    const unregisterInitialGameState = registerHandler(
      "initial-game-state",
      (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          const { gameState } = message.payload;
          if (gameState?.players) {
            setPlayers(gameState.players);
            console.log(
              "[WebRTC] Initial game state, players:",
              gameState.players.length
            );
          }
        }
      }
    );

    const unregisterGameReset = registerHandler("game-reset", (message) => {
      if (message.type === "GAME_RESET") {
        const { room } = message.payload;
        setPlayers(room.players || []);
        setIsHost(room.hostId === localPlayerId);
        console.log("[WebRTC] Game reset, players:", room.players?.length || 0);
      }
    });

    return () => {
      unregisterRoomCreated();
      unregisterRoomJoined();
      unregisterPlayerJoined();
      unregisterPlayerLeft();
      unregisterGameStateUpdate();
      unregisterInitialGameState();
      unregisterGameReset();
    };
  }, [isInRoomOrGame, registerHandler, localPlayerId]);

  // Don't provide WebRTC context on home page or other routes
  if (!isInRoomOrGame || !roomId || !localPlayerId) {
    return <>{children}</>;
  }

  return (
    <WebRTCProvider
      roomId={roomId}
      localPlayerId={localPlayerId}
      players={players}
      isHost={isHost}
    >
      {children}
    </WebRTCProvider>
  );
}
