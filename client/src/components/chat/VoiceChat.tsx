import { Icon } from "@iconify/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVoiceChatContext } from "@/context/VoiceChatContext";
import type { Player } from "shared";
import { useTextDirection } from "@/hooks/useTextDirection";

interface VoiceChatProps {
  players: Player[];
  localPlayerId: string;
}

export default function VoiceChat({
  players,
  localPlayerId,
}: Readonly<VoiceChatProps>) {
  const { t } = useTranslation();
  const {
    isVoiceEnabled,
    isMuted,
    audioError,
    mutedPlayers,
    hostMutedPlayers,
    hostMuted,
    isHost,
    audioLevels,
    enableVoiceChat,
    disableVoiceChat,
    toggleMute,
    togglePlayerMute,
    kickPlayer,
    mutePlayerMic,
  } = useVoiceChatContext();

  const direction = useTextDirection();

  const handleToggleVoice = () => {
    if (isVoiceEnabled) {
      disableVoiceChat();
    } else {
      enableVoiceChat();
    }
  };

  // Get other players (not self, not bots)
  const otherPlayers = players.filter(
    (p) => p.id !== localPlayerId && !p.isBot && p.isConnected
  );

  return (
    <Card  dir={direction}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="mdi:phone" className="w-5 h-5" style={{ color: '#10b981' }} />
          {t('voiceChat.title')}
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
            className={"w-full bg-green-600 hover:bg-green-700"}
            size="lg"
          >
            {isVoiceEnabled ? (
              <>
                <Icon icon="mdi:phone-off" className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                {t('voiceChat.leaveVoiceChat')}
              </>
            ) : (
              <>
                <Icon icon="mdi:phone" className="w-4 h-4 mr-2" style={{ color: '#ffffff' }} />
                {t('voiceChat.joinVoiceChat')}
              </>
            )}
          </Button>

          {isVoiceEnabled && (
            <Button
              onClick={toggleMute}
              variant="outline"
              className={`w-full ${isMuted ? "bg-red-50 border-red-300" : ""}`}
              size="lg"
              disabled={hostMuted}
            >
              {isMuted ? (
                <>
                  <Icon icon="mdi:microphone-off" className="w-4 h-4 mr-2" style={{ color: '#ef4444' }} />
                  {hostMuted ? t('voiceChat.mutedByHost') : t('voiceChat.unmute')}
                </>
              ) : (
                <>
                  <Icon icon="mdi:microphone" className="w-4 h-4 mr-2" style={{ color: '#10b981' }} />
                  {t('voiceChat.mute')}
                </>
              )}
            </Button>
          )}
        </div>

        {isVoiceEnabled && (
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{t('voiceChat.voiceChatActive')}</span>
            </div>
            {isMuted && (
              <div className="flex items-center gap-2 text-red-600">
                <Icon icon="mdi:microphone-off" className="w-3 h-3" style={{ color: '#ef4444' }} />
                <span>{t('voiceChat.yourMicMuted')}</span>
              </div>
            )}
            {hostMuted && (
              <div className="flex items-center gap-2 text-orange-600">
                <Icon icon="mdi:microphone-off" className="w-3 h-3" style={{ color: '#f97316' }} />
                <span>{t('voiceChat.hostDisabledMic')}</span>
              </div>
            )}
          </div>
        )}

        {/* Player List with Controls */}
        {isVoiceEnabled && otherPlayers.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <div className="text-xs font-semibold text-gray-700">
              {t('voiceChat.connectedPlayers', { count: otherPlayers.length })}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {otherPlayers.map((player) => {
                const isPlayerMuted = mutedPlayers.has(player.id);
                const isPlayerHostMuted = hostMutedPlayers.has(player.id);
                const audioLevel = audioLevels.get(player.id) || 0;
                return (
                  <div key={player.id} className="bg-gray-50 rounded">
                    <div className="flex items-center justify-between p-2 text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full ${player.isConnected ? "bg-green-500" : "bg-gray-400"}`}
                        />
                        <span className="truncate font-medium">
                          {player.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Personal mute toggle */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => togglePlayerMute(player.id)}
                          title={
                            isPlayerMuted
                              ? t('voiceChat.unmutePlayer', { player: player.name })
                              : t('voiceChat.mutePlayer', { player: player.name })
                          }
                        >
                          {isPlayerMuted ? (
                            <Icon icon="mdi:volume-off" className="w-4 h-4" style={{ color: '#ef4444' }} />
                          ) : (
                            <Icon icon="mdi:volume-high" className="w-4 h-4" style={{ color: '#6b7280' }} />
                          )}
                        </Button>

                        {/* Host controls */}
                        {isHost && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                mutePlayerMic(player.id, !isPlayerHostMuted)
                              }
                              title={t('voiceChat.mutePlayerMic', { player: player.name })}
                            >
                              {isPlayerHostMuted ? (
                                <Icon icon="mdi:microphone-off" className="w-4 h-4" style={{ color: '#f97316' }} />
                              ) : (
                                <Icon icon="mdi:microphone" className="w-4 h-4" style={{ color: '#6b7280' }} />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => kickPlayer(player.id)}
                              title={t('voiceChat.kickPlayer', { player: player.name })}
                            >
                              <Icon icon="mdi:account-off" className="w-4 h-4" style={{ color: '#ef4444' }} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Audio level bar */}
                    <div className="px-2 pb-2">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-75"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          {isVoiceEnabled
            ? t('voiceChat.connectedToPlayers', { count: otherPlayers.length })
            : t('voiceChat.joinToTalk')}
        </div>

        {isHost && isVoiceEnabled && (
          <div className="text-xs text-blue-600 pt-1">
            {t('voiceChat.hostControls')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
