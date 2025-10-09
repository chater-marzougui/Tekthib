import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DisplayGameCard, RankTypes } from "@shared";
import RenderOneHand from "./RenderCard";
import type { Card as GameCard, LastPlay } from "shared";
import WastedPile from "./board/WastedPile";
import { Badge } from "@/components/ui/badge";
import PlayerControls from "./board/PlayerControls";
import StateCard from "./board/StateCard";
import CenterPile from "./board/CenterPile";
import { HelpCircle } from "lucide-react";

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
  autoPlayTimeout: number;
  serverTimer?: number;
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
  autoPlayTimeout,
  serverTimer,
}: Readonly<MergedGameBoardProps>) {
  const [claimedRank, setClaimedRank] = useState(
    lastPlay ? lastPlay.claimedRank : ""
  );
  const [timer, setTimer] = useState(autoPlayTimeout);

  // Update timer when server sends updates
  useEffect(() => {
    if (serverTimer !== undefined) {
      setTimer(serverTimer);
    }
  }, [serverTimer]);

  const handlePlayCards = () => {
    if (selectedCards.length > 0 && (claimedRank || lastPlay)) {
      onPlayCards(selectedCards, lastPlay ? lastPlay.claimedRank : claimedRank);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setClaimedRank("");
    }
  };

  const sortedCards = [...playerCards].sort((a, b) => {
    const aIndex = RankTypes.indexOf(a.rank);
    const bIndex = RankTypes.indexOf(b.rank);
    return aIndex - bIndex;
  });

  // Calculate number of hands needed
  const maxCardsPerHand = Math.min(Math.floor(window.innerWidth / 35), 24);
  const numberOfHands = Math.ceil(sortedCards.length / maxCardsPerHand);

  return (
    <div className="space-y-4">
      {/* Main Game Board */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4 md:gap-6">
            {/* Mobile: Top row wrapper for StateCard + WastedPile */}
            <div className="flex md:hidden flex-row justify-between items-start gap-4 w-full">
              <StateCard
                isMyTurn={isMyTurn}
                currentPlayer={currentPlayer}
                timer={autoPlayTimeout >= 10 ? timer : null}
                lastPlay={lastPlay}
              />
              <WastedPile removedCards={removedCards} />
            </div>

            {/* Desktop: Left side - StateCard only */}
            <div className="hidden md:block">
              <StateCard
                isMyTurn={isMyTurn}
                currentPlayer={currentPlayer}
                timer={autoPlayTimeout >= 10 ? timer : null}
                lastPlay={lastPlay}
              />
            </div>

            {/* Center - Game board (both mobile and desktop) */}
            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <div className="w-full space-y-4">
                {lastPlay && (
                  <div className="relative">
                    {/* Decorative background blur */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-lg blur-xl" />

                    {/* Content */}
                    <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">
                          {lastPlay.player}
                        </span>
                        <span className="text-sm md:text-base text-muted-foreground">
                          claimed
                        </span>
                        <div className="flex items-center gap-1.5">
                          {lastPlay.cardCount}×
                          <Badge
                            variant={isMyTurn ? "destructive" : "default"}
                            className="text-base md:text-lg font-bold px-3 py-1"
                          >
                            {lastPlay.claimedRank}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <CenterPile pileCount={pileCount} lastPlay={lastPlay} />

                {canChallenge && lastPlay && (
                  <div className="flex justify-center">
                    <Button
                      onClick={onChallenge}
                      variant="destructive"
                      size="lg"
                      className="animate-pulse"
                    >
                      <HelpCircle className="w-5 h-5 mr-2" />
                      Challenge (Call Liar!)
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop: Right side - WastedPile only */}
            <div className="hidden md:block">
              <WastedPile removedCards={removedCards} />
            </div>
          </div>
        <div className="player-hand-container"></div>
        </CardHeader>
        {/* Play Controls */}
        <PlayerControls
          isMyTurn={isMyTurn}
          canPlay={playerCards.length > 0}
          setClaimedRank={setClaimedRank}
          claimedRank={claimedRank}
          selectedCards={selectedCards}
          handlePlayCards={handlePlayCards}
          lastPlay={lastPlay}
        />
        {playerCards.length > 0 && (
          <CardContent className="p-6 space-y-6 px-0">
            <div className="relative flex items-center justify-center p-0 m-0 mb-3">
              <div className="flex-1 border-t border-border"></div>
              <div className="px-4 text-sm font-semibold text-muted-foreground bg-background">
                Your Cards ({playerCards.length})
              </div>
              <div className="flex-1 border-t border-border"></div>
            </div>
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
