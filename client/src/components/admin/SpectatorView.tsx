import { useEffect, useState } from "react";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import type { Player } from "shared";
import { motion, AnimatePresence } from "framer-motion";

interface SpectatorViewProps {
  roomCode: string;
  onClose: () => void;
}

interface GameState {
  phase: string;
  currentPlayerIndex: number;
  currentPlayerId: string;
  pileCount: number;
  currentRank: string | null;
  lastPlayerId: string | null;
  lastPlayedCount: number;
  winners: string[];
  players: Player[];
}

export default function SpectatorView({ roomCode, onClose }: SpectatorViewProps) {
  const { sendMessage, registerHandler } = useWebSocketContext();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Join as spectator
    sendMessage({
      type: "SPECTATE_ROOM",
      payload: { roomCode },
    });

    // Register message handlers
    const unregisterHandlers = [
      registerHandler("spectator-view-joined", (message) => {
        if (message.type === "SPECTATOR_JOINED") {
          setIsConnected(true);
          setError(null);
        }
      }),

      registerHandler("spectator-view-initial", (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-view-update", (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-view-cards-played", (message) => {
        if (message.type === "CARDS_PLAYED") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-view-challenge", (message) => {
        if (message.type === "CHALLENGE_RESULT") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-view-ended", (message) => {
        if (message.type === "GAME_ENDED") {
          // Game ended, update state
        }
      }),

      registerHandler("spectator-view-error", (message) => {
        if (message.type === "ERROR") {
          setError(message.payload.message);
          setIsConnected(false);
        }
      }),
    ];

    // Cleanup on unmount
    return () => {
      sendMessage({
        type: "LEAVE_SPECTATE",
        payload: {},
      });
      unregisterHandlers.forEach((unregister) => unregister());
    };
  }, [roomCode, sendMessage, registerHandler]);

  const handleClose = () => {
    sendMessage({
      type: "LEAVE_SPECTATE",
      payload: {},
    });
    onClose();
  };

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Icon icon="mdi:alert-circle" className="w-6 h-6" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">{error}</p>
          <Button onClick={handleClose} variant="outline" className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected || !gameState) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
            Connecting to Room {roomCode}...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const currentPlayer = gameState.players.find(
    (p) => p.id === gameState.currentPlayerId
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto space-y-4"
    >
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:eye" className="w-6 h-6" />
              Spectating Room: {roomCode}
              <Badge variant="outline" className="ml-2">
                {gameState.phase}
              </Badge>
            </CardTitle>
            <Button onClick={handleClose} variant="outline" size="sm">
              <Icon icon="mdi:close" className="w-4 h-4 mr-2" />
              Exit Spectator Mode
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Game State */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Game Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Phase:</span>
              <Badge variant={gameState.phase === "playing" ? "default" : "secondary"}>
                {gameState.phase}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pile Count:</span>
              <Badge variant="outline" className="font-bold">
                {gameState.pileCount} cards
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Rank:</span>
              <Badge variant="secondary">
                {gameState.currentRank || "None"}
              </Badge>
            </div>
            {currentPlayer && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Turn:</span>
                <Badge className="bg-green-600 hover:bg-green-700">
                  <Icon icon="mdi:account" className="w-4 h-4 mr-1" />
                  {currentPlayer.name}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gameState.lastPlayerId ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Player:</span>
                  <span className="font-medium">
                    {
                      gameState.players.find(
                        (p) => p.id === gameState.lastPlayerId
                      )?.name
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cards Played:</span>
                  <Badge variant="outline">{gameState.lastPlayedCount}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Claimed Rank:</span>
                  <Badge variant="secondary">{gameState.currentRank}</Badge>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">No plays yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Players */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Players ({gameState.players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {gameState.players.map((player, index) => {
                const isCurrentPlayer = player.id === gameState.currentPlayerId;
                const hasWon = gameState.winners.includes(player.id);

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isCurrentPlayer
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : hasWon
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {index + 1}. {player.name}
                        </span>
                        {player.isBot && (
                          <Badge variant="secondary" className="text-xs">
                            BOT
                          </Badge>
                        )}
                      </div>
                      {isCurrentPlayer && (
                        <Icon
                          icon="mdi:account-arrow-right"
                          className="w-5 h-5 text-green-600 animate-pulse"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Icon icon="mdi:cards" className="w-4 h-4" />
                        <span>
                          {player.cardCount || 0} {player.cardCount === 1 ? "card" : "cards"}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          player.isConnected ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        <Icon
                          icon={player.isConnected ? "mdi:check-circle" : "mdi:close-circle"}
                          className="w-4 h-4"
                        />
                        <span>{player.isConnected ? "Online" : "Offline"}</span>
                      </div>
                    </div>
                    {hasWon && (
                      <div className="mt-2 flex items-center gap-1 text-yellow-600 font-semibold">
                        <Icon icon="mdi:trophy" className="w-4 h-4" />
                        <span>Winner!</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
