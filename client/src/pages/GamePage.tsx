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
import { RenderCard } from "@/components/game/RenderCard";
import { useHeader } from "@/context/HeaderContext";

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
  const { setHeaderConfig } = useHeader();

  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [playerHand, setPlayerHand] = useState<DisplayGameCard[]>([]);
  const [gameState, setGameState] = useState<ServerGameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [autoPlayTimeout, setAutoPlayTimeout] = useState(45);
  const [pilePosition, setPilePosition] = useState({ x: 0, y: 0 });
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 });

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
            setAutoPlayTimeout(room.autoPlayTimeout);
          } else {
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
            resultDescription =
              "Learn to play! and Try to be more honest next time.";
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
        if (
          errorCode === "ROOM_NOT_FOUND" ||
          errorMessage === "Room not found"
        ) {
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

  useEffect(() => {
    setHeaderConfig({
      actionButton: {
        label: "Leave Game",
        onClick: () => handleLeaveGame(),
        variant: "destructive",
        color: "default",
      },
    });
    return () => {
      setHeaderConfig({
        actionButton: undefined,
      });
    };
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      // Find the center pile element - you'll need to add an id to CenterPile component
      const pileEl = document.querySelector(".center-pile-container"); // or use an ID
      // Find the player hand element - you'll need to add an id to the hand section
      const handEl = document.querySelector(".player-hand-container"); // or use an ID

      if (pileEl) {
        const rect = pileEl.getBoundingClientRect();
        setPilePosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }

      if (handEl) {
        const rect = handEl.getBoundingClientRect();
        setHandPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    setTimeout(updatePositions, 100);

    return () => window.removeEventListener("resize", updatePositions);
  }, []);

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
      {playingCardsAnimation?.show &&
        pilePosition.x > 0 &&
        handPosition.x > 0 && (
          <div className="fixed inset-0 z-40 pointer-events-none">
            {playingCardsAnimation.cards.map((card, index) => {
              const totalCards = playingCardsAnimation.cards.length;
              const cardWidth = 80;

              const maxHandSpread = window.innerWidth * 0.6;
              const idealSpacing = 20;
              const totalIdealWidth =
                totalCards * cardWidth + (totalCards - 1) * idealSpacing;
              const handSpread = Math.min(totalIdealWidth, maxHandSpread);
              const cardSpacing = (handSpread - cardWidth) / (totalCards - 1);

              const handStartX =
                handPosition.x -
                handSpread / 2 +
                cardWidth / 2 +
                index * cardSpacing;
              const startX = handStartX;
              const startY = handPosition.y;

              const stackOffset = 2;
              const endX =
                pilePosition.x + (index - totalCards / 2) * stackOffset;
              const endY = pilePosition.y + index * stackOffset;

              const rotation =
                (index - totalCards / 2) * 3 + (Math.random() - 0.5) * 5;

              const baseDuration = 0.6;
              const duration = Math.min(baseDuration, 0.4 + totalCards * 0.02);
              const baseDelay =
                totalCards > 8 ? 0.05 : totalCards > 4 ? 0.07 : 0.08;
              const delay = index * baseDelay;

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
                  transition={{ duration, delay, ease: "easeInOut" }}
                  className="absolute w-20 h-28"
                  style={{ left: 0, top: 0 }}
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
        )}

      {revealedCardsAnimation?.show &&
        pilePosition.x > 0 &&
        handPosition.x > 0 && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {revealedCardsAnimation.cards.map((card, index) => {
              const totalCards = revealedCardsAnimation.cards.length;
              const cardWidth = 96;

              const startX = pilePosition.x + (Math.random() - 0.5) * 40;
              const startY = pilePosition.y + (Math.random() - 0.5) * 40;

              const maxSpreadWidth = Math.min(window.innerWidth * 0.8, 600);
              const totalIdealWidth = totalCards * cardWidth;
              const spreadWidth = Math.min(totalIdealWidth, maxSpreadWidth);
              const cardSpacing =
                (spreadWidth - cardWidth) / Math.max(totalCards - 1, 1);

              const handStartX =
                handPosition.x - spreadWidth / 2 + cardWidth / 2;
              const endX = handStartX + index * cardSpacing;
              const endY = handPosition.y;

              const baseDuration = 0.6;
              const duration = Math.max(
                0.4,
                Math.min(baseDuration, totalCards * 0.08)
              );
              const baseDelay =
                totalCards > 10 ? 0.05 : totalCards > 5 ? 0.08 : 0.1;
              const delay = index * baseDelay;

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
                  transition={{ duration, delay, ease: "easeOut" }}
                  className="absolute w-24 h-36"
                  style={{ transformStyle: "preserve-3d", left: 0, top: 0 }}
                >
                  {RenderCard(card, false, () => {}, false, 1, "medium")}
                </motion.div>
              );
            })}
          </div>
        )}

      <div className="max-w-7xl mx-auto space-y-2">
        <div className="flex justify-between items-center">
          <div>
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
            {!isConnected && (
              <p className="text-yellow-600 text-sm mt-1">
                Connecting to server...
              </p>
            )}
          </div>
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
