import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Player {
  id: string;
  name: string;
  isReady: boolean;
}

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get player name from navigation state
    const name = location.state?.playerName || 'Anonymous';
    setPlayerName(name);

    // Simulate room creation or joining
    if (roomId === 'create') {
      // Creating a new room
      const newRoomCode = generateRoomCode();
      setRoomCode(newRoomCode);
      setIsHost(true);
      // Add the current player as host
      setPlayers([{ id: '1', name, isReady: false }]);
    } else {
      // Joining existing room
      setRoomCode(roomId || '');
      setIsHost(false);
      // Simulate existing players (in real app, this would come from WebSocket)
      setPlayers([
        { id: '1', name: 'Host Player', isReady: true },
        { id: '2', name, isReady: false }
      ]);
    }
  }, [roomId, location.state]);

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleReadyToggle = () => {
    setIsReady(!isReady);
    // Update player ready status
    setPlayers(prev => prev.map(player => 
      player.name === playerName 
        ? { ...player, isReady: !isReady }
        : player
    ));
  };

  const handleStartGame = () => {
    if (isHost && players.every(p => p.isReady)) {
      navigate('/game', { state: { roomCode, playerName, players } });
    }
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  const canStartGame = isHost && players.length >= 1 && players.every(p => p.isReady); // Temporarily allow 1 player for testing

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">🎮 Game Lobby</h1>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Room Code:</span>
              <Button 
                variant="outline" 
                onClick={copyRoomCode}
                className="font-mono text-lg px-4"
              >
                {roomCode}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Players ({players.length}/10)</CardTitle>
                <CardDescription>
                  Waiting for players to join and get ready...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          {index === 0 && <div className="text-xs text-gray-500">Host</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.isReady ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Ready ✓
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            Not Ready
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, index) => (
                    <div 
                      key={`empty-${index}`}
                      className="flex items-center p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
                    >
                      <div className="text-gray-400">Waiting for player...</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Controls */}
          <div className="space-y-6">
            {/* Ready Status */}
            <Card>
              <CardHeader>
                <CardTitle>Your Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">Playing as:</div>
                  <div className="font-semibold text-lg">{playerName}</div>
                </div>
                <Button 
                  onClick={handleReadyToggle}
                  className={`w-full ${isReady ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  variant={isReady ? 'default' : 'outline'}
                >
                  {isReady ? '✓ Ready!' : 'Mark as Ready'}
                </Button>
              </CardContent>
            </Card>

            {/* Game Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isHost && (
                  <Button 
                    onClick={handleStartGame}
                    disabled={!canStartGame}
                    className="w-full"
                    size="lg"
                  >
                    {canStartGame ? '🚀 Start Game' : 'Waiting for players...'}
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleLeaveRoom}
                  className="w-full"
                >
                  Leave Room
                </Button>
              </CardContent>
            </Card>

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>Game Requirements</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Min Players:</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Players:</span>
                  <span className="font-medium">10</span>
                </div>
                <div className="flex justify-between">
                  <span>Cards per deck:</span>
                  <span className="font-medium">108</span>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  All players must be ready before the host can start the game.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}