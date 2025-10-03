import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RenderOneHand from "./RenderCard";
import { RankTypes, playableRanks, } from "shared";
export default function PlayerHand({ cards, onCardSelect, onPlayCards, isMyTurn, lastPlay, selectedCards, }) {
    const [claimedRank, setClaimedRank] = useState(lastPlay ? lastPlay.claimedRank : "");
    const handlePlayCards = () => {
        if (selectedCards.length > 0 && (claimedRank || lastPlay)) {
            onPlayCards(selectedCards, lastPlay ? lastPlay.claimedRank : claimedRank);
            setClaimedRank("");
        }
    };
    const sortedCards = [...cards].sort((a, b) => {
        const aIndex = RankTypes.indexOf(a.rank);
        const bIndex = RankTypes.indexOf(b.rank);
        return aIndex - bIndex;
    });
    if (!cards || cards.length === 0)
        return null;
    // Calculate number of hands needed
    const numberOfHands = Math.ceil(sortedCards.length / 14);
    return (_jsxs("div", { className: "relative", children: [isMyTurn && (_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-3xl" })), _jsx(Card, { className: "relative bg-card shadow-2xl", children: _jsxs(CardContent, { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50" }), _jsx("div", { className: "relative bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg", children: cards.length })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-foreground", children: "Your Cards" }), _jsx("p", { className: "text-sm text-slate-400", children: isMyTurn ? (_jsxs("span", { className: "text-green-400 flex items-center gap-1", children: [_jsx("span", { className: "w-2 h-2 bg-green-400 rounded-full animate-pulse" }), "Your turn"] })) : ("Waiting...") })] })] }), lastPlay && (_jsxs("div", { className: "bg-foreground backdrop-blur-sm border border-slate-600 rounded-lg px-4 py-2", children: [_jsx("p", { className: "text-xs text-slate-400", children: "Current claim" }), _jsx("p", { className: "text-2xl font-bold text-white", children: lastPlay.claimedRank }), _jsxs("p", { className: "text-xs text-slate-500", children: [lastPlay.cardCount, " cards"] })] }))] }), cards.length > 0 ? (_jsx("div", { className: "relative py-4", children: _jsx("div", { className: "flex flex-col items-center gap-2", children: Array.from({ length: numberOfHands }, (_, handIndex) => RenderOneHand(sortedCards, handIndex * 14, isMyTurn, onCardSelect, selectedCards)) }) })) : (_jsxs("div", { className: "text-slate-400 py-16 text-center", children: [_jsx("div", { className: "text-6xl mb-4 opacity-20", children: "\uD83C\uDCCF" }), _jsx("p", { className: "text-lg", children: "No cards in hand" })] })), isMyTurn && cards.length > 0 && (_jsxs("div", { className: "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-4", children: [!lastPlay && (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-300", children: "Claim this rank:" }), _jsx("div", { className: "grid grid-cols-13 gap-2", children: playableRanks.map((rank) => (_jsxs("button", { onClick: () => setClaimedRank(rank), className: `
                          relative py-3 px-2 rounded-lg font-bold text-lg transition-all duration-200
                          ${claimedRank === rank
                                                    ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105"
                                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-105"}
                        `, children: [claimedRank === rank && (_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-50" })), _jsx("span", { className: "relative", children: rank })] }, rank))) })] })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex-1 bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-600", children: [_jsx("p", { className: "text-xs text-slate-400 mb-1", children: "Selected cards" }), _jsxs("p", { className: "text-2xl font-bold text-white", children: [selectedCards.length, " ", _jsxs("span", { className: "text-lg text-slate-400", children: ["card", selectedCards.length !== 1 ? "s" : ""] })] })] }), _jsxs(Button, { onClick: handlePlayCards, disabled: selectedCards.length === 0 || (!lastPlay && !claimedRank), size: "lg", className: `
                    relative overflow-hidden px-8 py-6 text-lg font-bold rounded-xl
                    transition-all duration-300
                    ${selectedCards.length > 0 && (claimedRank || lastPlay)
                                                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/50 hover:scale-105"
                                                : "bg-slate-700 text-slate-500 cursor-not-allowed"}
                  `, children: [selectedCards.length > 0 && (claimedRank || lastPlay) && (_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-green-400/0 via-white/20 to-green-400/0" })), _jsxs("span", { className: "relative flex items-center gap-2", children: [_jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M14 5l7 7m0 0l-7 7m7-7H3" }) }), "Play Cards"] })] })] })] }))] }) })] }));
}
