import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import type { Player } from '@/types';

interface VoiceChatProps {
  roomId: string;
  localPlayerId: string;
  players: Player[];
}

export default function VoiceChat({ roomId, localPlayerId, players }: Readonly<VoiceChatProps>) {
  const {
    isVoiceEnabled,
    isMuted,
    audioError,
    enableVoiceChat,
    disableVoiceChat,
    toggleMute,
  } = useVoiceChat({ roomId, localPlayerId, players });

  const handleToggleVoice = () => {
    if (isVoiceEnabled) {
      disableVoiceChat();
    } else {
      enableVoiceChat();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Voice Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {audioError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {audioError}
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleToggleVoice}
            className={`w-full ${
              isVoiceEnabled
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            size="lg"
          >
            {isVoiceEnabled ? (
              <>
                <PhoneOff className="w-4 h-4 mr-2" />
                Leave Voice Chat
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Join Voice Chat
              </>
            )}
          </Button>

          {isVoiceEnabled && (
            <Button
              onClick={toggleMute}
              variant="outline"
              className={`w-full ${isMuted ? 'bg-red-50 border-red-300' : ''}`}
              size="lg"
            >
              {isMuted ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Mute
                </>
              )}
            </Button>
          )}
        </div>

        {isVoiceEnabled && (
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Voice chat active</span>
            </div>
            {isMuted && (
              <div className="flex items-center gap-2 text-red-600">
                <MicOff className="w-3 h-3" />
                <span>Your microphone is muted</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          {isVoiceEnabled
            ? `Connected to ${players.filter((p) => p.id !== localPlayerId && !p.isBot && p.isConnected).length} player(s)`
            : 'Join to talk with other players'}
        </div>
      </CardContent>
    </Card>
  );
}