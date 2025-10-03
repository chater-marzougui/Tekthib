import { type DisplayGameCard } from "shared";
interface PlayerHandProps {
    cards: DisplayGameCard[];
    onCardSelect: (cardId: string) => void;
    onPlayCards: (selectedCards: string[], claimedRank: string) => void;
    isMyTurn: boolean;
    lastPlay?: {
        player: string;
        cardCount: number;
        claimedRank: string;
    } | null;
    selectedCards: string[];
}
interface PlayerHandProps {
    cards: DisplayGameCard[];
    onCardSelect: (cardId: string) => void;
    onPlayCards: (selectedCards: string[], claimedRank: string) => void;
    isMyTurn: boolean;
    lastPlay?: {
        player: string;
        cardCount: number;
        claimedRank: string;
    } | null;
    selectedCards: string[];
}
export default function PlayerHand({ cards, onCardSelect, onPlayCards, isMyTurn, lastPlay, selectedCards, }: Readonly<PlayerHandProps>): import("react/jsx-runtime").JSX.Element | null;
export {};
