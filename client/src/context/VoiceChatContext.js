import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";
const VoiceChatContext = createContext(null);
export function VoiceChatProvider({ children, roomId, localPlayerId, players, isHost = false, }) {
    const voiceChat = useVoiceChat({ roomId, localPlayerId, players, isHost });
    return (_jsx(VoiceChatContext.Provider, { value: voiceChat, children: children }));
}
export function useVoiceChatContext() {
    const context = useContext(VoiceChatContext);
    if (!context) {
        throw new Error("useVoiceChatContext must be used within a VoiceChatProvider");
    }
    return context;
}
