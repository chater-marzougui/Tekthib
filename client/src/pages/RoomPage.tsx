import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocketContext } from '@/context/WebSocketContext';
import ChatBox from '@/components/chat/ChatBox';
import type { Player } from '@/types';

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { sendMessage, registerHandler, isConnected } = useWebSocketContext();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const name = location.state?.playerName || 'Anonymous';
    setPlayerName(name);

    // Register WebSocket message handlers
    const unregisterRoomCreated = registerHandler('room-created', (message) => {
      if (message.type === 'ROOM_CREATED') {
        const { room, playerId: pid } = message.payload;
        setRoomCode(room.code);
        setIsHost(true);
        setPlayerId(pid);
        setPlayers(room.players);
        // Update URL to reflect actual room code
        window.history.replaceState(null, '', `/room/${room.code}`);
      }
    });

    const unregisterRoomJoined = registerHandler('room-joined', (message) => {
      if (message.type === 'ROOM_JOINED') {
        const { room, playerId: pid } = message.payload;
        setRoomCode(room.code);
        setPlayerId(pid);
        setPlayers(room.players);
        setIsHost(room.hostId === pid);
      }
    });

    const unregisterPlayerJoined = registerHandler('player-joined', (message) => {
      if (message.type === 'PLAYER_JOINED') {
        const { player } = message.payload;
        setPlayers(prev => [...prev, player]);
      }
    });

    const unregisterPlayerLeft = registerHandler('player-left', (message) => {
      if (message.type === 'PLAYER_LEFT') {
        const { playerId: leftPlayerId, newHostId } = message.payload;
        setPlayers(prev => prev.filter(p => p.id !== leftPlayerId));
        if (newHostId && newHostId === playerId) {
          setIsHost(true);
        }
      }
    });

    const unregisterGameStateUpdate = registerHandler('game-state-update', (message) => {
      if (message.type === 'GAME_STATE_UPDATE') {
        const { playerId: updatedPlayerId, isReady: updatedReady } = message.payload;
        setPlayers(prev => prev.map(p => 
          p.id === updatedPlayerId ? { ...p, isReady: updatedReady } : p
        ));
      }
    });

    const unregisterGameStarted = registerHandler('game-started', (message) => {
      if (message.type === 'GAME_STARTED') {
        navigate('/game', { 
          state: { 
            roomCode, 
            playerName, 
            playerId,
            gameState: message.payload.gameState 
          } 
        });
      }
    });

    const unregisterError = registerHandler('error', (message) => {
      if (message.type === 'ERROR') {
        setError(message.payload.message);
      }
    });

    // Create or join room based on roomId parameter
    if (roomId === 'create') {
      sendMessage({
        type: 'CREATE_ROOM',
        payload: { playerName: name, maxPlayers: 10 }
      });
    } else {
      sendMessage({
        type: 'JOIN_ROOM',
        payload: { roomCode: roomId || '', playerName: name }
      });
    }

    return () => {
      unregisterRoomCreated();
      unregisterRoomJoined();
      unregisterPlayerJoined();
      unregisterPlayerLeft();
      unregisterGameStateUpdate();
      unregisterGameStarted();
      unregisterError();
    };
  }, [roomId, location.state, isConnected, sendMessage, registerHandler, navigate, playerId]);

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    sendMessage({
      type: 'READY',
      payload: { ready: newReadyState }
    });
  };

  const handleStartGame = () => {
    if (isHost && canStartGame) {
      sendMessage({
        type: 'START_GAME',
        payload: {}
      });
    }
  };

  const handleLeaveRoom = () => {
    sendMessage({
      type: 'LEAVE_ROOM',
      payload: { roomId: roomCode, playerId }
    });
    navigate('/');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  const canStartGame = isHost && players.length >= 3 && players.every(p => p.isReady);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">🎮 Game Lobby</h1>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          {!isConnected && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
              Connecting to server...
            </div>
          )}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Room Code:</span>
              <Button 
                variant="outline" 
                onClick={copyRoomCode}
                className="font-mono text-lg px-4"
                disabled={!roomCode}
              >
                {roomCode || 'Loading...'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Players ({players.length}/10)</CardTitle>
                <CardDescription>
                  Waiting for players to join and get ready...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">
                            {player.name}
                            {player.id === playerId && ' (You)'}
                          </div>
                          {player.id === players[0]?.id && <div className="text-xs text-gray-500">Host</div>}
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

            {/* Chat Box */}
            {playerId && playerName && (
              <ChatBox playerName={playerName} playerId={playerId} />
            )}
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