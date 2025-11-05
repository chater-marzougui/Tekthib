# Server Architecture Refactoring

This document explains the refactored server architecture, focusing on the roomHandler, roomManager, and gameEngine components.

## 🎯 Refactoring Goals

- **Eliminate Redundancy**: Remove duplicated validation, serialization, and broadcasting logic
- **Improve Reusability**: Extract common patterns into utility functions
- **Enhance Maintainability**: Organize code into focused, single-responsibility modules
- **Preserve Functionality**: Maintain all existing game logic and behavior without breaking changes

## 📁 New Utility Modules

### `utils/validation.ts`
Common validation functions used across all handlers:
- `validateRoomExists()` - Ensures room exists before operations
- `validateIsHost()` - Verifies player has host privileges
- `validatePlayerInRoom()` - Confirms player membership
- `validateNotBot()` - Prevents operations on bot players
- `validateNotSelf()` - Prevents self-targeting actions
- `validateRoomHasSpace()` - Checks room capacity

**Usage Pattern:**
```typescript
const validation = validateIsHost(room, playerId);
if (!validation.valid) {
  return sendError(validation.error);
}
```

### `utils/serialization.ts`
Player and room data transformation for client transmission:
- `serializePlayer()` - Converts PlayerWithHand to safe client format
- `serializePlayers()` - Batch player serialization
- `serializeRoom()` - Complete room state serialization

**Purpose:** Eliminates 10+ instances of inline player mapping logic.

### `utils/messageBuilder.ts`
WebSocket message payload construction:
- `buildRoomCreatedPayload()`
- `buildRoomJoinedPayload()`
- `buildPlayerJoinedPayload()`
- `buildPlayerLeftPayload()`
- `buildErrorPayload()`
- `buildGameResetPayload()`

**Purpose:** Centralizes payload structure, reduces errors from inconsistent message shapes.

### `utils/idUtils.ts`
ID generation and management:
- `generateUniqueId()` - Creates timestamped unique IDs
- `reassignHostIfNeeded()` - Handles host migration logic

**Pattern:** Used in room creation, bot addition, and player removal.

### `utils/gameStatsUtils.ts`
Game statistics calculations:
- `calculatePlayerGameStats()` - Aggregates player performance metrics
- `calculateFinalPosition()` - Determines player placement
- `calculateTotalChallenges()` - Sums challenge statistics

**Purpose:** Simplifies complex stat calculations in game history.

## 🎮 Handler Helper Modules

### `handlers/helpers/gameStateHelper.ts`
Game state broadcasting utilities:
- `broadcastGameStateUpdate()` - Sends state to all room players
- `broadcastGameEnded()` - Notifies game completion
- `checkAndBroadcastGameEnd()` - Combines check and broadcast

**Impact:** Eliminates 100+ lines of duplicate broadcasting code.

### `handlers/helpers/challengeHelper.ts`
Challenge processing logic:
- `processChallengeWithSuspense()` - Handles challenge with optional delay
- `broadcastChallengeResult()` - Notifies all players of outcome
- `getLastPlayInfo()` - Retrieves validation info

**Impact:** Consolidates human and bot challenge logic (removed 200+ duplicate lines).

### `handlers/helpers/botTurnHelper.ts`
Bot turn management:
- `processBotChallenge()` - Handles bot challenge decisions
- `processBotTurn()` - Executes bot play logic

**Impact:** Centralizes bot AI interaction, improves testability.

## 🔄 Refactored Flow Examples

### Before: Room Creation
```typescript
// 30 lines of inline validation, player creation, and payload building
const host = { id, name, hand: [], isConnected: true, isReady: false, isBot: false };
const room = { id: generateId(), code: generateCode(), ... };
sendToClient(ws, { type: 'ROOM_CREATED', payload: { room: { ... } } });
```

### After: Room Creation
```typescript
const room = roomManager.createRoom(...);
sendToClient(ws, {
  type: 'ROOM_CREATED',
  payload: buildRoomCreatedPayload(serializeRoom(room), playerId),
});
```

### Before: Challenge Processing
```typescript
// 80+ lines duplicated between human and bot challenges
if (challengeSuspenseEnabled) {
  gameEngine.setProcessingChallenge(true);
  broadcastToRoom(...);
}
setTimeout(() => {
  // 50+ lines of result broadcasting
}, suspenseDelay);
```

### After: Challenge Processing
```typescript
processChallengeWithSuspense(
  clients, roomId, gameEngine, challengerId, result,
  () => triggerBotTurn(clients, roomId, gameEngine)
);
```

## 📊 Metrics

**Lines Reduced:**
- roomHandlers.ts: ~150 lines
- gameHandlers.ts: ~250 lines
- roomManager.ts: ~60 lines
- **Total: ~460 lines eliminated** while improving readability

**Reusability Improvements:**
- Validation logic: 6 functions replacing 40+ inline checks
- Serialization: 3 functions replacing 15+ duplicate mappings
- Broadcasting: 3 functions replacing 8+ duplicate patterns
- Challenge logic: 3 functions replacing 2 complete implementations

## 🧪 Testing Considerations

**Critical Test Areas:**
1. **Validation Flow**: Ensure all error paths still work
2. **Serialization**: Verify all client payloads match expected format
3. **Challenge Timing**: Confirm suspense delays work correctly
4. **Bot Behavior**: Validate bot decision-making unchanged
5. **Game State**: Ensure all broadcasts reach correct players

**Unchanged Behavior:**
- Game rules (four-of-a-kind, challenge outcomes)
- Turn order and advancement
- Bot AI decision-making
- Timer functionality
- Room lifecycle (creation, joining, leaving)

## 📝 Key Design Decisions

### 1. Validation Returns Objects
```typescript
{ valid: boolean; error?: string }
```
**Rationale:** Allows early returns with consistent error handling pattern.

### 2. Serialization at Handler Level
**Rationale:** Separates business logic (roomManager) from presentation (handlers).

### 3. Helper Functions Accept Callbacks
```typescript
processChallengeWithSuspense(..., onComplete?: () => void)
```
**Rationale:** Maintains flexibility for different post-challenge flows.

### 4. ID Generation Utility
**Rationale:** Ensures consistent ID format and uniqueness across all entities.

## 🔍 Troubleshooting Guide

### Issue: "Room not found" after refactoring
- **Check:** Validation returns correct error codes
- **Fix:** Ensure `validateRoomExists()` is called before operations

### Issue: Client receives incorrect player data
- **Check:** Serialization includes all required fields
- **Fix:** Verify `serializePlayer()` matches client expectations

### Issue: Challenge doesn't trigger
- **Check:** Challenge helper receives correct parameters
- **Fix:** Ensure `getLastPlayInfo()` returns valid data

## 🚀 Future Improvements

1. **Extract Timer Logic**: Create dedicated timer helper
2. **Consolidate Event Emission**: Centralize all WebSocket event types
3. **Type-Safe Payloads**: Generate payload types from message builder
4. **Unit Tests**: Add tests for all utility functions
5. **Error Handling**: Create centralized error handler with logging

## 📚 Related Files

- Original handlers: `server/src/websocket/handlers/roomHandlers.ts`, `gameHandlers.ts`
- Core logic: `server/src/utils/roomManager.ts`
- Game engine: `server/src/game/GameEngine.ts`
- Shared types: `shared/src/types/index.ts`
