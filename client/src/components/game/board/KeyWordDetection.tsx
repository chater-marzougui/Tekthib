import { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimpleKeywordDetector } from "@/hooks/useKeywordDetector";
import { toast } from "sonner";
import type { Player } from "shared";

interface KeywordDetectionProps {
  players: Player[];
  localPlayerId: string;
  isVoiceEnabled: boolean;
  onKeywordTriggered?: (keyword: string, playerId: string) => void;
}

const KEYWORD_DISPLAY: Record<string, string> = {
  tekthib: "تكذّب / Tekthib",
  tahchi_fih: "تحشي فيه / Tahchi Fih",
  liar: "Liar",
  bluff: "Bluff",
  kadab: "كدّاب / Kadab",
  kaddeb: "كدّب / Kaddeb",
};

const KEYWORD_EMOJI: Record<string, string> = {
  tekthib: "🤥",
  tahchi_fih: "🤔",
  liar: "🤥",
  bluff: "🃏",
  kadab: "🤥",
  kaddeb: "🤔",
};

export default function KeywordDetection({
  players,
  localPlayerId,
  isVoiceEnabled,
  onKeywordTriggered,
}: Readonly<KeywordDetectionProps>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [recentDetections, setRecentDetections] = useState<
    Array<{ keyword: string; playerId: string; timestamp: number }>
  >([]);

  // Handle keyword detection
  const handleKeywordDetected = useCallback(
    (keyword: string, playerId: string) => {
      const timestamp = Date.now();

      // Add to recent detections
      setRecentDetections((prev) => [
        { keyword, playerId, timestamp },
        ...prev.slice(0, 9), // Keep last 10
      ]);

      // Find player name
      const player = players.find((p) => p.id === playerId);
      const playerName = player?.name || "Unknown";

      // Show toast notification
      const keywordDisplay = KEYWORD_DISPLAY[keyword] || keyword;

      toast.info(`🎤 ${playerName} said: ${keywordDisplay}`, {
        duration: 3000,
      });

      // Trigger callback if provided
      if (onKeywordTriggered) {
        onKeywordTriggered(keyword, playerId);
      }
    },
    [players, onKeywordTriggered]
  );

  const { isListening, error, detectedKeywords } = useSimpleKeywordDetector({
    onKeywordDetected: handleKeywordDetected,
    enabled: isEnabled && isVoiceEnabled,
    localPlayerId,
  });

  const toggleKeywordDetection = () => {
    if (!isVoiceEnabled) {
      toast.error("Please enable voice chat first");
      return;
    }
    setIsEnabled(!isEnabled);
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="mdi:microphone-message" className="w-5 h-5" />
          Keyword Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {!isVoiceEnabled && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded text-sm">
            Enable voice chat to use keyword detection
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={toggleKeywordDetection}
            className={`w-full ${
              isEnabled
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 hover:bg-gray-700"
            }`}
            size="lg"
            disabled={!isVoiceEnabled}
          >
            {isListening ? (
              <>
                <Icon icon="mdi:microphone-settings" className="w-4 h-4 mr-2" />
                Stop Detection
              </>
            ) : (
              <>
                <Icon
                  icon="mdi:microphone-message-off"
                  className="w-4 h-4 mr-2"
                />
                Start Detection
              </>
            )}
          </Button>
        </div>

        {isListening && (
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>Listening for keywords...</span>
            </div>
          </div>
        )}

        {/* Detection Statistics */}
        {detectedKeywords.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Keywords Detected ({detectedKeywords.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(detectedKeywords)).map((keyword, uniqueIdx) => (
                <span
                  key={`${keyword}-${uniqueIdx}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {KEYWORD_EMOJI[keyword] || "💬"} {KEYWORD_DISPLAY[keyword] || keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Detections */}
        {recentDetections.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Recent Activity
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {recentDetections.map((detection) => {
                const player = players.find((p) => p.id === detection.playerId);
                return (
                  <div
                    key={`detection-${detection.timestamp}-${detection.keyword}`}
                    className="bg-gray-50 rounded p-2 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {KEYWORD_EMOJI[detection.keyword] || "💬"}
                      </span>
                      <span className="font-medium">{player?.name}</span>
                      <span className="text-gray-500">said</span>
                      <span className="font-semibold text-blue-600">
                        {KEYWORD_DISPLAY[detection.keyword] || detection.keyword}
                      </span>
                    </div>
                    <span className="text-gray-400">
                      {formatTimestamp(detection.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info about supported keywords */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <details>
            <summary className="cursor-pointer hover:text-gray-700">
              Supported Keywords
            </summary>
            <div className="mt-2 space-y-1 pl-2">
              <div>🤥 تكذّب (Tekthib) - You're lying</div>
              <div>🤔 تحشي فيه (Tahchi Fih) - You're bluffing</div>
              <div>🤥 كدّاب (Kadab) - Liar</div>
              <div>🤔 كدّب (Kaddeb) - He lied</div>
              <div>🃏 Bluff / Liar (English)</div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
