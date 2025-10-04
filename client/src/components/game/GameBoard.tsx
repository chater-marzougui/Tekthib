import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import type { Card as GameCard } from "shared";

interface LastPlay {
  player: string;
  cardCount: number;
  claimedRank: string;
}

interface GameBoardProps {
  lastPlay: LastPlay | null;
  currentPlayer: string;
  pileCount: number;
  canChallenge: boolean;
  onChallenge: () => void;
  removedCards: GameCard[];
}

export default function GameBoard({
  lastPlay,
  currentPlayer,
  pileCount,
  canChallenge,
  onChallenge,
  removedCards,
}: Readonly<GameBoardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Play</CardTitle>
        <p className="text-sm text-gray-600">
          {currentPlayer
            ? `${currentPlayer}'s turn`
            : "Waiting for game to start..."}
        </p>
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

            {/* Scattered realistic pile with animations */}
            <div className="relative h-36 w-28 mx-auto">
              <AnimatePresence>
                {Array.from({ length: Math.min(pileCount, 6) }).map((_, i) => {
                  const rotation = Math.sin(i) * 15 - 7.5;
                  const offsetX = Math.cos(i * 1.5) * 8;

                  return (
                    <motion.div
                      key={`pile-card-${i}`}
                      initial={{ 
                        opacity: 0, 
                        scale: 0.5,
                        y: -100,
                        rotate: 0
                      }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        y: 0,
                        rotate: rotation
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.5,
                        y: 100
                      }}
                      transition={{
                        duration: 0.5,
                        delay: i * 0.05,
                        type: "spring",
                        stiffness: 200
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
                })}
              </AnimatePresence>
              {pileCount > 4 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20"
                >
                  {pileCount}
                </motion.div>
              )}
            </div>

            {/* Challenge button */}
            {canChallenge && (
              <div className="space-y-2">
                <Button
                  onClick={onChallenge}
                  variant="destructive"
                  size="lg"
                  className="animate-pulse"
                >
                  🤔 Challenge (Call Liar!)
                </Button>
                <p className="text-xs text-gray-500">
                  Think they're bluffing? Call them out!
                </p>
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

      {/* Display removed cards (four-of-a-kind) */}
      {removedCards.length > 0 && (
        <CardContent className="pt-0 border-t">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-600">
              Out of Game ({removedCards.length} cards)
            </p>
            <div className="flex flex-wrap gap-2">
              {removedCards.map((card, index) => (
                <motion.div
                  key={`removed-${card.id}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="w-12 h-16 bg-white rounded border border-gray-300 shadow-sm flex flex-col items-center justify-center text-xs"
                  style={{
                    color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
                  }}
                >
                  <div className="font-bold">{card.rank}</div>
                  <div>
                    {card.suit === 'hearts' && '♥'}
                    {card.suit === 'diamonds' && '♦'}
                    {card.suit === 'clubs' && '♣'}
                    {card.suit === 'spades' && '♠'}
                    {card.suit === 'joker' && '🃏'}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
