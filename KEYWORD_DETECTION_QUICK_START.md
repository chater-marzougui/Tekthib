# 🎤 Keyword Detection - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Start the Dev Server
```bash
cd client
npm run dev:client
```

### 2. Open the Test Page
Navigate to: **http://localhost:5173/Tekthib/keyword-test**

Or open the standalone HTML: **http://localhost:5173/keyword-test.html**

### 3. Test It!
1. Click "Start Listening"
2. Allow microphone access
3. Say any of these words:
   - **تكذّب** (tekthib) - "You're lying"
   - **كدّاب** (kadab) - "Liar"  
   - **Liar** (English)
   - **Bluff** (English)

## 📖 What Was Done

✅ **Fixed** the `useKeywordDetector` hook (all TypeScript errors resolved)  
✅ **Optimized** the `KeywordDetection` component (removed unnecessary functions)  
✅ **Created** a React test page at `/keyword-test`  
✅ **Created** a standalone HTML test page (no build needed)  
✅ **Configured** Vite to handle TensorFlow properly  
✅ **Documented** everything in `KEYWORD_DETECTION.md`  

## 🎯 Supported Keywords

| Say This | Language | What It Means |
|----------|----------|---------------|
| تكذّب (tekthib) | Arabic | You're lying |
| تحشي فيه (tahchi fih) | Tunisian | You're bluffing |
| كدّاب (kadab) | Arabic | Liar |
| كدّب (kaddeb) | Arabic | He lied |
| Liar | English | Liar |
| Bluff | English | Bluff |

## 🔧 Use in Your Code

```typescript
import { useSimpleKeywordDetector } from "@/hooks/useKeywordDetector";

const { isListening, error, detectedKeywords } = useSimpleKeywordDetector({
  enabled: true,
  localPlayerId: "player-123",
  onKeywordDetected: (keyword, playerId) => {
    console.log(`${playerId} said: ${keyword}`);
  },
});
```

## 🎨 Test Pages

### React Test Page (Recommended)
- Full UI with stats and history
- Route: `/keyword-test`  
- Shows matched vs. unmatched words
- Real-time detection log

### Standalone HTML
- No build required
- File: `client/public/keyword-test.html`
- Great for quick testing
- Beautiful animations

## 📚 Full Documentation

See `KEYWORD_DETECTION.md` for complete API reference, troubleshooting, and advanced usage.

## ⚙️ Configuration

### Adjust Sensitivity
```typescript
confidenceThreshold: 0.6  // More sensitive (more false positives)
confidenceThreshold: 0.85 // Less sensitive (fewer false positives)
```

### Custom Keywords
```typescript
targetKeywords: ["yes", "no", "stop", "go"]
```

## 🎉 That's It!

The keyword detection system is ready to use. Test it, integrate it, and enjoy real-time speech recognition in your game!

---

**Need Help?** Check the full docs in `KEYWORD_DETECTION.md` or the summary in `KEYWORD_DETECTION_SUMMARY.md`
