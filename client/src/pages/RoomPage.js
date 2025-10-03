import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { useWebSocketContext } from "@/context/WebSocketContext";
import ChatBox from "@/components/chat/ChatBox";
import { toast } from "sonner";
import { VoiceChatProvider } from "@/context/VoiceChatContext";
import VoiceChat from "@/components/chat/VoiceChat";
import { Trash } from "lucide-react";
import { PlayerBadge } from "@/components/PlayerBadge";
function isDuplicatePlayer(players, newPlayer) {
    return players.some((p) => p.id === newPlayer.id);
}
export default function RoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { sendMessage, registerHandler, isConnected } = useWebSocketContext();
    const [players, setPlayers] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [roomCode, setRoomCode] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const playerName = localStorage.getItem("playerName") || "Unknown";
    const playerId = localStorage.getItem("clientId") || "";
    const roomCodeRef = useRef(roomCode);
    // Get isPublic from URL params if creating room
    const searchParams = new URLSearchParams(window.location.search);
    const isPublic = searchParams.get("isPublic") !== "false";
    useEffect(() => {
        roomCodeRef.current = roomCode;
    }, [roomCode]);
    useEffect(() => {
        if (!isConnected) {
            return;
        }
        // Register WebSocket message handlers
        const unregisterRoomCreated = registerHandler("room-created", (message) => {
            if (message.type === "ROOM_CREATED") {
                const { room } = message.payload;
                setRoomCode(room.code);
                setIsHost(true);
                setPlayers(room.players);
                // Update URL to reflect actual room code
                window.history.replaceState(null, "", `/room/${room.code}`);
            }
        });
        const unregisterRoomJoined = registerHandler("room-joined", (message) => {
            if (message.type === "ROOM_JOINED") {
                const { room } = message.payload;
                setRoomCode(room.code);
                setPlayers(room.players);
                setIsHost(room.hostId === playerId);
            }
        });
        const unregisterPlayerJoined = registerHandler("player-joined", (message) => {
            if (message.type === "PLAYER_JOINED") {
                const { player } = message.payload;
                setPlayers((prev) => {
                    if (!isDuplicatePlayer(prev, player)) {
                        return [...prev, player];
                    }
                    return prev;
                });
            }
        });
        const unregisterPlayerLeft = registerHandler("player-left", (message) => {
            if (message.type === "PLAYER_LEFT") {
                const { playerId: leftPlayerId, newHostId } = message.payload;
                setPlayers((prev) => prev.filter((p) => p.id !== leftPlayerId));
                if (newHostId && newHostId === playerId) {
                    setIsHost(true);
                }
            }
        });
        const unregisterGameStateUpdate = registerHandler("game-state-update", (message) => {
            if (message.type === "GAME_STATE_UPDATE") {
                const { playerId: updatedPlayerId, isReady: updatedReady } = message.payload;
                setPlayers((prev) => prev.map((p) => p.id === updatedPlayerId ? { ...p, isReady: updatedReady } : p));
            }
        });
        const unregisterGameStarted = registerHandler("game-started", (message) => {
            if (message.type === "GAME_STARTED") {
                const currentRoomCode = roomCodeRef.current || roomId;
                navigate(`/game/${currentRoomCode}`);
            }
        });
        const unregisterError = registerHandler("error", (message) => {
            if (message.type === "ERROR") {
                setError(message.payload.message);
                toast.error(`Error: ${message.payload.message}`);
            }
            if (message.payload.code === "ROOM_NOT_FOUND") {
                setTimeout(() => {
                    navigate("/");
                }, 2000);
            }
        });
        const unregisterBotsAdded = registerHandler("bots-added", (message) => {
            if (message.type === "BOTS_ADDED") {
                const { players: updatedPlayers } = message.payload;
                setPlayers(updatedPlayers);
                toast.success("Bots added successfully!");
            }
        });
        const unregisterBotRemoved = registerHandler("bot-removed", (message) => {
            if (message.type === "BOT_REMOVED") {
                const { players: updatedPlayers } = message.payload;
                setPlayers(updatedPlayers);
                toast.success("Bot removed successfully!");
            }
        });
        // Create or join room based on roomId parameter
        if (roomId === "create") {
            sendMessage({
                type: "CREATE_ROOM",
                payload: { playerName, maxPlayers: 10, isPublic },
            });
        }
        else {
            sendMessage({
                type: "JOIN_ROOM",
                payload: { roomCode: roomId || "", playerName },
            });
        }
        return () => {
            unregisterRoomCreated();
            unregisterRoomJoined();
            unregisterPlayerJoined();
            unregisterPlayerLeft();
            unregisterGameStateUpdate();
            unregisterGameStarted();
            unregisterError();
            unregisterBotsAdded();
            unregisterBotRemoved();
        };
    }, [
        roomId,
        isConnected,
        sendMessage,
        registerHandler,
        navigate,
        playerId,
        playerName,
    ]);
    const handleReadyToggle = () => {
        const newReadyState = !isReady;
        setIsReady(newReadyState);
        sendMessage({
            type: "READY",
            payload: { ready: newReadyState },
        });
    };
    const handleStartGame = () => {
        if (isHost && canStartGame) {
            sendMessage({
                type: "START_GAME",
                payload: {},
            });
        }
    };
    const handleLeaveRoom = () => {
        sendMessage({
            type: "LEAVE_ROOM",
            payload: { roomId: roomCode, playerId },
        });
        navigate("/");
    };
    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode);
        toast.success("Room code copied to clipboard!");
    };
    const handleAddBots = (count) => {
        if (isHost) {
            sendMessage({
                type: "ADD_BOTS",
                payload: { count },
            });
        }
    };
    const handleRemovePlayer = (Id, isBot) => {
        console.log("Removing player or bot:", Id, isBot);
        if (isHost) {
            sendMessage({
                type: isBot ? "REMOVE_BOT" : "KICK_PLAYER",
                payload: isBot ? { botId: Id } : { playerId: Id },
            });
        }
    };
    const canStartGame = isHost && players.length >= 3 && players.every((p) => p.isReady);
    // Wrap content with VoiceChatProvider if we have a room
    const content = (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4", children: _jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsxs("div", { className: "text-center space-y-2", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\uD83C\uDFAE Game Lobby" }), error && (_jsx("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative", children: error })), !isConnected && (_jsx("div", { className: "bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative", children: "Connecting to server..." })), _jsx("div", { className: "flex items-center justify-center gap-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-lg font-semibold", children: "Room Code:" }), _jsx(Button, { variant: "outline", onClick: copyRoomCode, className: "font-mono text-lg px-4 cursor-pointer", disabled: !roomCode, children: roomCode || "Loading..." })] }) })] }), _jsxs("div", { className: "grid lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { children: ["Players (", players.length, "/10)"] }), _jsx(CardDescription, { children: "Waiting for players to join and get ready..." })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-3", children: [players.map((player) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-background rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(PlayerBadge, { player: player, playerId: playerId }), _jsxs("div", { children: [_jsxs("div", { className: "font-medium", children: [player.name, player.id === playerId && " (You)", player.isBot && " 🤖"] }), player.id === players[0]?.id && (_jsx("div", { className: "text-xs text-gray-500", children: "Host" }))] })] }), _jsxs("div", { className: "flex items-center", children: [isHost && (_jsx(Button, { variant: "ghost", size: "sm", className: "text-red-600 cursor-pointer", onClick: () => handleRemovePlayer(player.id, player.isBot || false), children: _jsx(Trash, { className: "w-4 h-4" }) })), _jsx(Button, { variant: "ghost", className: "flex items-center gap-2 cursor-pointer", onClick: handleReadyToggle, disabled: player.id !== playerId, children: player.isReady ? (_jsx("span", { className: "px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium", children: "Ready \u2713" })) : (_jsx("span", { className: "px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium", children: "Not Ready" })) })] })] }, player.id))), Array.from({ length: Math.max(0, 6 - players.length) }).map((_, index) => (_jsx("div", { className: "flex items-center p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300", children: _jsx("div", { className: "text-gray-400", children: "Waiting for player..." }) }, `empty-${index}-slot`)))] }) })] }), playerId && playerName && (_jsx(ChatBox, { playerName: playerName, playerId: playerId }))] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Your Status" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-sm text-gray-600 mb-2", children: "Playing as:" }), _jsx("div", { className: "font-semibold text-lg", children: playerName })] }), _jsx(Button, { onClick: handleReadyToggle, className: `w-full ${isReady ? "bg-green-600 hover:bg-green-700" : ""}`, variant: isReady ? "default" : "outline", children: isReady ? "✓ Ready!" : "Mark as Ready" })] })] }), roomCode && playerId && (_jsx(VoiceChat, { players: players, localPlayerId: playerId })), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Game Controls" }) }), _jsxs(CardContent, { className: "space-y-4", children: [isHost && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Add Bot Players" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: () => handleAddBots(1), disabled: players.length >= 10, variant: "outline", size: "sm", className: "flex-1", children: "+1 Bot" }), _jsx(Button, { onClick: () => handleAddBots(2), disabled: players.length >= 9, variant: "outline", size: "sm", className: "flex-1", children: "+2 Bots" }), _jsx(Button, { onClick: () => handleAddBots(3), disabled: players.length >= 8, variant: "outline", size: "sm", className: "flex-1", children: "+3 Bots" })] })] }), _jsx(Button, { onClick: handleStartGame, disabled: !canStartGame, className: "w-full", size: "lg", children: canStartGame
                                                                ? "🚀 Start Game"
                                                                : "Waiting for players..." })] })), _jsx(Button, { variant: "outline", onClick: handleLeaveRoom, className: "w-full", children: "Leave Room" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Game Requirements" }) }), _jsxs(CardContent, { className: "text-sm space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Min Players:" }), _jsx("span", { className: "font-medium", children: "3" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Max Players:" }), _jsx("span", { className: "font-medium", children: "10" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Cards per deck:" }), _jsx("span", { className: "font-medium", children: "108" })] }), _jsx("div", { className: "text-xs text-gray-500 mt-3", children: "All players must be ready before the host can start the game." })] })] })] })] })] }) }));
    // Wrap with VoiceChatProvider if room is active
    if (roomCode && playerId) {
        return (_jsx(VoiceChatProvider, { roomId: roomCode, localPlayerId: playerId, players: players, isHost: isHost, children: content }));
    }
    return content;
}
