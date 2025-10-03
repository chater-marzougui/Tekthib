import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
export default function AdminPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [systemState, setSystemState] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const fetchSystemState = async (pwd) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/system-state?password=${encodeURIComponent(pwd)}`);
            if (response.status === 401) {
                toast.error("Invalid admin password");
                setIsAuthenticated(false);
                return;
            }
            if (!response.ok) {
                throw new Error("Failed to fetch system state");
            }
            const data = await response.json();
            setSystemState(data);
            setIsAuthenticated(true);
        }
        catch (error) {
            console.error("Error fetching system state:", error);
            toast.error("Failed to fetch system state");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleLogin = (e) => {
        e.preventDefault();
        if (password.trim()) {
            fetchSystemState(password);
        }
    };
    // Auto-refresh every 5 seconds when authenticated
    useEffect(() => {
        if (isAuthenticated && autoRefresh && password) {
            const interval = setInterval(() => {
                fetchSystemState(password);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, autoRefresh, password]);
    // Login screen
    if (!isAuthenticated) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4", children: _jsxs(Card, { className: "w-96", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "\uD83D\uDD10 Admin Login" }), _jsx(CardDescription, { children: "Enter admin password to view system state" })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleLogin, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "Admin Password" }), _jsx(Input, { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Enter password", disabled: isLoading })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "submit", className: "flex-1", disabled: isLoading, children: isLoading ? "Checking..." : "Login" }), _jsx(Button, { type: "button", variant: "outline", onClick: () => navigate("/"), children: "Back" })] })] }) })] }) }));
    }
    // Admin dashboard
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4", children: _jsxs("div", { className: "max-w-7xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\uD83C\uDFAE System Admin Dashboard" }), _jsx("p", { className: "text-gray-600", children: "Real-time system state monitoring" })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsx(Button, { variant: "outline", onClick: () => setAutoRefresh(!autoRefresh), className: autoRefresh ? "bg-green-100" : "", children: autoRefresh ? "🔄 Auto-refresh ON" : "⏸️ Auto-refresh OFF" }), _jsx(Button, { onClick: () => fetchSystemState(password), disabled: isLoading, children: isLoading ? "Refreshing..." : "🔄 Refresh" }), _jsx(Button, { variant: "outline", onClick: () => {
                                        setIsAuthenticated(false);
                                        setPassword("");
                                        navigate("/");
                                    }, children: "Logout" })] })] }), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "\uD83C\uDFE0 Total Active Rooms" }) }), _jsx(CardContent, { children: _jsx("p", { className: "text-4xl font-bold text-blue-600", children: systemState?.totalRooms || 0 }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "\uD83D\uDC65 Total Players Online" }) }), _jsx(CardContent, { children: _jsx("p", { className: "text-4xl font-bold text-green-600", children: systemState?.totalPlayers || 0 }) })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Active Rooms" }), _jsx(CardDescription, { children: systemState?.rooms.length === 0
                                        ? "No active rooms"
                                        : `${systemState?.rooms.length} room(s) active` })] }), _jsx(CardContent, { children: systemState?.rooms.length === 0 ? (_jsx("p", { className: "text-center text-gray-500 py-8", children: "No rooms currently active" })) : (_jsx("div", { className: "space-y-4", children: systemState?.rooms.map((room) => (_jsxs(Card, { className: "bg-gray-50", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsxs(CardTitle, { className: "text-lg", children: ["Room Code: ", room.code] }), _jsxs(CardDescription, { children: ["Created: ", new Date(room.createdAt).toLocaleString()] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-sm font-medium", children: ["Players: ", room.playerCount, "/", room.maxPlayers] }), room.gameState && (_jsx("div", { className: "text-xs text-green-600 font-medium", children: "\uD83C\uDFAE Game in Progress" }))] })] }) }), _jsxs(CardContent, { className: "space-y-4", children: [room.gameState && (_jsxs("div", { className: "bg-white p-3 rounded border", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Game State" }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { children: ["Phase:", " ", _jsx("span", { className: "font-medium", children: room.gameState.phase })] }), _jsxs("div", { children: ["Current Player:", " ", _jsxs("span", { className: "font-medium", children: ["Player ", room.gameState.currentPlayerIndex + 1] })] }), _jsxs("div", { children: ["Pile Count:", " ", _jsx("span", { className: "font-medium", children: room.gameState.pileCount })] }), _jsxs("div", { children: ["Current Rank:", " ", _jsx("span", { className: "font-medium", children: room.gameState.currentRank || "None" })] })] })] })), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold mb-2", children: "Players" }), _jsx("div", { className: "space-y-2", children: room.players.map((player, idx) => (_jsxs("div", { className: "flex justify-between items-center bg-white p-2 rounded border", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-medium", children: ["#", idx + 1] }), _jsx("span", { children: player.name }), player.id === room.hostId && (_jsx("span", { className: "text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded", children: "HOST" }))] }), _jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: player.isConnected
                                                                                    ? "text-green-600"
                                                                                    : "text-red-600", children: player.isConnected
                                                                                    ? "🟢 Online"
                                                                                    : "🔴 Offline" }), _jsx("span", { className: player.isReady
                                                                                    ? "text-green-600"
                                                                                    : "text-gray-500", children: player.isReady ? "✓ Ready" : "⏳ Not Ready" }), room.gameState && (_jsxs("span", { className: "text-blue-600", children: ["\uD83C\uDCCF ", player.cardCount, " cards"] }))] })] }, player.id))) })] })] })] }, room.id))) })) })] })] }) }));
}
