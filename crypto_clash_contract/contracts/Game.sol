// SPDX-License-Identifier: MIT

pragma solidity >=0.7.3;

contract Game {
    uint public constant BET_MIN = 1e16; // The minimum bet (1 BLD)
    uint public constant REVEAL_TIMEOUT = 10 minutes; // Max delay of revelation phase

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
        Draw
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
        uint firstReveal;
        uint initialBet;
        uint gameId;
        bool isActive;
    }

    // Mapping from player address to their active game ID
    mapping(address => uint) private playerToActiveGame;

    // Mapping from game ID to game state
    mapping(uint => GameState) private games;

    // Array to track all game IDs (for enumeration)
    uint[] private gameIds;

    // Counter for generating unique game IDs
    uint private nextGameId = 1;

    // Array to store completed games
    GameState[] private pastGames;

    // ------------------------- Registration ------------------------- //

    modifier validBet(uint gameId) {
        require(msg.value >= BET_MIN, "Minimum bet not met");
        require(
            games[gameId].initialBet == 0 ||
                msg.value >= games[gameId].initialBet,
            "Bet value too low"
        );
        _;
    }

    modifier notAlreadyInGame() {
        require(
            playerToActiveGame[msg.sender] == 0,
            "Player already in an active game"
        );
        _;
    }

    // Register a player to an existing game or create a new game.
    // If gameId is 0, player will join or create the first available game.
    // Return player's ID and game ID upon successful registration.
    function register(
        uint gameId
    )
        public
        payable
        validBet(gameId)
        notAlreadyInGame
        returns (uint playerId, uint returnGameId)
    {
        // If gameId is 0, find an open game or create a new one
        if (gameId == 0) {
            gameId = findOrCreateGame();
        }

        require(games[gameId].isActive, "Game is not active");

        GameState storage game = games[gameId];

        if (game.playerA.addr == address(0x0)) {
            game.playerA.addr = payable(msg.sender);
            game.initialBet = msg.value;
            playerToActiveGame[msg.sender] = gameId;
            return (1, gameId);
        } else if (game.playerB.addr == address(0x0)) {
            require(
                msg.sender != game.playerA.addr,
                "Cannot play against yourself"
            );
            game.playerB.addr = payable(msg.sender);
            playerToActiveGame[msg.sender] = gameId;
            return (2, gameId);
        }

        revert("Game is full");
    }

    // Find an open game or create a new one
    function findOrCreateGame() private returns (uint) {
        // Look for a game with only one player
        for (uint i = 0; i < gameIds.length; i++) {
            uint gId = gameIds[i];
            GameState storage game = games[gId];
            if (
                game.isActive &&
                game.playerA.addr != address(0x0) &&
                game.playerB.addr == address(0x0)
            ) {
                return gId;
            }
        }

        // No open game found, create a new one
        return createNewGame();
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

    modifier isRegistered() {
        uint gameId = playerToActiveGame[msg.sender];
        require(gameId != 0, "Player not in any active game");
        require(
            msg.sender == games[gameId].playerA.addr ||
                msg.sender == games[gameId].playerB.addr,
            "Player not registered in this game"
        );
        _;
    }

    // Save player's encrypted move. encrMove must be "<1|2|3>-password" hashed with sha256.
    // Return 'true' if move was valid, 'false' otherwise.
    function play(bytes32 encrMove) public isRegistered returns (bool) {
        uint gameId = playerToActiveGame[msg.sender];
        GameState storage game = games[gameId];

        // Basic sanity checks with explicit errors to help debugging
        require(encrMove != bytes32(0), "Encrypted move cannot be zero");
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

    modifier commitPhaseEnded() {
        uint gameId = playerToActiveGame[msg.sender];
        require(gameId != 0, "Player not in any active game");
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
        string memory clearMove
    ) public isRegistered commitPhaseEnded returns (Moves) {
        uint gameId = playerToActiveGame[msg.sender];
        GameState storage game = games[gameId];

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

    modifier revealPhaseEnded() {
        uint gameId = playerToActiveGame[msg.sender];
        require(gameId != 0, "Player not in any active game");
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
    function getOutcome() public revealPhaseEnded returns (Outcomes) {
        uint gameId = playerToActiveGame[msg.sender];
        GameState storage game = games[gameId];

        // Only calculate outcome once
        require(game.outcome == Outcomes.None, "Outcome already determined");

        Outcomes outcome;

        if (game.playerA.move == game.playerB.move) {
            outcome = Outcomes.Draw;
        } else if (
            (game.playerA.move == Moves.Rock &&
                game.playerB.move == Moves.Scissors) ||
            (game.playerA.move == Moves.Paper &&
                game.playerB.move == Moves.Rock) ||
            (game.playerA.move == Moves.Scissors &&
                game.playerB.move == Moves.Paper) ||
            (game.playerA.move != Moves.None && game.playerB.move == Moves.None)
        ) {
            outcome = Outcomes.PlayerA;
        } else {
            outcome = Outcomes.PlayerB;
        }

        // Store the outcome permanently before resetting
        game.outcome = outcome;

        address payable addrA = game.playerA.addr;
        address payable addrB = game.playerB.addr;
        uint betPlayerA = game.initialBet;

        // Move game to past games before resetting
        pastGames.push(game);

        // Reset and cleanup
        resetGame(gameId); // Reset game before paying to avoid reentrancy attacks
        pay(addrA, addrB, betPlayerA, outcome);

        return outcome;
    }

    // Pay the winner(s).
    function pay(
        address payable addrA,
        address payable addrB,
        uint betPlayerA,
        Outcomes outcome
    ) private {
        if (outcome == Outcomes.PlayerA) {
            addrA.transfer(address(this).balance);
        } else if (outcome == Outcomes.PlayerB) {
            addrB.transfer(address(this).balance);
        } else {
            addrA.transfer(betPlayerA);
            addrB.transfer(address(this).balance);
        }
    }

    // Reset a specific game.
    function resetGame(uint gameId) private {
        GameState storage game = games[gameId];

        // Clear player mappings
        if (game.playerA.addr != address(0x0)) {
            playerToActiveGame[game.playerA.addr] = 0;
        }
        if (game.playerB.addr != address(0x0)) {
            playerToActiveGame[game.playerB.addr] = 0;
        }

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
    function whoAmI() public view returns (uint) {
        uint gameId = playerToActiveGame[msg.sender];
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

    // Get the active game ID for the caller
    function getMyActiveGameId() public view returns (uint) {
        return playerToActiveGame[msg.sender];
    }

    // Return 'true' if both players have commited a move, 'false' otherwise.
    function bothPlayed() public view returns (bool) {
        uint gameId = playerToActiveGame[msg.sender];
        if (gameId == 0) return false;

        GameState storage game = games[gameId];
        return (game.playerA.encrMove != bytes32(0) && game.playerB.encrMove != bytes32(0));
    }

    // Return 'true' if both players have revealed their move, 'false' otherwise.
    function bothRevealed() public view returns (bool) {
        uint gameId = playerToActiveGame[msg.sender];
        if (gameId == 0) return false;

        GameState storage game = games[gameId];
        return (game.playerA.move != Moves.None &&
            game.playerB.move != Moves.None);
    }

    // Return 'true' if player A has revealed their move, 'false' otherwise.
    function playerARevealed() public view returns (bool) {
        uint gameId = playerToActiveGame[msg.sender];
        if (gameId == 0) return false;

        GameState storage game = games[gameId];
        return (game.playerA.move != Moves.None);
    }

    // Return 'true' if player B has revealed their move, 'false' otherwise.
    function playerBRevealed() public view returns (bool) {
        uint gameId = playerToActiveGame[msg.sender];
        if (gameId == 0) return false;

        GameState storage game = games[gameId];
        return (game.playerB.move != Moves.None);
    }

    // Return time left before the end of the revelation phase.
    function revealTimeLeft() public view returns (int) {
        uint gameId = playerToActiveGame[msg.sender];
        if (gameId == 0) return int(REVEAL_TIMEOUT);

        GameState storage game = games[gameId];
        if (game.firstReveal != 0) {
            return int((game.firstReveal + REVEAL_TIMEOUT) - block.timestamp);
        }
        return int(REVEAL_TIMEOUT);
    }

    function getLastWinner() public view returns (Outcomes) {
        uint gameId = playerToActiveGame[msg.sender];
        if (gameId == 0) return Outcomes.None;

        return games[gameId].outcome;
    }

    // ------------------------- Game Management ------------------------- //

    // Get details of a specific game (for viewing any game)
    function getGameDetails(
        uint gameId
    )
        public
        view
        returns (
            address playerAAddr,
            address playerBAddr,
            uint initialBet,
            Outcomes outcome,
            bool isActive
        )
    {
        GameState storage game = games[gameId];
        require(game.gameId != 0, "Game does not exist");
        return (
            game.playerA.addr,
            game.playerB.addr,
            game.initialBet,
            game.outcome,
            game.isActive
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

    // Get number of past games
    function getPastGamesCount() public view returns (uint) {
        return pastGames.length;
    }

    // Get details of a past game by index
    function getPastGame(
        uint index
    )
        public
        view
        returns (
            address playerAAddr,
            address playerBAddr,
            uint initialBet,
            Outcomes outcome
        )
    {
        require(index < pastGames.length, "Index out of bounds");
        GameState storage game = pastGames[index];
        return (
            game.playerA.addr,
            game.playerB.addr,
            game.initialBet,
            game.outcome
        );
    }
}
