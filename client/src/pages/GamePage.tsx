import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocketContext } from '@/context/WebSocketContext';
import GameBoard from '../components/game/GameBoard';
import PlayerHand from '../components/game/PlayerHand';
import PlayerList from '../components/game/PlayerList';
import ChatBox from '../components/chat/ChatBox';
import type { Card as GameCard, GameState as ServerGameState, Rank, Player } from '@/types';

interface GamePlayer {
  id: string;
  name: string;
  cardCount: number;
  isCurrentTurn: boolean;
}

interface DisplayGameCard extends GameCard {
  selected: boolean;
}

interface LastPlay {
  player: string;
  cardCount: number;
  claimedRank: string;
}

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sendMessage, registerHandler, isConnected } = useWebSocketContext();
  
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [playerHand, setPlayerHand] = useState<DisplayGameCard[]>([]);
  const [gameState, setGameState] = useState<ServerGameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const playerName = localStorage.getItem('playerName') || 'Anonymous';
  const playerId = localStorage.getItem('playerId') || 'Anonymous-'+Math.floor(Math.random()*10000);
  const [lastPlay, setLastPlay] = useState<LastPlay | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize game data and setup WebSocket handlers
  useEffect(() => {
    const initialGameState = location.state?.gameState as ServerGameState;
    
    const initialPlayersData = initialGameState.players || [];
    
    
    if (initialGameState) {
      setGameState(initialGameState);
    }

    // Register WebSocket handlers
    const unregisterGameStateUpdate = registerHandler('game-state-update', (message) => {
      if (message.type === 'GAME_STATE_UPDATE') {
        const { hand, gameState: newGameState } = message.payload;
        
        if (hand) {
          setPlayerHand(hand.map((card: GameCard) => ({ ...card, selected: false })));
          console.log('Updated player hand:', hand);
        } else {
          console.warn('Received GAME_STATE_UPDATE without hand data');
        }
        
        if (newGameState) {
          setGameState(newGameState);
        }
      }
    });

    const unregisterCardsPlayed = registerHandler('cards-played', (message) => {
      if (message.type === 'CARDS_PLAYED') {
        const { playerName: pName, cardCount, claimedRank, gameState: newGameState } = message.payload;
        
        setLastPlay({
          player: pName,
          cardCount,
          claimedRank
        });
        
        if (newGameState) {
          setGameState(newGameState);
        }
      }
    });

    const unregisterChallengeResult = registerHandler('challenge-result', (message) => {
      if (message.type === 'CHALLENGE_RESULT') {
        const { challengerName, wasLying, liarName, revealedCards, gameState: newGameState } = message.payload;
        
        const resultMessage = wasLying 
          ? `${challengerName} was right! ${liarName} was lying. Cards were: ${revealedCards.map((c: GameCard) => c.rank).join(', ')}`
          : `${challengerName} was wrong! ${liarName} was telling the truth. ${challengerName} takes the pile.`;
        
        alert(resultMessage);
        
        setLastPlay(null);
        
        if (newGameState) {
          setGameState(newGameState);
        }
      }
    });

    const unregisterGameEnded = registerHandler('game-ended', (message) => {
      if (message.type === 'GAME_ENDED') {
        const { winners, loser } = message.payload;
        
        const winnerNames = winners.map((id: string) => 
          initialPlayersData.find(p => p.id === id)?.name || 'Unknown'
        ).join(', ');

        const loserName = initialPlayersData.find(p => p.id === loser)?.name || 'Unknown';

        alert(`Game Over! Winners: ${winnerNames}. Loser: ${loserName}`);
        
        setTimeout(() => navigate('/'), 3000);
      }
    });

    const unregisterError = registerHandler('error', (message) => {
      if (message.type === 'ERROR') {
        setError(message.payload.message);
        setTimeout(() => setError(null), 3000);
      }
    });

    return () => {
      unregisterGameStateUpdate();
      unregisterCardsPlayed();
      unregisterChallengeResult();
      unregisterGameEnded();
      unregisterError();
    };
  }, [location.state, registerHandler, navigate, players]);

  // Update players list when game state changes
  useEffect(() => {
    if (!gameState) return;
    
    const updatedPlayers: GamePlayer[] = gameState.playerOrder.map((id) => ({
      id,
      name: gameState.players.find(p => p.id === id)?.name || 'Unknown',
      cardCount: gameState.playerHandCounts[id] || 0,
      isCurrentTurn: id === gameState.currentPlayerId
    }));
    
    setPlayers(updatedPlayers);
  }, [gameState]);

  const handleCardSelect = (cardId: string) => {
    setPlayerHand(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, selected: !card.selected }
        : card
    ));
    
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handlePlayCards = (selectedCardIds: string[], claimedRank: string) => {
    if (selectedCardIds.length === 0 || !claimedRank) return;
    
    sendMessage({
      type: 'PLAY_CARDS',
      payload: {
        cardIds: selectedCardIds,
        claimedRank: claimedRank as Rank
      }
    });
    
    // Clear selection
    setSelectedCards([]);
  };

  const handleChallenge = () => {
    sendMessage({
      type: 'CHALLENGE',
      payload: {
        challengerId: playerId
      }
    });
  };

  const handleLeaveGame = () => {
    navigate('/');
  };

  const isMyTurn = gameState?.currentPlayerId === playerId;
  const canChallenge = lastPlay !== null && lastPlay.player !== playerName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🃏 Tekthib Game</h1>
            <p className="text-gray-600">
              {isMyTurn ? "Your turn!" : "Waiting for other players..."}
            </p>
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
            {!isConnected && (
              <p className="text-yellow-600 text-sm mt-1">Connecting to server...</p>
            )}
          </div>
          <Button variant="outline" onClick={handleLeaveGame}>
            Leave Game
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Board - Center Area */}
          <div className="lg:col-span-3 space-y-6">
            <GameBoard 
              lastPlay={lastPlay}
              currentPlayer={players.find(p => p.isCurrentTurn)?.name || ''}
              canChallenge={canChallenge}
              onChallenge={handleChallenge}
            />
            
            <PlayerHand 
              cards={playerHand}
              onCardSelect={handleCardSelect}
              onPlayCards={handlePlayCards}
              isMyTurn={isMyTurn}
              selectedCards={selectedCards}
            />
          </div>

          {/* Players List and Game Info */}
          <div className="space-y-4">
            <PlayerList 
              players={players}
              currentPlayerName={playerName}
            />

            {/* Chat Box */}
            {playerId && playerName && (
              <ChatBox playerName={playerName} playerId={playerId} />
            )}

            {/* Game Rules Quick Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Rules</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>• Play cards face-down and claim a rank</div>
                <div>• You can bluff (lie about the rank)</div>
                <div>• Others can challenge by calling "Liar!"</div>
                <div>• Wrong challenger takes the pile</div>
                <div>• First to empty hand wins!</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}