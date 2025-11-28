// SPDX-License-Identifier: MIT

pragma solidity >=0.7.3;

contract Game {
    uint public constant BET_MIN = 1e16; // The minimum bet (1 BLD)
    uint public constant REVEAL_TIMEOUT = 10 minutes; // Max delay of revelation phase
    uint public constant COMMIT_TIMEOUT = 10 minutes; // Max delay of commit phase

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

    struct Player {
        address payable addr;
        uint bet;
        bytes32 encrMove;
        Moves move;
        string nickname;
    }

    struct GameState {
        Player playerA;
        Player playerB;
        Outcomes outcome;
        uint firstCommit;
        uint firstReveal;
        uint initialBet;
        uint gameId;
        bool isActive;
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
        gameIds.push(gameId);

        return gameId;
    }

    // ------------------------- Commit ------------------------- //

    modifier isRegistered(uint gameId) {
        require(gameId != 0, "Invalid game ID");
        require(
            msg.sender == games[gameId].playerA.addr ||
                msg.sender == games[gameId].playerB.addr,
            "Player not registered in this game"
        );
        _;
    }

    // Save player's encrypted move. encrMove must be "<1|2|3>-password" hashed with sha256.
    // Return 'true' if move was valid, 'false' otherwise.
    function play(uint gameId, bytes32 encrMove) public isRegistered(gameId) returns (bool) {
        GameState storage game = games[gameId];

        // Check if game is still active (commit phase not timed out)
        require(game.isActive, "Game is no longer active");
        require(game.firstCommit == 0 || block.timestamp <= game.firstCommit + COMMIT_TIMEOUT, "Commit phase timeout expired");

        // Basic sanity checks with explicit errors to help debugging
        require(encrMove != bytes32(0), "Encrypted move cannot be zero");
        
        // Track first commit timestamp
        if (game.firstCommit == 0) {
            game.firstCommit = block.timestamp;
        }
        
        // Ensure the caller hasn't already committed a move
        if (msg.sender == game.playerA.addr) {
            require(
                game.playerA.encrMove == bytes32(0),
                "Player A already committed"
            );
            game.playerA.encrMove = encrMove;
        } else if (msg.sender == game.playerB.addr) {
            require(
                game.playerB.encrMove == bytes32(0),
                "Player B already committed"
            );
            game.playerB.encrMove = encrMove;
        } else {
            revert("Caller not registered");
        }
        return true;
    }

    // ------------------------- Reveal ------------------------- //

    modifier commitPhaseEnded(uint gameId) {
        require(gameId != 0, "Invalid game ID");
        require(
            games[gameId].playerA.encrMove != bytes32(0) &&
                games[gameId].playerB.encrMove != bytes32(0),
            "Commit phase not ended"
        );
        _;
    }

    // Compare clear move given by the player with saved encrypted move.
    // Return clear move upon success, 'Moves.None' otherwise.
    function reveal(
        uint gameId,
        string memory clearMove
    ) public isRegistered(gameId) commitPhaseEnded(gameId) returns (Moves) {
        GameState storage game = games[gameId];

        // Check if reveal phase timeout has expired
        if( game.firstReveal != 0 ) {
        require(block.timestamp <= game.firstReveal + REVEAL_TIMEOUT, "Reveal phase timeout expired");
        }
        bytes32 encrMove = keccak256(abi.encodePacked(clearMove)); // Hash of clear input (= "move-password")
        Moves move = Moves(getFirstChar(clearMove)); // Actual move (Rock / Paper / Scissors)

        // If move invalid, exit
        require(move != Moves.None, "Invalid move");

        // If hashes match, clear move is saved
        if (
            msg.sender == game.playerA.addr && encrMove == game.playerA.encrMove
        ) {
            game.playerA.move = move;
        } else if (
            msg.sender == game.playerB.addr && encrMove == game.playerB.encrMove
        ) {
            game.playerB.move = move;
        } else {
            return Moves.None;
        }

        // Timer starts after first revelation from one of the player
        if (game.firstReveal == 0) {
            game.firstReveal = block.timestamp;
        }

        if(
            game.playerA.move != Moves.None &&
            game.playerB.move != Moves.None
        ) {
            // Both players have revealed, compute outcome
            if (game.playerA.move == game.playerB.move) {
                game.outcome = Outcomes.Draw;
            } else if (
                (game.playerA.move == Moves.Rock &&
                    game.playerB.move == Moves.Scissors) ||
                (game.playerA.move == Moves.Paper &&
                    game.playerB.move == Moves.Rock) ||
                (game.playerA.move == Moves.Scissors &&
                    game.playerB.move == Moves.Paper)
            ) {
                game.outcome = Outcomes.PlayerA;
            } else {
                game.outcome = Outcomes.PlayerB;
            }
        }

        return move;
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

    modifier revealPhaseEnded(uint gameId) {
        require(gameId != 0, "Invalid game ID");
        require(
            (games[gameId].playerA.move != Moves.None &&
                games[gameId].playerB.move != Moves.None) ||
                (games[gameId].firstReveal != 0 &&
                    block.timestamp >
                    games[gameId].firstReveal + REVEAL_TIMEOUT),
            "Reveal phase not ended"
        );
        _;
    }

    // Compute the outcome and pay the winner(s).
    // Return the outcome.
    function getOutcome(uint gameId) public revealPhaseEnded(gameId) returns (Outcomes) {
        GameState storage game = games[gameId];

        require(
            game.outcome != Outcomes.None,
            "Outcome not yet determined"
        );

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

    // Return time left before the end of the revelation phase.
    function revealTimeLeft(uint gameId) public view returns (int) {
        if (gameId == 0) return int(REVEAL_TIMEOUT);

        GameState storage game = games[gameId];
        if (game.firstReveal != 0) {
            uint deadline = game.firstReveal + REVEAL_TIMEOUT;
            if (block.timestamp >= deadline) {
                return 0;
            }
            return int(deadline - block.timestamp);
        }
        return int(REVEAL_TIMEOUT);
    }

    // Return time left before the end of the commit phase.
    function commitTimeLeft(uint gameId) public view returns (int) {
        if (gameId == 0) return int(COMMIT_TIMEOUT);

        GameState storage game = games[gameId];
        if (game.firstCommit != 0) {
            uint deadline = game.firstCommit + COMMIT_TIMEOUT;
            if (block.timestamp >= deadline) {
                return 0;
            }
            return int(deadline - block.timestamp);
        }
        return int(COMMIT_TIMEOUT);
    }

    // Resolve a game that has timed out. Caller must be the non-offending player.
    // The offending player is slashed (loses their bet), winner gets both bets.
    function resolveTimeout(uint gameId) public isRegistered(gameId) {
        GameState storage game = games[gameId];
        require(game.isActive, "Game is not active");
        
        address caller = msg.sender;
        address payable offender;
        address payable winner = payable(caller);
        
        bool commitPhaseTimedOut = game.firstCommit != 0 && 
                                   block.timestamp > game.firstCommit + COMMIT_TIMEOUT && (game.playerA.encrMove == bytes32(0) || game.playerB.encrMove == bytes32(0));
        bool revealPhaseTimedOut = game.firstReveal != 0 && 
                                   block.timestamp > game.firstReveal + REVEAL_TIMEOUT;
        
        if (commitPhaseTimedOut) {
            // Commit phase timeout: player who didn't commit first is offender
            require(
                (caller == game.playerA.addr && game.playerB.encrMove == bytes32(0)) ||
                (caller == game.playerB.addr && game.playerA.encrMove == bytes32(0)),
                "Caller must be the non-offending player"
            );
            
            if (caller == game.playerA.addr) {
                offender = game.playerB.addr;
                game.outcome = Outcomes.PlayerBTimeout;
            } else {
                offender = game.playerA.addr;
                game.outcome = Outcomes.PlayerATimeout;
            }
        } else if (revealPhaseTimedOut) {
            // Reveal phase timeout: player who didn't reveal is offender
            require(
                (caller == game.playerA.addr && game.playerB.move == Moves.None) ||
                (caller == game.playerB.addr && game.playerA.move == Moves.None),
                "Caller must be the non-offending player"
            );
            
            if (caller == game.playerA.addr) {
                offender = game.playerB.addr;
                game.outcome = Outcomes.PlayerBTimeout;
            } else {
                offender = game.playerA.addr;
                game.outcome = Outcomes.PlayerATimeout;
            }
        } else {
            revert("No timeout has occurred");
        }
        
        // Reset game
        resetGame(gameId);
        
        // Pay winner and slash offender
        payWithSlash(winner, offender, game.initialBet);
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
            bool isActive,
            uint returnGameId
        )
    {
        GameState storage game = games[gameId];
        require(game.gameId != 0, "Game does not exist");
        return (
            game.playerA,
            game.playerB,
            game.initialBet,
            game.outcome,
            game.isActive,
            game.gameId
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
}
