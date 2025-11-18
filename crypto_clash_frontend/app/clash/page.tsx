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

  // Inputs for contract functions
  const [phase, setPhase] = useState<"lobby" | "commit" | "reveal">("lobby");

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
                account={account}
                contract={contract}
                config={config}
                web3={web3}
                setStatus={setStatus}
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
