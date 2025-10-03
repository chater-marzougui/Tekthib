interface LastPlay {
    player: string;
    cardCount: number;
    claimedRank: string;
}
interface GameBoardProps {
    lastPlay: LastPlay | null;
    currentPlayer: string;
    pileCount: number;
    canChallenge: boolean;
    onChallenge: () => void;
}
export default function GameBoard({ lastPlay, currentPlayer, pileCount, canChallenge, onChallenge, }: Readonly<GameBoardProps>): import("react/jsx-runtime").JSX.Element;
export {};
