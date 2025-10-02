import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

export default function GameBoard({
  lastPlay,
  currentPlayer,
  pileCount,
  canChallenge,
  onChallenge,
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

            {/* Scattered realistic pile */}
            <div className="relative h-36 w-28 mx-auto">
              {Array.from({ length: Math.min(pileCount, 6) }).map((_, i) => {
                const rotation = Math.sin(i) * 15 - 7.5;
                const offsetX = Math.cos(i * 1.5) * 8;

                return (
                  <div
                    key={i}
                    className="absolute w-20 h-28 bg-white rounded-lg border-2 border-gray-300 shadow-xl"
                    style={{
                      top: `${i * 3}px`,
                      left: `calc(50% + ${offsetX}px)`,
                      transform: `translateX(-50%) rotate(${rotation}deg)`,
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
                  </div>
                );
              })}
              {pileCount > 4 && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20">
                  {pileCount}
                </div>
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
    </Card>
  );
}
