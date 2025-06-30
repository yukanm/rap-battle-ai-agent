# Sequential Battle Generation Update

## Overview
Updated the backend battle managers to generate verses sequentially instead of in parallel, matching the frontend's new terminology and structure.

## Key Changes

### 1. Battle Format Update
- Changed from `'8bars-4rounds' | '16bars-2rounds'` to `'3verses-3rounds' | '3verses-1round'`
- Each round now contains multiple verses (3 per MC)
- Total of 6 verses per round, alternating between MCs

### 2. Data Structure Changes

#### Added `Verse` interface to types/index.ts:
```typescript
export interface Verse {
  number: number // 1-6 within a round
  participantId: 'ai1' | 'ai2'
  lyric: Lyric
}
```

#### Updated `Round` interface:
```typescript
export interface Round {
  number: number
  verses: Verse[] // Changed from lyrics: { ai1: Lyric, ai2: Lyric }
  votes: {
    ai1: number
    ai2: number
  }
}
```

### 3. Sequential Generation Logic

The new generation order for each round:
1. MC1 verse 1
2. MC2 verse 1  
3. MC1 verse 2
4. MC2 verse 2
5. MC1 verse 3
6. MC2 verse 3

Each verse is:
- Generated individually with a 2-second delay between verses
- Emitted as a separate event with `verseNumber` and `participantId`
- Audio generated immediately after lyrics for that verse

### 4. Event Structure Updates

Events now include verse-specific information:
```typescript
// Lyric generated event
{
  type: 'lyric_generated',
  battleId,
  data: { 
    roundNumber,
    verseNumber: 1-6,
    verse: Verse,
    participantId: 'ai1' | 'ai2'
  }
}

// Audio ready event
{
  type: 'audio_ready',
  battleId,
  data: { 
    roundNumber,
    verseNumber: 1-6,
    audioUrl,
    participantId: 'ai1' | 'ai2'
  }
}
```

### 5. Files Modified

1. **src/types/index.ts**
   - Added `Verse` interface
   - Updated `Round` interface
   - Changed battle format types
   - Made `bars` optional in `Lyric` and `GenerateLyricRequest`

2. **src/services/websocket/battleManager.ts**
   - Imported `Verse` type
   - Updated `createBattle` to use new formats
   - Rewrote `generateRounds` for sequential generation
   - Updated `generateLyric` to handle verse context

3. **src/services/websocket/battleManagerWithAgent.ts**
   - Same updates as battleManager.ts
   - Maintained agent integration compatibility

4. **src/services/websocket/improvedBattleManager.ts**
   - Updated format references
   - Fixed bars calculation

5. **src/services/websocket/index.ts**
   - Updated format validation

6. **src/services/mc-battle-agent.ts**
   - Updated battle evaluation format text

### 6. Benefits of Sequential Generation

1. **Better Answer/Response Flow**: Each MC can respond to the previous verse immediately
2. **More Realistic Battle Feel**: Mimics real MC battles where rappers alternate
3. **Improved Context**: Each verse has access to all previous verses in the round
4. **Frontend Sync**: Matches the frontend's expectation of verse-by-verse updates

### 7. Testing

Created test files:
- `src/__tests__/unit/websocket/sequentialBattleManager.test.ts`
- `src/scripts/test-sequential-battle.ts`

Run the test script:
```bash
npx ts-node src/scripts/test-sequential-battle.ts
```

## Migration Notes

- Existing battles with old format will need migration
- Frontend WebSocket handlers should be updated to handle verse-specific events
- Consider adding backwards compatibility if needed