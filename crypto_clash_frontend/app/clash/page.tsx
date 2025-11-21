"use client";

import { useEffect, useState } from "react";
import Web3 from "web3";
import GameList from "./GameList";
import Commit from "./Commit";
import Reveal from "./Reveal";

export default function Clash() {
  const [config, setConfig] = useState<Config | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [account, setAccount] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Inputs for contract functions
  const [phase, setPhase] = useState<"games" | "commit" | "reveal">("games");
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const handlePlayClick = (gameId: number) => {
    setPhase("commit");
  };

  // Clear status when phase changes
  useEffect(() => {
    setStatus("");
  }, [phase]);

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
        // Get accounts from MetaMask
        if (globalThis.window !== undefined && (globalThis as any).ethereum) {
          try {
            const accounts = await (globalThis as any).ethereum.request({
              method: "eth_requestAccounts",
            });
            setAvailableAccounts(accounts);
            setAccount(accounts[0]);
            setSelectedAccount(accounts[0]);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 font-sans">
      <main className="w-full max-w-3xl mx-auto py-12 px-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <img
            src="web-app-manifest-192x192.png"
            alt="Crypto Clash Logo"
            className="mx-auto mb-4 w-40 h-40"
          />
          <h1 className="text-4xl font-bold text-center mb-2 text-slate-900 dark:text-white">
            Crypto Clash
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
            {phase === "games" && "Browse and join games."}
            {phase === "commit" && "Commit your move."}
            {phase === "reveal" && "Reveal your move."}
          </p>
          <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Select Wallet Address:
              </label>
              {availableAccounts.length > 0 ? (
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value);
                    setAccount(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableAccounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {`${acc.slice(0, 6)}...${acc.slice(-4)}`}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">No accounts available</p>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Active Account:</span>{" "}
              {selectedAccount
                ? `${selectedAccount.slice(0, 6)}...${selectedAccount.slice(-4)}`
                : "Not connected"}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              <span className="font-semibold">Game Contract Address:</span>{" "}
              {config?.GAME_CONTRACT_ADDRESS}
            </p>
          </div>
          <div className="flex justify-center mb-6 space-x-4">
            <button
              onClick={() => setPhase("games")}
              className={`px-4 py-2 rounded ${
                phase === "games"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              Games
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
            {phase === "games" && (
              <GameList
                account={selectedAccount}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
                onPlayClick={handlePlayClick}
              />
            )}
            {phase === "commit" && (
              <Commit
                account={selectedAccount}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
                selectedMove={selectedMove}
                setSelectedMove={setSelectedMove}
                secret={secret}
                setSecret={setSecret}
                onBothPlayersCommitted={() => setPhase("reveal")}
              />
            )}
            {phase === "reveal" && (
              <Reveal
                account={selectedAccount}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
                selectedMove={selectedMove}
                secret={secret}
              />
            )}
          </div>
          {status && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                status.includes("✅") || status.includes("tx sent")
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
