import { useState, useEffect, useCallback, useRef } from 'react';

interface KeywordDetectorOptions {
  enabled: boolean;
  localPlayerId: string;
  onKeywordDetected: (keyword: string, playerId: string) => void;
  targetKeywords?: string[];
  confidenceThreshold?: number;
}

interface KeywordDetectorReturn {
  isListening: boolean;
  error: string | null;
  detectedKeywords: string[];
}

const DEFAULT_KEYWORDS = [
  'tekthib',
  'tahchi_fih',
  'liar',
  'bluff',
  'kadab',
  'kaddeb',
];

export function useSimpleKeywordDetector(options: KeywordDetectorOptions): KeywordDetectorReturn {
  const {
    enabled,
    localPlayerId,
    onKeywordDetected,
    targetKeywords = DEFAULT_KEYWORDS,
    confidenceThreshold = 0.75,
  } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  
  const recognizerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const speechCommandsRef = useRef<any>(null);

  const handleDetection = useCallback(
    async (result: any): Promise<void> => {
      try {
        const recognizer = recognizerRef.current;
        if (!recognizer) return;

        const words = recognizer.wordLabels();
        const scoresRaw = result.scores;
        const scores: number[] = Array.isArray(scoresRaw) 
          ? Array.from(scoresRaw[0] || [])
          : Array.from(scoresRaw as Float32Array);
        
        const maxScore = Math.max(...scores);
        const maxIndex = scores.indexOf(maxScore);
        const detectedWord = words[maxIndex];

        if (maxScore > confidenceThreshold && detectedWord !== '_background_noise_') {
          const normalizedWord = detectedWord.toLowerCase().replace(/[^a-z_]/g, '');
          const matchedKeyword = targetKeywords.find(
            (keyword) => normalizedWord.includes(keyword) || keyword.includes(normalizedWord)
          );

          if (matchedKeyword) {
            setDetectedKeywords((prev) => [...prev, matchedKeyword]);
            onKeywordDetected(matchedKeyword, localPlayerId);
          }
        }
      } catch (err) {
        console.error('Error in keyword detection:', err);
      }
    },
    [confidenceThreshold, targetKeywords, localPlayerId, onKeywordDetected]
  );

  useEffect(() => {
    let mounted = true;

    async function initRecognizer() {
      if (!enabled || isInitializedRef.current) return;

      try {
        setError(null);
        setIsListening(false);

        if (!speechCommandsRef.current) {
          const speechCommands = await import('@tensorflow-models/speech-commands');
          speechCommandsRef.current = speechCommands;
        }

        const recognizer = speechCommandsRef.current.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();

        if (!mounted) {
          recognizer.stopListening();
          return;
        }

        recognizerRef.current = recognizer;
        isInitializedRef.current = true;

        await recognizer.listen(handleDetection, {
          includeSpectrogram: true,
          probabilityThreshold: confidenceThreshold,
          overlapFactor: 0.5,
        });

        if (mounted) {
          setIsListening(true);
        }
      } catch (err) {
        console.error('Failed to initialize keyword detector:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to start detection');
          setIsListening(false);
        }
      }
    }

    async function cleanup() {
      if (recognizerRef.current) {
        try {
          await recognizerRef.current.stopListening();
        } catch (err) {
          console.error('Error stopping recognizer:', err);
        }
        recognizerRef.current = null;
      }
      isInitializedRef.current = false;
      setIsListening(false);
    }

    if (enabled) {
      initRecognizer();
    } else {
      cleanup();
    }

    return () => {
      mounted = false;
      cleanup();
    };
  }, [enabled, confidenceThreshold, handleDetection]);

  return {
    isListening,
    error,
    detectedKeywords,
  };
}
