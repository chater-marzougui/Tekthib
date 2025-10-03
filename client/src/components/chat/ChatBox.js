import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { SendHorizonal } from "lucide-react";
function isDuplicateMessage(messages, newMessage) {
    return (messages.some((msg) => msg.id === newMessage.id) ||
        messages.some((msg) => msg.timestamp === newMessage.timestamp &&
            msg.playerId === newMessage.playerId &&
            msg.message === newMessage.message));
}
export default function ChatBox({ playerName, playerId, systemMessages = [], }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const messagesEndRef = useRef(null);
    const { sendMessage, registerHandler } = useWebSocketContext();
    // Merge chat messages and system messages
    const allMessages = [...messages, ...systemMessages].sort((a, b) => a.timestamp - b.timestamp);
    const messageHandlerRef = useRef(null);
    useEffect(() => {
        messageHandlerRef.current = (message) => {
            if (message.type === "CHAT_MESSAGE") {
                const chatMessage = {
                    id: `${message.timestamp}-${message.payload.playerId}`,
                    playerId: message.payload.playerId,
                    playerName: message.payload.playerName,
                    message: message.payload.message,
                    timestamp: message.timestamp || Date.now(),
                };
                setMessages((prev) => {
                    const isDuplicate = isDuplicateMessage(prev, chatMessage);
                    if (isDuplicate) {
                        return prev;
                    }
                    return [...prev, chatMessage];
                });
            }
        };
    }, []);
    useEffect(() => {
        const unregister = registerHandler("chat-message", (message) => {
            messageHandlerRef.current?.(message);
        });
        return unregister;
    }, [registerHandler]);
    const handleSendMessage = () => {
        if (!inputMessage.trim())
            return;
        sendMessage({
            type: "CHAT_MESSAGE",
            payload: {
                message: inputMessage,
                playerId,
                playerName,
            },
        });
        setInputMessage("");
    };
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    };
    return (_jsxs(Card, { className: "h-96 flex flex-col", children: [_jsx(CardHeader, { className: "flex-shrink-0", children: _jsx(CardTitle, { children: "Chat" }) }), _jsxs(CardContent, { className: "flex-1 flex flex-col p-0 min-h-0", children: [_jsxs("div", { className: "flex-1 overflow-y-auto space-y-4 p-4", children: [allMessages.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground", children: "No messages yet. Start the conversation!" })) : (allMessages.map((msg) => {
                                // System message styling
                                if (msg.isSystem) {
                                    return (_jsx("div", { className: "flex justify-center my-2", children: _jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-md", children: [_jsx("div", { className: "text-sm text-center text-yellow-800 font-medium", children: msg.message }), _jsx("div", { className: "text-xs text-center text-yellow-600 mt-1", children: new Date(msg.timestamp).toLocaleTimeString([], {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    }) })] }) }, msg.id));
                                }
                                // Regular chat message styling
                                const isCurrentUser = msg.playerId === playerId;
                                const playerInitials = msg.playerName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .substring(0, 2);
                                return (_jsxs("div", { className: `flex items-end gap-2 ${isCurrentUser ? "justify-end" : "justify-start"}`, children: [!isCurrentUser && (_jsx(Avatar, { className: "h-8 w-8 flex-shrink-0", children: _jsx(AvatarFallback, { children: playerInitials }) })), _jsxs("div", { className: `flex flex-col gap-1 ${isCurrentUser ? "items-end" : "items-start"}`, children: [_jsxs("div", { className: `max-w-xs md:max-w-md rounded-lg px-3 py-2 text-sm break-words ${isCurrentUser
                                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                                        : "bg-muted text-muted-foreground rounded-bl-none"}`, children: [!isCurrentUser && (_jsx("div", { className: "text-xs font-semibold mb-1", children: msg.playerName })), msg.message] }), _jsx("div", { className: "text-xs text-muted-foreground", children: new Date(msg.timestamp).toLocaleTimeString([], {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    }) })] })] }, msg.id));
                            })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "flex items-center gap-2 p-2 border-t", children: [_jsx(Input, { value: inputMessage, onChange: (e) => setInputMessage(e.target.value), onKeyUp: handleKeyPress, placeholder: "Type a message...", className: "flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0", autoComplete: "off" }), _jsxs(Button, { onClick: handleSendMessage, disabled: !inputMessage.trim(), size: "icon", className: "flex-shrink-0", children: [_jsx(SendHorizonal, { className: "h-4 w-4" }), _jsx("span", { className: "sr-only", children: "Send message" })] })] })] })] }));
}
