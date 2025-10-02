import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Player {
  id: string;
  name: string;
  cardCount: number;
  isCurrentTurn: boolean;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerName: string;
}

export default function PlayerList({ players, currentPlayerName }: Readonly<PlayerListProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players ({players.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {players.map((player) => (
            <div 
              key={player.id}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${player.isCurrentTurn ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-gray-50'}
                ${player.name === currentPlayerName ? 'ring-2 ring-green-300' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm
                    ${player.name === currentPlayerName ? 'bg-green-500' : 'bg-blue-500'}
                  `}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">
                      {player.name}
                      {player.name === currentPlayerName && (
                        <span className="text-xs text-green-600 ml-2">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {player.cardCount} card{player.cardCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {player.isCurrentTurn && (
                    <div className="text-blue-600 font-semibold text-sm animate-pulse">
                      Current Turn
                    </div>
                  )}
                  {player.cardCount === 0 && (
                    <div className="text-green-600 font-semibold text-sm">
                      🏆 Winner!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}