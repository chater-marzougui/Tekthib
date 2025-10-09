# Keyword Detection Feature

## Overview
The keyword detection system uses TensorFlow.js Speech Commands model to recognize specific keywords spoken during gameplay. This feature is designed to detect game-related words like "tekthib" (you're lying), "bluff", "liar", etc.

## Files Structure

### Core Hook
- **`client/src/hooks/useKeywordDetector.ts`**
  - Main hook that provides keyword detection functionality
  - Uses `@tensorflow-models/speech-commands` for speech recognition
  - Handles model initialization, cleanup, and detection callbacks
  - Configurable confidence threshold and target keywords

### Components
- **`client/src/components/game/board/KeyWordDetection.tsx`**
  - UI component for in-game keyword detection
  - Displays recent detections, statistics, and supported keywords
  - Integrates with game state and player information
  - Shows toast notifications when keywords are detected

### Test Pages
- **`client/src/pages/KeywordTestPage.tsx`**
  - React-based test page integrated with the app
  - Full-featured testing interface
  - Access via `/keyword-test` route

- **`client/public/keyword-test.html`**
  - Standalone HTML test page
  - No build required - can be opened directly in browser
  - Access via `http://localhost:5173/keyword-test.html` (when dev server is running)

## Supported Keywords

| Keyword | Language | Emoji | Meaning |
|---------|----------|-------|---------|
| tekthib | Arabic (تكذّب) | 🤥 | You're lying |
| tahchi_fih | Arabic (تحشي فيه) | 🤔 | You're bluffing |
| kadab | Arabic (كدّاب) | 🤥 | Liar (noun) |
| kaddeb | Arabic (كدّب) | 🤔 | He lied |
| liar | English | 🤥 | Liar |
| bluff | English | 🃏 | Bluff |

## Usage

### In Your Component

```typescript
import { useSimpleKeywordDetector } from "@/hooks/useKeywordDetector";

function MyComponent() {
  const [isEnabled, setIsEnabled] = useState(false);

  const handleKeywordDetected = useCallback(
    (keyword: string, playerId: string) => {
      console.log(`Player ${playerId} said: ${keyword}`);
      // Handle the detection (show notification, trigger game action, etc.)
    },
    []
  );

  const { isListening, error, detectedKeywords } = useSimpleKeywordDetector({
    enabled: isEnabled,
    localPlayerId: "player-123",
    onKeywordDetected: handleKeywordDetected,
    targetKeywords: ["tekthib", "liar", "bluff"], // Optional
    confidenceThreshold: 0.75, // Optional (default: 0.75)
  });

  return (
    <div>
      <button onClick={() => setIsEnabled(!isEnabled)}>
        {isListening ? "Stop" : "Start"} Detection
      </button>
      {error && <div>Error: {error}</div>}
      <div>Detected: {detectedKeywords.join(", ")}</div>
    </div>
  );
}
```

### Hook Options

```typescript
interface KeywordDetectorOptions {
  enabled: boolean;                    // Enable/disable detection
  localPlayerId: string;               // Current player ID
  onKeywordDetected: (keyword: string, playerId: string) => void;
  targetKeywords?: string[];           // Keywords to detect (optional)
  confidenceThreshold?: number;        // Min confidence (0-1, default: 0.75)
}
```

### Return Values

```typescript
interface KeywordDetectorReturn {
  isListening: boolean;                // Whether actively listening
  error: string | null;                // Error message if any
  detectedKeywords: string[];          // All detected keywords (history)
}
```

## Testing

### Method 1: React Test Page (Recommended)
1. Start the dev server: `npm run dev:client`
2. Navigate to `http://localhost:5173/Tekthib/keyword-test`
3. Click "Start Listening"
4. Allow microphone access
5. Speak the target keywords

### Method 2: Standalone HTML Test
1. Start the dev server: `npm run dev:client`
2. Navigate to `http://localhost:5173/keyword-test.html`
3. Or open `client/public/keyword-test.html` directly in a browser
4. Click "Start Listening"
5. Allow microphone access
6. Speak the target keywords

### Method 3: In-Game Testing
1. Start a game with voice chat enabled
2. Open the keyword detection panel in the game UI
3. Enable keyword detection
4. Speak keywords during gameplay

## How It Works

1. **Model Loading**: Uses TensorFlow.js Speech Commands with the BROWSER_FFT recognizer
2. **Audio Processing**: Continuously analyzes audio from the microphone
3. **Recognition**: Detects words from the model's vocabulary
4. **Matching**: Compares detected words against target keywords
5. **Callback**: Triggers `onKeywordDetected` when a match is found

## Performance

- **Model Size**: ~1MB (BROWSER_FFT recognizer)
- **Latency**: ~100-300ms detection time
- **Accuracy**: Depends on:
  - Clear pronunciation
  - Minimal background noise
  - Good microphone quality
  - Proper confidence threshold

## Configuration

### Adjusting Sensitivity

Lower confidence threshold for more detections (more false positives):
```typescript
confidenceThreshold: 0.6  // More sensitive
```

Higher confidence threshold for fewer detections (fewer false positives):
```typescript
confidenceThreshold: 0.85  // Less sensitive
```

### Custom Keywords

Add your own keywords by matching against the model's vocabulary:
```typescript
targetKeywords: ["yes", "no", "up", "down", "left", "right"]
```

Note: Keywords must be recognizable by the speech-commands model. The model includes common English words and numbers.

## Troubleshooting

### No detections
- Check microphone permissions
- Verify microphone is working
- Speak louder and clearer
- Reduce confidence threshold
- Check browser console for errors

### Too many false positives
- Increase confidence threshold
- Reduce background noise
- Use better quality microphone
- Speak more clearly

### Error: "Failed to start detection"
- Microphone may be in use by another app
- Browser may not support required APIs
- Try refreshing the page
- Check browser console for specific error

## Browser Support

Requires browsers that support:
- Web Audio API
- MediaDevices.getUserMedia()
- TensorFlow.js

✅ Chrome 60+
✅ Firefox 55+
✅ Edge 79+
✅ Safari 11+

## Dependencies

```json
{
  "@tensorflow/tfjs": "^4.x",
  "@tensorflow-models/speech-commands": "^0.5.x"
}
```

Already installed via: `npm install @tensorflow/tfjs @tensorflow-models/speech-commands`

## Future Enhancements

- [ ] Custom model training for Arabic keywords
- [ ] Multi-language support
- [ ] Offline support with cached models
- [ ] Player-specific keyword tracking
- [ ] Keyword-triggered game animations
- [ ] Statistics dashboard
- [ ] Voice activity detection (VAD) integration
- [ ] Keyword challenge system integration

## Notes

- The current model is primarily trained on English words
- Arabic keyword detection works through phonetic similarity
- For better Arabic support, consider training a custom model
- Model runs entirely in the browser (no server required)
- All audio processing is local (privacy-friendly)
