"use client";

import { useEffect, useState } from "react";
import Web3 from "web3";
import GameList from "./GameList";
import GameModal from "./GameModal";
import { showErrorToast } from "@/app/lib/toast";

export default function Clash() {
  const [config, setConfig] = useState<Config | null>(null);
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | undefined>();
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");

  const handlePlayClick = (gameId: number) => {
    setSelectedGameId(gameId);
    setIsModalOpen(true);
  };

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
            setSelectedAccount(accounts[0]);
          } catch (err: any) {
            showErrorToast("MetaMask not available or user denied access: " + err.message);
          }
        }
      } catch (err: any) {
        showErrorToast("Failed to load config: " + err.message);
      }
    };
    loadConfig();
  }, []);

  // Fetch balance when selected account changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (web3 && selectedAccount) {
        try {
          const balanceWei = await web3.eth.getBalance(selectedAccount);
          const balanceEth = web3.utils.fromWei(balanceWei, "ether");
          setBalance(parseFloat(balanceEth).toFixed(4));
        } catch (err: any) {
          showErrorToast("Failed to fetch balance: " + err.message);
        }
      }
    };
    fetchBalance();
  }, [web3, selectedAccount]);

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
            Browse and join games.
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
              <span className="font-semibold">Current Balance:</span>{" "}
              {balance} ETH
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              <span className="font-semibold">Game Contract Address:</span>{" "}
              {config?.GAME_CONTRACT_ADDRESS}
            </p>
          </div>
          <div className="space-y-6">
            <GameList
              account={selectedAccount}
              contract={contract}
              config={config}
              web3={web3}
              setStatus={setStatus}
              onPlayClick={handlePlayClick}
            />
          </div>
        </div>

        {/* Game Modal */}
        <GameModal
          gameId={selectedGameId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          account={selectedAccount}
          contract={contract}
          config={config}
          web3={web3}
          setStatus={setStatus}
        />
      </main>
    </div>
  );
}
