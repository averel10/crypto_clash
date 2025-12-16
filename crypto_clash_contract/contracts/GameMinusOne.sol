// SPDX-License-Identifier: MIT
pragma solidity >=0.7.3;

contract GameMinusOne {
    uint constant BET_MIN = 1e16;
    uint constant REVEAL_TIMEOUT = 10 minutes;
    uint constant COMMIT_TIMEOUT = 10 minutes;
    uint constant WITHDRAW_TIMEOUT = 10 minutes;

    enum Moves { None, Rock, Paper, Scissors }
    enum Outcomes { None, A, B, D, AT, BT }
    enum GamePhase { Reg, InitC, FirstR, WithdC, WithdR, FinalC, FinalR, Done }

    struct Player {
        address payable addr;
        uint bet;
        bytes32 e1;
        bytes32 e2;
        Moves m1;
        Moves m2;
        bytes32 ew;
        uint w;
        bytes32 ef;
        Moves mf;
        string n;
    }

    struct GameState {
        Player a;
        Player b;
        Outcomes o;
        GamePhase p;
        uint fc;
        uint fr;
        uint fwc;
        uint fwr;
        uint ffc;
        uint ffr;
        uint ib;
        uint id;
        bool act;
        string mode;
    }

    mapping(uint => GameState) private g;
    uint[] private ids;
    uint private nextId = 1;

    modifier validBet(uint id_) {
        require(msg.value >= BET_MIN, "min");
        require(g[id_].ib == 0 || msg.value == g[id_].ib, "bet");
        _;
    }

    function register(uint id_, string memory n_) public payable validBet(id_) returns (uint, uint) {
        if (id_ == 0) id_ = createNewGame();
        require(g[id_].act, "act");
        require(g[id_].p == GamePhase.Reg, "st");
        require(bytes(n_).length > 0 && bytes(n_).length <= 20, "n");
        GameState storage gm = g[id_];
        if (gm.a.addr == address(0)) {
            gm.a.addr = payable(msg.sender);
            gm.a.n = n_;
            gm.ib = msg.value;
            return (1, id_);
        } else if (gm.b.addr == address(0)) {
            require(msg.sender != gm.a.addr, "self");
            gm.b.addr = payable(msg.sender);
            gm.b.n = n_;
            gm.p = GamePhase.InitC;
            return (2, id_);
        }
        revert("full");
    }

    function createNewGame() private returns (uint) {
        uint id_ = nextId++;
        g[id_].id = id_;
        g[id_].act = true;
        g[id_].p = GamePhase.Reg;
        g[id_].mode = "minusone";
        ids.push(id_);
        return id_;
    }

    modifier isRegistered(uint id_) {
        require(id_ != 0, "id");
        require(msg.sender == g[id_].a.addr || msg.sender == g[id_].b.addr, "reg");
        _;
    }

    function commitInitialMoves(uint id_, bytes32 e1_, bytes32 e2_) public isRegistered(id_) returns (bool) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.InitC, "ph");
        require(e1_ != bytes32(0) && e2_ != bytes32(0), "0");
        require(e1_ != e2_, "eq");
        if (gm.fc != 0) require(block.timestamp <= gm.fc + COMMIT_TIMEOUT, "to");
        if (gm.fc == 0) gm.fc = block.timestamp;
        if (msg.sender == gm.a.addr) {
            require(gm.a.e1 == bytes32(0), "a");
            gm.a.e1 = e1_;
            gm.a.e2 = e2_;
        } else if (msg.sender == gm.b.addr) {
            require(gm.b.e1 == bytes32(0), "b");
            gm.b.e1 = e1_;
            gm.b.e2 = e2_;
        } else revert("reg");
        if (gm.a.e1 != bytes32(0) && gm.b.e1 != bytes32(0)) {
            gm.p = GamePhase.FirstR;
            gm.fr = 0;
        }
        return true;
    }

    function revealInitialMoves(uint id_, string memory c1, string memory c2) public isRegistered(id_) returns (Moves, Moves) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.FirstR, "ph");
        if (gm.fr != 0) require(block.timestamp <= gm.fr + REVEAL_TIMEOUT, "to");
        bytes32 e1_ = keccak256(abi.encodePacked(c1));
        bytes32 e2_ = keccak256(abi.encodePacked(c2));
        Moves m1_ = Moves(getFirstChar(c1));
        Moves m2_ = Moves(getFirstChar(c2));
        require(m1_ != Moves.None && m2_ != Moves.None, "m");
        require(m1_ != m2_, "eq");
        if (msg.sender == gm.a.addr) {
            require(e1_ == gm.a.e1 && e2_ == gm.a.e2, "h");
            gm.a.m1 = m1_;
            gm.a.m2 = m2_;
        } else if (msg.sender == gm.b.addr) {
            require(e1_ == gm.b.e1 && e2_ == gm.b.e2, "h");
            gm.b.m1 = m1_;
            gm.b.m2 = m2_;
        } else revert("reg");
        if (gm.fr == 0) gm.fr = block.timestamp;
        if (gm.a.m1 != Moves.None && gm.b.m1 != Moves.None) {
            gm.p = GamePhase.WithdC;
            gm.fwc = 0;
        }
        return (m1_, m2_);
    }

    function commitWithdraw(uint id_, bytes32 ew_) public isRegistered(id_) returns (bool) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.WithdC, "ph");
        require(ew_ != bytes32(0), "0");
        if (gm.fwc != 0) require(block.timestamp <= gm.fwc + COMMIT_TIMEOUT, "to");
        if (msg.sender == gm.a.addr) {
            require(gm.a.ew == bytes32(0), "a");
            gm.a.ew = ew_;
        } else if (msg.sender == gm.b.addr) {
            require(gm.b.ew == bytes32(0), "b");
            gm.b.ew = ew_;
        } else revert("reg");
        if (gm.fwc == 0) gm.fwc = block.timestamp;
        if (gm.a.ew != bytes32(0) && gm.b.ew != bytes32(0)) {
            gm.p = GamePhase.WithdR;
            gm.fwr = 0;
        }
        return true;
    }

    function withdrawMove(uint id_, string memory cw) public isRegistered(id_) returns (uint) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.WithdR, "ph");
        if (gm.fwr != 0) require(block.timestamp <= gm.fwr + REVEAL_TIMEOUT, "to");
        bytes32 ew_ = keccak256(abi.encodePacked(cw));
        uint idx = getFirstChar(cw);
        require(idx == 1 || idx == 2, "idx");
        if (msg.sender == gm.a.addr) {
            require(ew_ == gm.a.ew, "h");
            require(gm.a.w == 0, "a");
            gm.a.w = idx;
        } else if (msg.sender == gm.b.addr) {
            require(ew_ == gm.b.ew, "h");
            require(gm.b.w == 0, "b");
            gm.b.w = idx;
        } else revert("reg");
        if (gm.fwr == 0) gm.fwr = block.timestamp;
        if (gm.a.w != 0 && gm.b.w != 0) {
            gm.p = GamePhase.FinalC;
            gm.ffc = 0;
        }
        return idx;
    }

    function commitFinalMove(uint id_, bytes32 ef_) public isRegistered(id_) returns (bool) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.FinalC, "ph");
        require(ef_ != bytes32(0), "0");
        if (gm.ffc != 0) require(block.timestamp <= gm.ffc + COMMIT_TIMEOUT, "to");
        if (msg.sender == gm.a.addr) {
            require(gm.a.ef == bytes32(0), "a");
            gm.a.ef = ef_;
        } else if (msg.sender == gm.b.addr) {
            require(gm.b.ef == bytes32(0), "b");
            gm.b.ef = ef_;
        } else revert("reg");
        if (gm.ffc == 0) gm.ffc = block.timestamp;
        if (gm.a.ef != bytes32(0) && gm.b.ef != bytes32(0)) {
            gm.p = GamePhase.FinalR;
            gm.ffr = 0;
        }
        return true;
    }

    function revealFinalMove(uint id_, string memory cf_) public isRegistered(id_) returns (Moves) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.FinalR, "ph");
        if (gm.ffr != 0) require(block.timestamp <= gm.ffr + REVEAL_TIMEOUT, "to");
        bytes32 ef_ = keccak256(abi.encodePacked(cf_));
        Moves mf_ = Moves(getFirstChar(cf_));
        require(mf_ != Moves.None, "m");
        if (msg.sender == gm.a.addr) {
            require(ef_ == gm.a.ef, "h");
            Moves exp = gm.a.w == 1 ? gm.a.m2 : gm.a.m1;
            require(mf_ == exp, "w");
            gm.a.mf = mf_;
        } else if (msg.sender == gm.b.addr) {
            require(ef_ == gm.b.ef, "h");
            Moves exp = gm.b.w == 1 ? gm.b.m2 : gm.b.m1;
            require(mf_ == exp, "w");
            gm.b.mf = mf_;
        } else revert("reg");
        if (gm.ffr == 0) gm.ffr = block.timestamp;
        if (gm.a.mf != Moves.None && gm.b.mf != Moves.None) determineOutcome(id_);
        return mf_;
    }

    function determineOutcome(uint id_) private {
        GameState storage gm = g[id_];
        if (gm.a.mf == gm.b.mf) gm.o = Outcomes.D;
        else if ((gm.a.mf == Moves.Rock && gm.b.mf == Moves.Scissors) ||
                 (gm.a.mf == Moves.Paper && gm.b.mf == Moves.Rock) ||
                 (gm.a.mf == Moves.Scissors && gm.b.mf == Moves.Paper))
            gm.o = Outcomes.A;
        else gm.o = Outcomes.B;
        gm.p = GamePhase.Done;
    }

    function getFirstChar(string memory s) private pure returns (uint) {
        bytes memory b = bytes(s);
        if (b.length == 0) return 0;
        bytes1 f = b[0];
        if (f == 0x31) return 1;
        if (f == 0x32) return 2;
        if (f == 0x33) return 3;
        return 0;
    }

    function getOutcome(uint id_) public returns (Outcomes) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.Done, "dn");
        require(gm.o != Outcomes.None, "o");
        address payable a = gm.a.addr;
        address payable b = gm.b.addr;
        uint bet = gm.ib;
        Outcomes out = gm.o;
        resetGame(id_);
        pay(a, b, bet, out);
        return out;
    }

    function pay(address payable a, address payable b, uint bet, Outcomes o) private {
        if (o == Outcomes.A) a.transfer(bet * 2);
        else if (o == Outcomes.B) b.transfer(bet * 2);
        else { a.transfer(bet); b.transfer(bet); }
    }

    function payWithSlash(address payable w, address payable, uint bet) private {
        w.transfer(bet * 2);
    }

    function resetGame(uint id_) private {
        g[id_].act = false;
    }

    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }

    function whoAmI(uint id_) public view returns (uint) {
        if (id_ == 0) return 0;
        GameState storage gm = g[id_];
        if (msg.sender == gm.a.addr) return 1;
        if (msg.sender == gm.b.addr) return 2;
        return 0;
    }

    function getGamePhase(uint id_) public view returns (GamePhase) {
        return g[id_].p;
    }

    function getTimeLeft(uint id_) public view returns (int) {
        if (id_ == 0) return 0;
        GameState storage gm = g[id_];
        if (gm.p == GamePhase.InitC && gm.fc != 0) {
            uint d = gm.fc + COMMIT_TIMEOUT;
            if (block.timestamp >= d) return 0;
            return int(d - block.timestamp);
        } else if (gm.p == GamePhase.FirstR && gm.fr != 0) {
            uint d = gm.fr + REVEAL_TIMEOUT;
            if (block.timestamp >= d) return 0;
            return int(d - block.timestamp);
        } else if (gm.p == GamePhase.WithdC && gm.fwc != 0) {
            uint d = gm.fwc + COMMIT_TIMEOUT;
            if (block.timestamp >= d) return 0;
            return int(d - block.timestamp);
        } else if (gm.p == GamePhase.WithdR && gm.fwr != 0) {
            uint d = gm.fwr + REVEAL_TIMEOUT;
            if (block.timestamp >= d) return 0;
            return int(d - block.timestamp);
        } else if (gm.p == GamePhase.FinalC && gm.ffc != 0) {
            uint d = gm.ffc + COMMIT_TIMEOUT;
            if (block.timestamp >= d) return 0;
            return int(d - block.timestamp);
        } else if (gm.p == GamePhase.FinalR && gm.ffr != 0) {
            uint d = gm.ffr + REVEAL_TIMEOUT;
            if (block.timestamp >= d) return 0;
            return int(d - block.timestamp);
        }
        return int(COMMIT_TIMEOUT);
    }

    function resolveTimeout(uint id_) public isRegistered(id_) {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        address c = msg.sender;
        address payable w = payable(c);
        bool to = false;
        if (gm.p == GamePhase.InitC && gm.fc != 0) {
            if (block.timestamp > gm.fc + COMMIT_TIMEOUT) {
                if (c == gm.a.addr && gm.b.e1 == bytes32(0)) {
                    gm.o = Outcomes.A;
                    to = true;
                } else if (c == gm.b.addr && gm.a.e1 == bytes32(0)) {
                    gm.o = Outcomes.B;
                    to = true;
                }
            }
        } else if (gm.p == GamePhase.FirstR && gm.fr != 0) {
            if (block.timestamp > gm.fr + REVEAL_TIMEOUT) {
                if (c == gm.a.addr && gm.b.m1 == Moves.None) {
                    gm.o = Outcomes.A;
                    to = true;
                } else if (c == gm.b.addr && gm.a.m1 == Moves.None) {
                    gm.o = Outcomes.B;
                    to = true;
                }
            }
        } else if (gm.p == GamePhase.WithdC && gm.fwc != 0) {
            if (block.timestamp > gm.fwc + COMMIT_TIMEOUT) {
                if (c == gm.a.addr && gm.b.ew == bytes32(0)) {
                    gm.o = Outcomes.A;
                    to = true;
                } else if (c == gm.b.addr && gm.a.ew == bytes32(0)) {
                    gm.o = Outcomes.B;
                    to = true;
                }
            }
        } else if (gm.p == GamePhase.WithdR && gm.fwr != 0) {
            if (block.timestamp > gm.fwr + REVEAL_TIMEOUT) {
                if (c == gm.a.addr && gm.b.w == 0) {
                    gm.o = Outcomes.A;
                    to = true;
                } else if (c == gm.b.addr && gm.a.w == 0) {
                    gm.o = Outcomes.B;
                    to = true;
                }
            }
        } else if (gm.p == GamePhase.FinalC && gm.ffc != 0) {
            if (block.timestamp > gm.ffc + COMMIT_TIMEOUT) {
                if (c == gm.a.addr && gm.b.ef == bytes32(0)) {
                    gm.o = Outcomes.A;
                    to = true;
                } else if (c == gm.b.addr && gm.a.ef == bytes32(0)) {
                    gm.o = Outcomes.B;
                    to = true;
                }
            }
        } else if (gm.p == GamePhase.FinalR && gm.ffr != 0) {
            if (block.timestamp > gm.ffr + REVEAL_TIMEOUT) {
                if (c == gm.a.addr && gm.b.mf == Moves.None) {
                    gm.o = Outcomes.A;
                    to = true;
                } else if (c == gm.b.addr && gm.a.mf == Moves.None) {
                    gm.o = Outcomes.B;
                    to = true;
                }
            }
        }
        require(to, "to");
        address payable l = w == gm.a.addr ? gm.b.addr : gm.a.addr;
        uint bet = gm.ib;
        resetGame(id_);
        payWithSlash(w, l, bet);
    }

    function getGameDetails(uint id_) public view returns (
        Player memory, Player memory, uint, Outcomes, GamePhase, bool, uint, string memory) {
        GameState storage gm = g[id_];
        require(gm.id != 0, "no");
        return (gm.a, gm.b, gm.ib, gm.o, gm.p, gm.act, gm.id, gm.mode);
    }

    function getActiveGameIds() public view returns (uint[] memory) {
        uint c = 0;
        for (uint i = 0; i < ids.length; i++) if (g[ids[i]].act) c++;
        uint[] memory a = new uint[](c);
        uint ix = 0;
        for (uint i = 0; i < ids.length; i++) if (g[ids[i]].act) a[ix++] = ids[i];
        return a;
    }

    function startGame(uint id_) public {
        GameState storage gm = g[id_];
        require(gm.act, "act");
        require(gm.p == GamePhase.Reg, "st");
        require(gm.a.addr != address(0) && gm.b.addr != address(0), "r");
        gm.p = GamePhase.InitC;
    }
}
