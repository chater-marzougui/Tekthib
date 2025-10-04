import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { DisplayGameCard, playableRanks, RankTypes } from "@shared";
import RenderOneHand from "./RenderCard";
import type { Card as GameCard } from "shared";

interface LastPlay {
  player: string;
  cardCount: number;
  claimedRank: string;
}

interface MergedGameBoardProps {
  lastPlay: LastPlay | null;
  currentPlayer: string;
  pileCount: number;
  canChallenge: boolean;
  onChallenge: () => void;
  removedCards: GameCard[];
  playerCards: DisplayGameCard[];
  onCardSelect: (cardId: string) => void;
  onPlayCards: (selectedCards: string[], claimedRank: string) => void;
  isMyTurn: boolean;
  selectedCards: string[];
}

export default function GameBoard({
  lastPlay,
  currentPlayer,
  pileCount,
  canChallenge,
  onChallenge,
  removedCards,
  playerCards,
  onCardSelect,
  onPlayCards,
  isMyTurn,
  selectedCards,
}: Readonly<MergedGameBoardProps>) {
  const [claimedRank, setClaimedRank] = useState(
    lastPlay ? lastPlay.claimedRank : ""
  );
  const autoPlayTimeout = 45; // seconds
  const [timer, setTimer] = useState(autoPlayTimeout);

  // Timer effect for auto-play
  useEffect(() => {
    if (!isMyTurn) {
      setTimer(autoPlayTimeout); // Reset timer when it's not player's turn
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Time's up - auto-play random cards
          const numCards = Math.floor(Math.random() * 4) + 1; // 1-4 cards
          const availableCards = playerCards.slice(
            0,
            Math.min(numCards, playerCards.length)
          );
          const autoSelectedCards = availableCards.map((c) => c.id);

          // Determine the rank to claim
          const rankToClaim = lastPlay
            ? lastPlay.claimedRank
            : playableRanks[Math.floor(Math.random() * playableRanks.length)];

          onPlayCards(autoSelectedCards, rankToClaim);
          return autoPlayTimeout;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, playerCards, lastPlay, onPlayCards]);

  const handlePlayCards = () => {
    if (selectedCards.length > 0 && (claimedRank || lastPlay)) {
      onPlayCards(selectedCards, lastPlay ? lastPlay.claimedRank : claimedRank);
      setClaimedRank("");
    }
  };

  const sortedCards = [...playerCards].sort((a, b) => {
    const aIndex = RankTypes.indexOf(a.rank);
    const bIndex = RankTypes.indexOf(b.rank);
    return aIndex - bIndex;
  });

  // Get unique ranks from removed cards (one card per four-of-a-kind)
  const uniqueRemovedRanks = Array.from(
    new Set(removedCards.map((card) => card.rank))
  ).map((rank) => removedCards.find((card) => card.rank === rank)!);

  // Calculate number of hands needed
  const maxCardsPerHand = Math.min(Math.floor(window.innerWidth / 35), 24);
  const numberOfHands = Math.ceil(sortedCards.length / maxCardsPerHand);

  return (
    <div className="space-y-4">
      {/* Main Game Board */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50" />
                  <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                    {playerCards.length}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Your Cards
                  </h3>
                  <p className="text-sm text-slate-400">
                    {isMyTurn ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Your turn - {timer}s
                      </span>
                    ) : currentPlayer ? (
                      `${currentPlayer}'s turn`
                    ) : (
                      "Waiting for game to start..."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer display when it's player's turn */}
              {isMyTurn && (
                <div
                  className={`relative ${timer <= 5 ? "animate-pulse" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-red-500 rounded-full blur-md opacity-50" />
                  <div
                    className={`relative rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl shadow-lg ${
                      timer <= 5
                        ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                        : "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
                    }`}
                  >
                    {timer}
                  </div>
                </div>
              )}

              {lastPlay && !isMyTurn && (
                <div className="bg-foreground backdrop-blur-sm border border-slate-600 rounded-lg px-4 py-2">
                  <p className="text-xs text-slate-400">Current claim</p>
                  <p className="text-2xl font-bold text-white">
                    {lastPlay.claimedRank}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lastPlay.cardCount} cards
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lastPlay ? (
            <div className="text-center space-y-4">
              <div className="text-lg">
                <span className="font-semibold">{lastPlay.player}</span> played{" "}
                <span className="font-bold text-blue-600">
                  {lastPlay.cardCount} ({lastPlay.claimedRank}
                  {lastPlay.cardCount > 1 ? "s" : ""})
                </span>
              </div>

              <div className="flex justify-center items-start gap-8">
                {/* Center pile */}
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-600 mb-2 text-center">
                    Center Pile
                  </p>
                  <div className="relative h-36 w-28">
                    <AnimatePresence>
                      {Array.from({ length: Math.min(pileCount, 6) }).map(
                        (_, i) => {
                          const rotation = Math.sin(i) * 15 - 7.5;
                          const offsetX = Math.cos(i * 1.5) * 8;

                          return (
                            <motion.div
                              key={`pile-card-${i}`}
                              initial={{
                                opacity: 0,
                                scale: 0.5,
                                y: -100,
                                rotate: 0,
                              }}
                              animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                rotate: rotation,
                              }}
                              exit={{
                                opacity: 0,
                                scale: 0.5,
                                y: 100,
                              }}
                              transition={{
                                duration: 0.5,
                                delay: i * 0.05,
                                type: "spring",
                                stiffness: 200,
                              }}
                              className="absolute w-20 h-28 bg-white rounded-lg border-2 border-gray-300 shadow-xl"
                              style={{
                                top: `${i * 3}px`,
                                left: `calc(50% + ${offsetX}px)`,
                                transform: `translateX(-50%)`,
                                zIndex: i,
                                background:
                                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-white font-bold text-3xl opacity-50">
                                  ?
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                      )}
                    </AnimatePresence>
                    {pileCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-0 right-0 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20"
                      >
                        {pileCount}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Out of game pile */}
                {uniqueRemovedRanks.length > 0 && (
                  <div className="flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-600 mb-2 text-center">
                      Out of Game
                    </p>
                    <div className="relative h-36 w-28">
                      {uniqueRemovedRanks.slice(0, 6).map((card, i) => {
                        const rotation = Math.sin(i * 2) * 12 - 6;
                        const offsetX = Math.cos(i * 2) * 6;

                        return (
                          <motion.div
                            key={`removed-${card.id}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="absolute w-20 h-28 bg-white rounded-lg border-2 border-gray-400 shadow-lg flex flex-col items-center justify-center"
                            style={{
                              top: `${i * 3}px`,
                              left: `calc(50% + ${offsetX}px)`,
                              transform: `translateX(-50%) rotate(${rotation}deg)`,
                              zIndex: i,
                              color:
                                card.suit === "hearts" ||
                                card.suit === "diamonds"
                                  ? "red"
                                  : "black",
                            }}
                          >
                            <div className="font-bold text-2xl">
                              {card.rank}
                            </div>
                            <div className="text-3xl">
                              {card.suit === "hearts" && "♥"}
                              {card.suit === "diamonds" && "♦"}
                              {card.suit === "clubs" && "♣"}
                              {card.suit === "spades" && "♠"}
                              {card.suit === "joker" && "🃏"}
                            </div>
                          </motion.div>
                        );
                      })}
                      {uniqueRemovedRanks.length > 1 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20"
                        >
                          {uniqueRemovedRanks.length}
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Challenge button */}
              {canChallenge && (
                <div className="space-y-0">
                  <Button
                    onClick={onChallenge}
                    variant="destructive"
                    size="lg"
                    className="animate-pulse"
                  >
                    🤔 Challenge (Call Liar!)
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🃏</div>
              <div>Waiting for first play...</div>
              <div className="text-sm mt-2">
                The game will begin once someone plays their first cards
              </div>
            </div>
          )}
        </CardContent>

        {/* Play Controls */}
        {isMyTurn && playerCards.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-0 space-y-4">
            {!lastPlay && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">
                  Claim this rank:
                </label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {playableRanks.map((rank) => (
                    <button
                      key={rank}
                      onClick={() => setClaimedRank(rank)}
                      className={`
                  min-w-[40px] py-2 px-3 rounded-md font-bold text-base transition-all
                  ${
                    claimedRank === rank
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  }
                `}
                    >
                      {rank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                onClick={handlePlayCards}
                disabled={
                  selectedCards.length === 0 || (!lastPlay && !claimedRank)
                }
                size="lg"
                className={`
            px-6 py-4 text-base font-semibold rounded-lg transition-all
            ${
              selectedCards.length > 0 && (claimedRank || lastPlay)
                ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }
          `}
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  Play Cards
                </span>
              </Button>
            </div>
          </div>
        )}
        {playerCards.length > 0 && (
          <CardContent className="p-6 space-y-6 pt-0 border-t">
            {/* Header Section */}
            <div className="flex items-center justify-between"></div>
            {/* Cards Display */}
            <div className="relative py-4">
              <div className="flex flex-col items-center gap-2">
                {Array.from({ length: numberOfHands }, (_, handIndex) =>
                  RenderOneHand(
                    sortedCards,
                    handIndex * maxCardsPerHand,
                    isMyTurn,
                    onCardSelect,
                    selectedCards,
                    maxCardsPerHand
                  )
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
