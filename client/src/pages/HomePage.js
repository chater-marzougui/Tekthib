import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Seo from "@/components/SEO";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
export default function HomePage() {
    const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
    const [roomCode, setRoomCode] = useState("");
    const [rooms, setRooms] = useState([]);
    const [isPublicRoom, setIsPublicRoom] = useState(true);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [roomPassword, setRoomPassword] = useState("");
    const navigate = useNavigate();
    // Fetch rooms on component mount and periodically
    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);
    const fetchRooms = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/rooms`);
            if (response.ok) {
                const data = await response.json();
                setRooms(data);
            }
        }
        catch (error) {
            console.error("Failed to fetch rooms:", error);
        }
    };
    const handleCreateRoom = () => {
        if (!playerName.trim())
            return;
        localStorage.setItem("playerName", playerName);
        // Pass isPublic as query parameter
        navigate(`/room/create?isPublic=${isPublicRoom}`);
    };
    const handleJoinRoom = () => {
        if (!playerName.trim() || !roomCode.trim())
            return;
        localStorage.setItem("playerName", playerName);
        console.log("Based on server URL:", SERVER_URL);
        fetch(`${SERVER_URL}/api/rooms/${roomCode.trim().toUpperCase()}`)
            .then(async (response) => {
            const data = await response.json().catch(() => ({})); // fallback if no body
            if (!response.ok) {
                throw new Error(data.error || "Unknown error");
            }
            if (data.inProgress) {
                throw new Error("Cannot join, game already in progress");
            }
            return data;
        })
            .then(() => {
            navigate(`/room/${roomCode}`);
        })
            .catch((error) => {
            toast.error(`❌ ${error.message}`);
        });
    };
    const handleRoomClick = (room) => {
        if (!playerName.trim()) {
            toast.error("Please enter your name first");
            return;
        }
        if (room.inProgress) {
            toast.error("Game already in progress");
            return;
        }
        localStorage.setItem("playerName", playerName);
        if (room.isPublic && room.code) {
            // Public room - join directly
            navigate(`/room/${room.code}`);
        }
        else {
            // Private room - ask for password
            setShowPasswordDialog(true);
        }
    };
    const handlePrivateRoomJoin = () => {
        if (!roomPassword.trim()) {
            toast.error("Please enter the room password");
            return;
        }
        // For private rooms, the password is the room code
        fetch(`${SERVER_URL}/api/rooms/${roomPassword.trim().toUpperCase()}`)
            .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || "Invalid password");
            }
            if (data.inProgress) {
                throw new Error("Cannot join, game already in progress");
            }
            return data;
        })
            .then(() => {
            navigate(`/room/${roomPassword.trim().toUpperCase()}`);
            setShowPasswordDialog(false);
            setRoomPassword("");
        })
            .catch((error) => {
            toast.error(`❌ ${error.message}`);
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx(Seo, { title: "Tekthib - Tunisian Online Card Game", description: "Play Tekthib, the ultimate Tunisian bluffing card game online! Create rooms, invite friends, and master the art of deception.", keywords: "Tekthib, Tunisian card game, online card game, bluffing game, multiplayer", image: "/og-image.png", url: "https://tekthib.com" }), _jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-2xl space-y-8", children: [_jsxs("div", { className: "text-center space-y-4", children: [_jsx("h1", { className: "text-5xl font-bold text-gray-900 mb-2", children: "\uD83C\uDCCF Tekthib" }), _jsx("p", { className: "text-xl text-gray-600 mb-4", children: "Tunisian Online Card Game" }), _jsx("p", { className: "text-lg text-gray-500 max-w-lg mx-auto", children: "Play smart, bluff well, and be the first to get rid of all your cards. Challenge your friends in this exciting game of deception and strategy!" })] }), _jsxs("div", { className: "grid md:grid-cols-2 gap-6", children: [_jsxs(Card, { className: "hover:shadow-lg transition-shadow", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-center", children: "\uD83C\uDFAE Create Room" }), _jsx(CardDescription, { className: "text-center", children: "Start a new game and invite friends" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "create-name", children: "Your Name" }), _jsx(Input, { id: "create-name", value: playerName, onChange: (e) => setPlayerName(e.target.value), placeholder: "Enter your name" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Room Visibility" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: isPublicRoom ? "default" : "outline", onClick: () => setIsPublicRoom(true), className: "flex-1", children: "\uD83C\uDF0D Public" }), _jsx(Button, { type: "button", variant: !isPublicRoom ? "default" : "outline", onClick: () => setIsPublicRoom(false), className: "flex-1", children: "\uD83D\uDD12 Private" })] }), _jsx("p", { className: "text-xs text-gray-500", children: isPublicRoom
                                                                ? "Anyone can see and join your room"
                                                                : "Players need the room code to join" })] }), _jsx(Button, { className: "w-full", onClick: handleCreateRoom, disabled: !playerName.trim(), children: "Create New Room" })] })] }), _jsxs(Card, { className: "hover:shadow-lg transition-shadow", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-center", children: "\uD83D\uDEAA Join Room" }), _jsx(CardDescription, { className: "text-center", children: "Join an existing game with a room code" })] }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "join-name", children: "Your Name" }), _jsx(Input, { id: "join-name", value: playerName, onChange: (e) => setPlayerName(e.target.value), placeholder: "Enter your name" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "room-code", children: "Room Code" }), _jsx(Input, { id: "room-code", value: roomCode, onChange: (e) => setRoomCode(e.target.value.toUpperCase()), placeholder: "ABCD1234", maxLength: 8 })] }), _jsx(Button, { variant: "outline", className: "w-full", onClick: handleJoinRoom, disabled: !playerName.trim() || !roomCode.trim(), children: "Join Room" })] })] })] }), rooms.length > 0 && (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-center", children: "\uD83C\uDFAE Available Rooms" }), _jsx(CardDescription, { className: "text-center", children: "Click on a room to join" })] }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2 max-h-96 overflow-y-auto", children: rooms.map((room) => (_jsx("div", { onClick: () => handleRoomClick(room), className: `p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${room.inProgress ? "opacity-50 cursor-not-allowed" : ""}`, children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-semibold", children: [room.hostName, "'s Room"] }), room.isPublic ? (_jsx("span", { className: "text-xs bg-green-100 text-green-800 px-2 py-1 rounded", children: "\uD83C\uDF0D Public" })) : (_jsx("span", { className: "text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded", children: "\uD83D\uDD12 Private" })), room.inProgress && (_jsx("span", { className: "text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded", children: "In Progress" }))] }), _jsxs("div", { className: "text-sm text-gray-600", children: ["\uD83D\uDC65 ", room.playerCount, "/", room.maxPlayers] })] }) }, room.id))) }) })] })), _jsxs(Card, { className: "border-dashed", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-center", children: "\uD83D\uDCD6 Quick Rules" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid md:grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold mb-2", children: "\uD83C\uDFAF Goal" }), _jsx("p", { className: "text-gray-600", children: "Be the first to get rid of all your cards. Last player with cards loses." })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold mb-2", children: "\uD83C\uDCCF Gameplay" }), _jsx("p", { className: "text-gray-600", children: "Play cards face-down and announce a rank. Others can challenge if they think you're lying!" })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold mb-2", children: "\uD83E\uDD25 Bluffing" }), _jsx("p", { className: "text-gray-600", children: "You don't need the cards you claim to have. Bluff wisely!" })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold mb-2", children: "\uD83C\uDFC6 Special Rule" }), _jsx("p", { className: "text-gray-600", children: "Collect all 4 cards of the same rank to remove them permanently." })] })] }) })] })] }) }), _jsx(Dialog, { open: showPasswordDialog, onOpenChange: setShowPasswordDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Join Private Room" }), _jsx(DialogDescription, { children: "This is a private room. Please enter the room code (password) to join." })] }), _jsx("div", { className: "space-y-4 py-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "room-password", children: "Room Code" }), _jsx(Input, { id: "room-password", value: roomPassword, onChange: (e) => setRoomPassword(e.target.value.toUpperCase()), placeholder: "Enter room code", maxLength: 8, onKeyPress: (e) => {
                                            if (e.key === 'Enter') {
                                                handlePrivateRoomJoin();
                                            }
                                        } })] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => {
                                        setShowPasswordDialog(false);
                                        setRoomPassword("");
                                    }, children: "Cancel" }), _jsx(Button, { onClick: handlePrivateRoomJoin, children: "Join Room" })] })] }) })] }));
}
