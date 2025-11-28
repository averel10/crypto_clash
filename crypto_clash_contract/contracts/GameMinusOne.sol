// SPDX-License-Identifier: MIT

pragma solidity >=0.7.3;

contract GameMinusOne {
    uint public constant BET_MIN = 1e16; // The minimum bet (0.01 ETH)
    uint public constant REVEAL_TIMEOUT = 10 minutes; // Max delay of revelation phase
    uint public constant COMMIT_TIMEOUT = 10 minutes; // Max delay of commit phase
    uint public constant WITHDRAW_TIMEOUT = 10 minutes; // Max delay for withdrawal phase

    enum Moves {
        None,
        Rock,
        Paper,
        Scissors
    }

    enum Outcomes {
        None,
        PlayerA,
        PlayerB,
        Draw,
        PlayerATimeout,
        PlayerBTimeout
    } // Possible outcomes

    enum GamePhase {
        Registration,      // Waiting for players
        InitialCommit,     // Players commit 2 moves each
        FirstReveal,       // Players reveal both moves
        Withdrawal,        // Players choose which move to withdraw
        FinalCommit,       // Players commit their remaining move again (for fairness)
        FinalReveal,       // Players reveal final move
        Completed          // Game finished
    }

    struct Player {
        address payable addr;
        uint bet;
        // Initial phase - 2 moves
        bytes32 encrMove1;
        bytes32 encrMove2;
        Moves move1;
        Moves move2;
        // Withdrawal phase
        uint withdrawnMoveIndex; // 1 or 2
        // Final phase
        bytes32 encrFinalMove;
        Moves finalMove;
        string nickname;
    }

    struct GameState {
        Player playerA;
        Player playerB;
        Outcomes outcome;
        GamePhase phase;
        uint firstCommit;
        uint firstReveal;
        uint firstWithdraw;
        uint firstFinalCommit;
        uint firstFinalReveal;
        uint initialBet;
        uint gameId;
        bool isActive;
        string gameMode; // "minusone" for this contract
    }

    // Mapping from game ID to game state
    mapping(uint => GameState) private games;

    // Array to track all game IDs (for enumeration)
    uint[] private gameIds;

    // Counter for generating unique game IDs
    uint private nextGameId = 1;

    // ------------------------- Registration ------------------------- //

    modifier validBet(uint gameId) {
        require(msg.value >= BET_MIN, "Minimum bet not met");
        require(
            games[gameId].initialBet == 0 ||
                msg.value == games[gameId].initialBet,
            "Bet value must match initial bet"
        );
        _;
    }

    // Register a player to an existing game or create a new game.
    // If gameId is 0, player will join or create the first available game.
    // Return player's ID and game ID upon successful registration.
    function register(
        uint gameId,
        string memory nickname
    )
        public
        payable
        validBet(gameId)
        returns (uint playerId, uint returnGameId)
    {
        // If gameId is 0, find an open game or create a new one
        if (gameId == 0) {
            gameId = createNewGame();
        }

        require(games[gameId].isActive, "Game is not active");
        require(games[gameId].phase == GamePhase.Registration, "Game already started");
        require(bytes(nickname).length > 0, "Nickname cannot be empty");
        require(bytes(nickname).length <= 20, "Nickname too long (max 20 characters)");

        GameState storage game = games[gameId];

        if (game.playerA.addr == address(0x0)) {
            game.playerA.addr = payable(msg.sender);
            game.playerA.nickname = nickname;
            game.initialBet = msg.value;
            return (1, gameId);
        } else if (game.playerB.addr == address(0x0)) {
            require(
                msg.sender != game.playerA.addr,
                "Cannot play against yourself"
            );
            game.playerB.addr = payable(msg.sender);
            game.playerB.nickname = nickname;
            
            // Both players registered, automatically start the game
            game.phase = GamePhase.InitialCommit;
            
            return (2, gameId);
        }

        revert("Game is full");
    }


    // Create a new game
    function createNewGame() private returns (uint) {
        uint gameId = nextGameId;
        nextGameId++;

        games[gameId].gameId = gameId;
        games[gameId].isActive = true;
        games[gameId].phase = GamePhase.Registration;
        games[gameId].gameMode = "minusone";
        gameIds.push(gameId);

        return gameId;
    }

    // ------------------------- Initial Commit (2 moves) ------------------------- //

    modifier isRegistered(uint gameId) {
        require(gameId != 0, "Invalid game ID");
        require(
            msg.sender == games[gameId].playerA.addr ||
                msg.sender == games[gameId].playerB.addr,
            "Player not registered in this game"
        );
        _;
    }

    // Commit two moves for the initial phase
    // encrMove1 and encrMove2 must be "<1|2|3>-password" hashed with keccak256
    function commitInitialMoves(uint gameId, bytes32 encrMove1, bytes32 encrMove2) 
        public 
        isRegistered(gameId) 
        returns (bool) 
    {
        GameState storage game = games[gameId];
        
        require(game.isActive, "Game is no longer active");
        require(game.phase == GamePhase.InitialCommit, "Not in initial commit phase");
        require(encrMove1 != bytes32(0) && encrMove2 != bytes32(0), "Encrypted moves cannot be zero");
        require(encrMove1 != encrMove2, "Both moves must be different");
        
        // Check timeout
        if (game.firstCommit != 0) {
            require(block.timestamp <= game.firstCommit + COMMIT_TIMEOUT, "Commit phase timeout expired");
        }
        
        // Track first commit timestamp
        if (game.firstCommit == 0) {
            game.firstCommit = block.timestamp;
        }
        
        // Store encrypted moves
        if (msg.sender == game.playerA.addr) {
            require(game.playerA.encrMove1 == bytes32(0), "Player A already committed");
            game.playerA.encrMove1 = encrMove1;
            game.playerA.encrMove2 = encrMove2;
        } else if (msg.sender == game.playerB.addr) {
            require(game.playerB.encrMove1 == bytes32(0), "Player B already committed");
            game.playerB.encrMove1 = encrMove1;
            game.playerB.encrMove2 = encrMove2;
        } else {
            revert("Caller not registered");
        }
        
        // Check if both players have committed, advance to reveal phase
        if (game.playerA.encrMove1 != bytes32(0) && game.playerB.encrMove1 != bytes32(0)) {
            game.phase = GamePhase.FirstReveal;
            game.firstReveal = 0; // Reset for reveal phase
        }
        
        return true;
    }

    // ------------------------- First Reveal (2 moves) ------------------------- //

    // Reveal both initial moves
    // clearMove1 and clearMove2 must be the original strings used for hashing
    function revealInitialMoves(uint gameId, string memory clearMove1, string memory clearMove2)
        public
        isRegistered(gameId)
        returns (Moves, Moves)
    {
        GameState storage game = games[gameId];
        
        require(game.isActive, "Game is no longer active");
        require(game.phase == GamePhase.FirstReveal, "Not in first reveal phase");
        
        // Check timeout
        if (game.firstReveal != 0) {
            require(block.timestamp <= game.firstReveal + REVEAL_TIMEOUT, "Reveal phase timeout expired");
        }
        
        bytes32 encrMove1 = keccak256(abi.encodePacked(clearMove1));
        bytes32 encrMove2 = keccak256(abi.encodePacked(clearMove2));
        Moves move1 = Moves(getFirstChar(clearMove1));
        Moves move2 = Moves(getFirstChar(clearMove2));
        
        require(move1 != Moves.None && move2 != Moves.None, "Invalid moves");
        require(move1 != move2, "Both moves must be different");
        
        // Verify and store moves
        if (msg.sender == game.playerA.addr) {
            require(encrMove1 == game.playerA.encrMove1 && encrMove2 == game.playerA.encrMove2, 
                "Hash mismatch for Player A");
            game.playerA.move1 = move1;
            game.playerA.move2 = move2;
        } else if (msg.sender == game.playerB.addr) {
            require(encrMove1 == game.playerB.encrMove1 && encrMove2 == game.playerB.encrMove2,
                "Hash mismatch for Player B");
            game.playerB.move1 = move1;
            game.playerB.move2 = move2;
        } else {
            revert("Caller not registered");
        }
        
        // Start reveal timer on first reveal
        if (game.firstReveal == 0) {
            game.firstReveal = block.timestamp;
        }
        
        // Check if both players have revealed, advance to withdrawal phase
        if (game.playerA.move1 != Moves.None && game.playerB.move1 != Moves.None) {
            game.phase = GamePhase.Withdrawal;
            game.firstWithdraw = 0; // Reset for withdrawal phase
        }
        
        return (move1, move2);
    }

    // ------------------------- Withdrawal Phase ------------------------- //

    // Choose which move to withdraw (1 or 2)
    function withdrawMove(uint gameId, uint moveIndex)
        public
        isRegistered(gameId)
        returns (bool)
    {
        GameState storage game = games[gameId];
        
        require(game.isActive, "Game is no longer active");
        require(game.phase == GamePhase.Withdrawal, "Not in withdrawal phase");
        require(moveIndex == 1 || moveIndex == 2, "Move index must be 1 or 2");
        
        // Check timeout
        if (game.firstWithdraw != 0) {
            require(block.timestamp <= game.firstWithdraw + WITHDRAW_TIMEOUT, "Withdrawal phase timeout expired");
        }
        
        // Store withdrawal choice
        if (msg.sender == game.playerA.addr) {
            require(game.playerA.withdrawnMoveIndex == 0, "Player A already withdrew");
            game.playerA.withdrawnMoveIndex = moveIndex;
        } else if (msg.sender == game.playerB.addr) {
            require(game.playerB.withdrawnMoveIndex == 0, "Player B already withdrew");
            game.playerB.withdrawnMoveIndex = moveIndex;
        } else {
            revert("Caller not registered");
        }
        
        // Start withdrawal timer on first withdrawal
        if (game.firstWithdraw == 0) {
            game.firstWithdraw = block.timestamp;
        }
        
        // Check if both players have withdrawn, advance to final commit phase
        if (game.playerA.withdrawnMoveIndex != 0 && game.playerB.withdrawnMoveIndex != 0) {
            game.phase = GamePhase.FinalCommit;
            game.firstFinalCommit = 0; // Reset for final commit
        }
        
        return true;
    }

    // ------------------------- Final Commit (remaining move) ------------------------- //

    // Commit the remaining move again (for fairness and to prevent cheating)
    function commitFinalMove(uint gameId, bytes32 encrFinalMove)
        public
        isRegistered(gameId)
        returns (bool)
    {
        GameState storage game = games[gameId];
        
        require(game.isActive, "Game is no longer active");
        require(game.phase == GamePhase.FinalCommit, "Not in final commit phase");
        require(encrFinalMove != bytes32(0), "Encrypted move cannot be zero");
        
        // Check timeout
        if (game.firstFinalCommit != 0) {
            require(block.timestamp <= game.firstFinalCommit + COMMIT_TIMEOUT, "Final commit timeout expired");
        }
        
        // Store encrypted final move
        if (msg.sender == game.playerA.addr) {
            require(game.playerA.encrFinalMove == bytes32(0), "Player A already committed final move");
            game.playerA.encrFinalMove = encrFinalMove;
        } else if (msg.sender == game.playerB.addr) {
            require(game.playerB.encrFinalMove == bytes32(0), "Player B already committed final move");
            game.playerB.encrFinalMove = encrFinalMove;
        } else {
            revert("Caller not registered");
        }
        
        // Start final commit timer on first commit
        if (game.firstFinalCommit == 0) {
            game.firstFinalCommit = block.timestamp;
        }
        
        // Check if both players have committed, advance to final reveal phase
        if (game.playerA.encrFinalMove != bytes32(0) && game.playerB.encrFinalMove != bytes32(0)) {
            game.phase = GamePhase.FinalReveal;
            game.firstFinalReveal = 0; // Reset for final reveal
        }
        
        return true;
    }

    // ------------------------- Final Reveal ------------------------- //

    // Reveal the final move and determine winner
    function revealFinalMove(uint gameId, string memory clearFinalMove)
        public
        isRegistered(gameId)
        returns (Moves)
    {
        GameState storage game = games[gameId];
        
        require(game.isActive, "Game is no longer active");
        require(game.phase == GamePhase.FinalReveal, "Not in final reveal phase");
        
        // Check timeout
        if (game.firstFinalReveal != 0) {
            require(block.timestamp <= game.firstFinalReveal + REVEAL_TIMEOUT, "Final reveal timeout expired");
        }
        
        bytes32 encrFinalMove = keccak256(abi.encodePacked(clearFinalMove));
        Moves finalMove = Moves(getFirstChar(clearFinalMove));
        
        require(finalMove != Moves.None, "Invalid move");
        
        // Verify and store final move
        if (msg.sender == game.playerA.addr) {
            require(encrFinalMove == game.playerA.encrFinalMove, "Hash mismatch for Player A final move");
            // Verify this is the non-withdrawn move
            Moves expectedMove = game.playerA.withdrawnMoveIndex == 1 ? game.playerA.move2 : game.playerA.move1;
            require(finalMove == expectedMove, "Final move must be the non-withdrawn move");
            game.playerA.finalMove = finalMove;
        } else if (msg.sender == game.playerB.addr) {
            require(encrFinalMove == game.playerB.encrFinalMove, "Hash mismatch for Player B final move");
            // Verify this is the non-withdrawn move
            Moves expectedMove = game.playerB.withdrawnMoveIndex == 1 ? game.playerB.move2 : game.playerB.move1;
            require(finalMove == expectedMove, "Final move must be the non-withdrawn move");
            game.playerB.finalMove = finalMove;
        } else {
            revert("Caller not registered");
        }
        
        // Start final reveal timer on first reveal
        if (game.firstFinalReveal == 0) {
            game.firstFinalReveal = block.timestamp;
        }
        
        // Check if both players have revealed final moves, determine outcome
        if (game.playerA.finalMove != Moves.None && game.playerB.finalMove != Moves.None) {
            determineOutcome(gameId);
        }
        
        return finalMove;
    }

    // Determine the final outcome based on both players' final moves
    function determineOutcome(uint gameId) private {
        GameState storage game = games[gameId];
        
        if (game.playerA.finalMove == game.playerB.finalMove) {
            game.outcome = Outcomes.Draw;
        } else if (
            (game.playerA.finalMove == Moves.Rock && game.playerB.finalMove == Moves.Scissors) ||
            (game.playerA.finalMove == Moves.Paper && game.playerB.finalMove == Moves.Rock) ||
            (game.playerA.finalMove == Moves.Scissors && game.playerB.finalMove == Moves.Paper)
        ) {
            game.outcome = Outcomes.PlayerA;
        } else {
            game.outcome = Outcomes.PlayerB;
        }
        
        game.phase = GamePhase.Completed;
    }

    // Return first character of a given string.
    // Returns 0 if the string is empty or the first character is not '1','2' or '3'.
    function getFirstChar(string memory str) private pure returns (uint) {
        bytes memory b = bytes(str);
        if (b.length == 0) {
            return 0;
        }
        bytes1 firstByte = b[0];
        if (firstByte == 0x31) {
            return 1;
        } else if (firstByte == 0x32) {
            return 2;
        } else if (firstByte == 0x33) {
            return 3;
        } else {
            return 0;
        }
    }

    // ------------------------- Result ------------------------- //

    // Compute the outcome and pay the winner(s).
    // Return the outcome.
    function getOutcome(uint gameId) public returns (Outcomes) {
        GameState storage game = games[gameId];
        
        require(game.isActive, "Game is not active");
        require(game.phase == GamePhase.Completed, "Game not completed yet");
        require(game.outcome != Outcomes.None, "Outcome not yet determined");

        address payable addrA = game.playerA.addr;
        address payable addrB = game.playerB.addr;
        uint betPlayerA = game.initialBet;

        // Reset and cleanup
        resetGame(gameId); // Reset game before paying to avoid reentrancy attacks
        pay(addrA, addrB, betPlayerA, game.outcome);

        return game.outcome;
    }

    // Pay the winner(s).
    function pay(
        address payable addrA,
        address payable addrB,
        uint betPlayerA,
        Outcomes outcome
    ) private {
        if (outcome == Outcomes.PlayerA) {
            addrA.transfer(betPlayerA * 2);
        } else if (outcome == Outcomes.PlayerB) {
            addrB.transfer(betPlayerA * 2);
        } else {
            addrA.transfer(betPlayerA);
            addrB.transfer(betPlayerA);
        }
    }

    // Pay to one player and slash the other (timeout resolution).
    function payWithSlash(
        address payable winner,
        address payable loser,
        uint betAmount
    ) private {
        // Winner gets both bets
        winner.transfer(betAmount * 2);
        // Loser gets nothing (slashed)
    }

    // Reset a specific game.
    function resetGame(uint gameId) private {
        GameState storage game = games[gameId];

        // Mark game as inactive
        game.isActive = false;

        // Note: We keep the game data in the mapping for reference
        // but players are now free to join other games
    }

    // ------------------------- Helpers ------------------------- //

    // Return contract balance
    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    // Return player's ID in their active game
    function whoAmI(uint gameId) public view returns (uint) {
        if (gameId == 0) {
            return 0;
        }

        GameState storage game = games[gameId];
        if (msg.sender == game.playerA.addr) {
            return 1;
        } else if (msg.sender == game.playerB.addr) {
            return 2;
        } else {
            return 0;
        }
    }

    // Get the current phase of the game
    function getGamePhase(uint gameId) public view returns (GamePhase) {
        return games[gameId].phase;
    }

    // Get time remaining in current phase
    function getTimeLeft(uint gameId) public view returns (int) {
        if (gameId == 0) return 0;

        GameState storage game = games[gameId];
        
        if (game.phase == GamePhase.InitialCommit && game.firstCommit != 0) {
            uint deadline = game.firstCommit + COMMIT_TIMEOUT;
            if (block.timestamp >= deadline) return 0;
            return int(deadline - block.timestamp);
        } else if (game.phase == GamePhase.FirstReveal && game.firstReveal != 0) {
            uint deadline = game.firstReveal + REVEAL_TIMEOUT;
            if (block.timestamp >= deadline) return 0;
            return int(deadline - block.timestamp);
        } else if (game.phase == GamePhase.Withdrawal && game.firstWithdraw != 0) {
            uint deadline = game.firstWithdraw + WITHDRAW_TIMEOUT;
            if (block.timestamp >= deadline) return 0;
            return int(deadline - block.timestamp);
        } else if (game.phase == GamePhase.FinalCommit && game.firstFinalCommit != 0) {
            uint deadline = game.firstFinalCommit + COMMIT_TIMEOUT;
            if (block.timestamp >= deadline) return 0;
            return int(deadline - block.timestamp);
        } else if (game.phase == GamePhase.FinalReveal && game.firstFinalReveal != 0) {
            uint deadline = game.firstFinalReveal + REVEAL_TIMEOUT;
            if (block.timestamp >= deadline) return 0;
            return int(deadline - block.timestamp);
        }
        
        return int(COMMIT_TIMEOUT); // Default timeout
    }

    // Resolve a game that has timed out
    function resolveTimeout(uint gameId) public isRegistered(gameId) {
        GameState storage game = games[gameId];
        require(game.isActive, "Game is not active");
        
        address caller = msg.sender;
        address payable winner = payable(caller);
        
        bool timeoutOccurred = false;
        
        // Check for timeout in various phases
        if (game.phase == GamePhase.InitialCommit && game.firstCommit != 0) {
            if (block.timestamp > game.firstCommit + COMMIT_TIMEOUT) {
                // Player who didn't commit loses
                if (caller == game.playerA.addr && game.playerB.encrMove1 == bytes32(0)) {
                    game.outcome = Outcomes.PlayerA;
                    timeoutOccurred = true;
                } else if (caller == game.playerB.addr && game.playerA.encrMove1 == bytes32(0)) {
                    game.outcome = Outcomes.PlayerB;
                    timeoutOccurred = true;
                }
            }
        } else if (game.phase == GamePhase.FirstReveal && game.firstReveal != 0) {
            if (block.timestamp > game.firstReveal + REVEAL_TIMEOUT) {
                // Player who didn't reveal loses
                if (caller == game.playerA.addr && game.playerB.move1 == Moves.None) {
                    game.outcome = Outcomes.PlayerA;
                    timeoutOccurred = true;
                } else if (caller == game.playerB.addr && game.playerA.move1 == Moves.None) {
                    game.outcome = Outcomes.PlayerB;
                    timeoutOccurred = true;
                }
            }
        } else if (game.phase == GamePhase.Withdrawal && game.firstWithdraw != 0) {
            if (block.timestamp > game.firstWithdraw + WITHDRAW_TIMEOUT) {
                // Player who didn't withdraw loses
                if (caller == game.playerA.addr && game.playerB.withdrawnMoveIndex == 0) {
                    game.outcome = Outcomes.PlayerA;
                    timeoutOccurred = true;
                } else if (caller == game.playerB.addr && game.playerA.withdrawnMoveIndex == 0) {
                    game.outcome = Outcomes.PlayerB;
                    timeoutOccurred = true;
                }
            }
        } else if (game.phase == GamePhase.FinalCommit && game.firstFinalCommit != 0) {
            if (block.timestamp > game.firstFinalCommit + COMMIT_TIMEOUT) {
                // Player who didn't commit final move loses
                if (caller == game.playerA.addr && game.playerB.encrFinalMove == bytes32(0)) {
                    game.outcome = Outcomes.PlayerA;
                    timeoutOccurred = true;
                } else if (caller == game.playerB.addr && game.playerA.encrFinalMove == bytes32(0)) {
                    game.outcome = Outcomes.PlayerB;
                    timeoutOccurred = true;
                }
            }
        } else if (game.phase == GamePhase.FinalReveal && game.firstFinalReveal != 0) {
            if (block.timestamp > game.firstFinalReveal + REVEAL_TIMEOUT) {
                // Player who didn't reveal final move loses
                if (caller == game.playerA.addr && game.playerB.finalMove == Moves.None) {
                    game.outcome = Outcomes.PlayerA;
                    timeoutOccurred = true;
                } else if (caller == game.playerB.addr && game.playerA.finalMove == Moves.None) {
                    game.outcome = Outcomes.PlayerB;
                    timeoutOccurred = true;
                }
            }
        }
        
        require(timeoutOccurred, "No timeout has occurred or caller is not the non-offending player");
        
        address payable loser = winner == game.playerA.addr ? game.playerB.addr : game.playerA.addr;
        
        // Reset game
        resetGame(gameId);
        
        // Pay winner and slash offender
        payWithSlash(winner, loser, game.initialBet);
    }

    // ------------------------- Game Management ------------------------- //

    // Get details of a specific game (for viewing any game)
    function getGameDetails(
        uint gameId
    )
        public
        view
        returns (
            Player memory playerA,
            Player memory playerB,
            uint initialBet,
            Outcomes outcome,
            GamePhase phase,
            bool isActive,
            uint returnGameId,
            string memory gameMode
        )
    {
        GameState storage game = games[gameId];
        require(game.gameId != 0, "Game does not exist");
        return (
            game.playerA,
            game.playerB,
            game.initialBet,
            game.outcome,
            game.phase,
            game.isActive,
            game.gameId,
            game.gameMode
        );
    }

    // Get all active game IDs
    function getActiveGameIds() public view returns (uint[] memory) {
        uint activeCount = 0;

        // Count active games
        for (uint i = 0; i < gameIds.length; i++) {
            if (games[gameIds[i]].isActive) {
                activeCount++;
            }
        }

        // Build array of active game IDs
        uint[] memory activeIds = new uint[](activeCount);
        uint index = 0;
        for (uint i = 0; i < gameIds.length; i++) {
            if (games[gameIds[i]].isActive) {
                activeIds[index] = gameIds[i];
                index++;
            }
        }

        return activeIds;
    }

    // Advance game to initial commit phase (called automatically after both players register)
    function startGame(uint gameId) public {
        GameState storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(game.phase == GamePhase.Registration, "Game already started");
        require(game.playerA.addr != address(0) && game.playerB.addr != address(0), "Both players must be registered");
        
        game.phase = GamePhase.InitialCommit;
    }
}
