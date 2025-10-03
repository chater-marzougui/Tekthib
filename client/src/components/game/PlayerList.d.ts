import type { Player as BasePlayer } from "shared";
interface Player extends BasePlayer {
    isCurrentTurn: boolean;
}
interface PlayerListProps {
    players: Player[];
    currentPlayerId: string;
}
export default function PlayerList({ players, currentPlayerId, }: Readonly<PlayerListProps>): import("react/jsx-runtime").JSX.Element;
export {};
