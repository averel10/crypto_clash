// SPDX-License-Identifier: MIT
pragma solidity >=0.7.3;

contract GameMinusOne {
    uint constant BET_MIN = 1e16;
    uint constant REVEAL_TIMEOUT = 10 minutes;
    uint constant COMMIT_TIMEOUT = 10 minutes;
    uint constant WITHDRAW_TIMEOUT = 10 minutes;

    enum Moves { None, Rock, Paper, Scissors }
    enum Outcomes { None, A, B, D, AT, BT }
    enum GamePhase { Reg, InitC, FirstR, WithdC, WithdR, Done }

    struct Player {
        address payable addr;
        uint bet;
        bytes32 hash1;
        bytes32 hash2;
        Moves move1;
        Moves move2;
        bytes32 wHash;
        uint withdrawn;
        string nick;
    }

    struct GameState {
        Player pA;
        Player pB;
        Outcomes outcome;
        GamePhase phase;
        uint tCommit;
        uint tReveal;
        uint tWithdC;
        uint tWithdR;
        uint bet;
        uint gameId;
        bool active;
        string mode;
    }

    mapping(uint => GameState) private games;
    uint[] private gameIds;
    uint private nextId = 1;

    modifier validBet(uint gameId) {
        require(msg.value >= BET_MIN, "Bet below minimum");
        require(games[gameId].bet == 0 || msg.value == games[gameId].bet, "Bet must match initial");
        _;
    }

    function register(uint gameId, string memory name) public payable validBet(gameId) returns (uint, uint) {
        if (gameId == 0) gameId = createNewGame();
        require(games[gameId].active, "Game not active");
        require(games[gameId].phase == GamePhase.Reg, "Game started");
        require(bytes(name).length > 0 && bytes(name).length <= 20, "Invalid nickname");
        GameState storage game = games[gameId];
        if (game.pA.addr == address(0)) {
            game.pA.addr = payable(msg.sender);
            game.pA.nick = name;
            game.bet = msg.value;
            return (1, gameId);
        } else if (game.pB.addr == address(0)) {
            require(msg.sender != game.pA.addr, "Cannot play yourself");
            game.pB.addr = payable(msg.sender);
            game.pB.nick = name;
            game.phase = GamePhase.InitC;
            return (2, gameId);
        }
        revert("Game full");
    }

    function createNewGame() private returns (uint) {
        uint gameId = nextId++;
        games[gameId].gameId = gameId;
        games[gameId].active = true;
        games[gameId].phase = GamePhase.Reg;
        games[gameId].mode = "minusone";
        gameIds.push(gameId);
        return gameId;
    }

    modifier isRegistered(uint gameId) {
        require(gameId != 0, "Invalid game ID");
        require(msg.sender == games[gameId].pA.addr || msg.sender == games[gameId].pB.addr, "Not registered");
        _;
    }

    function doCommit(uint gameId, bytes32 hash1, bytes32 hash2, uint8 mode) private {
        GameState storage game = games[gameId];
        require(game.active && hash1 != bytes32(0), "Invalid hash");
        bool isPlayerA = msg.sender == game.pA.addr;
        if (mode == 0) {
            require(game.phase == GamePhase.InitC, "Wrong phase");
            require(hash2 != bytes32(0) && hash1 != hash2, "Moves must differ");
            if (game.tCommit != 0) require(block.timestamp <= game.tCommit + COMMIT_TIMEOUT, "Commit timeout");
            if (game.tCommit == 0) game.tCommit = block.timestamp;
            if (isPlayerA) {
                require(game.pA.hash1 == bytes32(0), "Already committed");
                game.pA.hash1 = hash1; game.pA.hash2 = hash2;
            } else {
                require(game.pB.hash1 == bytes32(0), "Already committed");
                game.pB.hash1 = hash1; game.pB.hash2 = hash2;
            }
            if (game.pA.hash1 != bytes32(0) && game.pB.hash1 != bytes32(0)) { game.phase = GamePhase.FirstR; game.tReveal = 0; }
        } else {
            require(game.phase == GamePhase.WithdC, "Wrong phase");
            if (game.tWithdC != 0) require(block.timestamp <= game.tWithdC + COMMIT_TIMEOUT, "Commit timeout");
            if (game.tWithdC == 0) game.tWithdC = block.timestamp;
            if (isPlayerA) {
                require(game.pA.wHash == bytes32(0), "Already committed");
                game.pA.wHash = hash1;
            } else {
                require(game.pB.wHash == bytes32(0), "Already committed");
                game.pB.wHash = hash1;
            }
            if (game.pA.wHash != bytes32(0) && game.pB.wHash != bytes32(0)) { game.phase = GamePhase.WithdR; game.tWithdR = 0; }
        }
    }

    function commitInitialMoves(uint id_, bytes32 e1_, bytes32 e2_) public isRegistered(id_) returns (bool) {
        doCommit(id_, e1_, e2_, 0);
        return true;
    }

    function revealInitialMoves(uint gameId, string memory clear1, string memory clear2) public isRegistered(gameId) returns (Moves, Moves) {
        GameState storage game = games[gameId];
        require(game.active, "Game not active");
        require(game.phase == GamePhase.FirstR, "Wrong phase");
        if (game.tReveal != 0) require(block.timestamp <= game.tReveal + REVEAL_TIMEOUT, "Reveal timeout");
        bytes32 hash1 = keccak256(abi.encodePacked(clear1));
        bytes32 hash2 = keccak256(abi.encodePacked(clear2));
        Moves move1 = Moves(getFirstChar(clear1));
        Moves move2 = Moves(getFirstChar(clear2));
        require(move1 != Moves.None && move2 != Moves.None, "Invalid moves");
        require(move1 != move2, "Moves must differ");
        if (msg.sender == game.pA.addr) {
            require(hash1 == game.pA.hash1 && hash2 == game.pA.hash2, "Hash mismatch");
            game.pA.move1 = move1;
            game.pA.move2 = move2;
        } else if (msg.sender == game.pB.addr) {
            require(hash1 == game.pB.hash1 && hash2 == game.pB.hash2, "Hash mismatch");
            game.pB.move1 = move1;
            game.pB.move2 = move2;
        } else revert("Not registered");
        if (game.tReveal == 0) game.tReveal = block.timestamp;
        if (game.pA.move1 != Moves.None && game.pB.move1 != Moves.None) {
            game.phase = GamePhase.WithdC;
            game.tWithdC = 0;
        }
        return (move1, move2);
    }

    function commitWithdraw(uint gameId, bytes32 wHash) public isRegistered(gameId) returns (bool) {
        doCommit(gameId, wHash, bytes32(0), 1);
        return true;
    }

    function withdrawMove(uint gameId, string memory clear) public isRegistered(gameId) returns (uint) {
        GameState storage game = games[gameId];
        require(game.active, "Game not active");
        require(game.phase == GamePhase.WithdR, "Wrong phase");
        if (game.tWithdR != 0) require(block.timestamp <= game.tWithdR + REVEAL_TIMEOUT, "Reveal timeout");
        bytes32 wHash = keccak256(abi.encodePacked(clear));
        uint idx = getFirstChar(clear);
        require(idx == 1 || idx == 2, "Index must be 1 or 2");
        if (msg.sender == game.pA.addr) {
            require(wHash == game.pA.wHash, "Hash mismatch");
            require(game.pA.withdrawn == 0, "Already withdrew");
            game.pA.withdrawn = idx;
        } else if (msg.sender == game.pB.addr) {
            require(wHash == game.pB.wHash, "Hash mismatch");
            require(game.pB.withdrawn == 0, "Already withdrew");
            game.pB.withdrawn = idx;
        } else revert("Not registered");
        if (game.tWithdR == 0) game.tWithdR = block.timestamp;
        if (game.pA.withdrawn != 0 && game.pB.withdrawn != 0) determineOutcome(gameId);
        return idx;
    }


    function determineOutcome(uint gameId) private {
        GameState storage game = games[gameId];
        Moves finalA = game.pA.withdrawn == 1 ? game.pA.move2 : game.pA.move1;
        Moves finalB = game.pB.withdrawn == 1 ? game.pB.move2 : game.pB.move1;
        if (finalA == finalB) game.outcome = Outcomes.D;
        else if ((finalA == Moves.Rock && finalB == Moves.Scissors) ||
                 (finalA == Moves.Paper && finalB == Moves.Rock) ||
                 (finalA == Moves.Scissors && finalB == Moves.Paper))
            game.outcome = Outcomes.A;
        else game.outcome = Outcomes.B;
        game.phase = GamePhase.Done;
    }

    function getFirstChar(string memory str) private pure returns (uint) {
        bytes memory b = bytes(str);
        if (b.length == 0) return 0;
        bytes1 first = b[0];
        if (first == 0x31) return 1;
        if (first == 0x32) return 2;
        if (first == 0x33) return 3;
        return 0;
    }

    function getOutcome(uint gameId) public returns (Outcomes) {
        GameState storage game = games[gameId];
        require(game.active, "Game not active");
        require(game.phase == GamePhase.Done, "Game not finished");
        require(game.outcome != Outcomes.None, "No outcome yet");
        address payable addrA = game.pA.addr;
        address payable addrB = game.pB.addr;
        uint betAmount = game.bet;
        Outcomes result = game.outcome;
        resetGame(gameId);
        pay(addrA, addrB, betAmount, result);
        return result;
    }

    function pay(address payable addrA, address payable addrB, uint bet, Outcomes outcome) private {
        if (outcome == Outcomes.A) addrA.transfer(bet * 2);
        else if (outcome == Outcomes.B) addrB.transfer(bet * 2);
        else { addrA.transfer(bet); addrB.transfer(bet); }
    }

    function payWithSlash(address payable winner, address payable, uint bet) private {
        winner.transfer(bet * 2);
    }

    function resetGame(uint gameId) private {
        games[gameId].active = false;
    }

    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    function whoAmI(uint gameId) public view returns (uint) {
        if (gameId == 0) return 0;
        GameState storage game = games[gameId];
        if (msg.sender == game.pA.addr) return 1;
        if (msg.sender == game.pB.addr) return 2;
        return 0;
    }

    function getGamePhase(uint gameId) public view returns (GamePhase) {
        return games[gameId].phase;
    }

    function getTimeLeft(uint gameId) public view returns (int) {
        if (gameId == 0) return 0;
        GameState storage game = games[gameId];
        uint timeout; uint start;
        if (game.phase == GamePhase.InitC && game.tCommit != 0) { timeout = COMMIT_TIMEOUT; start = game.tCommit; }
        else if (game.phase == GamePhase.FirstR && game.tReveal != 0) { timeout = REVEAL_TIMEOUT; start = game.tReveal; }
        else if (game.phase == GamePhase.WithdC && game.tWithdC != 0) { timeout = COMMIT_TIMEOUT; start = game.tWithdC; }
        else if (game.phase == GamePhase.WithdR && game.tWithdR != 0) { timeout = REVEAL_TIMEOUT; start = game.tWithdR; }
        else return int(COMMIT_TIMEOUT);
        uint deadline = start + timeout;
        if (block.timestamp >= deadline) return 0;
        return int(deadline - block.timestamp);
    }

    function resolveTimeout(uint gameId) public isRegistered(gameId) {
        GameState storage game = games[gameId];
        require(game.active, "Game not active");
        address caller = msg.sender;
        bool isPlayerA = caller == game.pA.addr;
        bool timedOut = false;
        
        if (game.phase == GamePhase.InitC && game.tCommit != 0 && block.timestamp > game.tCommit + COMMIT_TIMEOUT) {
            timedOut = (isPlayerA && game.pB.hash1 == bytes32(0)) || (!isPlayerA && game.pA.hash1 == bytes32(0));
        } else if (game.phase == GamePhase.FirstR && game.tReveal != 0 && block.timestamp > game.tReveal + REVEAL_TIMEOUT) {
            timedOut = (isPlayerA && game.pB.move1 == Moves.None) || (!isPlayerA && game.pA.move1 == Moves.None);
        } else if (game.phase == GamePhase.WithdC && game.tWithdC != 0 && block.timestamp > game.tWithdC + COMMIT_TIMEOUT) {
            timedOut = (isPlayerA && game.pB.wHash == bytes32(0)) || (!isPlayerA && game.pA.wHash == bytes32(0));
        } else if (game.phase == GamePhase.WithdR && game.tWithdR != 0 && block.timestamp > game.tWithdR + REVEAL_TIMEOUT) {
            timedOut = (isPlayerA && game.pB.withdrawn == 0) || (!isPlayerA && game.pA.withdrawn == 0);
        }
        
        require(timedOut, "No timeout or invalid caller");
        game.outcome = isPlayerA ? Outcomes.A : Outcomes.B;
        address payable winner = payable(caller);
        address payable loser = isPlayerA ? game.pB.addr : game.pA.addr;
        uint betAmount = game.bet;
        resetGame(gameId);
        payWithSlash(winner, loser, betAmount);
    }

    function getGameDetails(uint gameId) public view returns (
        Player memory, Player memory, uint, Outcomes, GamePhase, bool, uint, string memory) {
        GameState storage game = games[gameId];
        require(game.gameId != 0, "Game does not exist");
        return (game.pA, game.pB, game.bet, game.outcome, game.phase, game.active, game.gameId, game.mode);
    }

    function getActiveGameIds() public view returns (uint[] memory) {
        uint count = 0;
        for (uint i = 0; i < gameIds.length; i++) if (games[gameIds[i]].active) count++;
        uint[] memory active = new uint[](count);
        uint idx = 0;
        for (uint i = 0; i < gameIds.length; i++) if (games[gameIds[i]].active) active[idx++] = gameIds[i];
        return active;
    }
}
