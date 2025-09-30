import { Card, Suit, Rank } from '../types';

export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = this.createDeck();
  }

  private createDeck(): Card[] {
    const cards: Card[] = [];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    // Create two standard decks (52 cards each = 104 total)
    for (let deckNum = 1; deckNum <= 2; deckNum++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          cards.push({
            id: `${suit}-${rank}-${deckNum}`,
            suit,
            rank,
            deckNumber: deckNum as 1 | 2
          });
        }
      }
    }

    // Add 4 Jokers
    for (let i = 1; i <= 4; i++) {
      cards.push({
        id: `joker-${i}`,
        suit: 'joker',
        rank: 'Joker',
        deckNumber: i <= 2 ? 1 : 2
      });
    }

    return cards;
  }

  shuffle(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  distributeCards(numPlayers: number): Card[][] {
    this.shuffle();
    const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
    
    // Distribute cards evenly
    this.cards.forEach((card, index) => {
      hands[index % numPlayers].push(card);
    });

    return hands;
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  getRemainingCount(): number {
    return this.cards.length;
  }
}