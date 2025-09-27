import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GameBoard from '../components/game/GameBoard';
import PlayerHand from '../components/game/PlayerHand';
import PlayerList from '../components/game/PlayerList';

interface Player {
  id: string;
  name: string;
  cardCount: number;
  isCurrentTurn: boolean;
}

interface GameCard {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  selected: boolean;
}

interface GameState {
  currentPlayer: string;
  lastPlay: {
    player: string;
    cardCount: number;
    claimedRank: string;
  } | null;
  phase: 'playing' | 'challenging' | 'game_over';
}

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerHand, setPlayerHand] = useState<GameCard[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: '',
    lastPlay: null,
    phase: 'playing'
  });
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState('');

  // Initialize game data
  useEffect(() => {
    const name = location.state?.playerName || 'Player';
    const roomPlayers: Player[] = location.state?.players || [];
    
    setPlayerName(name);
    
    // Initialize players with card counts
    const gamePlayers = roomPlayers.map((player: Player, index: number) => ({
      id: player.id,
      name: player.name,
      cardCount: Math.floor(108 / roomPlayers.length) + (index < 108 % roomPlayers.length ? 1 : 0),
      isCurrentTurn: index === 0
    }));
    
    setPlayers(gamePlayers);
    setGameState(prev => ({ ...prev, currentPlayer: gamePlayers[0]?.name || '' }));
    
    // Generate initial hand for current player
    const initialHand = generateInitialHand(gamePlayers[0]?.cardCount || 18);
    setPlayerHand(initialHand);
  }, [location.state]);

  const generateInitialHand = (cardCount: number): GameCard[] => {
    const suits: GameCard['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const hand: GameCard[] = [];
    
    for (let i = 0; i < cardCount; i++) {
      hand.push({
        id: `card-${i}`,
        suit: suits[Math.floor(Math.random() * suits.length)],
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        selected: false
      });
    }
    
    return hand.sort((a, b) => ranks.indexOf(a.rank) - ranks.indexOf(b.rank));
  };

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
    
    // Remove played cards from hand
    setPlayerHand(prev => prev.filter(card => !selectedCardIds.includes(card.id)));
    
    // Update game state
    setGameState(prev => ({
      ...prev,
      lastPlay: {
        player: playerName,
        cardCount: selectedCardIds.length,
        claimedRank
      },
      phase: 'challenging'
    }));
    
    // Clear selection
    setSelectedCards([]);
    
    // Advance turn (simplified)
    setTimeout(() => {
      const currentIndex = players.findIndex(p => p.name === playerName);
      const nextIndex = (currentIndex + 1) % players.length;
      setGameState(prev => ({
        ...prev,
        currentPlayer: players[nextIndex]?.name || '',
        phase: 'playing'
      }));
    }, 2000);
  };

  const handleChallenge = () => {
    // Simulate challenge result (in real game, server would determine this)
    const isBluff = Math.random() > 0.5;
    alert(isBluff ? 'Challenge successful! Player was bluffing.' : 'Challenge failed! Player was telling the truth.');
    
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      lastPlay: null
    }));
  };

  const handleLeaveGame = () => {
    navigate('/');
  };

  const isMyTurn = gameState.currentPlayer === playerName;
  const canChallenge = gameState.phase === 'challenging' && gameState.lastPlay?.player !== playerName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🃏 Tekthib Game</h1>
            <p className="text-gray-600">
              {isMyTurn ? "Your turn!" : `${gameState.currentPlayer}'s turn`}
            </p>
          </div>
          <Button variant="outline" onClick={handleLeaveGame}>
            Leave Game
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Board - Center Area */}
          <div className="lg:col-span-3 space-y-6">
            <GameBoard 
              lastPlay={gameState.lastPlay}
              currentPlayer={gameState.currentPlayer}
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