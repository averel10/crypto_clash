# Dual-Mode Frontend Implementation

This document describes the frontend implementation that supports both Classic and Minus One game modes.

## Overview

The frontend has been updated to seamlessly work with two different smart contracts:
- **Game.sol** (Classic Mode): Standard Rock-Paper-Scissors with 2 phases
- **GameMinusOne.sol** (Minus One Mode): Squid Game-inspired variant with 6 phases

## Game Modes Comparison

### Classic Mode
**Phases:**
1. Commit Phase (both players submit encrypted moves)
2. Reveal Phase (both players reveal their moves)

**Functions:**
- `register(gameId, nickname)` - Join/create game
- `play(gameId, encrMove)` - Submit encrypted move
- `reveal(gameId, clearMove)` - Reveal move
- `commitTimeLeft()` / `revealTimeLeft()` - Check timeouts
- `getOutcome(gameId)` - Get game result

**Data Structure:**
```typescript
Player {
  addr: string;
  nickname: string;
  encrMove?: string;  // Classic only
  move?: string;      // Classic only
}
```

### Minus One Mode
**Phases:**
1. Registration
2. Initial Commit (both players commit 2 moves)
3. First Reveal (reveal both moves)
4. Withdraw Commit (commit which move to withdraw)
5. Withdraw Reveal (reveal withdrawal choice)
6. Done

**Functions:**
- `register(gameId, nickname)` - Join/create game
- `commitInitialMoves(gameId, hash1, hash2)` - Submit 2 encrypted moves
- `revealInitialMoves(gameId, clear1, clear2)` - Reveal both moves
- `commitWithdraw(gameId, wHash)` - Submit withdrawal choice
- `withdrawMove(gameId, clear)` - Reveal withdrawal
- `getTimeLeft(gameId)` - Universal timeout checker
- `getOutcome(gameId)` - Get game result

**Data Structure:**
```typescript
Player {
  addr: string;
  nickname: string;
  hash1?: string;      // MinusOne only
  hash2?: string;      // MinusOne only
  move1?: string;      // MinusOne only
  move2?: string;      // MinusOne only
  wHash?: string;      // MinusOne only
  withdrawn?: string;  // MinusOne only (1 or 2)
}
```

## Implementation Details

### Type System
The frontend uses optional fields to support both modes:

```typescript
interface Player {
  addr: string;
  nickname: string;
  // Classic fields
  encrMove?: string;
  move?: string;
  // MinusOne fields
  hash1?: string;
  hash2?: string;
  move1?: string;
  move2?: string;
  wHash?: string;
  withdrawn?: string;
}

interface GameDetails {
  playerA: Player;
  playerB: Player;
  initialBet: string;
  outcome: number;
  isActive: boolean;
  returnGameId: number;
  gameMode?: string; // "classic" or "minusone"
}
```

### Component Updates

#### GameModal.tsx
- **Purpose:** Manages game state and routes to correct phase component
- **Changes:**
  - Added `gameMode` field to GameDetails
  - Phase detection logic checks `gameMode` and appropriate fields
  - Storage structure expanded for MinusOne state (move1/2, secret1/2, withdrawChoice)

#### Commit.tsx
- **Purpose:** Handles all commit phases (move commits and withdrawal commits)
- **Changes:**
  - Added MinusOne-specific props: `selectedMove1`, `selectedMove2`, `secret1`, `secret2`, `withdrawChoice`
  - Hash generation adapts based on mode:
    - Classic: `keccak256(move-password)`
    - MinusOne initial: Two hashes `keccak256(move1-password1)`, `keccak256(move2-password2)`
    - MinusOne withdrawal: `keccak256(1-password)` or `keccak256(2-password)`
  - UI conditionally renders:
    - Classic: Single move selector
    - MinusOne initial: Two move selectors with different colored borders
    - MinusOne withdrawal: Choice between withdrawing move 1 or 2
  - Contract calls:
    - Classic: `play(gameId, encrMove)`
    - MinusOne initial: `commitInitialMoves(gameId, hash1, hash2)`
    - MinusOne withdrawal: `commitWithdraw(gameId, wHash)`

#### Reveal.tsx
- **Purpose:** Handles all reveal phases (move reveals and withdrawal reveals)
- **Changes:**
  - Added MinusOne-specific props: `selectedMove1`, `selectedMove2`, `secret1`, `secret2`, `isWithdrawPhase`
  - State checks adapted:
    - Classic: Check `move` field
    - MinusOne initial: Check `move1` field
    - MinusOne withdrawal: Check `withdrawn` field
  - Reveal function calls:
    - Classic: `reveal(gameId, clearMove)`
    - MinusOne initial: `revealInitialMoves(gameId, clear1, clear2)`
    - MinusOne withdrawal: `withdrawMove(gameId, clear)`
  - UI conditionally displays:
    - Classic: Single move display
    - MinusOne initial: Both moves displayed side-by-side
    - MinusOne withdrawal: Withdrawal choice (1️⃣ or 2️⃣)
  - Final outcome shows:
    - Classic: Final move from each player
    - MinusOne: All 4 moves with withdrawn ones marked (grayed out with "Withdrawn" label)

#### GameList.tsx
- **Purpose:** Lists available games and shows their status
- **Changes:**
  - `getGamePhase()` function checks `gameMode` and appropriate fields:
    - Classic: Returns "Commit", "Reveal", or "Outcome"
    - MinusOne: Returns "Initial Commit", "Initial Reveal", "Withdraw Commit", "Withdraw Reveal", or "Done"
  - Game mode badge displays "Classic" or "Minus One"
  - Phase colors:
    - Yellow: Commit phases
    - Blue: Initial reveal
    - Amber: Withdraw commit
    - Orange: Withdraw reveal
    - Purple: Complete/Done

### Hash Generation

All hashing uses Keccak256 with Web3.js:

```typescript
// Classic mode
const hash = web3.utils.keccak256(web3.utils.utf8ToHex(`${move}-${secret}`));

// MinusOne initial moves
const hash1 = web3.utils.keccak256(web3.utils.utf8ToHex(`${move1}-${secret1}`));
const hash2 = web3.utils.keccak256(web3.utils.utf8ToHex(`${move2}-${secret2}`));

// MinusOne withdrawal
const wHash = web3.utils.keccak256(web3.utils.utf8ToHex(`${withdrawChoice}-${secret}`));
```

### Session Storage

Game state persists across page refreshes using sessionStorage:

**Classic Mode:**
```typescript
{
  selectedMove: string,
  secret: string,
  expiresAt: number
}
```

**MinusOne Mode:**
```typescript
{
  selectedMove1: string,
  selectedMove2: string,
  secret1: string,
  secret2: string,
  withdrawChoice: string,
  expiresAt: number
}
```

Storage expires after 1 hour to prevent stale data.

## Testing Checklist

### Classic Mode
- [ ] Create new game with "Classic Mode"
- [ ] Join game as Player B
- [ ] Both players commit moves
- [ ] Both players reveal moves
- [ ] Verify correct outcome (win/lose/draw)
- [ ] Check ETH payouts

### Minus One Mode
- [ ] Create new game with "Minus One Mode"
- [ ] Join game as Player B
- [ ] Both players commit 2 initial moves
- [ ] Both players reveal initial moves
- [ ] Verify both moves displayed correctly
- [ ] Both players commit withdrawal choice
- [ ] Both players reveal withdrawal
- [ ] Verify final moves (1 active, 1 withdrawn per player)
- [ ] Check correct outcome based on remaining moves
- [ ] Check ETH payouts

### Edge Cases
- [ ] Timeout handling in Classic mode
- [ ] Timeout handling in MinusOne mode (different phases)
- [ ] Page refresh preserves state (both modes)
- [ ] GameList shows correct phase for both modes
- [ ] Switching between active games (mixed modes)

## Deployment Steps

1. **Deploy GameMinusOne contract:**
   ```bash
   cd crypto_clash_contract
   npx hardhat run scripts/deploy.ts --network <network>
   ```

2. **Update config.json:**
   ```json
   {
     "GAME_CONTRACT_ADDRESS": "0x...",
     "GAME_MINUSONE_CONTRACT_ADDRESS": "0x...",
     "NETWORK_NAME": "...",
     "CHAIN_ID": ...
   }
   ```

3. **Copy config to frontend:**
   ```bash
   cd crypto_clash_frontend
   node copy_config.js
   ```

4. **Build and deploy frontend:**
   ```bash
   npm run build
   npm run start
   ```

## Future Enhancements

- Contract mode detection could be automatic (read contract bytecode or interface)
- Support switching contracts without page reload
- Statistics tracking for each mode separately
- Leaderboard for each mode
- Tournament mode supporting both game types
