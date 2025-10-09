import { useState, useCallback } from "react";
import { useSimpleKeywordDetector } from "@/hooks/useKeywordDetector";
import { Icon } from "@iconify/react";

const TARGET_KEYWORDS = [
  "tekthib",
  "tahchi_fih",
  "liar",
  "bluff",
  "kadab",
  "kaddeb",
];

const KEYWORD_INFO: Record<string, { emoji: string; label: string; description: string }> = {
  tekthib: { emoji: "🤥", label: "تكذّب (Tekthib)", description: "You're lying" },
  tahchi_fih: { emoji: "🤔", label: "تحشي فيه (Tahchi Fih)", description: "You're bluffing" },
  liar: { emoji: "🤥", label: "Liar", description: "English: Liar" },
  bluff: { emoji: "🃏", label: "Bluff", description: "English: Bluff" },
  kadab: { emoji: "🤥", label: "كدّاب (Kadab)", description: "Liar (noun)" },
  kaddeb: { emoji: "🤔", label: "كدّب (Kaddeb)", description: "He lied" },
};

export default function KeywordTestPage() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [detectedWords, setDetectedWords] = useState<
    Array<{ word: string; timestamp: number; matched: boolean }>
  >([]);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  const handleKeywordDetected = useCallback((keyword: string, playerId: string) => {
    const timestamp = Date.now();
    const matched = TARGET_KEYWORDS.includes(keyword);
    
    setDetectedWords((prev) => [
      { word: keyword, timestamp, matched },
      ...prev.slice(0, 19), // Keep last 20
    ]);
    
    if (matched) {
      setLastDetected(keyword);
      // Auto-clear after 5 seconds
      setTimeout(() => setLastDetected(null), 5000);
    }
    
    console.log("Detected:", keyword, "Matched:", matched, "PlayerId:", playerId);
  }, []);

  const { isListening, error, detectedKeywords } = useSimpleKeywordDetector({
    onKeywordDetected: handleKeywordDetected,
    enabled: isEnabled,
    localPlayerId: "test-player",
    targetKeywords: TARGET_KEYWORDS,
    confidenceThreshold: 0.7,
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getMatchedCount = () => {
    return detectedWords.filter((d) => d.matched).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Icon icon="mdi:microphone-message" className="w-8 h-8 text-blue-600" />
            Keyword Detection Test Page
          </h1>
          <p className="text-gray-600">
            Test the speech recognition system by speaking the target keywords
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4">
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all transform hover:scale-105 ${
                isListening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isListening ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="mdi:stop-circle" className="w-6 h-6" />
                  Stop Listening
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="mdi:microphone" className="w-6 h-6" />
                  Start Listening
                </span>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <strong>Error:</strong> {error}
              </div>
            )}

            {isListening && (
              <div className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <span className="font-medium">Listening for keywords...</span>
              </div>
            )}
          </div>
        </div>

        {/* Last Detected (Large Display) */}
        {lastDetected && (
          <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg shadow-lg p-8 text-white animate-in">
            <div className="text-center space-y-4">
              <div className="text-6xl">{KEYWORD_INFO[lastDetected]?.emoji || "✅"}</div>
              <div className="text-3xl font-bold">
                {KEYWORD_INFO[lastDetected]?.label || lastDetected}
              </div>
              <div className="text-xl opacity-90">
                {KEYWORD_INFO[lastDetected]?.description || "Matched!"}
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{detectedKeywords.length}</div>
            <div className="text-sm text-gray-600">Total Detected</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{getMatchedCount()}</div>
            <div className="text-sm text-gray-600">Matched Keywords</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {Array.from(new Set(detectedKeywords)).length}
            </div>
            <div className="text-sm text-gray-600">Unique Keywords</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{TARGET_KEYWORDS.length}</div>
            <div className="text-sm text-gray-600">Target Keywords</div>
          </div>
        </div>

        {/* Target Keywords Reference */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Icon icon="mdi:target" className="w-6 h-6 text-blue-600" />
            Target Keywords to Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TARGET_KEYWORDS.map((keyword) => {
              const info = KEYWORD_INFO[keyword];
              const isDetected = detectedKeywords.includes(keyword);
              return (
                <div
                  key={keyword}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isDetected
                      ? "bg-green-50 border-green-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{info?.emoji || "💬"}</span>
                    <span className="font-bold text-gray-800">{info?.label || keyword}</span>
                  </div>
                  <div className="text-sm text-gray-600">{info?.description || ""}</div>
                  {isDetected && (
                    <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-semibold">
                      <Icon icon="mdi:check-circle" className="w-4 h-4" />
                      Detected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detection Log */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Icon icon="mdi:history" className="w-6 h-6 text-blue-600" />
            Detection Log
          </h2>
          {detectedWords.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No keywords detected yet. Start listening and speak!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {detectedWords.map((detection, idx) => {
                const info = KEYWORD_INFO[detection.word];
                return (
                  <div
                    key={`${detection.timestamp}-${idx}`}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      detection.matched
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {detection.matched ? info?.emoji || "✅" : "❓"}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {info?.label || detection.word}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(detection.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div>
                      {detection.matched ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          ✓ Match
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                          No Match
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Click "Start Listening" to begin</li>
            <li>Allow microphone access when prompted</li>
            <li>Speak one of the target keywords clearly</li>
            <li>Watch for matches in the large display and detection log</li>
            <li>Try different keywords and accents</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
