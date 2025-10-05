import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebSocketContext } from "@/context/WebSocketContext";
import type { WSMessage } from "shared";
import { SendHorizonal } from "lucide-react";

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
  systemMessageColor?: string;
}

interface ChatBoxProps {
  playerName: string;
  playerId: string;
  systemMessages?: ChatMessage[];
}

function isDuplicateMessage(
  messages: ChatMessage[],
  newMessage: ChatMessage,
): boolean {
  return (
    messages.some((msg) => msg.id === newMessage.id) ||
    messages.some(
      (msg) =>
        msg.timestamp === newMessage.timestamp &&
        msg.playerId === newMessage.playerId &&
        msg.message === newMessage.message,
    )
  );
}

interface SystemMessageStyle {
  containerClass: string;
  textColor: string;
  timeColor: string;
}

function getSystemMessageStyleClass(color: string | undefined): SystemMessageStyle {
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
}: Readonly<ChatBoxProps>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { sendMessage, registerHandler } = useWebSocketContext();

  const allMessages = [...messages, ...systemMessages].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const messageHandlerRef = useRef<(message: WSMessage) => void>(null);

  useEffect(() => {
    messageHandlerRef.current = (message) => {
      if (message.type === "CHAT_MESSAGE") {
        const chatMessage: ChatMessage = {
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
    if (!inputMessage.trim()) return;

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Scroll to bottom using scrollTop instead of scrollIntoView
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [allMessages]);

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto space-y-4 p-4"
        >
          {allMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            allMessages.map((msg) => {
              if (msg.isSystem) {
                const { containerClass, textColor, timeColor } = getSystemMessageStyleClass(msg.systemMessageColor);
                return (
                  <div key={msg.id} className={`flex justify-center my-2 ${containerClass}`}>
                    <div className={`rounded-lg px-4 py-2 max-w-md ${containerClass}`}>
                      <div className={`text-sm text-center ${textColor} font-medium`}>
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
                      {msg.message}
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
        <div className="flex items-center gap-2 p-2 border-t">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyUp={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}