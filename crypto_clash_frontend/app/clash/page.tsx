"use client";

import { useEffect, useState } from "react";
import Web3 from "web3";
import Lobby from "./Lobby";
import Commit from "./Commit";
import Reveal from "./Reveal";

export default function Clash() {
  const [config, setConfig] = useState<Config | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [account, setAccount] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Inputs for contract functions
  const [phase, setPhase] = useState<"lobby" | "commit" | "reveal">("lobby");

  const [registerGameId, setRegisterGameId] = useState<string>("0");
  const [registerBet, setRegisterBet] = useState<string>("");
  // State for read-only contract calls
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
  // (Removed unused inputs and state)

  // Load config and contract
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/crypto_clash/config.json");
        const data = await response.json();
        setConfig(data);
        const web3Instance = new Web3(data.API_URL);
        setWeb3(web3Instance);
        const contractInstance = new web3Instance.eth.Contract(
          data.GAME_ABI,
          data.GAME_CONTRACT_ADDRESS
        );
        setContract(contractInstance);
        // Get account
        if (globalThis.window !== undefined && (globalThis as any).ethereum) {
          try {
            const accounts = await (globalThis as any).ethereum.request({
              method: "eth_requestAccounts",
            });
            setAccount(accounts[0]);
          } catch (err: any) {
            setStatus(
              "MetaMask not available or user denied access: " + err.message
            );
          }
        }
      } catch (err: any) {
        setStatus("Failed to load config: " + err.message);
      }
    };
    loadConfig();
  }, []);

  // (Removed unused helpers)

  // Contract function handlers
  const handleRegister = async () => {
    if (!contract || !web3 || !account) return;
    setLoading(true);
    setStatus("");
    try {
      console.log(registerBet)
      const bet = web3.utils.toWei(registerBet || "0.01", "ether");
      console.log(bet)
      console.log(web3.utils.toHex(bet))
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 font-sans">
      <main className="w-full max-w-3xl mx-auto py-12 px-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Crypto Clash
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
            {phase === "lobby" && "Register for a game to start."}
            {phase === "commit" && "Commit your move."}
            {phase === "reveal" && "Reveal your move."}
          </p>
          <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Connected Account:</span>{" "}
              {account
                ? `${account.slice(0, 6)}...${account.slice(-4)}`
                : "Not connected"}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              <span className="font-semibold">Game Contract Address:</span>{" "}
              {config?.GAME_CONTRACT_ADDRESS}
            </p>
          </div>
          <div className="flex justify-center mb-6 space-x-4">
            <button
              onClick={() => setPhase("lobby")}
              className={`px-4 py-2 rounded ${
                phase === "lobby"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              Lobby
            </button>
            <button
              onClick={() => setPhase("commit")}
              className={`px-4 py-2 rounded ${
                phase === "commit"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              Commit
            </button>
            <button
              onClick={() => setPhase("reveal")}
              className={`px-4 py-2 rounded ${
                phase === "reveal"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              Reveal
            </button>
          </div>
          <div className="space-y-6">
            {phase === "lobby" && (
              <Lobby
                registerGameId={registerGameId}
                setRegisterGameId={setRegisterGameId}
                registerBet={registerBet}
                setRegisterBet={setRegisterBet}
                handleRegister={handleRegister}
                loading={loading}
                account={account}
                contract={contract}
                betMin={betMin}
                handleGetBetMin={handleGetBetMin}
                activeGameIds={activeGameIds}
                handleGetActiveGameIds={handleGetActiveGameIds}
                contractBalance={contractBalance}
                handleGetContractBalance={handleGetContractBalance}
                gameDetailsId={gameDetailsId}
                setGameDetailsId={setGameDetailsId}
                gameDetails={gameDetails}
                handleGetGameDetails={handleGetGameDetails}
                myActiveGameId={myActiveGameId}
                handleGetMyActiveGameId={handleGetMyActiveGameId}
                pastGameIndex={pastGameIndex}
                setPastGameIndex={setPastGameIndex}
                pastGame={pastGame}
                handleGetPastGame={handleGetPastGame}
                pastGamesCount={pastGamesCount}
                handleGetPastGamesCount={handleGetPastGamesCount}
                whoAmI={whoAmI}
                handleWhoAmI={handleWhoAmI}
              />
            )}
            {phase === "commit" && (
              <Commit
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
              />
            )}
            {phase === "reveal" && (
              <Reveal
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
              />
            )}
          </div>
          {status && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                status.includes("tx sent")
                  ? "bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200"
              }`}
            >
              <p className="text-sm break-words">{status}</p>
            </div>
          )}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-2">ℹ️ Note:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                MetaMask or a compatible Web3 wallet is required for write
                operations
              </li>
              <li>
                Use bytes32 for encrypted move (see contract docs for details)
              </li>
              <li>ETH values are in Ether (not Wei)</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
