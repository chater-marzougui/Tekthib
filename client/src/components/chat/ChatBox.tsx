import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebSocketContext } from '@/context/WebSocketContext';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface ChatBoxProps {
  playerName: string;
  playerId: string;
}

export default function ChatBox({ playerName, playerId }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, registerHandler } = useWebSocketContext();

  useEffect(() => {
    // Register handler for incoming chat messages
    const unregister = registerHandler('chat-message', (message) => {
      if (message.type === 'CHAT_MESSAGE') {
        const chatMessage: ChatMessage = {
          id: `${message.timestamp}-${Math.random()}`,
          playerId: message.payload.playerId,
          playerName: message.payload.playerName,
          message: message.payload.message,
          timestamp: message.timestamp || Date.now()
        };
        
        setMessages(prev => [...prev, chatMessage]);
      }
    });

    return unregister;
  }, [registerHandler]);

  useEffect(() => {
    // Scroll to bottom when new message arrives
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    sendMessage({
      type: 'CHAT_MESSAGE',
      payload: {
        message: inputMessage,
        playerId,
        playerName
      }
    });

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.playerId === playerId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.playerId === playerId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {msg.playerId !== playerId && (
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {msg.playerName}
                    </div>
                  )}
                  <div className="text-sm break-words">{msg.message}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
