import { useState } from "react";
import Web3 from "web3";
import { Button } from "./Button";
import { Input } from "./Input";

interface LobbyProps {
  account: string;
  contract: any;
  config: Config | null;
  web3: Web3 | null;
  setStatus: (status: string) => void;
}

export default function Lobby({
  account,
  contract,
  config,
  web3,
  setStatus,
}: Readonly<LobbyProps>) {
  const [loading, setLoading] = useState(false);
  const [registerGameId, setRegisterGameId] = useState<string>("0");
  const [registerBet, setRegisterBet] = useState<string>("");
  const [betMin, setBetMin] = useState<string>("");
  const [activeGameIds, setActiveGameIds] = useState<string>("");
  const [contractBalance, setContractBalance] = useState<string>("");
  const [gameDetailsId, setGameDetailsId] = useState<string>("");
  const [gameDetails, setGameDetails] = useState<any>(null);
  const [myActiveGameId, setMyActiveGameId] = useState<string>("");
  const [pastGameIndex, setPastGameIndex] = useState<string>("");
  const [pastGame, setPastGame] = useState<any>(null);
  const [pastGamesCount, setPastGamesCount] = useState<string>("");
  const [whoAmI, setWhoAmI] = useState<string>("");

  // Read-only contract function handlers
  const handleGetBetMin = async () => {
    if (!contract || !web3) return;
    setLoading(true);
    try {
      const res = await contract.methods.BET_MIN().call();
      setBetMin(web3.utils.fromWei(res, "ether") + " ETH");
    } catch (err: any) {
      setStatus("Failed to fetch BET_MIN: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetActiveGameIds = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.getActiveGameIds().call();
      setActiveGameIds(res.join(", "));
    } catch (err: any) {
      setStatus("Failed to fetch active game IDs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetContractBalance = async () => {
    if (!contract || !web3) return;
    setLoading(true);
    try {
      const res = await contract.methods.getContractBalance().call();
      setContractBalance(web3.utils.fromWei(res, "ether") + " ETH");
    } catch (err: any) {
      setStatus("Failed to fetch contract balance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetGameDetails = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods
        .getGameDetails(Number(gameDetailsId))
        .call();
      setGameDetails(res);
    } catch (err: any) {
      setStatus("Failed to fetch game details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetMyActiveGameId = async () => {
    if (!contract || !account) return;
    setLoading(true);
    try {
      const res = await contract.methods
        .getMyActiveGameId()
        .call({ from: account });
      setMyActiveGameId(res.toString());
    } catch (err: any) {
      setStatus("Failed to fetch my active game ID: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPastGame = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods
        .getPastGame(Number(pastGameIndex))
        .call();
      setPastGame(res);
    } catch (err: any) {
      setStatus("Failed to fetch past game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPastGamesCount = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const res = await contract.methods.getPastGamesCount().call();
      setPastGamesCount(res.toString());
    } catch (err: any) {
      setStatus("Failed to fetch past games count: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWhoAmI = async () => {
    if (!contract || !account) return;
    setLoading(true);
    try {
      const res = await contract.methods.whoAmI().call({ from: account });
      setWhoAmI(res.toString());
    } catch (err: any) {
      setStatus("Failed to fetch whoAmI: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    setStatus("");
    try {
      console.log(registerBet);
      const bet = web3.utils.toWei(registerBet || "0.01", "ether");
      console.log(bet);
      console.log(web3.utils.toHex(bet));
      const tx = contract.methods.register(Number(registerGameId || 0));
      const gas = await tx.estimateGas({ from: account, value: bet });
      const result = await (globalThis as any).ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: config?.GAME_CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            value: web3.utils.numberToHex(bet),
            gas: web3.utils.toHex(gas),
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
          },
        ],
      });
      setStatus("Register tx sent: " + result);
    } catch (err: any) {
      setStatus("Register failed: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="border p-4 rounded-lg">
      <h2 className="font-semibold mb-2">register(uint gameId) (payable)</h2>
      <Input
        type="text"
        placeholder="Game ID (0 = auto)"
        value={registerGameId}
        onChange={(e) => setRegisterGameId(e.target.value)}
        className="mr-2"
      />
      <Input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Bet in ETH (default 0.01)"
        value={registerBet}
        onChange={(e) => setRegisterBet(e.target.value)}
        className="mr-2"
      />
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Enter amount in ETH (e.g., 0.01 for 0.01 ETH). Entering 1 means 1 full
        ETH.
      </div>
      <Button
        onClick={handleRegister}
        disabled={loading || !account || !contract}
        variant="primary"
      >
        Register
      </Button>

      <div className="mt-4 space-y-2">
        <Button onClick={handleGetBetMin} variant="secondary">BET_MIN</Button>
        <span className="ml-2 text-xs">{betMin}</span>
        <br />
        <Button onClick={handleGetActiveGameIds} variant="secondary">getActiveGameIds</Button>
        <span className="ml-2 text-xs">{activeGameIds}</span>
        <br />
        <Button onClick={handleGetContractBalance} variant="secondary">getContractBalance</Button>
        <span className="ml-2 text-xs">{contractBalance}</span>
        <br />
        <Input type="text" placeholder="Game ID" value={gameDetailsId} onChange={e => setGameDetailsId(e.target.value)} className="mr-2" />
        <Button onClick={handleGetGameDetails} variant="secondary">getGameDetails</Button>
        <span className="ml-2 text-xs">{gameDetails && <pre className="inline whitespace-pre-wrap">{JSON.stringify(gameDetails, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}</pre>}</span>
        <br />
        <Button onClick={handleGetMyActiveGameId} variant="secondary">getMyActiveGameId</Button>
        <span className="ml-2 text-xs">{myActiveGameId}</span>
        <br />
        <Input type="text" placeholder="Past Game Index" value={pastGameIndex} onChange={e => setPastGameIndex(e.target.value)} className="mr-2" />
        <Button onClick={handleGetPastGame} variant="secondary">getPastGame</Button>
        <span className="ml-2 text-xs">{pastGame && <pre className="inline whitespace-pre-wrap">{JSON.stringify(pastGame, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)}</pre>}</span>
        <br />
        <Button onClick={handleGetPastGamesCount} variant="secondary">getPastGamesCount</Button>
        <span className="ml-2 text-xs">{pastGamesCount}</span>
        <br />
        <Button onClick={handleWhoAmI} variant="secondary">whoAmI</Button>
        <span className="ml-2 text-xs">{whoAmI}</span>
      </div>
    </div>
  );
}
