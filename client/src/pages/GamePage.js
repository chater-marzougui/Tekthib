import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { VoiceChatProvider } from "@/context/VoiceChatContext";
import GameBoard from "../components/game/GameBoard";
import PlayerHand from "../components/game/PlayerHand";
import PlayerList from "../components/game/PlayerList";
import ChatBox from "../components/chat/ChatBox";
import { toast } from "sonner";
import VoiceChat from "@/components/chat/VoiceChat";
export default function GamePage() {
    const navigate = useNavigate();
    const { roomId } = useParams();
    const { sendMessage, registerHandler, isConnected } = useWebSocketContext();
    const [players, setPlayers] = useState([]);
    const [playerHand, setPlayerHand] = useState([]);
    const [gameState, setGameState] = useState(null);
    const [selectedCards, setSelectedCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [systemMessages, setSystemMessages] = useState([]);
    const playerName = localStorage.getItem("playerName") || "Anonymous";
    const playerId = localStorage.getItem("clientId") || "";
    const [lastPlay, setLastPlay] = useState(null);
    const [error, setError] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [canChallenge, setCanChallenge] = useState(false);
    const [gameEndedDialog, setGameEndedDialog] = useState({
        open: false,
        winners: [],
        loser: "",
    });
    // Request initial game state when component mounts
    useEffect(() => {
        console.log(roomId, playerId);
        if (isConnected && roomId && playerId) {
            // Request current game state from server
            console.log("Requesting initial game state for room:", roomId);
            sendMessage({
                type: "GET_GAME_STATE",
                payload: {
                    roomCode: roomId,
                    playerId,
                },
            });
        }
        else if (isConnected && roomId && !playerId) {
            // If no playerId, user probably navigated directly without going through room
            console.error("No player ID found. Please rejoin from home page.");
            setError("Session expired. Please return to home and rejoin the game.");
            setIsLoading(false);
        }
    }, [isConnected, roomId, playerId, sendMessage]);
    // Initialize game data and setup WebSocket handlers
    useEffect(() => {
        // Register handler for initial game state response
        const unregisterInitialState = registerHandler("initial-game-state", (message) => {
            if (message.type === "INITIAL_GAME_STATE") {
                console.log("Received initial game state:", message.payload);
                const { hand, gameState: initialGameState } = message.payload;
                if (initialGameState) {
                    setGameState(initialGameState);
                    setIsMyTurn(initialGameState.currentPlayerId === playerId);
                }
                if (hand) {
                    setPlayerHand(hand.map((card) => ({ ...card, selected: false })));
                }
                setIsLoading(false);
            }
        });
        // Register WebSocket handlers
        const unregisterGameStateUpdate = registerHandler("game-state-update", (message) => {
            if (message.type === "GAME_STATE_UPDATE") {
                const { hand, gameState: newGameState } = message.payload;
                if (hand) {
                    setPlayerHand(hand.map((card) => ({ ...card, selected: false })));
                }
                if (newGameState) {
                    setGameState(newGameState);
                    setIsMyTurn(newGameState.currentPlayerId === playerId);
                }
            }
        });
        const unregisterCardsPlayed = registerHandler("cards-played", (message) => {
            if (message.type === "CARDS_PLAYED") {
                const { playerName: pName, cardCount, claimedRank, gameState: newGameState, } = message.payload;
                setLastPlay({
                    player: pName,
                    cardCount,
                    claimedRank,
                });
                if (newGameState) {
                    setGameState(newGameState);
                    setIsMyTurn(newGameState.currentPlayerId === playerId);
                    setCanChallenge(pName !== playerName);
                }
            }
        });
        const unregisterChallengeResult = registerHandler("challenge-result", (message) => {
            if (message.type === "CHALLENGE_RESULT") {
                const { challengerName, wasLying, playerName: lastPlayerName, gameState: newGameState, } = message.payload;
                let toastType = "info";
                // Don't reveal cards, just show who was right/wrong
                let resultMessage = "";
                if (wasLying && lastPlayerName === playerName) {
                    resultMessage = `You were caught lying! Learn to play!.`;
                    toastType = "error";
                }
                else if (wasLying && challengerName === playerName) {
                    resultMessage = `You were right! ${lastPlayerName} was lying.`;
                    toastType = "success";
                }
                else if (!wasLying && lastPlayerName === playerName) {
                    resultMessage = `You were telling the truth! Well played, ${challengerName} was wrong.`;
                    toastType = "success";
                }
                else if (!wasLying && challengerName === playerName) {
                    resultMessage = `You were wrong! ${lastPlayerName} was telling the truth.`;
                    toastType = "error";
                }
                else {
                    resultMessage = wasLying
                        ? `${challengerName} was right! ${lastPlayerName} was lying.`
                        : `${challengerName} was wrong! ${lastPlayerName} was telling the truth.`;
                }
                // Show toast notification
                if (toastType === "error") {
                    toast.error(resultMessage);
                }
                else if (toastType === "success") {
                    toast.success(resultMessage);
                }
                else {
                    toast(resultMessage);
                }
                // Add system message to chat
                const systemMessage = {
                    id: `system-${Date.now()}${Math.random()}`,
                    playerId: "system",
                    playerName: "System",
                    message: resultMessage,
                    timestamp: Date.now(),
                    isSystem: true,
                };
                setSystemMessages((prev) => [...prev, systemMessage]);
                setLastPlay(null);
                setCanChallenge(false);
                if (newGameState) {
                    setGameState(newGameState);
                    setIsMyTurn(newGameState.currentPlayerId === playerId);
                }
            }
        });
        const unregisterGameEnded = registerHandler("game-ended", (message) => {
            if (message.type === "GAME_ENDED") {
                const { winners, loser, gameState: finalState } = message.payload;
                const winnerNames = winners
                    .map((id) => finalState?.players?.find((p) => p.id === id)?.name ||
                    "Unknown")
                    .join(", ");
                const loserName = finalState?.players?.find((p) => p.id === loser)?.name ||
                    "Unknown";
                // Show dialog instead of alert
                setGameEndedDialog({
                    open: true,
                    winners: winnerNames.split(", "),
                    loser: loserName,
                    playerStats: finalState?.playerStats,
                });
                // Also show toast
                toast.success(`Game Over! Winners: ${winnerNames}`);
                // Add system message to chat
                const systemMessage = {
                    id: `system-${Date.now()}`,
                    playerId: "system",
                    playerName: "System",
                    message: `Game Over! Winners: ${winnerNames}. Loser: ${loserName}`,
                    timestamp: Date.now(),
                    isSystem: true,
                };
                setSystemMessages((prev) => [...prev, systemMessage]);
            }
        });
        const unregisterError = registerHandler("error", (message) => {
            if (message.type === "ERROR") {
                setError(message.payload.message);
                setTimeout(() => setError(null), 3000);
            }
        });
        return () => {
            unregisterInitialState();
            unregisterGameStateUpdate();
            unregisterCardsPlayed();
            unregisterChallengeResult();
            unregisterGameEnded();
            unregisterError();
        };
    }, [registerHandler, navigate, playerId, playerName, lastPlay]);
    // Convert gameState players to Player[] format for voice chat
    const playersForVoice = gameState
        ? gameState.players.map((p) => ({
            id: p.id,
            name: p.name,
            isReady: true,
            isConnected: p.isConnected,
            isBot: p.isBot,
        }))
        : [];
    // Determine if current player is host (first player in the list)
    const isHost = !!(gameState &&
        gameState.players.length > 0 &&
        gameState.players[0].id === playerId);
    // Update players list when game state changes
    useEffect(() => {
        if (!gameState)
            return;
        const updatedPlayers = gameState.playerOrder.map((id) => {
            const playerData = gameState.players.find((p) => p.id === id);
            return {
                id,
                name: playerData?.name || "Unknown",
                cardCount: gameState.playerHandCounts[id] || 0,
                isCurrentTurn: id === gameState.currentPlayerId,
                isBot: playerData?.isBot || false,
                isConnected: playerData?.isConnected || false,
                isReady: playerData?.isReady || false,
            };
        });
        setPlayers(updatedPlayers);
    }, [gameState]);
    const handleCardSelect = (cardId) => {
        setPlayerHand((prev) => prev.map((card) => card.id === cardId ? { ...card, selected: !card.selected } : card));
        setSelectedCards((prev) => prev.includes(cardId)
            ? prev.filter((id) => id !== cardId)
            : [...prev, cardId]);
    };
    const handlePlayCards = (selectedCardIds, claimedRank) => {
        if (selectedCardIds.length === 0 || !claimedRank)
            return;
        sendMessage({
            type: "PLAY_CARDS",
            payload: {
                cardIds: selectedCardIds,
                claimedRank: claimedRank,
            },
        });
        // Clear selection
        setSelectedCards([]);
    };
    const handleChallenge = () => {
        sendMessage({
            type: "CHALLENGE",
            payload: {
                challengerId: playerId,
            },
        });
    };
    const handleLeaveGame = () => {
        navigate("/");
    };
    // Show loading state while fetching game data
    if (isLoading || !gameState) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center", children: _jsx(Card, { className: "w-96", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "text-center space-y-4", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" }), _jsx("p", { className: "text-gray-600", children: "Loading game..." }), !isConnected && (_jsx("p", { className: "text-yellow-600 text-sm", children: "Connecting to server..." }))] }) }) }) }));
    }
    const content = (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4", children: [_jsxs("div", { className: "max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\uD83C\uDCCF Tekthib Game" }), _jsx("p", { className: "text-gray-600", children: isMyTurn ? "Your turn!" : "Waiting for other players..." }), error && _jsx("p", { className: "text-red-600 text-sm mt-1", children: error }), !isConnected && (_jsx("p", { className: "text-yellow-600 text-sm mt-1", children: "Connecting to server..." }))] }), _jsx(Button, { variant: "outline", onClick: handleLeaveGame, children: "Leave Game" })] }), _jsxs("div", { className: "grid lg:grid-cols-4 gap-6", children: [_jsxs("div", { className: "lg:col-span-3 space-y-6", children: [_jsx(GameBoard, { lastPlay: lastPlay, pileCount: gameState.pileCount, currentPlayer: players.find((p) => p.isCurrentTurn)?.name || "", canChallenge: canChallenge, onChallenge: handleChallenge }), _jsx(PlayerHand, { cards: playerHand, lastPlay: lastPlay, onCardSelect: handleCardSelect, onPlayCards: handlePlayCards, isMyTurn: isMyTurn, selectedCards: selectedCards })] }), _jsxs("div", { className: "space-y-4", children: [_jsx(PlayerList, { players: players, currentPlayerId: playerId }), roomId && playerId && (_jsx(VoiceChat, { players: playersForVoice, localPlayerId: playerId })), playerId && playerName && (_jsx(ChatBox, { playerName: playerName, playerId: playerId, systemMessages: systemMessages })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Quick Rules" }) }), _jsxs(CardContent, { className: "text-sm space-y-2", children: [_jsx("div", { children: "\u2022 Play cards face-down and claim a rank" }), _jsx("div", { children: "\u2022 You can bluff (lie about the rank)" }), _jsx("div", { children: "\u2022 Others can challenge by calling \"Liar!\"" }), _jsx("div", { children: "\u2022 Wrong challenger takes the pile" }), _jsx("div", { children: "\u2022 First to empty hand wins!" })] })] })] })] })] }), _jsx(Dialog, { open: gameEndedDialog.open, onOpenChange: (open) => {
                    setGameEndedDialog({ ...gameEndedDialog, open });
                    if (!open) {
                        navigate("/");
                    }
                }, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\uD83C\uDF89 Game Over!" }), _jsx(DialogDescription, { children: "The game has ended. Here are the results:" })] }), _jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-green-600 mb-2", children: "\uD83C\uDFC6 Winners:" }), _jsx("ul", { className: "list-disc list-inside space-y-1", children: gameEndedDialog.winners.map((winner, idx) => (_jsx("li", { className: "text-lg", children: winner }, idx))) })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-red-600 mb-2", children: "\uD83D\uDE22 Loser:" }), _jsx("p", { className: "text-lg", children: gameEndedDialog.loser })] }), gameEndedDialog.playerStats && gameState && (_jsxs("div", { className: "mt-6", children: [_jsx("h3", { className: "font-semibold text-blue-600 mb-3", children: "\uD83D\uDCCA Player Statistics" }), _jsx("div", { className: "space-y-3", children: gameState.players.map((player) => {
                                                const stats = gameEndedDialog.playerStats?.[player.id];
                                                if (!stats)
                                                    return null;
                                                return (_jsxs("div", { className: "border rounded-lg p-3 bg-gray-50", children: [_jsx("h4", { className: "font-semibold mb-2", children: player.name }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\uD83E\uDD25 Caught Bluffing:" }), _jsx("span", { className: "font-semibold", children: stats.timesCaughtBluffing })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\uD83D\uDE0E Successful Bluffs:" }), _jsx("span", { className: "font-semibold", children: stats.timesBluffedSuccessfully })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\u274C False Accusations:" }), _jsx("span", { className: "font-semibold", children: stats.timesFalselyAccused })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\u2705 Told Truth:" }), _jsx("span", { className: "font-semibold", children: stats.timesToldTruth })] })] })] }, player.id));
                                            }) })] }))] }), _jsx(DialogFooter, { children: _jsx(Button, { onClick: () => {
                                    setGameEndedDialog({ ...gameEndedDialog, open: false });
                                    navigate("/");
                                }, children: "Return to Home" }) })] }) })] }));
    // Wrap with VoiceChatProvider to maintain voice connections
    if (roomId && playerId) {
        return (_jsx(VoiceChatProvider, { roomId: roomId, localPlayerId: playerId, players: playersForVoice, isHost: isHost, children: content }));
    }
    return content;
}
