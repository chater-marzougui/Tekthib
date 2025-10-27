import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useVoiceChatContext } from "@/context/WebRTCContext";
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
import { RenderUnknownCard } from "@/components/game/RenderUnknownCard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import QuickRules from "@/components/game/QuickRules";
import { getToastMessage } from "@/lib/utils";
import PlayerNameDialog from "@/components/room/PlayerNameDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useHeader } from "@/hooks/useHeader";
import { useSound } from "@/hooks/useSound";
import {
  SOUNDS,
  WIN_SOUNDS,
  LOSE_SOUNDS,
  WIN_ROUND_SOUNDS,
  LOSE_ROUND_SOUNDS,
} from "@/lib/sounds";
import { Badge } from "@/components/ui/badge";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const {
    sendMessage,
    registerHandler,
    isConnected,
    autoPlayTimeout: wsAutoPlayTimeout,
  } = useWebSocketContext();
  const { disableVoiceChat } = useVoiceChatContext();
  const { setHeaderConfig } = useHeader();
  const { playSound, playRandomSound } = useSound();

  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [playerHand, setPlayerHand] = useState<DisplayGameCard[]>([]);
  const [gameState, setGameState] = useState<ServerGameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [challengeSuspenseEnabled, setChallengeSuspenseEnabled] =
    useState(true);
  const [pilePosition, setPilePosition] = useState({ x: 0, y: 0 });
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 });
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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
    fromPlayerId?: string;
  } | null>(null);
  const [takingCardsAnimation, setTakingCardsAnimation] = useState<{
    show: boolean;
    cardCount: number;
    toPlayerId?: string;
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
      setError(t("game.sessionExpired"));
      setIsLoading(false);
    }
  }, [isConnected, roomId, playerId, sendMessage, t]);

  useEffect(() => {
    if (!isConnected) return;
    const unregisterInitialState = registerHandler(
      "initial-game-state",
      (message) => {
        if (message.type === "INITIAL_GAME_STATE") {
          const { hand, gameState: initialGameState, room } = message.payload;
          if ((initialGameState || hand) && isLoading) setIsLoading(false);

          // Set challenge suspense enabled from room settings
          if (room && room.challengeSuspenseEnabled !== undefined) {
            setChallengeSuspenseEnabled(room.challengeSuspenseEnabled);
          } else {
            setChallengeSuspenseEnabled(true);
          }

          if (initialGameState) {
            setIsLoading(false);
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
                !isLastPlayer && !isWinner && initialGameState.pileCount > 0
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
        toast.info(t("game.gameNotStarted"));
        navigate(`/room/${roomId}`);
      }
    });

    const unregisterGameStateUpdate = registerHandler(
      "game-state-update",
      (message) => {
        if (message.type === "GAME_STATE_UPDATE") {
          const { hand, gameState: newGameState } = message.payload;
          if (isLoading && (hand || newGameState)) setIsLoading(false);

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
          playerId: playedPlayerId,
          playerName: pName,
          cardCount,
          claimedRank,
          gameState: newGameState,
          wasAutoPlayed,
        } = message.payload;

        setLastPlay({
          player: pName,
          cardCount,
          claimedRank,
        });

        // Show notification if it was an auto-play
        if (wasAutoPlayed) {
          toast.info(
            t("game.autoPlayed", {
              pName,
              cardCount,
              claimedRank,
            }) || `${pName} timed out - ${cardCount} cards were auto-played`
          );
        }

        // Trigger animation for other players (not current player, as they have their own animation)
        if (playedPlayerId && playedPlayerId !== playerId) {
          const dummyCards: GameCard[] = Array.from(
            { length: cardCount },
            (_, i) => ({
              id: `dummy-${Date.now()}-${i}`,
              suit: "hearts" as const,
              rank: "2" as const,
              deckNumber: 1 as const,
            })
          );

          setPlayingCardsAnimation({
            show: true,
            cards: dummyCards,
            fromPlayerId: playedPlayerId,
          });

          setTimeout(() => {
            setPlayingCardsAnimation(null);
          }, 1200);
        }

        if (newGameState) {
          setGameState(newGameState);
          setIsMyTurn(newGameState.currentPlayerId === playerId);
          const isWinner = newGameState.winners.includes(playerId);
          setCanChallenge(playedPlayerId !== playerId && !isWinner);
        }
      }
    });

    const unregisterChallengeSubmitted = registerHandler(
      "challenge-submitted",
      (message) => {
        if (message.type !== "CHALLENGE_SUBMITTED") {
          return;
        }

        // Play suspense drums sound immediately when challenge is submitted
        // Only if the setting is enabled
        if (challengeSuspenseEnabled) {
          playSound(SOUNDS.CHALLENGE_SUSPENSE_DRUMS);
        }
      }
    );

    const unregisterChallengeResult = registerHandler(
      "challenge-result",
      (message) => {
        if (message.type !== "CHALLENGE_RESULT") {
          return;
        }
        const {
          challengerId,
          challengerName,
          wasLying,
          playerId: lastPlayerId,
          playerName: lastPlayerName,
          gameState: newGameState,
          revealedCards,
        } = message.payload;

        const result = getToastMessage(
          wasLying,
          playerName,
          challengerName,
          lastPlayerName,
          revealedCards?.length || 0
        );

        const toastColor = result.color;
        const resultMessage = result.message;
        const resultDescription = result.description;

        // Play challenge result sound (70% probability)
        // If I won the challenge, play win sound; if I lost, play lose sound
        const iWon =
          (wasLying && challengerId === playerId) ||
          (!wasLying && lastPlayerId === playerId);
        const iLost =
          (wasLying && lastPlayerId === playerId) ||
          (!wasLying && challengerId === playerId);

        if (iWon) {
          playRandomSound(WIN_ROUND_SOUNDS, { probability: 0.7 });
        } else if (iLost) {
          playRandomSound(LOSE_ROUND_SOUNDS, { probability: 0.7 });
        }

        // Check user settings for showing challenge toasts
        const showChallengeToasts =
          localStorage.getItem("showChallengeToasts") !== "false";

        if (showChallengeToasts) {
          if (toastColor === "red") {
            toast.error(resultMessage, { description: resultDescription });
          } else if (toastColor === "green") {
            toast.success(resultMessage, { description: resultDescription });
          } else {
            toast.info(resultMessage, { description: resultDescription });
          }
        }

        const shouldShowCardReveal =
          (wasLying && lastPlayerName === playerName) ||
          (!wasLying && challengerName === playerName);

        if (shouldShowCardReveal && revealedCards && revealedCards.length > 0) {
          setRevealedCardsAnimation({ show: true, cards: revealedCards });

          setTimeout(() => {
            setRevealedCardsAnimation(null);
          }, 2500);
        }

        // Trigger animation for cards being taken from pile
        // The loser takes the pile - use the number of revealed cards as an approximation
        const loserPlayerId = wasLying ? lastPlayerId : challengerId;
        const cardsToTake = revealedCards?.length || 1;
        if (loserPlayerId) {
          setTakingCardsAnimation({
            show: true,
            cardCount: cardsToTake,
            toPlayerId: loserPlayerId,
          });

          setTimeout(() => {
            setTakingCardsAnimation(null);
          }, 1500);
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
    );

    const unregisterGameEnded = registerHandler("game-ended", (message) => {
      if (message.type !== "GAME_ENDED") {
        return;
      }
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

      // Play game end sound (70% probability)
      // If I won, play win sound; if I lost, play lose sound
      if (winners.includes(playerId)) {
        playRandomSound(WIN_SOUNDS, { probability: 0.7 });
      } else if (loser === playerId) {
        playRandomSound(LOSE_SOUNDS, { probability: 0.7 });
      }

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
          toast.error(t("errors.roomNotFound"));
          navigate("/");
          return;
        }

        // If player not in room, redirect to room page if it exists
        if (errorMessage === "Player not in room") {
          toast.error(t("errors.notInGame"));
          navigate("/");
          return;
        }

        setError(errorMessage);
        setTimeout(() => setError(null), 3000);
      }
    });

    const unregisterGameReset = registerHandler("game-reset", (message) => {
      if (message.type === "GAME_RESET") {
        toast.success(t("game.gameReset"));
        navigate(`/room/${roomId}`);
      }
    });

    return () => {
      unregisterInitialState();
      unregisterRoomJoined();
      unregisterGameStateUpdate();
      unregisterCardsPlayed();
      unregisterChallengeSubmitted();
      unregisterChallengeResult();
      unregisterGameEnded();
      unregisterError();
      unregisterGameReset();
    };
  }, [
    registerHandler,
    navigate,
    playerId,
    playerName,
    lastPlay,
    roomId,
    isConnected,
    challengeSuspenseEnabled,
    playSound,
  ]);

  useEffect(() => {
    if (!gameState) return;
    if (isLoading) setIsLoading(false);

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
        label: t("game.leaveGame"),
        onClick: () =>
          isLoading ? handleLeaveGame() : setShowLeaveDialog(true),
        variant: "destructive",
        color: "default",
      },
      middleElement: lastPlay && (
        <div className="flex items-center gap-1.5">
          {lastPlay.cardCount}×
          <Badge
            variant={isMyTurn ? "destructive" : "default"}
            className="text-base sm:text-md font-bold px-3 py-1"
          >
            {lastPlay.claimedRank}
          </Badge>
        </div>
      ),
      showNameInMobile: false,
    });
    return () => {
      setHeaderConfig({
        actionButton: undefined,
      });
    };
  }, [t, isLoading, lastPlay]);

  useEffect(() => {
    const updatePositions = () => {
      // Find the center pile element - you'll need to add an id to CenterPile component
      const pileEl = document.querySelector(".center-pile-container"); // or use an ID
      // Find the player hand element - you'll need to add an id to the hand section
      const handEl = document.querySelector(".player-hand-container"); // or use an ID

      if (pileEl) {
        const rect = pileEl.getBoundingClientRect();
        setPilePosition({
          x: (rect.left + rect.right) / 2 - 20, // slight offset to the left
          y: (rect.top + rect.bottom) / 2 + 30, // slight offset downwards
        });
      }

      if (handEl) {
        const rect = handEl.getBoundingClientRect();
        setHandPosition({
          x: (rect.left + rect.right) / 2,
          y: (rect.top + rect.bottom) / 2,
        });
      }
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    setTimeout(updatePositions, 100);

    return () => window.removeEventListener("resize", updatePositions);
  }, [lastPlay]);

  const handleCardSelect = (cardId: string) => {
    // Play card select sound (100% probability)
    playSound(SOUNDS.CARD_SELECT);

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
    setPlayingCardsAnimation({
      show: true,
      cards: cardsBeingPlayed,
      fromPlayerId: playerId, // Current player
    });

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
    // Play challenge button sound (100% probability)
    playSound(SOUNDS.CHALLENGE_BUTTON_CLICKED);

    sendMessage({
      type: "CHALLENGE",
      payload: {
        challengerId: playerId,
      },
    });
  };

  const handleLeaveGame = () => {
    disableVoiceChat();
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
      toast.error(t("game.pleaseEnterValidName"));
    }
  };

  if (isLoading || !gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner isConnected={isConnected} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Confirm leave dialog */}
      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        onConfirm={handleLeaveGame}
        title={t("confirmDialog.leaveGameTitle")}
        description={t("confirmDialog.leaveGameDescription")}
        confirmText={t("confirmDialog.leave")}
        cancelText={t("confirmDialog.cancel")}
        variant="destructive"
      />

      <PlayerNameDialog
        nameInput={nameInput}
        setNameInput={setNameInput}
        showNameDialog={showNameDialog}
        handleNameSubmit={handleNameSubmit}
      />

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

      {playingCardsAnimation?.show && pilePosition.x > 1 && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {playingCardsAnimation.cards.map((card, index) => {
            const totalCards = playingCardsAnimation.cards.length;
            const cardWidth = 80;

            // Get start position based on who is playing
            let startX, startY;
            const fromPlayerId = playingCardsAnimation.fromPlayerId;

            if (fromPlayerId && fromPlayerId !== playerId) {
              // Animation from another player's avatar
              const playerAvatarEl = document.querySelector(
                `[data-player-id="${fromPlayerId}"]`
              );
              if (playerAvatarEl) {
                const rect = playerAvatarEl.getBoundingClientRect();
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
              } else {
                // Fallback to center if player not found
                startX = pilePosition.x;
                startY = pilePosition.y - 100;
              }
            } else {
              // Animation from current player's hand
              if (handPosition.x === 0) return null;
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
              startX = handStartX;
              startY = handPosition.y;
            }

            const stackOffset = 2;
            const endX =
              pilePosition.x + (index - totalCards / 2) * stackOffset;
            const endY = pilePosition.y * 0.75 + index * stackOffset;

            const rotation =
              (index - totalCards / 2) * 3 + (Math.random() - 0.5) * 5;

            const baseDuration = 0.6;
            const duration = Math.min(baseDuration, 0.4 + totalCards * 0.02);
            const getBaseDelay = () => {
              if (totalCards <= 4) return 0.09;
              if (totalCards <= 8) return 0.07;
              return 0.05;
            };
            const baseDelay = getBaseDelay();
            const delay = index * baseDelay;

            return (
              <motion.div
                key={`play-${card.id}-${index}`}
                initial={{
                  x: startX,
                  y: startY,
                  scale: 1,
                  opacity: 0.8,
                  rotate: 0,
                }}
                animate={{
                  x: endX,
                  y: endY,
                  scale: 0.8,
                  opacity: 0.1,
                  rotate: rotation,
                }}
                transition={{ duration, delay, ease: "easeInOut" }}
                className="absolute w-12 h-20"
                style={{ left: 0, top: 0 }}
              >
                {RenderUnknownCard("default")}
              </motion.div>
            );
          })}
        </div>
      )}

      {takingCardsAnimation?.show && pilePosition.x > 0 && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {Array.from({
            length: Math.min(takingCardsAnimation.cardCount, 10),
          }).map((_, index) => {
            const totalCards = takingCardsAnimation.cardCount;
            const toPlayerId = takingCardsAnimation.toPlayerId;

            // Get end position based on who is taking cards
            let endX, endY;
            if (toPlayerId && toPlayerId !== playerId) {
              // Animation to another player's avatar
              const playerAvatarEl = document.querySelector(
                `[data-player-id="${toPlayerId}"]`
              );
              if (playerAvatarEl) {
                const rect = playerAvatarEl.getBoundingClientRect();
                endX = (rect.left + rect.right) / 2;
                endY = (rect.top + rect.bottom) / 2;
              } else {
                // Fallback if player not found
                return null;
              }
            } else {
              // Animation to current player's hand
              if (handPosition.x === 0) return null;
              endX = handPosition.x;
              endY = handPosition.y;
            }

            const stackOffset = 2;

            const startX =
              pilePosition.x + (index - totalCards / 2) * stackOffset;
            const startY = pilePosition.y * 0.7 + index * stackOffset;

            const rotation = (index - 5) * 3 + (Math.random() - 0.5) * 5;

            const duration = 0.7;
            const delay = index * 0.05;

            return (
              <motion.div
                key={`take-${index + 1}`}
                initial={{
                  x: startX,
                  y: startY,
                  scale: 0.8,
                  opacity: 0.8,
                  rotate: rotation,
                }}
                animate={{
                  x: endX,
                  y: endY,
                  scale: 0.5,
                  opacity: 0.3,
                  rotate: rotation + 180,
                }}
                transition={{ duration, delay, ease: "easeInOut" }}
                className="absolute w-12 h-20"
                style={{ left: 0, top: 0 }}
              >
                {RenderUnknownCard("destructive")}
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
              const getBaseDelay = () => {
                if (totalCards <= 5) return 0.1;
                if (totalCards <= 10) return 0.08;
                return 0.05;
              };
              const baseDelay = getBaseDelay();
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

        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row gap-6">
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
              autoPlayTimeout={wsAutoPlayTimeout ?? 45}
              serverTimer={gameState.remainingTime}
              players={players}
              currentPlayerId={playerId}
            />

            <div className="gap-4 flex flex-row flex-wrap w-full lg:flex-col lg:w-84">
              {playerId && playerName && (
                <ChatBox
                  playerName={playerName}
                  playerId={playerId}
                  systemMessages={systemMessages}
                  players={players}
                />
              )}
              <PlayerList players={players} currentPlayerId={playerId} />
            </div>
          </div>

          <div className="flex gap-4 flex-wrap w-full">
            <QuickRules />

            {roomId && playerId && (
              <VoiceChat players={players} localPlayerId={playerId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
