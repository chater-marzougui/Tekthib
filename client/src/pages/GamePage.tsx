import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { VoiceChatProvider } from "@/context/VoiceChatContext";
import GameBoard from "../components/game/GameBoard";
import PlayerHand from "../components/game/PlayerHand";
import PlayerList from "../components/game/PlayerList";
import ChatBox from "../components/chat/ChatBox";
import { toast } from "sonner";
import type { Card as GameCard, Rank, Player, DisplayGameCard } from "shared";
import type { GameState as ServerGameState } from "./../types";
import VoiceChat from "@/components/chat/VoiceChat";

interface GamePlayer extends Player {
  isCurrentTurn: boolean;
}

interface LastPlay {
  player: string;
  cardCount: number;
  claimedRank: string;
}

interface SystemMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isSystem: boolean;
}

export default function GamePage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { sendMessage, registerHandler, isConnected } = useWebSocketContext();

  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [playerHand, setPlayerHand] = useState<DisplayGameCard[]>([]);
  const [gameState, setGameState] = useState<ServerGameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);

  const playerName = localStorage.getItem("playerName") || "Anonymous";
  const playerId = localStorage.getItem("clientId") || "";

  const [lastPlay, setLastPlay] = useState<LastPlay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [canChallenge, setCanChallenge] = useState(false);
  const [gameEndedDialog, setGameEndedDialog] = useState<{
    open: boolean;
    winners: string[];
    loser: string;
  }>({
    open: false,
    winners: [],
    loser: "",
  });

  // Request initial game state when component mounts
  useEffect(() => {
    console.log(roomId, playerId);
    if (isConnected && roomId && playerId) {
      // Request current game state from server
      console.log("Requesting initial game state for room:", roomId);
      sendMessage({
        type: "GET_GAME_STATE",
        payload: {
          roomCode: roomId,
          playerId,
        },
      });
    } else if (isConnected && roomId && !playerId) {
      // If no playerId, user probably navigated directly without going through room
      console.error("No player ID found. Please rejoin from home page.");
      setError("Session expired. Please return to home and rejoin the game.");
      setIsLoading(false);
    }
  }, [isConnected, roomId, playerId, sendMessage]);

  // Initialize game data and setup WebSocket handlers
  useEffect(() => {
    // Register handler for initial game state response
    const unregisterInitialState = registerHandler(
      "initial-game-state",
      (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          console.log("Received initial game state:", message.payload);
          const { hand, gameState: initialGameState } = message.payload;

          if (initialGameState) {
            setGameState(initialGameState);
            setIsMyTurn(initialGameState.currentPlayerId === playerId);
          }

          if (hand) {
            setPlayerHand(
              hand.map((card: GameCard) => ({ ...card, selected: false })),
            );
          }

          setIsLoading(false);
        }
      },
    );

    // Register WebSocket handlers
    const unregisterGameStateUpdate = registerHandler(
      "game-state-update",
      (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          const { hand, gameState: newGameState } = message.payload;

          if (hand) {
            setPlayerHand(
              hand.map((card: GameCard) => ({ ...card, selected: false })),
            );
          }

          if (newGameState) {
            setGameState(newGameState);
            setIsMyTurn(newGameState.currentPlayerId === playerId);
          }
        }
      },
    );

    const unregisterCardsPlayed = registerHandler("cards-played", (message) => {
      if (message.type === "CARDS_PLAYED") {
        const {
          playerName: pName,
          cardCount,
          claimedRank,
          gameState: newGameState,
        } = message.payload;

        setLastPlay({
          player: pName,
          cardCount,
          claimedRank,
        });

        if (newGameState) {
          setGameState(newGameState);
          setIsMyTurn(newGameState.currentPlayerId === playerId);
          setCanChallenge(pName !== playerName);
        }
      }
    });

    const unregisterChallengeResult = registerHandler(
      "challenge-result",
      (message) => {
        if (message.type === "CHALLENGE_RESULT") {
          const {
            challengerName,
            wasLying,
            playerName: lastPlayerName,
            gameState: newGameState,
          } = message.payload;
          let toastType = "info";

          // Don't reveal cards, just show who was right/wrong
          let resultMessage = "";
          if (wasLying && lastPlayerName === playerName) {
            resultMessage = `You were caught lying! Learn to play!.`;
            toastType = "error";
          } else if (wasLying && challengerName === playerName) {
            resultMessage = `You were right! ${lastPlayerName} was lying.`;
            toastType = "success";
          } else if (!wasLying && lastPlayerName === playerName) {
            resultMessage = `You were telling the truth! Well played, ${challengerName} was wrong.`;
            toastType = "success";
          } else if (!wasLying && challengerName === playerName) {
            resultMessage = `You were wrong! ${lastPlayerName} was telling the truth.`;
            toastType = "error";
          } else {
            resultMessage = wasLying
              ? `${challengerName} was right! ${lastPlayerName} was lying.`
              : `${challengerName} was wrong! ${lastPlayerName} was telling the truth.`;
          }

          // Show toast notification
          if (toastType === "error") {
            toast.error(resultMessage);
          } else if (toastType === "success") {
            toast.success(resultMessage);
          } else {
            toast(resultMessage);
          }

          // Add system message to chat
          const systemMessage: SystemMessage = {
            id: `system-${Date.now()}${Math.random()}`,
            playerId: "system",
            playerName: "System",
            message: resultMessage,
            timestamp: Date.now(),
            isSystem: true,
          };
          setSystemMessages((prev) => [...prev, systemMessage]);

          setLastPlay(null);
          setCanChallenge(false);

          if (newGameState) {
            setGameState(newGameState);
            setIsMyTurn(newGameState.currentPlayerId === playerId);
          }
        }
      },
    );

    const unregisterGameEnded = registerHandler("game-ended", (message) => {
      if (message.type === "GAME_ENDED") {
        const { winners, loser, gameState: finalState } = message.payload;

        const winnerNames = winners
          .map(
            (id: string) =>
              finalState?.players?.find((p: Player) => p.id === id)?.name ||
              "Unknown",
          )
          .join(", ");

        const loserName =
          finalState?.players?.find((p: Player) => p.id === loser)?.name ||
          "Unknown";

        // Show dialog instead of alert
        setGameEndedDialog({
          open: true,
          winners: winnerNames.split(", "),
          loser: loserName,
        });

        // Also show toast
        toast.success(`Game Over! Winners: ${winnerNames}`);

        // Add system message to chat
        const systemMessage: SystemMessage = {
          id: `system-${Date.now()}`,
          playerId: "system",
          playerName: "System",
          message: `Game Over! Winners: ${winnerNames}. Loser: ${loserName}`,
          timestamp: Date.now(),
          isSystem: true,
        };
        setSystemMessages((prev) => [...prev, systemMessage]);
      }
    });

    const unregisterError = registerHandler("error", (message) => {
      if (message.type === "ERROR") {
        setError(message.payload.message);
        setTimeout(() => setError(null), 3000);
      }
    });

    return () => {
      unregisterInitialState();
      unregisterGameStateUpdate();
      unregisterCardsPlayed();
      unregisterChallengeResult();
      unregisterGameEnded();
      unregisterError();
    };
  }, [registerHandler, navigate, playerId, playerName, lastPlay]);

  // Convert gameState players to Player[] format for voice chat
  const playersForVoice: Player[] = gameState
    ? gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isReady: true,
        isConnected: p.isConnected,
        isBot: p.isBot,
      }))
    : [];

  // Determine if current player is host (first player in the list)
  const isHost = !!(
    gameState &&
    gameState.players.length > 0 &&
    gameState.players[0].id === playerId
  );

  // Update players list when game state changes
  useEffect(() => {
    if (!gameState) return;

    const updatedPlayers: GamePlayer[] = gameState.playerOrder.map((id) => {
      const playerData = gameState.players.find((p) => p.id === id);
      return {
        id,
        name: playerData?.name || "Unknown",
        cardCount: gameState.playerHandCounts[id] || 0,
        isCurrentTurn: id === gameState.currentPlayerId,
        isBot: playerData?.isBot || false,
        isConnected: playerData?.isConnected || false,
        isReady: playerData?.isReady || false,
      };
    });

    setPlayers(updatedPlayers);
  }, [gameState]);

  const handleCardSelect = (cardId: string) => {
    setPlayerHand((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, selected: !card.selected } : card,
      ),
    );

    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  };

  const handlePlayCards = (selectedCardIds: string[], claimedRank: string) => {
    if (selectedCardIds.length === 0 || !claimedRank) return;

    sendMessage({
      type: "PLAY_CARDS",
      payload: {
        cardIds: selectedCardIds,
        claimedRank: claimedRank as Rank,
      },
    });

    // Clear selection
    setSelectedCards([]);
  };

  const handleChallenge = () => {
    sendMessage({
      type: "CHALLENGE",
      payload: {
        challengerId: playerId,
      },
    });
  };

  const handleLeaveGame = () => {
    navigate("/");
  };

  // Show loading state while fetching game data
  if (isLoading || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-600">Loading game...</p>
              {!isConnected && (
                <p className="text-yellow-600 text-sm">
                  Connecting to server...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🃏 Tekthib Game
            </h1>
            <p className="text-gray-600">
              {isMyTurn ? "Your turn!" : "Waiting for other players..."}
            </p>
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
            {!isConnected && (
              <p className="text-yellow-600 text-sm mt-1">
                Connecting to server...
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLeaveGame}>
            Leave Game
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Board - Center Area */}
          <div className="lg:col-span-3 space-y-6">
            <GameBoard
              lastPlay={lastPlay}
              pileCount={gameState.pileCount}
              currentPlayer={players.find((p) => p.isCurrentTurn)?.name || ""}
              canChallenge={canChallenge}
              onChallenge={handleChallenge}
            />

            <PlayerHand
              cards={playerHand}
              lastPlay={lastPlay}
              onCardSelect={handleCardSelect}
              onPlayCards={handlePlayCards}
              isMyTurn={isMyTurn}
              selectedCards={selectedCards}
            />
          </div>

          {/* Players List and Game Info */}
          <div className="space-y-4">
            <PlayerList players={players} currentPlayerId={playerId} />

            {/* Voice Chat */}
            {roomId && playerId && (
              <VoiceChat players={playersForVoice} localPlayerId={playerId} />
            )}

            {/* Chat Box */}
            {playerId && playerName && (
              <ChatBox
                playerName={playerName}
                playerId={playerId}
                systemMessages={systemMessages}
              />
            )}

            {/* Game Rules Quick Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Rules</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>• Play cards face-down and claim a rank</div>
                <div>• You can bluff (lie about the rank)</div>
                <div>• Others can challenge by calling "Liar!"</div>
                <div>• Wrong challenger takes the pile</div>
                <div>• First to empty hand wins!</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Game Ended Dialog */}
      <Dialog
        open={gameEndedDialog.open}
        onOpenChange={(open) => {
          setGameEndedDialog({ ...gameEndedDialog, open });
          if (!open) {
            navigate("/");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 Game Over!</DialogTitle>
            <DialogDescription>
              The game has ended. Here are the results:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold text-green-600 mb-2">🏆 Winners:</h3>
              <ul className="list-disc list-inside space-y-1">
                {gameEndedDialog.winners.map((winner, idx) => (
                  <li key={idx} className="text-lg">
                    {winner}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-red-600 mb-2">😢 Loser:</h3>
              <p className="text-lg">{gameEndedDialog.loser}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setGameEndedDialog({ ...gameEndedDialog, open: false });
                navigate("/");
              }}
            >
              Return to Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Wrap with VoiceChatProvider to maintain voice connections
  if (roomId && playerId) {
    return (
      <VoiceChatProvider
        roomId={roomId}
        localPlayerId={playerId}
        players={playersForVoice}
        isHost={isHost}
      >
        {content}
      </VoiceChatProvider>
    );
  }

  return content;
}
