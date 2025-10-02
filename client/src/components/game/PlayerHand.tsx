import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RenderHand from "./RenderCard";

interface GameCard {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades" | "joker";
  rank: string;
  selected: boolean;
}

interface PlayerHandProps {
  cards: GameCard[];
  onCardSelect: (cardId: string) => void;
  onPlayCards: (selectedCards: string[], claimedRank: string) => void;
  isMyTurn: boolean;
  lastPlay?: { player: string; cardCount: number; claimedRank: string } | null;
  selectedCards: string[];
}
interface PlayerHandProps {
  cards: GameCard[];
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

  const handlePlayCards = () => {
    if (selectedCards.length > 0 && (claimedRank || lastPlay)) {
      onPlayCards(selectedCards, lastPlay ? lastPlay.claimedRank : claimedRank);
      setClaimedRank("");
    }
  };

  const selectableRanks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  const rankOrder = [...selectableRanks, "Joker"];
  const sortedCards = [...cards].sort((a, b) => {
    const aIndex = rankOrder.indexOf(a.rank);
    const bIndex = rankOrder.indexOf(b.rank);
    return aIndex - bIndex;
  });

  if (!cards || cards.length === 0) return null;

  // Calculate number of hands needed
  const numberOfHands = Math.ceil(sortedCards.length / 14);

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
                      Your turn
                    </span>
                  ) : (
                    "Waiting..."
                  )}
                </p>
              </div>
            </div>

            {lastPlay && (
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
                  RenderHand(
                    sortedCards,
                    handIndex * 14,
                    isMyTurn,
                    onCardSelect,
                    selectedCards
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
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-4">
              {!lastPlay && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Claim this rank:
                  </label>
                  <div className="grid grid-cols-13 gap-2">
                    {selectableRanks.map((rank) => (
                      <button
                        key={rank}
                        onClick={() => setClaimedRank(rank)}
                        className={`
                          relative py-3 px-2 rounded-lg font-bold text-lg transition-all duration-200
                          ${
                            claimedRank === rank
                              ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105"
                              : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-105"
                          }
                        `}
                      >
                        {claimedRank === rank && (
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-50" />
                        )}
                        <span className="relative">{rank}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">Selected cards</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedCards.length}{" "}
                    <span className="text-lg text-slate-400">
                      card{selectedCards.length !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>

                <Button
                  onClick={handlePlayCards}
                  disabled={
                    selectedCards.length === 0 || (!lastPlay && !claimedRank)
                  }
                  size="lg"
                  className={`
                    relative overflow-hidden px-8 py-6 text-lg font-bold rounded-xl
                    transition-all duration-300
                    ${
                      selectedCards.length > 0 && (claimedRank || lastPlay)
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50 hover:scale-105"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }
                  `}
                >
                  {selectedCards.length > 0 && (claimedRank || lastPlay) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-white/20 to-green-400/0" />
                  )}
                  <span className="relative flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
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

// Demo component to show the cards in action
function Demo() {
  const [cards, setCards] = useState<GameCard[]>([
    { id: "1", suit: "spades", rank: "A", selected: false },
    { id: "2", suit: "hearts", rank: "2", selected: false },
    { id: "3", suit: "clubs", rank: "3", selected: false },
    { id: "4", suit: "diamonds", rank: "4", selected: false },
    { id: "5", suit: "hearts", rank: "5", selected: false },
    { id: "6", suit: "clubs", rank: "5", selected: false },
    { id: "7", suit: "spades", rank: "7", selected: false },
    { id: "8", suit: "diamonds", rank: "8", selected: false },
    { id: "9", suit: "hearts", rank: "9", selected: false },
    { id: "10", suit: "clubs", rank: "10", selected: false },
    { id: "11", suit: "spades", rank: "J", selected: false },
    { id: "12", suit: "diamonds", rank: "Q", selected: false },
    { id: "13", suit: "hearts", rank: "K", selected: false },
    { id: "14", suit: "clubs", rank: "A", selected: false },
    { id: "15", suit: "diamonds", rank: "2", selected: false },
  ]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isMyTurn] = useState(true);

  const handleCardSelect = (cardId: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handlePlayCards = (selected: string[], rank: string) => {
    console.log("Playing cards:", selected, "as rank:", rank);
    setCards((prev) => prev.filter((c) => !selected.includes(c.id)));
    setSelectedCards([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <PlayerHand
        cards={cards}
        onCardSelect={handleCardSelect}
        onPlayCards={handlePlayCards}
        isMyTurn={isMyTurn}
        lastPlay={null}
        selectedCards={selectedCards}
      />
    </div>
  );
}
