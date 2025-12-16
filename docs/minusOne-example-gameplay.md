# Example Gameplay: Rock-Paper-Scissors Minus One

This document provides a **step-by-step playbook** for two players (Alice and Bob) to play the "Minus One" variant. Follow along to understand the exact order of operations and function calls.

## Quick Reference

### Move Encoding

- `1` = Rock
- `2` = Paper
- `3` = Scissors

### Game Flow

```
1. Registration (both players)
2. Initial Commit (both players)
3. First Reveal (both players)
4. Withdrawal Commit (both players)
5. Withdrawal Reveal (both players)
6. Get Outcome (either player)
```

### Hash Generation Tool

🔗 **https://emn178.github.io/online-tools/keccak_256.html**

- Input Type: **UTF-8**
- Output Type: **Hex**
- Format: `<move>-<password>` (e.g., `1-mypass` for Rock)

### Game Rules

1. Each player commits 2 **different** moves (e.g., Rock + Paper)
2. Both players reveal their 2 moves
3. Each player secretly withdraws 1 move (commits which index: 1 or 2)
4. Both players reveal which move they withdrew
5. The **remaining move** for each player battles to determine winner

---

## Example Game Scenario

**Players:**

- 👩 **Alice** (will choose Rock + Paper, keep Rock)
- 👨 **Bob** (will choose Rock + Scissors, keep Scissors)

**Expected Winner:** Alice (Rock beats Scissors)

**Minimum Bet:** 0.01 ETH (10000000000000000 wei)

---

## 🎮 PHASE 1: REGISTRATION

> **Goal:** Both players join the game with their nicknames and bets

### Step 1.1: Alice Registers (Player 1)

**Function:** `register(uint gameId, string memory name)`

**Alice's Input:**

```
gameId: 0  (creates new game)
name: "Alice"
value: 0.01 ETH
```

**Smart Contract Call:**

```javascript
register(0, "Alice");
// Send 0.01 ETH with transaction
```

**Returns:** `(1, 1)`

- Position: Player 1
- Game ID: 1

✅ Alice is now registered as Player 1 in Game 1

---

### Step 1.2: Bob Registers (Player 2)

**Function:** `register(uint gameId, string memory name)`

**Bob's Input:**

```
gameId: 1  (joins Alice's game)
name: "Bob"
value: 0.01 ETH  (must match Alice's bet!)
```

**Smart Contract Call:**

```javascript
register(1, "Bob");
// Send 0.01 ETH with transaction
```

**Returns:** `(2, 1)`

- Position: Player 2
- Game ID: 1

✅ Bob is now registered as Player 2
✅ **Game automatically advances to InitialCommit phase**

---

## 🎮 PHASE 2: INITIAL COMMIT

> **Goal:** Both players commit their 2 encrypted moves (hashes)

### Step 2.1: Alice Prepares Her Hashes (Off-chain)

**Alice's Strategy:**

- Move 1: Rock (1)
- Move 2: Paper (2)

**Generate Hash for Move 1 (Rock):**

1. Go to: https://emn178.github.io/online-tools/keccak_256.html
2. Input: `1-alicepass1` (UTF-8)
3. Output: `0x7364263d5fc729b4709129564a2c516f2eb40f55d8704860e46f597c91b6b264`

**Generate Hash for Move 2 (Paper):**

1. Input: `2-alicepass2` (UTF-8)
2. Output: `0xc9ad7a6c99b3f5af24991d9c66c0cc2b731869f4b7399653f0820f99e34d45ef`

💾 **Alice must save these:**

- Cleartext for reveal: `1-alicepass1` and `2-alicepass2`
- Hashes for commit: `0x7364...` and `0xc9ad...`

---

### Step 2.2: Alice Commits

**Function:** `commitInitialMoves(uint gameId, bytes32 hash1, bytes32 hash2)`

**Alice's Input:**

```
gameId: 1
hash1: 0x7364263d5fc729b4709129564a2c516f2eb40f55d8704860e46f597c91b6b264
hash2: 0xc9ad7a6c99b3f5af24991d9c66c0cc2b731869f4b7399653f0820f99e34d45ef
```

**Smart Contract Call:**

```javascript
commitInitialMoves(
  1,
  "0x7364263d5fc729b4709129564a2c516f2eb40f55d8704860e46f597c91b6b264",
  "0xc9ad7a6c99b3f5af24991d9c66c0cc2b731869f4b7399653f0820f99e34d45ef"
);
```

**Returns:** `true`

✅ Alice has committed her two moves

---

### Step 2.3: Bob Prepares His Hashes (Off-chain)

**Bob's Strategy:**

- Move 1: Rock (1)
- Move 2: Scissors (3)

**Generate Hash for Move 1 (Rock):**

1. Go to: https://emn178.github.io/online-tools/keccak_256.html
2. Input: `1-bobsecret1` (UTF-8)
3. Output: `0x16864f12ec74b4fac1cd9fd5b0db1959e4df91cf55e9180cc13cdf20a134af16`

**Generate Hash for Move 2 (Scissors):**

1. Input: `3-bobsecret2` (UTF-8)
2. Output: `0x86d1def3d3f9bed5f2de22161040c10c75dcb52f263f3c3ec08cdc8ba10d2103`

💾 **Bob must save these:**

- Cleartext for reveal: `1-bobsecret1` and `3-bobsecret2`
- Hashes for commit: `0x1686...` and `0x86d1...`

---

### Step 2.4: Bob Commits

**Function:** `commitInitialMoves(uint gameId, bytes32 hash1, bytes32 hash2)`

**Bob's Input:**

```
gameId: 1
hash1: 0x16864f12ec74b4fac1cd9fd5b0db1959e4df91cf55e9180cc13cdf20a134af16
hash2: 0x86d1def3d3f9bed5f2de22161040c10c75dcb52f263f3c3ec08cdc8ba10d2103
```

**Smart Contract Call:**

```javascript
commitInitialMoves(
  1,
  "0x16864f12ec74b4fac1cd9fd5b0db1959e4df91cf55e9180cc13cdf20a134af16",
  "0x86d1def3d3f9bed5f2de22161040c10c75dcb52f263f3c3ec08cdc8ba10d2103"
);
```

**Returns:** `true`

✅ Bob has committed his two moves
✅ **Game automatically advances to FirstReveal phase**

---

## 🎮 PHASE 3: FIRST REVEAL

> **Goal:** Both players reveal their original cleartext strings to prove their moves

### Step 3.1: Alice Reveals

**Function:** `revealInitialMoves(uint gameId, string memory clear1, string memory clear2)`

**Alice's Input:**

```
gameId: 1
clear1: "1-alicepass1"  (the exact string she hashed)
clear2: "2-alicepass2"  (the exact string she hashed)
```

**Smart Contract Call:**

```javascript
revealInitialMoves(1, "1-alicepass1", "2-alicepass2");
```

**Returns:** `(Rock, Paper)` (enum values for moves 1 and 3)

✅ Alice's moves are now public:

- Move 1: Rock
- Move 2: Paper

---

### Step 3.2: Bob Reveals

**Function:** `revealInitialMoves(uint gameId, string memory clear1, string memory clear2)`

**Bob's Input:**

```
gameId: 1
clear1: "1-bobsecret1"  (the exact string he hashed)
clear2: "3-bobsecret2"  (the exact string he hashed)
```

**Smart Contract Call:**

```javascript
revealInitialMoves(1, "1-bobsecret1", "3-bobsecret2");
```

**Returns:** `(Rock, Scissors)` (enum values for moves 1 and 3)

✅ Bob's moves are now public:

- Move 1: Rock
- Move 2: Scissors

**Current Game State:**

- Alice has: Rock (move 1) and Paper (move 2)
- Bob has: Rock (move 1) and Scissors (move 2)

✅ **Game automatically advances to WithdrawalCommit phase**

---

## 🎮 PHASE 4: WITHDRAWAL COMMIT

> **Goal:** Both players secretly commit which move to withdraw (1 or 2)

### Step 4.1: Alice Prepares Withdrawal Hash (Off-chain)

**Alice's Decision:**

- She wants to keep Rock (move 1)
- So she will withdraw move index **2** (Paper)

**Generate Withdrawal Hash:**

1. Go to: https://emn178.github.io/online-tools/keccak_256.html
2. Input: `2-alicewith` (UTF-8) ← Note: "2" is the index to withdraw
3. Output: `0x7c9ff59a4d298766d9480c130f6ed67c06f135a1c2f45326583593bb9c2e6363`

💾 **Alice must save:**

- Cleartext: `2-alicewith`
- Hash: `0x9a3f...`

---

### Step 4.2: Alice Commits Withdrawal

**Function:** `commitWithdraw(uint gameId, bytes32 wHash)`

**Alice's Input:**

```
gameId: 1
wHash: 0x7c9ff59a4d298766d9480c130f6ed67c06f135a1c2f45326583593bb9c2e6363
```

**Smart Contract Call:**

```javascript
commitWithdraw(
  1,
  "0x7c9ff59a4d298766d9480c130f6ed67c06f135a1c2f45326583593bb9c2e6363"
);
```

**Returns:** `true`

✅ Alice has secretly committed to withdraw move 2

---

### Step 4.3: Bob Prepares Withdrawal Hash (Off-chain)

**Bob's Decision:**

- He wants to keep Scissors (move 2)
- So he will withdraw move index **1** (Rock)

**Generate Withdrawal Hash:**

1. Go to: https://emn178.github.io/online-tools/keccak_256.html
2. Input: `1-bobwith` (UTF-8) ← Note: "1" is the index to withdraw
3. Output: `0x29e944e8859972eb35622d3149120d878d7931aaa9ac2e213d0b321ee564b7dc`

💾 **Bob must save:**

- Cleartext: `1-bobwith`
- Hash: `0x29e9...`

---

### Step 4.4: Bob Commits Withdrawal

**Function:** `commitWithdraw(uint gameId, bytes32 wHash)`

**Bob's Input:**

```
gameId: 1
wHash: 0x29e944e8859972eb35622d3149120d878d7931aaa9ac2e213d0b321ee564b7dc
```

**Smart Contract Call:**

```javascript
commitWithdraw(
  1,
  "0x29e944e8859972eb35622d3149120d878d7931aaa9ac2e213d0b321ee564b7dc"
);
```

**Returns:** `true`

✅ Bob has secretly committed to withdraw move 1
✅ **Game automatically advances to WithdrawalReveal phase**

---

## 🎮 PHASE 5: WITHDRAWAL REVEAL

> **Goal:** Both players reveal which move they withdrew

### Step 5.1: Alice Reveals Withdrawal

**Function:** `withdrawMove(uint gameId, string memory clear)`

**Alice's Input:**

```
gameId: 1
clear: "2-alicewith"  (the exact string she hashed for withdrawal)
```

**Smart Contract Call:**

```javascript
withdrawMove(1, "2-alicewith");
```

**Returns:** `2`

✅ Alice withdrew move 2 (Paper)
✅ Alice keeps: **Rock** (move 1)

---

### Step 5.2: Bob Reveals Withdrawal

**Function:** `withdrawMove(uint gameId, string memory clear)`

**Bob's Input:**

```
gameId: 1
clear: "1-bobwith"  (the exact string he hashed for withdrawal)
```

**Smart Contract Call:**

```javascript
withdrawMove(1, "1-bobwith");
```

**Returns:** `1`

✅ Bob withdrew move 1 (Rock)
✅ Bob keeps: **Scissors** (move 2)

**Final Battle:**

- Alice's final move: **Rock**
- Bob's final move: **Scissors**
- **Winner: Alice!** (Rock beats Scissors)

✅ **Game automatically determines outcome and advances to Done phase**

---

## 🎮 PHASE 6: GET OUTCOME

> **Goal:** Either player calls to finalize and receive payout

### Step 6.1: Get Outcome (Either Player Can Call)

**Function:** `getOutcome(uint gameId)`

**Input:**

```
gameId: 1
```

**Smart Contract Call:**

```javascript
getOutcome(1);
```

**Returns:** `Outcomes.A` (Alice wins)

**What Happens:**

1. Contract calculates winner: Rock beats Scissors
2. Alice receives **0.02 ETH** (both players' bets)
3. Game is marked inactive
4. Contract balance reduced by payout

✅ **Game Complete!** Alice won and received 0.02 ETH

---

## 📊 Summary Table

| Step | Who Acts | Function                                | Key Inputs                                  | Result                        |
| ---- | -------- | --------------------------------------- | ------------------------------------------- | ----------------------------- |
| 1.1  | Alice    | `register(0, "Alice")`                  | gameId=0, name="Alice", value=0.01 ETH      | Player 1 in Game 1            |
| 1.2  | Bob      | `register(1, "Bob")`                    | gameId=1, name="Bob", value=0.01 ETH        | Player 2 in Game 1            |
| 2.1  | Alice    | `commitInitialMoves(1, hash1, hash2)`   | Hashes of "1-alicepass1" and "2-alicepass2" | Committed                     |
| 2.2  | Bob      | `commitInitialMoves(1, hash1, hash2)`   | Hashes of "1-bobsecret1" and "3-bobsecret2" | Committed                     |
| 3.1  | Alice    | `revealInitialMoves(1, clear1, clear2)` | "1-alicepass1", "2-alicepass2"              | Reveals Rock + Paper          |
| 3.2  | Bob      | `revealInitialMoves(1, clear1, clear2)` | "1-bobsecret1", "3-bobsecret2"              | Reveals Rock + Scissors       |
| 4.1  | Alice    | `commitWithdraw(1, wHash)`              | Hash of "2-alicewith"                       | Committed withdrawal          |
| 4.2  | Bob      | `commitWithdraw(1, wHash)`              | Hash of "1-bobwith"                         | Committed withdrawal          |
| 5.1  | Alice    | `withdrawMove(1, clear)`                | "2-alicewith"                               | Withdrew Paper, keeps Rock    |
| 5.2  | Bob      | `withdrawMove(1, clear)`                | "1-bobwith"                                 | Withdrew Rock, keeps Scissors |
| 6.1  | Either   | `getOutcome(1)`                         | gameId=1                                    | Alice wins, gets 0.02 ETH     |

---

## ⚠️ Important Notes

### Must Save These Strings!

- **Initial moves cleartext:** You need them in Phase 3
- **Withdrawal cleartext:** You need it in Phase 5
- **If you lose these strings, you cannot reveal and will timeout!**

### Order Matters

- Either player can act first within each phase
- Game won't advance until **both players** complete the current phase
- You have **10 minutes** per phase (commit or reveal)

### Common Mistakes

❌ Using different strings in reveal than in commit → "Hash mismatch"  
❌ Committing same move twice (e.g., Rock + Rock) → "Moves must differ"  
❌ Second player betting different amount → "Bet must match initial"  
❌ Withdrawing index 0 or 3 → "Index must be 1 or 2"  
❌ Losing your cleartext strings → Cannot reveal, will timeout

### Timeout Protection

If your opponent doesn't act within 10 minutes:

```javascript
resolveTimeout(1); // Call this to win by default
```
