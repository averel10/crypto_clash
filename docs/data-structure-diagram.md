# Game Contract Data Structure Diagram

## Overview

This diagram illustrates how the Game contract manages multiple concurrent Rock-Paper-Scissors games using mappings, arrays, and structs.

## Data Structure Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GAME CONTRACT STATE                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  1. games (mapping: uint => GameState)                                      │
│     Maps game ID to the complete game state                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Game ID                      Game State                                   │
│   ┌───────┐                   ┌──────────────────────────────────────┐      │
│   │   1   │    ───────────→   │ GameState {                          │      │
│   └───────┘                   │   gameId: 1                          │      │
│                               │   isActive: true                     │      │
│                               │   firstReveal: 0                     │      │
│                               │   initialBet: 0.01 ETH               │      │
│                               │   outcome: None                      │      │
│                               │   playerA: Player {                  │      │
│                               │     addr: 0xABC...123                │      │
│                               │     bet: 0.01 ETH                    │      │
│                               │     encrMove: 0x4f2a...              │      │
│                               │     move: None                       │      │
│                               │     nickname: "Alice"                │      │
│                               │   }                                  │      │
│                               │   playerB: Player {                  │      │
│                               │     addr: 0xDEF...456                │      │
│                               │     bet: 0.01 ETH                    │      │
│                               │     encrMove: 0x8b3c...              │      │
│                               │     move: None                       │      │
│                               │     nickname: "Bob"                  │      │
│                               │   }                                  │      │
│                               │ }                                    │      │
│                               └──────────────────────────────────────┘      │
│                                                                             │
│   ┌───────┐                   ┌──────────────────────────────────────┐      │
│   │   2   │    ───────────→   │ GameState {                          │      │
│   └───────┘                   │   gameId: 2                          │      │
│                               │   isActive: true                     │      │
│                               │   playerA: { addr: 0xGHI...789 }     │      │
│                               │   playerB: { addr: 0x000...000 }     │      │
│                               │   (waiting for playerB)              │      │
│                               │   ...                                │      │
│                               │ }                                    │      │
│                               └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  2. gameIds (array: uint[])                                                 │
│     Tracks all game IDs ever created (for enumeration)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Index:     0       1       2       3       4                              │
│            ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐                            │
│   Value:   │ 1 │   │ 2 │   │ 3 │   │ 4 │   │ 5 │  ...                       │
│            └───┘   └───┘   └───┘   └───┘   └───┘                            │
│                                                                             │
│   Entries are never removed (enables iteration over all games)              │
│   Use isActive flag to distinguish active from completed games              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  3. nextGameId (uint counter)                                               │
│     Auto-incrementing counter for unique game IDs                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Current Value: 6  ──→  Next game created will have ID = 6                 │
│                                                                             │
│   Increments with each new game: createNewGame()                            │
│   Starts at 1 and never resets (prevents ID collisions)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flow Diagram: Player Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PLAYER GAME LIFECYCLE                            │
└──────────────────────────────────────────────────────────────────────────┘

    Player: 0xABC...123 (msg.sender)
         │
         │ register(gameId, {value: 0.01 ETH})
         ↓
    ┌─────────────────────────────────────────────────────┐
    │  1. Register with Game                              │
    │     - If gameId == 0: createNewGame()               │
    │     - Validate bet >= BET_MIN (0.01 ETH)            │
    │     - If playerA slot empty: become playerA         │
    │     - Else if playerB slot empty: become playerB    │
    │     - Else: revert "Game is full"                   │
    └─────────────────────────────────────────────────────┘
         │
         ↓
    ┌─────────────────────────────────────────────────────┐
    │  2. Commit Phase                                    │
    │     play(gameId, encrMove)                          │
    │     - Store encrypted move for player               │
    │     - Wait for both players to commit               │
    └─────────────────────────────────────────────────────┘
         │
         │ (once both players committed)
         ↓
    ┌─────────────────────────────────────────────────────┐
    │  3. Reveal Phase                                    │
    │     reveal(gameId, "move-password")                 │
    │     - Hash and verify move                          │
    │     - Store clear move                              │
    │     - Start firstReveal timer on first reveal       │
    │     - Auto-calculate outcome if both revealed       │
    └─────────────────────────────────────────────────────┘
         │
         │ (once both players revealed OR timeout reached)
         ↓
    ┌─────────────────────────────────────────────────────┐
    │  4. Game completion                                 │
    │     getOutcome(gameId)                              │
    │     - Verify reveal phase ended                     │
    │     - Mark game as inactive                         │
    │     - Transfer winnings (2x bet for winner,        │
    │       1x bet each for draw)                         │
    │     - Return outcome (PlayerA/PlayerB/Draw)         │
    └─────────────────────────────────────────────────────┘
         │
         ↓
    Player can register for new game
```

## Relationship Diagram

```
                    ┌───────────────────────────────┐
                    │        Game IDs               │
                    │    (1, 2, 3, 4, 5...)         │
                    └──────────────┬────────────────┘
                                   │
                    ┌──────────────┴────────────────┐
                    │                               │
                games (mapping)              gameIds (array)
                    │                               │
                    ↓                               ↓
         ┌─────────────────────┐         ┌────────────────┐
         │   GameState Objects │         │  For iteration │
         │   - Player data     │         │  over all games│
         │   - Moves           │         │  (active/      │
         │   - Outcomes        │         │   inactive)    │
         │   - isActive flag   │         └────────────────┘
         │   - Timestamps      │
         └─────────────────────┘
```

## Key Relationships

1. **gameIds array → games mapping**:

   - `gameIds` maintains a list of all game IDs created
   - Each ID in `gameIds[i]` can be used to look up the game state: `games[gameIds[i]]`
   - Enables iteration over all games regardless of active status

2. **GameState structure**:

   - Each game has exactly 2 players (playerA and playerB)
   - Players are stored as `Player` structs with address, bet amount, moves, and nickname
   - The `isActive` flag indicates if the game is ongoing or completed
   - `outcome` is calculated when both players reveal or after reveal timeout

3. **nextGameId counter**:
   - Ensures unique game IDs across all games
   - Increments with each new game creation
   - Never resets, preventing ID collisions even in long-running contracts


## Data Flow Example: Two Players Join Game

```
Step 1: Player A registers with gameId=0 (create new game)
    createNewGame() → gameId = 1, nextGameId = 2
    games[1] = {
        gameId: 1,
        isActive: true,
        playerA: { addr: PlayerA, bet: 0.01 ETH, encrMove: 0, move: None, nickname: "" },
        playerB: { addr: 0x0, bet: 0, encrMove: 0, move: None, nickname: "" },
        outcome: None,
        firstReveal: 0,
        initialBet: 0
    }
    gameIds = [1]

Step 2: Player B joins game 1
    games[1] = {
        gameId: 1,
        isActive: true,
        playerA: { addr: PlayerA, bet: 0.01 ETH, ... },
        playerB: { addr: PlayerB, bet: 0.01 ETH, ... },
        outcome: None,
        ...
    }
    gameIds = [1]  (unchanged - game ID already exists)

Step 3: Players commit moves
    game.playerA.encrMove = hash("1-password")
    game.playerB.encrMove = hash("2-password")

Step 4: Players reveal moves
    game.playerA.move = Rock (1)
    game.playerB.move = Paper (2)
    game.firstReveal = block.timestamp
    game.outcome = PlayerB (Paper beats Rock)

Step 5: Game completes via getOutcome()
    games[1].isActive = false
    Transfer 0.02 ETH to PlayerB
    gameIds = [1]  (unchanged - game ID remains for historical reference)
```
