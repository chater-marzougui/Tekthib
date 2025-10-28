import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import type { Player, Card as GameCard, LastPlay } from "shared";
import GameBoard from "@/components/game/GameBoard";
import PlayerList from "@/components/game/PlayerList";
import { useHeader } from "@/hooks/useHeader";
import Seo from "@/components/SEO";

interface GameState {
  phase: string;
  currentPlayerIndex: number;
  currentPlayerId: string;
  pileCount: number;
  currentRank: string | null;
  lastPlayerId: string | null;
  lastPlayedCount: number;
  winners?: string[];
  playerOrder?: string[];
  playerHandCounts?: Record<string, number>;
  players: Player[];
  pile?: GameCard[];
  removedCards?: GameCard[];
}

export default function SpectatorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setHeaderConfig } = useHeader();
  const { sendMessage, registerHandler, isConnected } = useWebSocketContext();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected_spectator, setIsConnected_spectator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !roomId) return;

    // Join as spectator
    sendMessage({
      type: "SPECTATE_ROOM",
      payload: { roomCode: roomId },
    });

    // Register message handlers
    const unregisterHandlers = [
      registerHandler("spectator-joined", (message) => {
        if (message.type === "SPECTATOR_JOINED") {
          setIsConnected_spectator(true);
          setError(null);
        }
      }),

      registerHandler("spectator-initial", (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
            setIsLoading(false);
          }
        }
      }),

      registerHandler("spectator-update", (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-cards-played", (message) => {
        if (message.type === "CARDS_PLAYED") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-challenge", (message) => {
        if (message.type === "CHALLENGE_RESULT") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-ended", (message) => {
        if (message.type === "GAME_ENDED") {
          if (message.payload.gameState) {
            setGameState(message.payload.gameState);
          }
        }
      }),

      registerHandler("spectator-error", (message) => {
        if (message.type === "ERROR") {
          setError(message.payload.message);
          setIsConnected_spectator(false);
        }
      }),
    ];

    // Cleanup on unmount
    return () => {
      sendMessage({
        type: "LEAVE_SPECTATE",
        payload: {},
      });
      for (const unregister of unregisterHandlers) {
        unregister();
      }
    };
  }, [roomId, isConnected, sendMessage, registerHandler]);

  const handleLeaveSpectate = () => {
    sendMessage({
      type: "LEAVE_SPECTATE",
      payload: {},
    });
    navigate(-1);
  };

  useEffect(() => {
    setHeaderConfig({
      actionButton: {
        label: t("game.leaveGame"),
        onClick: () => handleLeaveSpectate(),
        variant: "destructive",
        color: "default",
      },
      middleElement: gameState?.lastPlayerId && (
        <div className="flex items-center gap-1.5">
          {gameState.lastPlayedCount}×
          <Badge
            variant="destructive"
            className="text-base sm:text-md font-bold px-3 py-1"
          >
            {gameState.currentRank || "N/A"}
          </Badge>
        </div>
      ),
      showNameInMobile: false,
    });
    return () => {
      setHeaderConfig({
        actionButton: undefined,
        middleElement: undefined,
        showNameInMobile: true,
      });
    };
  }, [
    t,
    gameState?.lastPlayerId,
    gameState?.lastPlayedCount,
    gameState?.currentRank,
  ]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Icon icon="mdi:alert-circle" className="w-6 h-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">{error}</p>
            <Button
              onClick={handleLeaveSpectate}
              variant="outline"
              className="w-full"
            >
              {t("game.leaveGame")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !isConnected_spectator || !gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
              {t("game.connecting")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {t("game.waitingForGame")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(
    (p) => p.id === gameState.currentPlayerId
  );

  const lastPlay: LastPlay | null = gameState.lastPlayerId
    ? {
        player:
          gameState.players.find((p) => p.id === gameState.lastPlayerId)
            ?.name || "Unknown",
        cardCount: gameState.lastPlayedCount,
        claimedRank: gameState.currentRank || "Unknown",
      }
    : null;

  const spectatorPlayers: Player[] = (gameState.playerOrder || []).map((id) => {
    const playerData = gameState.players.find((p) => p.id === id);
    return {
      id,
      name: playerData?.name || "Unknown",
      cardCount: gameState.playerHandCounts?.[id] || 0,
      isBot: playerData?.isBot || false,
      isConnected: playerData?.isConnected || false,
      isReady: playerData?.isReady || false,
    };
  });

  return (
    <div>
      <Seo
        title={`Spectating Room ${roomId} | Tekthib`}
        description={`Watching a live Tekthib game in room ${roomId}`}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Badge */}
        <div className="mb-4 flex items-center justify-center">
          <div className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-lg flex items-center gap-2">
            <Icon icon="mdi:eye" className="w-6 h-6" />
            Spectating Room {roomId}
          </div>
        </div>

        {/* Game Board */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <GameBoard
            lastPlay={lastPlay}
            pileCount={gameState.pileCount}
            currentPlayer={currentPlayer?.name || "Unknown"}
            canChallenge={false}
            onChallenge={() => {}}
            removedCards={gameState.removedCards || []}
            isMyTurn={false}
            selectedCards={[]}
            onPlayCards={() => {}}
            onCardSelect={() => {}}
            playerCards={[]}
            autoPlayTimeout={0}
            serverTimer={0}
            players={spectatorPlayers.map((p) => ({
              ...p,
              isCurrentTurn: p.id === gameState.currentPlayerId,
            }))}
            currentPlayerId={gameState.currentPlayerId}
            isReplay={true}
            suspenseBlock={false}
            spectatorMode={true}
          />

          <div className="gap-4 flex flex-row flex-wrap w-full lg:flex-col lg:w-84">
            <PlayerList
              players={spectatorPlayers.map((p) => ({
                ...p,
                isCurrentTurn: p.id === gameState.currentPlayerId,
              }))}
              currentPlayerId={gameState.currentPlayerId}
              loserId={undefined}
              winners={gameState.winners}
            />
          </div>
        </div>

        {/* Game Over */}
        {gameState.phase === "ended" &&
          gameState.winners &&
          gameState.winners.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Icon icon="mdi:trophy" className="w-6 h-6" />
                  Game Over
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">
                    Winners:{" "}
                    {gameState.winners
                      .map(
                        (id) =>
                          gameState.players.find((p) => p.id === id)?.name ||
                          "Unknown"
                      )
                      .join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}
