// SPDX-License-Identifier: MIT

pragma solidity ^0.8.30;

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
    }

    GameState private currentGame;

    GameState[] private pastGames;
    GameState[] private activeGames;

    // ------------------------- Registration ------------------------- //

    modifier validBet() {
        require(msg.value >= BET_MIN, "Minimum bet not met");
        require(
            currentGame.initialBet == 0 || msg.value >= currentGame.initialBet,
            "Bet value too low"
        );
        _;
    }

    modifier notAlreadyRegistered() {
        require(
            msg.sender != currentGame.playerA.addr &&
                msg.sender != currentGame.playerB.addr,
            "Player already registered"
        );
        _;
    }

    // Register a player.
    // Return player's ID upon successful registration.
    function register()
        public
        payable
        validBet
        notAlreadyRegistered
        returns (uint)
    {
        if (currentGame.playerA.addr == address(0x0)) {
            currentGame.playerA.addr = payable(msg.sender);
            currentGame.initialBet = msg.value;
            return 1;
        } else if (currentGame.playerB.addr == address(0x0)) {
            currentGame.playerB.addr = payable(msg.sender);
            return 2;
        }
        return 0;
    }

    // ------------------------- Commit ------------------------- //

    modifier isRegistered() {
        require(
            msg.sender == currentGame.playerA.addr ||
                msg.sender == currentGame.playerB.addr,
            "Player not registered"
        );
        _;
    }

    // Save player's encrypted move. encrMove must be "<1|2|3>-password" hashed with sha256.
    // Return 'true' if move was valid, 'false' otherwise.
    function play(bytes32 encrMove) public isRegistered returns (bool) {
        // Basic sanity checks with explicit errors to help debugging
        require(encrMove != bytes32(0), "Encrypted move cannot be zero");
        // Ensure the caller hasn't already committed a move
        if (msg.sender == currentGame.playerA.addr) {
            require(
                currentGame.playerA.encrMove == bytes32(0),
                "Player A already committed"
            );
            currentGame.playerA.encrMove = encrMove;
        } else if (msg.sender == currentGame.playerB.addr) {
            require(
                currentGame.playerB.encrMove == bytes32(0),
                "Player B already committed"
            );
            currentGame.playerB.encrMove = encrMove;
        } else {
            revert("Caller not registered");
        }
        return true;
    }

    // ------------------------- Reveal ------------------------- //

    modifier commitPhaseEnded() {
        require(
            currentGame.playerA.encrMove != bytes32(0) &&
                currentGame.playerB.encrMove != bytes32(0),
            "Commit phase not ended"
        );
        _;
    }

    // Compare clear move given by the player with saved encrypted move.
    // Return clear move upon success, 'Moves.None' otherwise.
    function reveal(
        string memory clearMove
    ) public isRegistered commitPhaseEnded returns (Moves) {
        bytes32 encrMove = sha256(abi.encodePacked(clearMove)); // Hash of clear input (= "move-password")
        Moves move = Moves(getFirstChar(clearMove)); // Actual move (Rock / Paper / Scissors)

        // If move invalid, exit
        require(move != Moves.None, "Invalid move");

        // If hashes match, clear move is saved
        if (
            msg.sender == currentGame.playerA.addr &&
            encrMove == currentGame.playerA.encrMove
        ) {
            currentGame.playerA.move = move;
        } else if (
            msg.sender == currentGame.playerB.addr &&
            encrMove == currentGame.playerB.encrMove
        ) {
            currentGame.playerB.move = move;
        } else {
            return Moves.None;
        }

        // Timer starts after first revelation from one of the player
        if (currentGame.firstReveal == 0) {
            currentGame.firstReveal = block.timestamp;
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
        require(
            (currentGame.playerA.move != Moves.None &&
                currentGame.playerB.move != Moves.None) ||
                (currentGame.firstReveal != 0 &&
                    block.timestamp > currentGame.firstReveal + REVEAL_TIMEOUT),
            "Reveal phase not ended"
        );
        _;
    }

    // Compute the outcome and pay the winner(s).
    // Return the outcome.
    function getOutcome() public revealPhaseEnded returns (Outcomes) {
        // Only calculate outcome once
        require(
            currentGame.outcome == Outcomes.None,
            "Outcome already determined"
        );

        Outcomes outcome;

        if (currentGame.playerA.move == currentGame.playerB.move) {
            outcome = Outcomes.Draw;
        } else if (
            (currentGame.playerA.move == Moves.Rock &&
                currentGame.playerB.move == Moves.Scissors) ||
            (currentGame.playerA.move == Moves.Paper &&
                currentGame.playerB.move == Moves.Rock) ||
            (currentGame.playerA.move == Moves.Scissors &&
                currentGame.playerB.move == Moves.Paper) ||
            (currentGame.playerA.move != Moves.None &&
                currentGame.playerB.move == Moves.None)
        ) {
            outcome = Outcomes.PlayerA;
        } else {
            outcome = Outcomes.PlayerB;
        }

        // Store the outcome permanently before resetting
        currentGame.outcome = outcome;

        address payable addrA = currentGame.playerA.addr;
        address payable addrB = currentGame.playerB.addr;
        uint betPlayerA = currentGame.initialBet;
        reset(); // Reset game before paying to avoid reentrancy attacks
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
        // Uncomment lines below if you need to adjust the gas limit
        if (outcome == Outcomes.PlayerA) {
            addrA.transfer(address(this).balance);
            // addrA.call.value(address(this).balance).gas(1000000)("");
        } else if (outcome == Outcomes.PlayerB) {
            addrB.transfer(address(this).balance);
            // addrB.call.value(address(this).balance).gas(1000000)("");
        } else {
            addrA.transfer(betPlayerA);
            addrB.transfer(address(this).balance);
            // addrA.call.value(betPlayerA).gas(1000000)("");
            // addrB.call.value(address(this).balance).gas(1000000)("");
        }
    }

    // Reset the game.
    function reset() private {
        currentGame.initialBet = 0;
        currentGame.firstReveal = 0;
        currentGame.playerA.addr = payable(address(0x0));
        currentGame.playerB.addr = payable(address(0x0));
        currentGame.playerA.encrMove = 0x0;
        currentGame.playerB.encrMove = 0x0;
        currentGame.playerA.move = Moves.None;
        currentGame.playerB.move = Moves.None;
    }

    // ------------------------- Helpers ------------------------- //

    // Return contract balance
    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    // Return player's ID
    function whoAmI() public view returns (uint) {
        if (msg.sender == currentGame.playerA.addr) {
            return 1;
        } else if (msg.sender == currentGame.playerB.addr) {
            return 2;
        } else {
            return 0;
        }
    }

    // Return 'true' if both players have commited a move, 'false' otherwise.
    function bothPlayed() public view returns (bool) {
        return (currentGame.playerA.encrMove != 0x0 &&
            currentGame.playerB.encrMove != 0x0);
    }

    // Return 'true' if both players have revealed their move, 'false' otherwise.
    function bothRevealed() public view returns (bool) {
        return (currentGame.playerA.move != Moves.None &&
            currentGame.playerB.move != Moves.None);
    }

    // Return 'true' if player A has revealed their move, 'false' otherwise.
    function playerARevealed() public view returns (bool) {
        return (currentGame.playerA.move != Moves.None);
    }

    // Return 'true' if player B has revealed their move, 'false' otherwise.
    function playerBRevealed() public view returns (bool) {
        return (currentGame.playerB.move != Moves.None);
    }

    // Return time left before the end of the revelation phase.
    function revealTimeLeft() public view returns (int) {
        if (currentGame.firstReveal != 0) {
            return
                int(
                    (currentGame.firstReveal + REVEAL_TIMEOUT) - block.timestamp
                );
        }
        return int(REVEAL_TIMEOUT);
    }

    function getLastWinner() public view returns (Outcomes) {
        return currentGame.outcome;
    }
}
