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
  canChallenge: boolean;
  onChallenge: () => void;
}

export default function GameBoard({ lastPlay, currentPlayer, canChallenge, onChallenge }: GameBoardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Play</CardTitle>
        <p className="text-sm text-gray-600">
          {currentPlayer ? `${currentPlayer}'s turn` : 'Waiting for game to start...'}
        </p>
      </CardHeader>
      <CardContent>
        {lastPlay ? (
          <div className="text-center space-y-4">
            <div className="text-lg">
              <span className="font-semibold">{lastPlay.player}</span> played{' '}
              <span className="font-bold text-blue-600">
                {lastPlay.cardCount} {lastPlay.claimedRank}
                {lastPlay.cardCount > 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Visual representation of played cards */}
            <div className="flex justify-center">
              {Array.from({ length: lastPlay.cardCount }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-16 h-24 bg-blue-600 rounded-lg border-2 border-white mr-2 shadow-lg flex items-center justify-center text-white font-bold"
                  style={{ zIndex: lastPlay.cardCount - i }}
                >
                  ?
                </div>
              ))}
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
            <div className="text-sm mt-2">The game will begin once someone plays their first cards</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}