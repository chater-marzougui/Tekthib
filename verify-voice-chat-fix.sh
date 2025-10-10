#!/bin/bash

# Voice Chat Verification Script
# This script helps verify that the voice chat fixes are working correctly

echo "=================================="
echo "Voice Chat Fix Verification"
echo "=================================="
echo ""

# Check if webrtc-adapter is imported in main.tsx
echo "1. Checking webrtc-adapter import in main.tsx..."
if grep -q 'import "webrtc-adapter"' client/src/main.tsx; then
    echo "   ✓ webrtc-adapter is imported globally"
else
    echo "   ✗ webrtc-adapter import missing!"
    exit 1
fi

# Check if auto-join logic is removed
echo ""
echo "2. Checking that auto-join logic is removed..."
if grep -q "wasVoiceEnabled" client/src/hooks/useVoiceChat.ts; then
    echo "   ✗ wasVoiceEnabled variable still exists!"
    exit 1
else
    echo "   ✓ wasVoiceEnabled removed"
fi

if grep -q 'sessionStorage.getItem("voiceChatEnabled")' client/src/hooks/useVoiceChat.ts; then
    echo "   ✗ sessionStorage.getItem still exists!"
    exit 1
else
    echo "   ✓ sessionStorage.getItem removed"
fi

# Check if handleOffer has the guard clause
echo ""
echo "3. Checking handleOffer guard clause..."
if grep -q "if (!isVoiceEnabled || !localStreamRef.current)" client/src/hooks/useVoiceChat.ts; then
    echo "   ✓ handleOffer has voice enabled check"
else
    echo "   ✗ handleOffer missing guard clause!"
    exit 1
fi

# Check if builds succeed
echo ""
echo "4. Testing builds..."
echo "   Building client..."
cd client && npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ Client builds successfully"
else
    echo "   ✗ Client build failed!"
    exit 1
fi

cd ..
echo "   Building server..."
cd server && npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ Server builds successfully"
else
    echo "   ✗ Server build failed!"
    exit 1
fi

cd ..

echo ""
echo "=================================="
echo "All automated checks passed! ✓"
echo "=================================="
echo ""
echo "Manual testing steps:"
echo "1. Start the server: npm run dev:server"
echo "2. Start the client: npm run dev:client"
echo "3. Open in Chrome: http://localhost:5173"
echo "4. Create a room"
echo "5. Verify voice chat is OFF by default"
echo "6. Click 'Join Voice Chat'"
echo "7. Verify browser prompts for microphone permission"
echo "8. Grant permission and verify voice chat activates"
echo "9. Open in Firefox (new private window)"
echo "10. Join the same room"
echo "11. Click 'Join Voice Chat' in Firefox"
echo "12. Verify both users can hear each other"
echo ""
echo "Expected behavior:"
echo "- No auto-join when entering room"
echo "- No auto-join when another player joins"
echo "- Browser microphone prompt appears ONLY after clicking 'Join Voice Chat'"
echo "- No 'RTCPeerConnection is not defined' errors in Firefox"
echo "- No 'Cannot create peer connection - no local stream' errors"
echo ""
