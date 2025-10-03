import type { Player } from "shared";
interface VoiceChatProps {
    players: Player[];
    localPlayerId: string;
}
export default function VoiceChat({ players, localPlayerId, }: Readonly<VoiceChatProps>): import("react/jsx-runtime").JSX.Element;
export {};
