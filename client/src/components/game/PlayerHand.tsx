import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GameCard {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
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

export default function PlayerHand({ 
  cards, 
  onCardSelect, 
  onPlayCards, 
  isMyTurn, 
  lastPlay,
  selectedCards 
}: Readonly<PlayerHandProps>) {
  const [claimedRank, setClaimedRank] = useState(lastPlay ? lastPlay.claimedRank : '');

  const getCardSymbol = (suit: GameCard['suit']) => {
    switch (suit) {
      case 'hearts': return '♥️';
      case 'diamonds': return '♦️';
      case 'clubs': return '♣️';
      case 'spades': return '♠️';
      case 'joker': return '🃏';
    }
  };

  const getCardColor = (suit: GameCard['suit']) => {
    if (suit === 'joker') return 'text-purple-600';
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-black';
  };

  const handlePlayCards = () => {
    console.log("Playing cards:", selectedCards, "Claimed rank:", claimedRank);
    if (selectedCards.length > 0 && (claimedRank || lastPlay)) {
      onPlayCards(selectedCards, lastPlay ? lastPlay.claimedRank : claimedRank);
      setClaimedRank('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Hand ({cards.length} cards)</CardTitle>
        {isMyTurn && (
          <p className="text-sm text-gray-600">
            {lastPlay ? 
            "Select cards to play - current claim: " + lastPlay.claimedRank + ` (${lastPlay.cardCount})` :
            "Select cards to play and choose what rank to claim"}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Cards Display - Show cards or empty message */}
        {cards.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {cards.sort((a,b) => a.rank > b.rank ? 1 : -1).map((card) => (
              <Card
                key={card.id}
                onClick={() => isMyTurn && onCardSelect(card.id)}
                className={`
                  w-16 h-24 bg-white rounded-lg border-2 shadow-md cursor-pointer transition-all
                  flex flex-col items-center justify-center text-sm font-bold
                  ${selectedCards.includes(card.id) ? 'border-blue-500 -translate-y-2 shadow-lg' : 'border-gray-300'}
                  ${!isMyTurn ? 'cursor-not-allowed opacity-50' : 'hover:shadow-lg'}
                  ${getCardColor(card.suit)}
                `}
              >
                <div className="text-2xl">{getCardSymbol(card.suit)}</div>
                <div>{card.rank}</div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 py-8 text-center">
            No cards in hand
          </div>
        )}

        {/* Play Controls */}
        {isMyTurn && cards.length > 0 && (
          <div className="flex gap-4 items-center">
            {!lastPlay && (<select
              value={claimedRank}
              onChange={(e) => setClaimedRank(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Choose rank to claim...</option>
              {['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
            )}
            <Button 
              onClick={handlePlayCards}
              disabled={selectedCards.length === 0 || (!lastPlay && !claimedRank)}
              size="lg"
            >
              Play {selectedCards.length} Card{selectedCards.length !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}