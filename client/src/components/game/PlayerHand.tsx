import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RenderOneHand from "./RenderCard";
import {
  RankTypes,
  playableRanks,
  type Rank,
  type DisplayGameCard,
} from "shared";

interface PlayerHandProps {
  cards: DisplayGameCard[];
  onCardSelect: (cardId: string) => void;
  onPlayCards: (selectedCards: string[], claimedRank: string) => void;
  isMyTurn: boolean;
  lastPlay?: { player: string; cardCount: number; claimedRank: string } | null;
  selectedCards: string[];
}
interface PlayerHandProps {
  cards: DisplayGameCard[];
  onCardSelect: (cardId: string) => void;
  onPlayCards: (selectedCards: string[], claimedRank: string) => void;
  isMyTurn: boolean;
  lastPlay?: { player: string; cardCount: number; claimedRank: string } | null;
  selectedCards: string[];
}

export default function PlayerHand({
  cards,
  onCardSelect,
  onPlayCards,
  isMyTurn,
  lastPlay,
  selectedCards,
}: Readonly<PlayerHandProps>) {
  const [claimedRank, setClaimedRank] = useState(
    lastPlay ? lastPlay.claimedRank : ""
  );
  const [timer, setTimer] = useState(1500);

  // Timer effect for auto-play
  useEffect(() => {
    if (!isMyTurn) {
      setTimer(1500); // Reset timer when it's not player's turn
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Time's up - auto-play random cards
          const numCards = Math.floor(Math.random() * 4) + 1; // 1-4 cards
          const availableCards = cards.slice(
            0,
            Math.min(numCards, cards.length)
          );
          const autoSelectedCards = availableCards.map((c) => c.id);

          // Determine the rank to claim
          const rankToClaim = lastPlay
            ? lastPlay.claimedRank
            : playableRanks[Math.floor(Math.random() * playableRanks.length)];

          onPlayCards(autoSelectedCards, rankToClaim);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, cards, lastPlay, onPlayCards]);

  const handlePlayCards = () => {
    if (selectedCards.length > 0 && (claimedRank || lastPlay)) {
      onPlayCards(selectedCards, lastPlay ? lastPlay.claimedRank : claimedRank);
      setClaimedRank("");
    }
  };

  const sortedCards = [...cards].sort((a, b) => {
    const aIndex = RankTypes.indexOf(a.rank as Rank);
    const bIndex = RankTypes.indexOf(b.rank as Rank);
    return aIndex - bIndex;
  });

  if (!cards || cards.length === 0) return null;

  // Calculate number of hands needed
  const maxCardsPerHand = Math.floor(window.innerWidth / 35);
  const numberOfHands = Math.ceil(sortedCards.length / maxCardsPerHand);

  return (
    <div className="relative">
      {/* Glowing background effect when it's player's turn */}
      {isMyTurn && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-3xl" />
      )}

      <Card className="relative bg-card shadow-2xl">
        <CardContent className="p-6 space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50" />
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                  {cards.length}
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
                  ) : (
                    "Waiting..."
                  )}
                </p>
              </div>
            </div>

            {/* Timer display when it's player's turn */}
            {isMyTurn && (
              <div className={`relative ${timer <= 5 ? "animate-pulse" : ""}`}>
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

          {/* Cards Display */}
          {cards.length > 0 ? (
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
          ) : (
            <div className="text-slate-400 py-16 text-center">
              <div className="text-6xl mb-4 opacity-20">🃏</div>
              <p className="text-lg">No cards in hand</p>
            </div>
          )}

          {/* Play Controls */}
          {isMyTurn && cards.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
