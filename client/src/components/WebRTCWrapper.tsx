import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { WebRTCProvider } from "@/context/WebRTCContext";
import { useWebSocketContext } from "@/context/WebSocketContext";
import type { Player } from "shared";

interface WebRTCWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides WebRTC context (voice + data channels) to children
 * Automatically tracks room state and player list for WebRTC connections
 */
export function WebRTCWrapper({ children }: Readonly<WebRTCWrapperProps>) {
  const location = useLocation();
  const { registerHandler } = useWebSocketContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  const playerId = localStorage.getItem("clientId") || "";

  // Extract roomId from pathname
  const roomId = (() => {
    const match = RegExp(/\/(room|game)\/([^/]+)/).exec(location.pathname);
    return match ? match[2] : undefined;
  })();

  // Determine if we're in a room/game page
  const isInRoomOrGame =
    location.pathname.includes("/room/") ||
    location.pathname.includes("/game/");

  useEffect(() => {
    if (!isInRoomOrGame || !roomId) {
      return;
    }

    // Listen for room state updates
    const unregisterRoomJoined = registerHandler("room-joined", (message) => {
      if (message.type === "ROOM_JOINED") {
        const { room } = message.payload;
        setPlayers(room.players);
        setIsHost(room.hostId === playerId);
      }
    });

    const unregisterRoomCreated = registerHandler("room-created", (message) => {
      if (message.type === "ROOM_CREATED") {
        const { room } = message.payload;
        setPlayers(room.players);
        setIsHost(true);
      }
    });

    const unregisterPlayerJoined = registerHandler(
      "player-joined",
      (message) => {
        if (message.type === "PLAYER_JOINED") {
          const { player } = message.payload;
          setPlayers((prev) => {
            if (!prev.some((p) => p.id === player.id)) {
              return [...prev, player];
            }
            return prev;
          });
        }
      }
    );

    const unregisterPlayerLeft = registerHandler("player-left", (message) => {
      if (message.type === "PLAYER_LEFT") {
        const { playerId: leftPlayerId, newHostId } = message.payload;
        setPlayers((prev) => prev.filter((p) => p.id !== leftPlayerId));
        if (newHostId && newHostId === playerId) {
          setIsHost(true);
        }
      }
    });

    const unregisterInitialState = registerHandler(
      "initial-game-state",
      (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          const { gameState } = message.payload;
          if (gameState) {
            const gamePlayers: Player[] = gameState.players;
            setPlayers(gamePlayers);
            setIsHost(
              gameState.players.length > 0 &&
                gameState.players[0].id === playerId
            );
          }
        }
      }
    );

    const unregisterGameStateUpdate = registerHandler(
      "game-state-update",
      (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          const { gameState } = message.payload;
          if (gameState) {
            const gamePlayers: Player[] = gameState.players;
            setPlayers(gamePlayers);
          }
        }
      }
    );

    const unregisterBotsAdded = registerHandler("bots-added", (message) => {
      if (message.type === "BOTS_ADDED") {
        const { players: updatedPlayers } = message.payload;
        setPlayers(updatedPlayers);
      }
    });

    const unregisterBotRemoved = registerHandler("bot-removed", (message) => {
      if (message.type === "BOT_REMOVED") {
        const { players: updatedPlayers } = message.payload;
        setPlayers(updatedPlayers);
      }
    });

    return () => {
      unregisterRoomJoined();
      unregisterRoomCreated();
      unregisterPlayerJoined();
      unregisterPlayerLeft();
      unregisterInitialState();
      unregisterGameStateUpdate();
      unregisterBotsAdded();
      unregisterBotRemoved();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerId, isInRoomOrGame]);

  // Only wrap with WebRTCProvider if we're in a room/game and have necessary data
  if (isInRoomOrGame && roomId && playerId) {
    return (
      <WebRTCProvider
        roomId={roomId}
        localPlayerId={playerId}
        players={players}
        isHost={isHost}
      >
        {children}
      </WebRTCProvider>
    );
  }

  return <>{children}</>;
}
