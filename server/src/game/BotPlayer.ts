import { Card, Player, Rank } from '../types';
import { GameEngine } from './GameEngine';

export class BotPlayer {
  private readonly gameEngine: GameEngine;
  private readonly roomId: string;

  constructor(gameEngine: GameEngine, roomId: string) {
    this.gameEngine = gameEngine;
    this.roomId = roomId;
  }

  /**
   * Determines if the bot should challenge the current play
   * @param isCurrentPlayer - whether it's the bot's turn
   * @returns true if bot should challenge
   */
  shouldChallenge(isCurrentPlayer: boolean): boolean {
    const probability = isCurrentPlayer ? 0.3 : 0.2;
    return Math.random() < probability;
  }

  /**
   * Determines what cards the bot should play
   * @param botPlayer - the bot player object
   * @param currentRank - the current rank that must be claimed
   * @returns object with cardIds to play and claimed rank
   */
  decidePlay(botPlayer: Player, currentRank: Rank | null): {
    cardIds: string[];
    claimedRank: Rank;
  } {
    const hand = botPlayer.hand;
    
    // If there's a current rank, we must claim it
    if (currentRank) {
      // Check if bot has cards of the current rank
      const matchingCards = hand.filter(
        card => card.rank === currentRank || card.rank === 'Joker'
      );
      
      if (matchingCards.length > 0) {
        // Play the matching cards (including jokers)
        return {
          cardIds: matchingCards.map(c => c.id),
          claimedRank: currentRank
        };
      } else {
        // Bot doesn't have the rank, so it must lie
        // Play 1-4 random cards
        const numCards = Math.floor(Math.random() * 4) + 1;
        const cardsToPlay = hand.slice(0, Math.min(numCards, hand.length));
        return {
          cardIds: cardsToPlay.map(c => c.id),
          claimedRank: currentRank
        };
      }
    } else {
      // No current rank - bot can claim any rank
      // Find the rank with most cards in hand
      const rankCounts = new Map<Rank, Card[]>();
      hand.forEach(card => {
        if (!rankCounts.has(card.rank)) {
          rankCounts.set(card.rank, []);
        }
        rankCounts.get(card.rank)!.push(card);
      });
      
      // Find the most common rank
      let bestRank: Rank = hand[0].rank;
      let maxCount = 0;
      rankCounts.forEach((cards, rank) => {
        if (cards.length > maxCount) {
          maxCount = cards.length;
          bestRank = rank;
        }
      });
      
      const cardsOfBestRank = rankCounts.get(bestRank) || [hand[0]];
      
      return {
        cardIds: cardsOfBestRank.map(c => c.id),
        claimedRank: bestRank
      };
    }
  }
}
