import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, UserX, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVoiceChatContext } from "@/context/VoiceChatContext";
export default function VoiceChat({ players, localPlayerId, }) {
    const { isVoiceEnabled, isMuted, audioError, mutedPlayers, hostMutedPlayers, hostMuted, isHost, enableVoiceChat, disableVoiceChat, toggleMute, togglePlayerMute, kickPlayer, mutePlayerMic, } = useVoiceChatContext();
    const handleToggleVoice = () => {
        if (isVoiceEnabled) {
            disableVoiceChat();
        }
        else {
            enableVoiceChat();
        }
    };
    // Get other players (not self, not bots)
    const otherPlayers = players.filter((p) => p.id !== localPlayerId && !p.isBot && p.isConnected);
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Phone, { className: "w-5 h-5" }), "Voice Chat"] }) }), _jsxs(CardContent, { className: "space-y-3", children: [audioError && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm", children: audioError })), _jsxs("div", { className: "space-y-2", children: [_jsx(Button, { onClick: handleToggleVoice, className: `w-full ${isVoiceEnabled
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-blue-600 hover:bg-blue-700"}`, size: "lg", children: isVoiceEnabled ? (_jsxs(_Fragment, { children: [_jsx(PhoneOff, { className: "w-4 h-4 mr-2" }), "Leave Voice Chat"] })) : (_jsxs(_Fragment, { children: [_jsx(Phone, { className: "w-4 h-4 mr-2" }), "Join Voice Chat"] })) }), isVoiceEnabled && (_jsx(Button, { onClick: toggleMute, variant: "outline", className: `w-full ${isMuted ? "bg-red-50 border-red-300" : ""}`, size: "lg", disabled: hostMuted, children: isMuted ? (_jsxs(_Fragment, { children: [_jsx(MicOff, { className: "w-4 h-4 mr-2" }), hostMuted ? "Muted by Host" : "Unmute"] })) : (_jsxs(_Fragment, { children: [_jsx(Mic, { className: "w-4 h-4 mr-2" }), "Mute"] })) }))] }), isVoiceEnabled && (_jsxs("div", { className: "text-xs text-gray-600 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full animate-pulse" }), _jsx("span", { children: "Voice chat active" })] }), isMuted && (_jsxs("div", { className: "flex items-center gap-2 text-red-600", children: [_jsx(MicOff, { className: "w-3 h-3" }), _jsx("span", { children: "Your microphone is muted" })] })), hostMuted && (_jsxs("div", { className: "flex items-center gap-2 text-orange-600", children: [_jsx(MicOff, { className: "w-3 h-3" }), _jsx("span", { children: "Host has disabled your microphone" })] }))] })), isVoiceEnabled && otherPlayers.length > 0 && (_jsxs("div", { className: "pt-3 border-t space-y-2", children: [_jsxs("div", { className: "text-xs font-semibold text-gray-700", children: ["Connected Players (", otherPlayers.length, ")"] }), _jsx("div", { className: "space-y-1 max-h-48 overflow-y-auto", children: otherPlayers.map((player) => {
                                    const isPlayerMuted = mutedPlayers.has(player.id);
                                    const isPlayerHostMuted = hostMutedPlayers.has(player.id);
                                    return (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded text-sm", children: [_jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${player.isConnected ? "bg-green-500" : "bg-gray-400"}` }), _jsx("span", { className: "truncate font-medium", children: player.name })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", className: "h-7 w-7 p-0", onClick: () => togglePlayerMute(player.id), title: isPlayerMuted
                                                            ? `Unmute ${player.name}`
                                                            : `Mute ${player.name}`, children: isPlayerMuted ? (_jsx(VolumeX, { className: "w-4 h-4 text-red-600" })) : (_jsx(Volume2, { className: "w-4 h-4 text-gray-600" })) }), isHost && (_jsxs(_Fragment, { children: [_jsx(Button, { size: "sm", variant: "ghost", className: "h-7 w-7 p-0", onClick: () => mutePlayerMic(player.id, !isPlayerHostMuted), title: `Mute ${player.name}'s microphone`, children: isPlayerHostMuted ? (_jsx(MicOff, { className: "w-4 h-4 text-orange-600" })) : (_jsx(Mic, { className: "w-4 h-4 text-gray-600" })) }), _jsx(Button, { size: "sm", variant: "ghost", className: "h-7 w-7 p-0", onClick: () => kickPlayer(player.id), title: `Kick ${player.name}`, children: _jsx(UserX, { className: "w-4 h-4 text-red-600" }) })] }))] })] }, player.id));
                                }) })] })), _jsx("div", { className: "text-xs text-gray-500 pt-2 border-t", children: isVoiceEnabled
                            ? `Connected to ${otherPlayers.length} player(s)`
                            : "Join to talk with other players" }), isHost && isVoiceEnabled && (_jsx("div", { className: "text-xs text-blue-600 pt-1", children: "\u2139\uFE0F As host, you can mute players or kick them" }))] })] }));
}
