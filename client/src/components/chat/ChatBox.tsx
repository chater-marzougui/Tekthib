import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { useWebRTCContext } from "@/context/WebRTCContext";
import type { WSMessage } from "shared";
import { Icon } from "@iconify/react";
import { useTextDirection } from "@/hooks/useTextDirection";

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
  systemMessageColor?: string;
  isBotMessage?: boolean; // Flag to indicate this is a bot message with i18n key
}

interface ChatBoxProps {
  playerName: string;
  playerId: string;
  systemMessages?: ChatMessage[];
  players?: Array<{ id: string; name: string; isBot: boolean }>;
}

function isDuplicateMessage(
  messages: ChatMessage[],
  newMessage: ChatMessage
): boolean {
  return (
    messages.some((msg) => msg.id === newMessage.id) ||
    messages.some(
      (msg) =>
        msg.timestamp === newMessage.timestamp &&
        msg.playerId === newMessage.playerId &&
        msg.message === newMessage.message
    )
  );
}

interface SystemMessageStyle {
  containerClass: string;
  textColor: string;
  timeColor: string;
}

function getSystemMessageStyleClass(
  color: string | undefined
): SystemMessageStyle {
  switch (color) {
    case "red":
      return {
        containerClass: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        timeColor: "text-red-600",
      };
    case "green":
      return {
        containerClass: "bg-green-50 border-green-200",
        textColor: "text-green-800",
        timeColor: "text-green-600",
      };
    case "blue":
    default:
      return {
        containerClass: "bg-blue-50 border-blue-200",
        textColor: "text-blue-800",
        timeColor: "text-blue-600",
      };
  }
}

export default function ChatBox({
  playerName,
  playerId,
  systemMessages = [],
  players = [],
}: Readonly<ChatBoxProps>) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { registerHandler } = useWebSocketContext();
  const { sendChatMessage, chatMessages } = useWebRTCContext();
  const direction = useTextDirection();

  // Get user settings from localStorage
  const showBotMessages = localStorage.getItem("showBotMessages") !== "false";
  const showSystemMessages =
    localStorage.getItem("showSystemMessages") !== "false";

  // Helper to check if a player is a bot
  const isPlayerBot = (messagePlayerId: string) => {
    return players.some((p) => p.id === messagePlayerId && p.isBot);
  };

  // Merge WebRTC chat messages with bot messages
  useEffect(() => {
    // Convert WebRTC chat messages to ChatMessage format
    const webrtcMessages: ChatMessage[] = chatMessages.map((msg) => ({
      id: `${msg.timestamp}-${msg.playerId}`,
      playerId: msg.playerId,
      playerName: msg.playerName,
      message: msg.message,
      timestamp: msg.timestamp,
      isBotMessage: false,
    }));

    setMessages((prev) => {
      // Merge with existing messages (bot messages)
      const merged = [...prev];
      for (const msg of webrtcMessages) {
        const exists = merged.some((m) => m.id === msg.id);
        if (!exists) {
          merged.push(msg);
        }
      }
      return merged;
    });
  }, [chatMessages]);

  // Filter messages based on settings
  const filteredMessages = [...messages, ...systemMessages]
    .filter((msg) => {
      // Filter system messages
      if (msg.isSystem && !showSystemMessages) {
        return false;
      }
      // Filter bot messages
      if (!msg.isSystem && isPlayerBot(msg.playerId) && !showBotMessages) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const allMessages = filteredMessages;

  const messageHandlerRef = useRef<(message: WSMessage) => void>(null);

  // Handle bot messages from WebSocket
  useEffect(() => {
    messageHandlerRef.current = (message) => {
      if (message.type === "CHAT_MESSAGE") {
        // Only handle bot messages via WebSocket
        if (message.payload.isBotMessage) {
          const chatMessage: ChatMessage = {
            id: `${message.timestamp}-${message.payload.playerId}`,
            playerId: message.payload.playerId,
            playerName: message.payload.playerName,
            message: message.payload.message,
            timestamp: message.timestamp || Date.now(),
            isBotMessage: true,
          };

          setMessages((prev) => {
            const isDuplicate = isDuplicateMessage(prev, chatMessage);
            if (isDuplicate) {
              return prev;
            }
            return [...prev, chatMessage];
          });
        }
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
    if (!inputMessage.trim()) return;

    // Send message through WebRTC data channels
    sendChatMessage(inputMessage.trim(), playerName);

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Scroll to bottom only when user is already at bottom (or on first render)
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isScrolledToBottom = 
        container.scrollHeight - container.scrollTop <= container.clientHeight + 50; // 50px threshold
      
      // Auto-scroll if user is at the bottom or if there are very few messages (initial load)
      if (isScrolledToBottom || allMessages.length <= 1) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [allMessages]);

  return (
    <Card
      className="h-96 flex flex-col w-full pt-3 pb-1 max-w-84"
      dir={direction}
    >
      <CardHeader className="flex-shrink-0">
        <CardTitle>{t("chat.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto space-y-4 p-4 border-t bg-transparent"
          style={{
            scrollbarColor: "#5b35c7 transparent",
          }}
        >
          {allMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("chat.noMessages")}
            </div>
          ) : (
            allMessages.map((msg) => {
              if (msg.isSystem) {
                const { containerClass, textColor, timeColor } =
                  getSystemMessageStyleClass(msg.systemMessageColor);
                return (
                  <div
                    key={msg.id}
                    className={`flex p-1 justify-center rounded-lg my-2 ${containerClass}`}
                  >
                    <div className={`p-2 max-w-md ${containerClass}`}>
                      <div
                        className={`text-sm text-center ${textColor} font-medium`}
                      >
                        {msg.message}
                      </div>
                      <div className={`text-xs text-center ${timeColor} mt-1`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              const isCurrentUser = msg.playerId === playerId;
              const playerInitials = msg.playerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2);

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>{playerInitials}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`flex flex-col gap-1 ${
                      isCurrentUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md rounded-lg px-3 py-2 text-sm break-words ${
                        isCurrentUser
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted text-muted-foreground rounded-bl-none"
                      }`}
                    >
                      {!isCurrentUser && (
                        <div className="text-xs font-semibold mb-1">
                          {msg.playerName}
                        </div>
                      )}
                      {msg.isBotMessage ? t(msg.message) : msg.message}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-2 p-2 border-t" dir="ltr">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyUp={handleKeyPress}
            placeholder={t("chat.typeMessage")}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
            dir={direction}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <Icon icon="mdi:send" className="h-4 w-4" />
            <span className="sr-only">{t("chat.sendMessage")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
