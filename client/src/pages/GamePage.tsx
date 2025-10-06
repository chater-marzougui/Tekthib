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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { VoiceChatProvider } from "@/context/VoiceChatContext";
import GameBoard from "../components/game/GameBoard";
import PlayerList from "../components/game/PlayerList";
import ChatBox from "../components/chat/ChatBox";
import { toast } from "sonner";
import type { Card as GameCard, Rank, Player, DisplayGameCard } from "shared";
import type { GameState as ServerGameState } from "./../types";
import VoiceChat from "@/components/chat/VoiceChat";
import { EndGameDialog } from "@/components/game/EndGameDialog";
import { motion } from "framer-motion";

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
  systemMessageColor?: string; // e.g., "red", "green", "blue"
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
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [autoPlayTimeout, setAutoPlayTimeout] = useState(45);

  const playerName = localStorage.getItem("playerName") || "";
  const playerId = localStorage.getItem("clientId") || "";

  useEffect(() => {
    if (!playerName || playerName === "Anonymous") {
      setShowNameDialog(true);
    }
  }, [playerName]);

  const [lastPlay, setLastPlay] = useState<LastPlay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [canChallenge, setCanChallenge] = useState(false);
  const [revealedCardsAnimation, setRevealedCardsAnimation] = useState<{
    show: boolean;
    cards: GameCard[];
  } | null>(null);
  const [playingCardsAnimation, setPlayingCardsAnimation] = useState<{
    show: boolean;
    cards: GameCard[];
  } | null>(null);
  const [gameEndedDialog, setGameEndedDialog] = useState<{
    open: boolean;
    winners: string[];
    loser: string;
    playerStats?: Record<string, import("shared").PlayerStats>;
  }>({
    open: false,
    winners: [],
    loser: "",
  });

  useEffect(() => {
    if (isConnected && roomId && playerId) {
      sendMessage({
        type: "GET_GAME_STATE",
        payload: {
          roomCode: roomId,
          playerId,
        },
      });
    } else if (isConnected && roomId && !playerId) {
      console.error("No player ID found. Please rejoin from home page.");
      setError("Session expired. Please return to home and rejoin the game.");
      setIsLoading(false);
    }
  }, [isConnected, roomId, playerId, sendMessage]);

  useEffect(() => {
    const unregisterInitialState = registerHandler(
      "initial-game-state",
      (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          const { hand, gameState: initialGameState, room } = message.payload;

          // Set auto play timeout from room settings
          if (room && room.autoPlayTimeout !== undefined) {
            console.log("Setting autoPlayTimeout to:", room.autoPlayTimeout);
            setAutoPlayTimeout(room.autoPlayTimeout);
          } else {
            console.warn("No room info in INITIAL_GAME_STATE");
            setAutoPlayTimeout(45);
          }

          if (initialGameState) {
            setGameState(initialGameState);
            setIsMyTurn(initialGameState.currentPlayerId === playerId);

            // If there's a pile and a last player, reconstruct lastPlay
            if (
              initialGameState.lastPlayerId &&
              initialGameState.pileCount > 0 &&
              initialGameState.currentRank
            ) {
              const lastPlayerData = initialGameState.players.find(
                (p: Player) => p.id === initialGameState.lastPlayerId
              );
              setLastPlay({
                player: lastPlayerData?.name || "Unknown",
                cardCount: initialGameState.lastPlayedCount || 0,
                claimedRank: initialGameState.currentRank,
              });

              // If it's my turn and there's a last play, I can challenge
              const isWinner = initialGameState.winners.includes(playerId);
              const isLastPlayer = initialGameState.lastPlayerId === playerId;
              setCanChallenge(
                initialGameState.currentPlayerId === playerId &&
                  !isLastPlayer &&
                  !isWinner &&
                  initialGameState.pileCount > 0
              );
            }
          }

          if (hand) {
            setPlayerHand(
              hand.map((card: GameCard) => ({ ...card, selected: false }))
            );
          }

          setIsLoading(false);
        }
      }
    );

    const unregisterRoomJoined = registerHandler("room-joined", (message) => {
      if (message.type === "ROOM_JOINED") {
        // Room exists but game hasn't started, redirect to room page
        toast.info("Game hasn't started yet. Redirecting to room...");
        navigate(`/room/${roomId}`);
      }
    });

    const unregisterGameStateUpdate = registerHandler(
      "game-state-update",
      (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          const { hand, gameState: newGameState } = message.payload;

          if (hand) {
            setPlayerHand(
              hand.map((card: GameCard) => ({ ...card, selected: false }))
            );
          }

          if (newGameState) {
            setGameState(newGameState);
            setIsMyTurn(newGameState.currentPlayerId === playerId);
          }
        }
      }
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
          const isWinner = newGameState.winners.includes(playerId);
          setCanChallenge(pName !== playerName && !isWinner);
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
            revealedCards,
          } = message.payload;
          let toastColor = "blue";

          let resultMessage = "";
          let resultDescription = "";
          if (wasLying && lastPlayerName === playerName) {
            resultMessage = `Caught lying by ${challengerName}!`;
            resultDescription = "Learn to play! and Try to be more honest next time.";
            toastColor = "red";
          } else if (wasLying && challengerName === playerName) {
            resultMessage = `You are right! ${lastPlayerName} was lying.`;
            toastColor = "green";
          } else if (!wasLying && lastPlayerName === playerName) {
            resultMessage = `Well played, ${challengerName} accused you.`;
            resultDescription = "You were telling the truth!";
            toastColor = "green";
          } else if (!wasLying && challengerName === playerName) {
            resultMessage = `You are wrong! ${lastPlayerName} is telling the truth.`;
            resultDescription = "Try to be more careful next time.";
            toastColor = "red";
          } else {
            resultMessage = wasLying
              ? `${challengerName} is right!`
              : `${challengerName} is wrong!`;

            resultDescription = `${challengerName} accused ${lastPlayerName} of lying. ${
              wasLying ? "He's right!" : "He's wrong!"
            }`;
          }

          if (toastColor === "red") {
            toast.error(resultMessage, { description: resultDescription });
          } else if (toastColor === "green") {
            toast.success(resultMessage, { description: resultDescription });
          } else {
            toast.info(resultMessage, { description: resultDescription });
          }

          const shouldShowCardReveal =
            (wasLying && lastPlayerName === playerName) ||
            (!wasLying && challengerName === playerName);

          if (
            shouldShowCardReveal &&
            revealedCards &&
            revealedCards.length > 0
          ) {
            setRevealedCardsAnimation({ show: true, cards: revealedCards });

            setTimeout(() => {
              setRevealedCardsAnimation(null);
            }, 2500);
          }

          const systemMessage: SystemMessage = {
            id: `system-${Date.now()}${Math.random()}`,
            playerId: "system",
            playerName: "System",
            message: resultMessage,
            timestamp: Date.now(),
            isSystem: true,
            systemMessageColor: toastColor,
          };
          setSystemMessages((prev) => [...prev, systemMessage]);

          setLastPlay(null);
          setCanChallenge(false);

          if (newGameState) {
            setGameState(newGameState);
            setIsMyTurn(newGameState.currentPlayerId === playerId);
          }
        }
      }
    );

    const unregisterGameEnded = registerHandler("game-ended", (message) => {
      if (message.type === "GAME_ENDED") {
        const { winners, loser, gameState: finalState } = message.payload;

        const winnerNames = winners
          .map(
            (id: string) =>
              finalState?.players?.find((p: Player) => p.id === id)?.name ||
              "Unknown"
          )
          .join(", ");

        const loserName =
          finalState?.players?.find((p: Player) => p.id === loser)?.name ||
          "Unknown";

        setGameEndedDialog({
          open: true,
          winners: winnerNames.split(", "),
          loser: loserName,
          playerStats: finalState?.playerStats,
        });

        toast.success(`Game Over! Winners: ${winnerNames}`);

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
        const errorMessage = message.payload.message;
        const errorCode = message.payload.code;
        
        // If room not found, redirect to home page
        if (errorCode === "ROOM_NOT_FOUND" || errorMessage === "Room not found") {
          toast.error("Room not found. Redirecting to home...");
          navigate("/");
          return;
        }
        
        // If player not in room, redirect to room page if it exists
        if (errorMessage === "Player not in room") {
          toast.error("You are not in this game. Redirecting...");
          navigate("/");
          return;
        }
        
        setError(errorMessage);
        setTimeout(() => setError(null), 3000);
      }
    });

    const unregisterGameReset = registerHandler("game-reset", (message) => {
      if (message.type === "GAME_RESET") {
        toast.success("Game reset! Return to room to start again.");
        navigate(`/room/${roomId}`);
      }
    });

    return () => {
      unregisterInitialState();
      unregisterRoomJoined();
      unregisterGameStateUpdate();
      unregisterCardsPlayed();
      unregisterChallengeResult();
      unregisterGameEnded();
      unregisterError();
      unregisterGameReset();
    };
  }, [registerHandler, navigate, playerId, playerName, lastPlay, roomId]);

  const playersForVoice: Player[] = gameState
    ? gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isReady: true,
        isConnected: p.isConnected,
        isBot: p.isBot,
      }))
    : [];

  const isHost = !!(
    gameState &&
    gameState.players.length > 0 &&
    gameState.players[0].id === playerId
  );

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
        card.id === cardId ? { ...card, selected: !card.selected } : card
      )
    );

    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handlePlayCards = (selectedCardIds: string[], claimedRank: string) => {
    if (selectedCardIds.length === 0 || !claimedRank) return;

    // Get the cards being played for animation
    const cardsBeingPlayed = playerHand.filter((card) =>
      selectedCardIds.includes(card.id)
    );

    // Show animation of cards moving to pile
    setPlayingCardsAnimation({ show: true, cards: cardsBeingPlayed });

    // Clear animation after it completes
    setTimeout(() => {
      setPlayingCardsAnimation(null);
    }, 1200);

    sendMessage({
      type: "PLAY_CARDS",
      payload: {
        cardIds: selectedCardIds,
        claimedRank: claimedRank as Rank,
      },
    });

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

  const handlePlayAgain = () => {
    if (!roomId || !playerId) return;

    sendMessage({
      type: "PLAY_AGAIN",
      payload: {
        roomCode: roomId,
        playerId,
      },
    });
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      localStorage.setItem("playerName", nameInput.trim());
      setShowNameDialog(false);
      window.location.reload();
    } else {
      toast.error("Please enter a valid name");
    }
  };

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
      <Dialog open={showNameDialog} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Enter Your Name</DialogTitle>
            <DialogDescription>
              Please enter your name to continue playing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Your Name</Label>
              <Input
                id="player-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNameSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {revealedCardsAnimation?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative">
            <div className="relative w-[600px] h-[400px]">
              {revealedCardsAnimation.cards.map((card, index) => {
                const totalCards = revealedCardsAnimation.cards.length;
                const centerX = 300;
                const centerY = 200;

                const startX = centerX + (Math.random() - 0.5) * 40;
                const startY = centerY + (Math.random() - 0.5) * 40;

                const spreadWidth = Math.min(totalCards * 30, 400);
                const cardSpacing = spreadWidth / totalCards;
                const endX = centerX - spreadWidth / 2 + index * cardSpacing;
                const endY = 350;

                const getCardSymbol = (suit: GameCard["suit"]) => {
                  switch (suit) {
                    case "hearts":
                      return "♥";
                    case "diamonds":
                      return "♦";
                    case "clubs":
                      return "♣";
                    case "spades":
                      return "♠";
                    case "joker":
                      return "🃏";
                  }
                };

                const getCardColor = (suit: GameCard["suit"]) => {
                  if (suit === "joker") return "text-purple-600";
                  return suit === "hearts" || suit === "diamonds"
                    ? "text-red-600"
                    : "text-black";
                };

                return (
                  <motion.div
                    key={`reveal-${card.id}-${index}`}
                    initial={{
                      x: startX,
                      y: startY,
                      rotateY: 180,
                      scale: 0.8,
                      opacity: 0,
                    }}
                    animate={{
                      x: endX,
                      y: endY,
                      rotateY: 0,
                      scale: 1,
                      opacity: 1,
                    }}
                    transition={{
                      duration: 0.8,
                      delay: index * 0.1,
                      ease: "easeOut",
                    }}
                    className="absolute w-24 h-36"
                    style={{
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div className="w-full h-full bg-white rounded-lg border-2 border-gray-400 shadow-2xl p-2 relative">
                      <div className="absolute top-1 left-2 flex flex-col items-center leading-none">
                        <div
                          className={`text-lg font-bold ${getCardColor(card.suit)}`}
                        >
                          {card.rank}
                        </div>
                        <div className={`text-2xl ${getCardColor(card.suit)}`}>
                          {getCardSymbol(card.suit)}
                        </div>
                      </div>

                      <div
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl ${getCardColor(card.suit)}`}
                      >
                        {getCardSymbol(card.suit)}
                      </div>

                      <div className="absolute bottom-1 right-2 flex flex-col items-center leading-none rotate-180">
                        <div
                          className={`text-lg font-bold ${getCardColor(card.suit)}`}
                        >
                          {card.rank}
                        </div>
                        <div className={`text-2xl ${getCardColor(card.suit)}`}>
                          {getCardSymbol(card.suit)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {playingCardsAnimation?.show && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="relative w-full h-full">
            {playingCardsAnimation.cards.map((card, index) => {
              const totalCards = playingCardsAnimation.cards.length;

              // Start from bottom of screen (player's hand position)
              const startX =
                window.innerWidth / 2 + (index - totalCards / 2) * 40;
              const startY = window.innerHeight - 150;

              // End at center (pile position)
              const endX = window.innerWidth / 2;
              const endY = window.innerHeight / 2 - 50;

              const rotation = Math.sin(index) * 15 - 7.5;

              return (
                <motion.div
                  key={`play-${card.id}-${index}`}
                  initial={{
                    x: startX,
                    y: startY,
                    scale: 1,
                    opacity: 1,
                    rotate: 0,
                  }}
                  animate={{
                    x: endX,
                    y: endY,
                    scale: 0.8,
                    opacity: 0.8,
                    rotate: rotation,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.08,
                    ease: "easeInOut",
                  }}
                  className="absolute w-20 h-28"
                >
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg border-2 border-purple-300 shadow-2xl flex items-center justify-center">
                    <div className="text-white font-bold text-4xl opacity-70">
                      ?
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🃏 Tekthib</h1>
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
          <div className="lg:col-span-3 space-y-6">
            <GameBoard
              lastPlay={lastPlay}
              pileCount={gameState.pileCount}
              currentPlayer={players.find((p) => p.isCurrentTurn)?.name || ""}
              canChallenge={canChallenge}
              onChallenge={handleChallenge}
              removedCards={gameState.removedCards || []}
              isMyTurn={isMyTurn}
              selectedCards={selectedCards}
              onPlayCards={handlePlayCards}
              onCardSelect={handleCardSelect}
              playerCards={playerHand}
              autoPlayTimeout={autoPlayTimeout}
            />

            {roomId && playerId && (
              <VoiceChat players={playersForVoice} localPlayerId={playerId} />
            )}

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

          <div className="space-y-4">
            {playerId && playerName && (
              <ChatBox
                playerName={playerName}
                playerId={playerId}
                systemMessages={systemMessages}
              />
            )}
            <PlayerList players={players} currentPlayerId={playerId} />
          </div>
        </div>
      </div>
      <EndGameDialog
        open={gameEndedDialog.open}
        winners={gameEndedDialog.winners}
        loser={gameEndedDialog.loser}
        playerStats={gameEndedDialog.playerStats}
        gameState={gameState}
        currentPlayerId={playerId}
        onClose={() => setGameEndedDialog({ ...gameEndedDialog, open: false })}
        handlePlayAgain={handlePlayAgain}
      />
    </div>
  );

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
