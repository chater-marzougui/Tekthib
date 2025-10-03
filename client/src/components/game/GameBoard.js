import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function GameBoard({ lastPlay, currentPlayer, pileCount, canChallenge, onChallenge, }) {
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Current Play" }), _jsx("p", { className: "text-sm text-gray-600", children: currentPlayer
                            ? `${currentPlayer}'s turn`
                            : "Waiting for game to start..." })] }), _jsx(CardContent, { children: lastPlay ? (_jsxs("div", { className: "text-center space-y-4", children: [_jsxs("div", { className: "text-lg", children: [_jsx("span", { className: "font-semibold", children: lastPlay.player }), " played", " ", _jsxs("span", { className: "font-bold text-blue-600", children: [lastPlay.cardCount, " (", lastPlay.claimedRank, lastPlay.cardCount > 1 ? "s" : "", ")"] })] }), _jsxs("div", { className: "relative h-36 w-28 mx-auto", children: [Array.from({ length: Math.min(pileCount, 6) }).map((_, i) => {
                                    const rotation = Math.sin(i) * 15 - 7.5;
                                    const offsetX = Math.cos(i * 1.5) * 8;
                                    return (_jsx("div", { className: "absolute w-20 h-28 bg-white rounded-lg border-2 border-gray-300 shadow-xl", style: {
                                            top: `${i * 3}px`,
                                            left: `calc(50% + ${offsetX}px)`,
                                            transform: `translateX(-50%) rotate(${rotation}deg)`,
                                            zIndex: i,
                                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        }, children: _jsx("div", { className: "w-full h-full flex items-center justify-center", children: _jsx("div", { className: "text-white font-bold text-3xl opacity-50", children: "?" }) }) }, i));
                                }), pileCount > 4 && (_jsx("div", { className: "absolute top-0 right-0 bg-amber-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg z-20", children: pileCount }))] }), canChallenge && (_jsxs("div", { className: "space-y-2", children: [_jsx(Button, { onClick: onChallenge, variant: "destructive", size: "lg", className: "animate-pulse", children: "\uD83E\uDD14 Challenge (Call Liar!)" }), _jsx("p", { className: "text-xs text-gray-500", children: "Think they're bluffing? Call them out!" })] }))] })) : (_jsxs("div", { className: "text-center text-gray-500 py-8", children: [_jsx("div", { className: "text-4xl mb-2", children: "\uD83C\uDCCF" }), _jsx("div", { children: "Waiting for first play..." }), _jsx("div", { className: "text-sm mt-2", children: "The game will begin once someone plays their first cards" })] })) })] }));
}
