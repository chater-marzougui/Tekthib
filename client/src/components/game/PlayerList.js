import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerBadge } from "../PlayerBadge";
export default function PlayerList({ players, currentPlayerId, }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Players (", players.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-3", children: players.map((player) => (_jsx("div", { className: `
                p-3 rounded-lg border-2 transition-all
                ${player.isCurrentTurn ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 bg-gray-50"}
                ${player.id === currentPlayerId ? "ring-2 ring-green-300" : ""}
              `, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PlayerBadge, { player: player, playerId: player.id }), _jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: [player.name, player.isBot && " 🤖", player.id === currentPlayerId && (_jsx("span", { className: "text-xs text-green-600 ml-2", children: "(You)" }))] }), _jsxs("div", { className: "text-sm text-gray-600", children: [player.cardCount, " card", player.cardCount !== 1 ? "s" : ""] })] })] }), _jsxs("div", { className: "text-right", children: [player.isCurrentTurn && (_jsx("div", { className: "text-blue-600 font-semibold text-sm animate-pulse", children: "Current Turn" })), player.cardCount === 0 && (_jsx("div", { className: "text-green-600 font-semibold text-sm", children: "\uD83C\uDFC6 Winner!" }))] })] }) }, player.id))) }) })] }));
}
