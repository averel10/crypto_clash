# Rock-Paper-Scissors DApp - Requirements

This document defines the functional requirements for a smart contract–based Rock-Paper-Scissors game with a React front end.  

## 1. Core Game Requirements

### 1.1 Player Connection (2 Players)
Players must be able to connect to the smart contract and register for a match.
The game supports exactly two players, and the contract must ensure that:
- The same address cannot join twice
- A third player cannot join
- Registration closes once both slots are filled

---

### 1.2 Lobby Status Display
The smart contract must expose the current lobby status, showing how many players have joined (0/2, 1/2, or 2/2).  
The front end uses this information to display a real-time lobby status.

---

### 1.3 Player Move Selection
Players must be able to commit their chosen action (rock, paper, or scissors).  
The chosen action is stored as a commitment (hashed value) until the reveal phase begins.

---

### 1.4 Move Reveal Phase
Once both players have committed their moves, each must reveal their move along with the secret used to generate the commitment hash.  
The contract must validate the commitment and determine the round outcome.

---

### 1.5 Winner Receives the Bidding Pool
After the game concludes, the contract must:
- Identify the winner  
- Transfer the total bidding pool (BDL-ETH tokens staked during registration) to the winner  

---

### 1.6 Tie Handling Logic
If both players reveal identical moves, the game is considered a tie.
The contract must define and enforce a deterministic tie-handling rule, choosing one of the following behaviors:
- Refund: Return each player’s original stake.
- Replay: Start a new round with the same players and no additional stake required.

The chosen behavior must be executed automatically by the contract without requiring additional front-end actions.

---

### 1.7 Player Token Bidding
Players must stake a fixed amount of BDL-ETH tokens during the registration phase.  
This stake forms the bidding pool and is required to participate in the game.

---

## 2. Front-End Requirements

### 2.1 MetaMask Integration
The front end must integrate with MetaMask for wallet connection and transaction signing.  
The connected wallet address must be displayed to the user.

---

### 2.2 Live Update: Move Commit Status
The UI must show when each player has committed their move.  
This information must update in real time through events or periodic polling.

---

### 2.3 Live Update: Reveal Status
The UI must show when each player has revealed their move.  
The difference between “move committed” and “move revealed” must be clearly visible.

---

### 2.4 Secret Input for Commitment Hash
The UI must provide an input field for entering the secret used for hashing the move.  
This secret is required during the reveal phase.

---

### 2.5 Icon-Based Action Selection

The UI must allow players to choose their move (rock, paper, or scissors) by clicking on visual icons.
Each option must be represented by a clearly distinguishable symbol (e.g., hand gesture icons) to provide a more intuitive selection experience.

---

## 3. Optional Requirements

### 3.1 Support for 3-Player Games
Add support for a third player.
The contract must adjust registration, turn logic, and win evaluation accordingly.

---

### 3.2 Multiple Lobbies
Allow players to create multiple independent lobbies.
Each lobby maintains its own configuration, players, and game lifecycle.

---

### 3.3 Game Modes (Best of 1 / 3 / 5)
Provide selectable game modes: Best of 1, Best of 3, or Best of 5.
The contract tracks round wins until a player reaches the required majority.

---

### 3.4 Temporary Username Selection
Allow players to choose a temporary username during registration.
The username is valid only for the current session and is not persisted.

---

### 3.5 Leaderboard (Address-Based)
Maintain a leaderboard ranking player addresses by performance metrics such as wins or total rewards.

---

### 3.6 Automatic Secret Generation
Include a UI feature that generates a random secret for move commitment.

---

### 3.7 Live Token Balance Display
Display the player’s BDL-ETH token balance directly in the game interface.