# Game Contract Data Structure Diagram

## Overview

This diagram illustrates how the Game contract manages multiple concurrent games using mappings and arrays.

## Data Structure Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GAME CONTRACT STATE                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  1. playerToActiveGame (mapping: address => uint)                           │
│     Maps each player address to their active game ID                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Player Address              →        Game ID                              │
│   ┌──────────────────┐               ┌───────┐                              │
│   │ 0xABC...123      │    ──────→    │   1   │                              │
│   └──────────────────┘               └───────┘                              │
│                                                                             │
│   ┌──────────────────┐               ┌───────┐                              │
│   │ 0xDEF...456      │    ──────→    │   1   │  (same game)                 │
│   └──────────────────┘               └───────┘                              │
│                                                                             │
│   ┌──────────────────┐               ┌───────┐                              │
│   │ 0xGHI...789      │    ──────→    │   2   │                              │
│   └──────────────────┘               └───────┘                              │
│                                                                             │
│   ┌──────────────────┐               ┌───────┐                              │
│   │ 0xJKL...012      │    ──────→    │   0   │  (no active game)            │
│   └──────────────────┘               └───────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  2. games (mapping: uint => GameState)                                      │
│     Maps game ID to the complete game state                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Game ID                      Game State                                   │
│   ┌───────┐                   ┌────────────────────────────────────┐        │
│   │   1   │    ───────────→   │ GameState {                        │        │
│   └───────┘                   │   gameId: 1                        │        │
│                               │   isActive: true                   │        │
│                               │   playerA: {                       │        │
│                               │     addr: 0xABC...123              │        │
│                               │     bet: 0.01 ETH                  │        │
│                               │     encrMove: 0x4f2a...            │        │
│                               │     move: Rock                     │        │
│                               │   }                                │        │
│                               │   playerB: {                       │        │
│                               │     addr: 0xDEF...456              │        │
│                               │     bet: 0.01 ETH                  │        │
│                               │     encrMove: 0x8b3c...            │        │
│                               │     move: Paper                    │        │
│                               │   }                                │        │
│                               │   outcome: PlayerB                 │        │
│                               │   firstReveal: 1699876543          │        │
│                               │   initialBet: 0.01 ETH             │        │
│                               │ }                                  │        │
│                               └────────────────────────────────────┘        │
│                                                                             │
│   ┌───────┐                   ┌────────────────────────────────────┐        │
│   │   2   │    ───────────→   │ GameState {                        │        │
│   └───────┘                   │   gameId: 2                        │        │
│                               │   isActive: true                   │        │
│                               │   playerA: { addr: 0xGHI...789 }   │        │
│                               │   playerB: { addr: 0x000...000 }   │        │
│                               │   outcome: None                    │        │
│                               │   ...                              │        │
│                               │ }                                  │        │
│                               └────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  3. gameIds (array: uint[])                                                 │
│     Tracks all game IDs for enumeration                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Index:     0       1       2       3       4                              │
│            ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐                            │
│   Value:   │ 1 │   │ 2 │   │ 3 │   │ 4 │   │ 5 │  ...                       │
│            └───┘   └───┘   └───┘   └───┘   └───┘                            │
│                                                                             │
│   Used to iterate over all games (active and inactive)                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  4. pastGames (array: GameState[])                                          │
│     Stores completed games for historical reference                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Index:     0                           1                                  │
│            ┌─────────────────────┐     ┌─────────────────────┐              │
│            │ GameState {         │     │ GameState {         │              │
│            │   gameId: 1         │     │   gameId: 3         │              │
│            │   isActive: false   │     │   isActive: false   │              │
│            │   playerA: ...      │     │   playerA: ...      │              │
│            │   playerB: ...      │     │   playerB: ...      │              │
│            │   outcome: PlayerB  │     │   outcome: Draw     │              │
│            │ }                   │     │ }                   │              │
│            └─────────────────────┘     └─────────────────────┘              │
│                                                                             │
│   Grows as games are completed via getOutcome()                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  5. nextGameId (uint counter)                                               │
│     Auto-incrementing counter for unique game IDs                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Current Value: 6  ──→  Next game created will have ID = 6                 │
│                                                                             │
│   Increments with each new game: createNewGame()                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flow Diagram: Player Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PLAYER GAME LIFECYCLE                            │
└──────────────────────────────────────────────────────────────────────────┘

    Player: 0xABC...123
         │
         │ register(0)
         ↓
    ┌─────────────────────────────────────┐
    │  1. Check playerToActiveGame        │
    │     0xABC...123 → 0 (not in game)   │
    └─────────────────────────────────────┘
         │
         ↓
    ┌─────────────────────────────────────┐
    │  2. findOrCreateGame()              │
    │     - Search for open game          │
    │     - Or create new game ID: 1      │
    └─────────────────────────────────────┘
         │
         ↓
    ┌─────────────────────────────────────┐
    │  3. Update mappings                 │
    │     playerToActiveGame[0xABC] = 1   │
    │     games[1].playerA = 0xABC...123  │
    │     games[1].isActive = true        │
    │     gameIds.push(1)                 │
    └─────────────────────────────────────┘
         │
         │ play(encrMove) → reveal(clearMove)
         ↓
    ┌─────────────────────────────────────┐
    │  4. Game progresses                 │
    │     Both players commit & reveal    │
    └─────────────────────────────────────┘
         │
         │ getOutcome()
         ↓
    ┌─────────────────────────────────────┐
    │  5. Game completion                 │
    │     - Calculate winner              │
    │     - pastGames.push(games[1])      │
    │     - playerToActiveGame[0xABC] = 0 │
    │     - playerToActiveGame[0xDEF] = 0 │
    │     - games[1].isActive = false     │
    │     - Pay winners                   │
    └─────────────────────────────────────┘
         │
         ↓
    Player can register for new game
```

## Relationship Diagram

```
                    ┌───────────────────────────────┐
                    │     Player Addresses          │
                    │  (External participants)      │
                    └──────────────┬────────────────┘
                                   │
                            playerToActiveGame
                                   │ (mapping)
                                   ↓
                    ┌───────────────────────────────┐
                    │        Game IDs               │
                    │    (1, 2, 3, 4, 5...)         │
                    └──────────────┬────────────────┘
                                   │
                                   │
                    ┌──────────────┴────────────────┐
                    │                               │
                games (mapping)              gameIds (array)
                    │                               │
                    ↓                               ↓
         ┌─────────────────────┐         ┌────────────────┐
         │   GameState Objects │         │  For iteration │
         │   - Player data     │         │  over all games│
         │   - Moves           │         └────────────────┘
         │   - Outcomes        │
         │   - isActive flag   │
         └──────────┬──────────┘
                    │
        When game completes (isActive = false)
                    │
                    ↓
         ┌──────────────────────┐
         │   pastGames array    │
         │  (Historical record) │
         └──────────────────────┘
```

## Key Relationships

1. **playerToActiveGame → games**:

   - A player's address maps to a game ID
   - That game ID is used to access the full game state in `games` mapping

2. **gameIds array**:

   - Maintains list of all game IDs ever created
   - Enables iteration over games (e.g., `getActiveGameIds()`)
   - Never removes entries, only marks games inactive

3. **pastGames array**:

   - Snapshot of completed games
   - Grows with each completed game
   - Provides historical game data

4. **nextGameId counter**:
   - Ensures unique game IDs
   - Increments with each new game
   - Never resets, preventing ID collisions

## Data Flow Example: Two Players Join Game

```
Step 1: Player A registers
    playerToActiveGame[PlayerA] = 0  →  1
    games[1] = { playerA: PlayerA, playerB: null, isActive: true }
    gameIds = [1]

Step 2: Player B joins same game
    playerToActiveGame[PlayerB] = 0  →  1
    games[1] = { playerA: PlayerA, playerB: PlayerB, isActive: true }
    gameIds = [1]  (unchanged)

Step 3: Game completes
    pastGames.push(games[1])  →  pastGames[0] = games[1]
    playerToActiveGame[PlayerA] = 1  →  0
    playerToActiveGame[PlayerB] = 1  →  0
    games[1].isActive = true  →  false
    gameIds = [1]  (unchanged, but game is inactive)
```
